import * as net from "net";


import _log         from "./_log";
import DEF          from "./_global";

let generateAddress = (socket: net.Socket): string =>{
    return "tcp:" + socket.remoteAddress + ":" + socket.remotePort;
}
const TCP_SERVER = net.createServer(function (socket) {
    _log("NEW TCP CLIENT: ", generateAddress(socket));


    socket.on("data", function (data) {
        
    });
    socket.on("error", function (error) {
        _log("TCP SOCKET ERROR", generateAddress(socket));
    });
    socket.on("close", function () {
        _log("TCP SOCKET CLOSED", generateAddress(socket));
    });
});

TCP_SERVER.on("listening", function(){
    _log("TCP SERVER LISTENING ON:", TCP_SERVER.address());
})
TCP_SERVER.on("close", function(){
    setTimeout(() => {
        _log("TCP SERVER STARTING AGAIN");
        TCP_SERVER_LISTEN();
    }, 5 * 1000);
});

/**
 * Start a TCP Server
 * Bind to port 4000 or env.TCP_PORT
 */
let TCP_SERVER_LISTEN = function(){
    const port = parseInt(process.env.TCP_PORT || "4000");
    const host = "0.0.0.0";
    
    TCP_SERVER.listen(port, host);
    _log(`TCP SERVER STARTED @${host}:${port}`);
}


export default TCP_SERVER_LISTEN;