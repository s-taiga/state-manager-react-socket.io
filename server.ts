import * as express from "express";
import * as http from "http";
import * as socketIo from "socket.io";
import { Resource, Resources, ResourceState } from './state-manage-react/src/class';
import * as fs from 'fs';
import * as SIM from './state-manage-react/src/socket_io_messages';
import * as cors from 'cors';

const port = process.env.PORT || 4001;
const web_address: string = "http://localhost:3000";
const app: express.Express = express();

const server: http.Server = http.createServer(app);
const io: socketIo.Server = socketIo(server, {
  cors: {
    origins: [web_address],
    methods: ["GET", "POST"],
  }
});

const dataPath: string = "resource_data.json";
const statePath: string = "state_data.json";

let dataDumped: Resources = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as Resources;
let stateData: Array<ResourceState> = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Array<ResourceState>;

io.on("connection", (socket: socketIo.Socket) => {
  console.log(`${socket.id} appeared`)
  io.to(socket.id).emit(SIM.OPEN_PAGE, { data: dataDumped, state: stateData });

  socket.on("client_to_server_join", () => {
    console.log(`${socket.id} joined`);
  })

  socket.on(SIM.CLIENT_CHANGED_RESOURCE, ({ data: target, name: userName }) => {
    console.log("changed target");
    console.log(target);
    for (let i = 0; i < dataDumped.length; i++) {
      console.log(dataDumped[i].name);
      console.log(target.name);
      if (dataDumped[i].id == target.id) {
        if (dataDumped[i].state.type === "state"
          || dataDumped[i].state.user === userName) {
          console.log("can change");
          dataDumped[i] = target;
          socket.broadcast.emit(SIM.SERVER_SEND_CHANGED_RESOURCE, target);
          io.to(socket.id).emit(SIM.SERVER_ACCEPT_CHANGE, target);
        } else {
          io.to(socket.id).emit(SIM.SERVER_DENIED_CHANGE, target);
        }
      }
    }
  });

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

  socket.on(SIM.CLIENT_ADD_RESOURCE, (resource: Resource) => {
    console.log("add resorce");
    resource.id = new Date().getTime();
    dataDumped.push(resource);
    console.log(dataDumped);
    io.emit(SIM.SERVER_ADD_RESOURCE, resource);
  });

  socket.on(SIM.CLIENT_RMV_RESOURCE, (resource: Resource) => {
    console.log("remove resorce");
    console.log(resource);
    dataDumped = dataDumped.filter((each_resource) => each_resource.id !== resource.id);
    console.log(dataDumped);
    io.emit(SIM.SERVER_RMV_RESOURCE, resource);
  });

  socket.on(SIM.CLIENT_ADD_STATE, (state: ResourceState) => {
    // 日付で一意性をとる
    state.id = new Date().getTime();
    stateData.push(state);
    console.log(state);
    io.emit(SIM.SERVER_ADD_STATE, state);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

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