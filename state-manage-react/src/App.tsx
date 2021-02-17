import React, { useState, useEffect, useReducer } from 'react';
import Select from 'react-select';
import socketIOClient from 'socket.io-client';
import { Resource, ResourceState, StateTypes } from './class';
import * as SIM from './socket_io_messages';
import './App.css';

const socket = socketIOClient('http://localhost:4001');

function App() {
  const [resources, setResources] = useReducer<Array<Resource>>(
    (currentResource: Array<Resource>, action) => {
      if (action.type === "add") {
        return [...currentResource, ...action.data];
      } else if (action.type === "change") {
        return currentResource.map(each_resource => each_resource.id === action.data.id ? action.data : each_resource);
      } else if (action.type === "remove") {
        return currentResource.filter(each_resource => each_resource.id !== action.data.id);
      } else if (action.type === "init") {
        return action.data;
      }
    }, []
  );
  const [states, setStates] = useReducer<Array<ResourceState>>(
    (currentStates: Array<ResourceState>, action) => {
      if (action.type === "add") {
        return [...currentStates, ...action.data];
      } else if (action.type === "change") {
        return currentStates.map(each_state => each_state.id === action.data.id ? action.data : each_state);
      } else if (action.type === "init") {
        return action.data;
      }
    }, []
  );
  const [dispState, setDispState] = useState<Boolean>(true);
  const [errorMessage, setErrMessage] = useState<string>("");
  const [userName, setUserName] = useState<string>(localStorage.getItem("user_name"));

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
  const [newStateName, setNewStateName] = useState<String>("");
  const [newStateColor, setNewColorState] = useState<string>("");
  const [newStateType, setNewStateType] = useState<StateTypes>("state");

  useEffect(() => {

    socket.emit("client_to_server_join");

    socket.on(SIM.OPEN_PAGE, (init_val: { data: Array<Resource>, state: Array<ResourceState> }) => {
      console.log("init page")
      console.log(init_val.data);
      setResources({ type: "init", data: init_val.data });

      console.log(init_val.state);
      setStates({ type: "init", data: init_val.state });
    });

    socket.on(SIM.SERVER_SEND_CHANGED_RESOURCE, (target: Resource) => {
      console.log(`changed state: ${target.name}`);
      setResources({ type: "change", data: target });
      setDispState(true);
    });

    socket.on(SIM.SERVER_ACCEPT_CHANGE, (target: Resource) => {
      setErrMessage(`${target.name}の${target.state.name}への状態変更に成功しました`);
      console.log(`${target.name}の${target.state.name}への状態変更に成功しました`);
      setResources({ type: "change", data: target });
      setDispState(true);
    });

    socket.on(SIM.SERVER_DENIED_CHANGE, (target: Resource) => {
      setErrMessage(`${target.name}の${target.state.name}への状態変更に失敗しました`);
      console.log(`${target.name}の${target.state.name}への状態変更に失敗しました`);
      setDispState(true);
    });

    socket.on(SIM.SERVER_SEND_CHANGED_STATE, (target: ResourceState) => {
      setStates({ type: "change", data: target });
    });

    socket.on(SIM.SERVER_ADD_RESOURCE, (resource: Resource) => {
      console.log(resources);
      setResources({ type: "add", data: [resource] });
    });

    socket.on(SIM.SERVER_RMV_RESOURCE, (resource: Resource) => {
      console.log(`remove ${resource.name}`);
      setResources({ type: "remove", data: resource });
    });

    socket.on(SIM.SERVER_ADD_STATE, (state: ResourceState) => {
      console.log(`added state, name: ${state.name}, id: ${state.id}`);
      console.log(states);
      setStates({ type: "add", data: [state] });
    });

  }, []);
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
        <p id="error_message">{errorMessage}</p>
        <table id="ResourceStateTable">
          <tbody>
            <tr>
              <td></td>
              <td>対象</td>
              <td style={{ width: "200px" }}>状態</td>
              <td>ユーザー</td>
            </tr>
            {resources.map((resource: Resource) => (
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
                <td style={{ backgroundColor: resource.state.color }}>{resource.name}</td>
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
            <tr>
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
                    let newState: ResourceState = states.filter((state: ResourceState) => {
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
      <div id="addNewState">
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
            setNewStateType(e.target.value);
          }}
        >
          <option value="state">状態</option>
          <option value="possess">所有</option>
        </select>
      </div>
      <input
        type="button"
        value="新しい状態を追加する"
        onClick={() => {
          const newState: ResourceState = {
            id: -1,
            name: newStateName,
            color: newStateColor,
            type: newStateType
          }
          console.log(`add ${newState.name}`);
          socket.emit(SIM.CLIENT_ADD_STATE, newState);
        }}
      />
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
