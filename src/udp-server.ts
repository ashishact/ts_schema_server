import dgram            from "dgram";

import _log             from "./_log";
import DEF              from "./_global";

import FIREHOSE         from   "./aws/firehose"


let generateAddress = (rinfo: dgram.RemoteInfo): string =>{
    return `udp:${rinfo.address}:${rinfo.port}`;
}
const UDP_SERVER = dgram.createSocket('udp4', function (msg, rinfo) {
    let addr = "udp:" + rinfo.address + ":" + rinfo.port;
});

UDP_SERVER.on('listening', () => {
    _log("UDP SERVER LISTENING ON:", UDP_SERVER.address());
});
UDP_SERVER.on('message', (msg, rinfo) => {
    let utf_msg = msg.toString();
    
    _log(generateAddress(rinfo), "=>", utf_msg);
    FIREHOSE.sendInFiveSeconds(utf_msg);
    if(DEF.WS) DEF.WS.to("dev_room").emit("udp", utf_msg);
});
UDP_SERVER.on('error', (error) => {
    _log("UDP SERVER ERROR:", error.stack);
    UDP_SERVER.close();
});
UDP_SERVER.on("close", ()=>{
    setTimeout(() => {
        _log("UDP SERVER STARTING AGAIN");
        UDP_SERVER_LISTEN();
    }, 5 * 1000);
});

/**
 * Start an UDP server
 * Bind to port 5000 or env.UDP_PORT
 */
let UDP_SERVER_LISTEN = function(){
    let port = parseInt(process.env.UDP_PORT || "5000");
    let host = "0.0.0.0";
    UDP_SERVER.bind(port, host);
    _log(`UDP SERVER STARTED @${host}:${port}`);
}


export default UDP_SERVER_LISTEN;