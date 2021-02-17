"use strict";
exports.__esModule = true;
var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var fs = require("fs");
var SIM = require("./state-manage-react/src/socket_io_messages");
var port = process.env.PORT || 4001;
var app = express();
var server = http.createServer(app);
var io = socketIo(server, {
    cors: {
        origins: ["http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});
var dataPath = "resource_data.json";
var statePath = "state_data.json";
var dataDumped = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
var stateData = JSON.parse(fs.readFileSync(statePath, 'utf8'));
io.on("connection", function (socket) {
    console.log(socket.id + " appeared");
    io.to(socket.id).emit(SIM.OPEN_PAGE, { data: dataDumped, state: stateData });
    socket.on("client_to_server_join", function () {
        console.log(socket.id + " joined");
    });
    socket.on(SIM.CLIENT_CHANGED_RESOURCE, function (_a) {
        var target = _a.data, userName = _a.name;
        console.log("changed target");
        console.log(target);
        for (var i = 0; i < dataDumped.length; i++) {
            console.log(dataDumped[i].name);
            console.log(target.name);
            if (dataDumped[i].id == target.id) {
                if (dataDumped[i].state.type === "state"
                    || dataDumped[i].state.user === userName) {
                    console.log("can change");
                    dataDumped[i] = target;
                    socket.broadcast.emit(SIM.SERVER_SEND_CHANGED_RESOURCE, target);
                    io.to(socket.id).emit(SIM.SERVER_ACCEPT_CHANGE, target);
                }
                else {
                    io.to(socket.id).emit(SIM.SERVER_DENIED_CHANGE, target);
                }
            }
        }
    });
    socket.on(SIM.CLIENT_CHANGED_STATE, function (target) {
        console.log("change state");
        console.log(target);
        for (var i = 0; i < stateData.length; i++) {
            if (stateData[i].id == target.id) {
                stateData[i] = target;
                socket.broadcast.emit(SIM.SERVER_SEND_CHANGED_STATE, target);
            }
        }
    });
    socket.on(SIM.CLIENT_ADD_RESOURCE, function (resource) {
        console.log("add resorce");
        resource.id = new Date().getTime();
        dataDumped.push(resource);
        console.log(dataDumped);
        io.emit(SIM.SERVER_ADD_RESOURCE, resource);
    });
    socket.on(SIM.CLIENT_RMV_RESOURCE, function (resource) {
        console.log("remove resorce");
        console.log(resource);
        dataDumped = dataDumped.filter(function (each_resource) { return each_resource.id !== resource.id; });
        console.log(dataDumped);
        io.emit(SIM.SERVER_RMV_RESOURCE, resource);
    });
    socket.on(SIM.CLIENT_ADD_STATE, function (state) {
        // 日付で一意性をとる
        state.id = new Date().getTime();
        stateData.push(state);
        console.log(state);
        io.emit(SIM.SERVER_ADD_STATE, state);
    });
});
server.listen(port, function () { return console.log("Listening on port " + port); });
process.on("exit", function () {
    console.log("Exitting...");
    var resourceString = JSON.stringify(dataDumped);
    var stateString = JSON.stringify(stateData);
    fs.writeFileSync(dataPath, resourceString);
    fs.writeFileSync(statePath, stateString);
    console.log("Data were saved !");
});
process.on("SIGINT", function () {
    console.log("Caught interrupt signal");
    process.exit(0);
});
