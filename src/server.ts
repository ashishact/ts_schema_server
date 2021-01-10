console.log("<===== BEGINING =====>");
import http         from "http";
import path         from "path";
import express      from "express";
import body_parser  from "body-parser";
import socketIO     from "socket.io";
import dotenv       from "dotenv";

dotenv.config({path: '../.env'});

import _log         from "./_log";
import DEF          from "./_global";

import TCP_SERVER_LISTEN from "./tcp-server";
import UDP_SERVER_LISTEN from "./udp-server";
import LSP_SERVER_LISTEN from "./vscode/lsp";
import API from "./api/api"




const exp       : express.Application       = express();
const server    : http.Server               = http.createServer(exp); // for socket.io
// const io        : socketIO.Server           = socketIO.Server(server);
const io        : socketIO.Server           = new socketIO.Server(server)
const ws_ns     : socketIO.Namespace        = io.of("/");


exp.set("port", parseInt(process.env.HTTP_PORT!) || 3000);



DEF.EXP         = exp;
DEF.WS          = ws_ns;
// DEF.REDIS


exp.use(body_parser.json());
// APIs
exp.use(express.static(path.join(__dirname, 'public')));


// TCP_SERVER_LISTEN();
// UDP_SERVER_LISTEN();
LSP_SERVER_LISTEN();
API.init();



server.listen(exp.get('port'), function () {
    _log("HTTP RUNNING ON : http://localhost:%s", exp.get('port'));
});

export default exp;
