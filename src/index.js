/* eslint-disable */
import {
  APP_NAME,
  PROTOCOL
} from './utils/config';
import { ws } from "./services/ws";

class VoicePing{
  constructor(loggeduser,socket_url){
    let transport = null ;
    console.log("Initialize complete");
    ws.setup({ host_: socket_url, transport, token: loggeduser.uuid, APP_NAME, PROTOCOL, myid: loggeduser.id });
  }

  connectToWebsocket(){
    console.log('Connect to the websocket');
    ws.connect();
  }

  disConnectWebsocket(){
    console.log('disconnect from the websocket');
    ws.disconnect();

  }

}

export default VoicePing;
