import * as express from "express";
import * as http from "http";
import * as socketIo from "socket.io";
import { Resource, Resources, ResourceState } from './state-manage-react/src/class';
import * as fs from 'fs';
import * as SIM from './state-manage-react/src/socket_io_messages';
import * as cors from 'cors';

// サーバーのポート
const port = process.env.PORT || 4001;
// ウェブアプリのアドレス
const web_address: string = "http://192.168.11.4:3000";
const app: express.Express = express();

const server: http.Server = http.createServer(app);
// socket.io初期設定
// ウェブアプリ側で別サーバー立てているのでcors設定がいる模様
const io: socketIo.Server = socketIo(server, {
  cors: {
    origins: [web_address],
    methods: ["GET", "POST"],
  }
});

// 管理対象と管理状態テーブル
// データベースはめんどくさいのでファイル管理
// 管理対象
const dataPath: string = "resource_data.json";
// 管理状態
const statePath: string = "state_data.json";

// ファイル内容を一括読み込み
let dataDumped: Resources = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as Resources;
let stateData: Array<ResourceState> = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Array<ResourceState>;

// socket.ioイベント設定
io.on("connection", (socket: socketIo.Socket) => {
  // 新しいアクセスがあった場合に現在のテーブル内容を送信する
  console.log(`${socket.id} appeared`)
  io.to(socket.id).emit(SIM.OPEN_PAGE, { data: dataDumped, state: stateData });

  socket.on("client_to_server_join", () => {
    console.log(`${socket.id} joined`);
  })

  // クライアントから対象の状態変更要求が来た場合
  socket.on(SIM.CLIENT_CHANGED_RESOURCE, ({ data: target, name: userName }) => {
    console.log("changed target");
    console.log(target);
    for (let i = 0; i < dataDumped.length; i++) {
      console.log(dataDumped[i].name);
      console.log(target.name);
      // 対象のidで一致検索
      if (dataDumped[i].id == target.id) {
        // 対象の状態がstateもしくはpossessでもその所有者から通知があった場合は変更を許可する
        if (dataDumped[i].state.type === "state"
          || dataDumped[i].state.user === userName) {
          console.log("can change");
          dataDumped[i] = target;
          // 変更内容を要求送信元以外に送付する
          socket.broadcast.emit(SIM.SERVER_SEND_CHANGED_RESOURCE, target);
          // 送信元に要求が受理されたことを通知する
          io.to(socket.id).emit(SIM.SERVER_ACCEPT_CHANGE, target);
        } else {
          // 変更できない場合送信元に要求が棄却されたことを通知する
          io.to(socket.id).emit(SIM.SERVER_DENIED_CHANGE, target);
        }
      }
    }
  });

  // 状態の変更要求
  // ウェブアプリ側では未実装
  socket.on(SIM.CLIENT_CHANGED_STATE, (target: ResourceState) => {
    console.log("change state");
    console.log(target);
    for (let i = 0; i < stateData.length; i++) {
      if (stateData[i].id == target.id) {
        stateData[i] = target;
        socket.broadcast.emit(SIM.SERVER_SEND_CHANGED_STATE, target);
      }
    }
  });

  // 対象の追加要求
  socket.on(SIM.CLIENT_ADD_RESOURCE, (resource: Resource) => {
    console.log("add resorce");
    resource.id = new Date().getTime();
    dataDumped.push(resource);
    console.log(dataDumped);
    io.emit(SIM.SERVER_ADD_RESOURCE, resource);
  });

  // 対象の削除要求
  socket.on(SIM.CLIENT_RMV_RESOURCE, (resource: Resource) => {
    console.log("remove resorce");
    console.log(resource);
    dataDumped = dataDumped.filter((each_resource) => each_resource.id !== resource.id);
    console.log(dataDumped);
    io.emit(SIM.SERVER_RMV_RESOURCE, resource);
  });

  // 状態の追加要求
  socket.on(SIM.CLIENT_ADD_STATE, (state: ResourceState) => {
    // 日付で一意性をとる
    state.id = new Date().getTime();
    stateData.push(state);
    console.log(state);
    io.emit(SIM.SERVER_ADD_STATE, state);
  });
});

// サーバー起動
server.listen(port, () => console.log(`Listening on port ${port}`));

// 終了時に現在までに追加された情報をファイルに出力する
process.on("exit", () => {
  console.log("Exitting...");
  const resourceString: string = JSON.stringify(dataDumped);
  const stateString: string = JSON.stringify(stateData);
  fs.writeFileSync(dataPath, resourceString);
  fs.writeFileSync(statePath, stateString);
  console.log("Data were saved !");
});
process.on("SIGINT", function () {
  console.log("Caught interrupt signal");
  process.exit(0);
});