import React, { useState, useEffect, useReducer } from 'react';
import Select from 'react-select';
import socketIOClient from 'socket.io-client';
import { Resource, ResourceState, StateTypes } from './class';
import * as SIM from './socket_io_messages';
import './App.css';

// サーバーのアドレス
const socket = socketIOClient('http://localhost:4001');

interface ResourceAction {
  type: string;
  data: Resource[];
}

const resourceReducer: React.Reducer<Resource[], ResourceAction> = (currentResource: Resource[], action: ResourceAction) => {
  if (action.type === "add") {
    return [...currentResource, ...action.data];
  } else if (action.type === "change") {
    return currentResource.map(each_resource => {
      const filteredResource: Resource[] = action.data.filter(each_data => each_data.id === each_resource.id);
      if (filteredResource.length === 0) {
        return each_resource;
      } else {
        return filteredResource[0];
      }
    });
  } else if (action.type === "remove") {
    return currentResource.filter(each_resource => action.data.filter(each_data => each_data.id === each_resource.id).length === 0);
  } else if (action.type === "init") {
    return action.data;
  } else {
    return [];
  }
}

interface ResourceStateAction {
  type: string;
  data: ResourceState[];
}

const resourceStateReducer: React.Reducer<ResourceState[], ResourceStateAction> = (currentStates: Array<ResourceState>, action: ResourceStateAction) => {
  if (action.type === "add") {
    return [...currentStates, ...action.data];
  } else if (action.type === "change") {
    return currentStates.map(each_state => {
      const filteredState: ResourceState[] = action.data.filter(each_data => each_data.id === each_state.id);
      if (filteredState.length === 0) {
        return each_state;
      } else {
        return filteredState[0];
      }
    });
  } else if (action.type === "init") {
    return action.data;
  } else {
    return [];
  }
}

// webアプリ本体
function App() {
  // 状態変数一覧
  // 対象の一覧変数
  const [resources, setResources] = useReducer(
    resourceReducer, []
  );
  // 状態の一覧変数
  const [states, setStates] = useReducer(
    resourceStateReducer, []
  );

  // ソート制御変数
  const [sortResource, setSortResource] = useState<Boolean>(false);
  const [sortState, setSortState] = useState<Boolean>(false);
  // 画面非活性を行う用の変数
  // 現在機能していない
  const [dispState, setDispState] = useState<Boolean>(true);
  // エラーメッセージ表示
  const [errorMessage, setErrMessage] = useState<string>("");
  // ユーザー名用変数
  const [userName, setUserName] = useState<string>(localStorage.getItem("user_name") || "");

  // 新しい管理対象
  const [newResourceName, setNewResourceName] = useState<string>("");
  const initRespurceState: ResourceState = {
    id: 0,
    name: "",
    color: "#ffffff",
    type: "state"
  };
  const [newResourceState, setNewResourceState] = useState<ResourceState>(initRespurceState);

  // 新しい管理状態
  const [isShowNewStateArea, setIsShow] = useState<Boolean>(false);
  const [newStateName, setNewStateName] = useState<String>("");
  const [newStateColor, setNewColorState] = useState<string>("");
  const [newStateType, setNewStateType] = useState<StateTypes>("state");

  // 初期処理
  // useEffectの第二引数が空配列の場合この処理は起動時の一回のみの実行になる
  useEffect(() => {

    socket.emit("client_to_server_join");

    // 画面を開いた最初期
    socket.on(SIM.OPEN_PAGE, (init_val: { data: Array<Resource>, state: Array<ResourceState> }) => {
      console.log("init page")
      console.log(init_val.data);
      setResources({ type: "init", data: init_val.data } as ResourceAction);

      console.log(init_val.state);
      setStates({ type: "init", data: init_val.state } as ResourceStateAction);
    });

    // 対象の変更通知がサーバーから来た場合
    socket.on(SIM.SERVER_SEND_CHANGED_RESOURCE, (target: Resource) => {
      console.log(`changed state: ${target.name}`);
      setResources({ type: "change", data: [target] } as ResourceAction);
      setDispState(true);
    });

    // こちらから対象の変更を投げた場合にそれが受容された場合
    socket.on(SIM.SERVER_ACCEPT_CHANGE, (target: Resource) => {
      setErrMessage(`${target.name}を${target.state.name}にしました`);
      console.log(`${target.name}を${target.state.name}にしました`);
      setResources({ type: "change", data: [target] } as ResourceAction);
      setDispState(true);
    });

    // 対象の変更が受け付けられなかった場合
    socket.on(SIM.SERVER_DENIED_CHANGE, (target: Resource) => {
      setErrMessage(`${target.name}を${target.state.name}にできませんでした`);
      console.log(`${target.name}を${target.state.name}にできませんでした`);
      setDispState(true);
    });

    // 状態の変更通知がサーバーから来た場合
    socket.on(SIM.SERVER_SEND_CHANGED_STATE, (target: ResourceState) => {
      setStates({ type: "change", data: [target] } as ResourceStateAction);
    });

    // 対象追加がサーバーから通知された場合
    socket.on(SIM.SERVER_ADD_RESOURCE, (resource: Resource) => {
      console.log(resources);
      setResources({ type: "add", data: [resource] } as ResourceAction);
    });

    // 対象削除がサーバーから通知された場合
    socket.on(SIM.SERVER_RMV_RESOURCE, (resource: Resource) => {
      console.log(`remove ${resource.name}`);
      setResources({ type: "remove", data: [resource] } as ResourceAction);
    });

    // 状態追加がサーバーから通知された場合
    socket.on(SIM.SERVER_ADD_STATE, (state: ResourceState) => {
      console.log(`added state, name: ${state.name}, id: ${state.id}`);
      console.log(states);
      setStates({ type: "add", data: [state] } as ResourceStateAction);
    });

  }, []);

  // ページ描画部分
  // ほんとはApp.tsxにだらだら書かずに小さいコンポーネントに分ける方が良い
  // のちのち複数ページにわける必要が出たりするとなおさら
  return (
    <div className="App">
      <div id="main_content" style={{ zIndex: 0 }}>
        <div>
          <span>貴方の名前</span>
          <input
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUserName(e.target.value);
              localStorage.setItem("user_name", e.target.value);
            }}
          />
        </div>
        <table id="ResourceStateTable" style={{ borderCollapse: "collapse", margin: "auto" }}>
          <tbody>
            <tr
              style={{
                borderBottom: "2px gray solid"
              }}
            >
              <td></td>
              <td>
                対象の機器名
                <input
                  type="checkbox"
                  onChange={(e) => {
                    console.log(`resorce sort ${e.target.checked}`);
                    setSortResource(e.target.checked);
                  }}
                />
              </td>
              <td style={{ width: "200px" }}>
                機器の状態
                <input
                  type="checkbox"
                  onChange={(e) => {
                    console.log(`state sort ${e.target.checked}`);
                    setSortState(e.target.checked);
                  }}
                />
              </td>
              <td>ユーザー</td>
            </tr>
            {resources
              .sort((a: Resource, b: Resource) => {
                const localeComp: number = a.name.localeCompare(b.name);
                const a_state: number = a.state ? a.state.id : 0;
                const b_state: number = b.state ? b.state.id : 0;
                const stateComp: number = b_state - a_state;
                if (sortResource && sortState) {
                  // どちらのソートもonの場合
                  // 機器名をベースにソートを行う
                  return localeComp === 0 ? stateComp : localeComp;
                } else if (sortResource && !sortState) {
                  return localeComp;
                } else if (!sortResource && sortState) {
                  return stateComp;
                } else {
                  // ソートを行わない
                  return 0;
                }
              })
              .map((resource: Resource) => (
                <tr>
                  <td>
                    <input
                      type="button"
                      value="－"
                      onClick={() => {
                        console.log(`remove ${resource.name}`);
                        socket.emit(SIM.CLIENT_RMV_RESOURCE, resource);
                      }}
                    />
                  </td>
                  <td style={{ backgroundColor: resource.state.color }}>
                    <input
                      type="text"
                      value={resource.name}
                      style={{
                        textAlign: "center",
                        border: "none",
                        backgroundColor: resource.state.color,
                        fontSize: "15px"
                      }}
                      onChange={(e) => {
                        console.log(`editing: ${e.currentTarget.textContent}`);
                        socket.emit(SIM.CLIENT_CHANGED_RESOURCE, {
                          data: {
                            id: resource.id,
                            name: e.target.value,
                            state: resource.state
                          },
                          name: userName
                        });
                      }}
                    />
                  </td>
                  <td>
                    <Select
                      options={
                        states.map((state: ResourceState) => { return { label: state.name, value: state.id } })
                      }
                      value={{ label: resource.state.name, value: resource.state.id }}
                      onChange={(value) => {
                        let newState: ResourceState = states.filter((state: ResourceState) => {
                          console.log(value);
                          return state.id === value.value;
                        })[0];
                        if (newState.type === "possess") {
                          newState.user = userName;
                        } else {
                          newState.user = "";
                        }
                        console.log(`send new state: ${newState.name}`);
                        socket.emit(SIM.CLIENT_CHANGED_RESOURCE, {
                          data: {
                            id: resource.id,
                            name: resource.name,
                            state: newState
                          },
                          name: userName
                        });
                        setDispState(false);
                      }}
                    />
                  </td>
                  <td>{resource.state.user}</td>
                </tr>
              ))}
            <tr
              style={{
                borderTop: "2px gray solid"
              }}
            >
              <td>
                <input
                  type="button"
                  value="＋"
                  onClick={() => {
                    const newResource: Resource = {
                      id: -1,
                      name: newResourceName,
                      state: newResourceState
                    }
                    console.log(`add ${newResource.name}`);
                    socket.emit(SIM.CLIENT_ADD_RESOURCE, newResource);
                  }}
                />
              </td>
              <td>
                <input
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNewResourceName(e.target.value);
                  }}
                />
              </td>
              <td>
                <Select
                  options={
                    states.map((state: ResourceState) => { return { label: state.name, value: state.id } })
                  }
                  onChange={(value) => {
                    let newState: ResourceState[] = states.filter((state: ResourceState) => {
                      return state.id === value.value;
                    });
                    setNewResourceState(newState[0]);
                  }}
                />
              </td>
              <td>{newResourceState.type === "state" ? "" : userName}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p id="error_message">{errorMessage}</p>
      <input
        type="checkbox"
        onChange={(e) => {
          console.log(`change show state to ${e.target.checked}`);
          setIsShow(e.target.checked);
        }}
      />あたらしい機器の状態を追加する
      <div id="addNewState"
        style={{ display: isShowNewStateArea ? "" : "none" }}
      >
        <span>新しい状態</span>
        <input
          type="text"
          onChange={(e) => {
            setNewStateName(e.target.value);
          }}
        />
        <span>色</span>
        <input
          type="color"
          onChange={(e) => {
            setNewColorState(e.target.value);
          }}
        />
        <span>状態</span>
        <select
          onChange={(e) => {
            setNewStateType(e.target.value as StateTypes);
          }}
        >
          <option value="state">状態</option>
          <option value="possess">所有</option>
        </select>
        <input
          type="button"
          value="新しい状態を追加する"
          onClick={() => {
            const newState: ResourceState = {
              id: -1,
              name: newStateName as string,
              color: newStateColor as string,
              type: newStateType as StateTypes
            }
            console.log(`add ${newState.name}`);
            socket.emit(SIM.CLIENT_ADD_STATE, newState);
          }}
        />
      </div>
      <div id="block_input"
        style={{
          zIndex: 1,
          opacity: 50,
          backgroundColor: 'white',
          width: '100%',
          height: '100%',
          display: dispState ? 'none' : ''
        }}
      ></div>
    </div>
  );
}

export default App;
