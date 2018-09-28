/* eslint-disable */
// import msgpack from 'msgpack-lite';
import { AccessMode } from './accessmode';
import {shared} from '../sharedPreferences/shared';
import {events} from '../sharedPreferences/eventHandlers';
import ws from "./ws";
let _reconnect_timer = null;
let timerCount= 0;
let socketTimeout= null;
var pingArr=[];
var pingInterval;

function pingMessage(arr){
  console.log("fist minute's ping =", arr[0]," ,", "second minute's ping =", arr[1])
  arr.splice(0,2);
}

function pingRecieve(arr){
  let i=0;
  setInterval(()=>{
    arr.push(i);
    i++;
  }, 60000)
}

 
export const jsonParseHelper = (key, val) => {
  if (key === 'ts' && typeof val === 'string' &&
    val.length >= 20 && val.length <= 24) {
    const date = new Date(val);
    if (date) {
      return date;
    }
  } else if (key === 'acs' && typeof val === 'object') {
    return new AccessMode(val);
  }
  return val;
};

const rfc3339DateString = (d) => {
  if (!d || d.getTime() === 0) {
    return undefined;
  }

  function pad(val, sp) {
    sp = sp || 2;
    return '0'.repeat(sp - (`${val}`).length) + val;
  }
  const millis = d.getUTCMilliseconds();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())
    }T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())
    }${millis ? `.${pad(millis, 3)}` : ''}Z`;
};
const jsonBuildHelper = (key, val) => {
  if (val instanceof Date) {
    val = rfc3339DateString(val);
  } else if (val === undefined || val === null || val === false ||
    (Array.isArray(val) && val.length === 0) ||
    ((typeof val === "object") && (Object.keys(val).length === 0))) {
    return undefined;
  }
  return val;
};

export const jsonLoggerHelper = (key, val) => {
  if (typeof val === 'string' && val.length > 128) {
    return `<${val.length}, bytes: ${val.substring(0, 12)}...${val.substring(val.length - 12)}>`;
  }
  return jsonBuildHelper(key, val);
};
const xdreq = () => {
  let xdreq = null;
  if ('withCredentials' in new XMLHttpRequest()) {
    xdreq = new XMLHttpRequest();
  } else if (typeof XDomainRequest !== "undefined") {
    xdreq = new XDomainRequest();
  } else {
    throw new Error("browser not supported");
  }
  return xdreq;
};

const makeBaseUrl = (host, protocol, token) => {
  let url = null;
  if (host.search("http") !== -1 || host.search("https") !== -1 || host.search("ws") !== -1 || host.search("wss") !== -1) {
    url = host;
    url += `?token=${token}`;
  } else {
    if (protocol === 'http' || protocol === 'https' || protocol === 'ws' || protocol === 'wss') {
      url = `${protocol}://`;
      url += host;
      if (url.charAt(url.length - 1) !== '/') {
        url += '/';
      }
      url += `v0/channels`;
      if (protocol === "http" || protocol === "https") {
        url += "/lp";
      }
      url += `?token=${token}`;
    }
  }
  return url;
};

export const Connection = (transport_, autoreconnect_) => {
  let instance;
  let host;
  let secure;
  let token;
  const autoreconnect = autoreconnect_;
  const _TIME_OUT = 5000;
  const _RECONNECT_MAX_COUNT = 10;
  let _reconnect_iteration = 0;
  let _reconnect_closed = false;

  const log = (text, object) => {
    if (instance.logger) {
      instance.logger(text, object);
    }
  };

  const reconnect=() =>{
    clearInterval(_reconnect_timer);
    var count= 0;
    const timeout= _TIME_OUT;
    _reconnect_timer= setInterval(() => {
     if(localStorage.getItem("authorized_user")){
      _reconnect_iteration +=  1;
      console.log("current iteration after 5 sec=", _reconnect_iteration);
      if(socketTimeout){
        count+=10
        socketTimeout = null;
      }else{
        count+=5
      }
       //count+=5;
       if(count % 15== 0){
         timerCount ++;
         socketTimeout= false;
          instance.connect().catch( () => {});
       }
     }
     else{
       clearInterval(_reconnect_timer);
     }
    }, timeout)
  }

  const init_ws = () => {
    let _socket = null;
    var status = 0;
    var flag = 0;
    return {
      connect(host_) {
        if (_socket && _socket.readyState === 1) {
          return Promise.resolve();
        }
        if (host_) {
          host = host_;
        }
        return new Promise(((resolve, reject) => {
          token= token+ sessionStorage.getItem("tabId");
          const url = makeBaseUrl(host, secure ? "wss" : "ws", token);
           clearInterval(_reconnect_timer);
           const conn = new WebSocket(url);
           conn.binaryType = 'arraybuffer';
          
          var timer = setTimeout(function(){
            new Promise((_, reject) => reject(new Error('Timeout Connecton of Websocket'))).
            catch(error => { console.log('caught', error.message); });
           // shared.socketTimeout();
            socketTimeout= true;
            events.handleCreateCustomEvents('onhandleTimeoutWebsocket');
            status = 1;
            //conn.onclose();
            _socket.close();
          }, 5000);

          conn.onopen = () => {
            console.log("Connected to the " + url);
            sessionStorage.setItem('onWebsocketConnectedTimestamp', new Date().getTime());
            sessionStorage.removeItem('start_timestamp_ping');
            pingRecieve(pingArr);
                pingInterval= setInterval(()=> {
                  pingMessage(pingArr)
                }, 180000)
            clearInterval(_reconnect_timer);
            socketTimeout= null;
            events.handleCreateCustomEvents('onhandleSuccessWebsocket')
            _reconnect_closed = false;
            if (instance.onOpen) {
              instance.onOpen();
            }
            clearTimeout(timer);
            resolve();
            if (autoreconnect) {
              clearInterval(_reconnect_timer);
              _reconnect_timer = null;
              _reconnect_iteration = 0;
            }
          };

          conn.onclose = (evt) => {
            console.log("Closed connection", evt);
            sessionStorage.removeItem('onWebsocketConnectedTimestamp');
            clearInterval(pingInterval);
            _socket = null;
            if (instance.onDisconnect) {
              instance.onDisconnect(null);
            }
            if (!_reconnect_closed && autoreconnect) {
                    reconnect();
            }
          };

          conn.onerror = (err) => {
            console.log('Connection Error', err);
            clearTimeout(timer);
            if(status != 1){
              flag = 1;
            }
            console.log('xx is '+sessionStorage.getItem('wifiInfo'));
            if(shared.isLoggedIn && (flag == 1) && sessionStorage.getItem('wifiInfo') != 2 ){
              if(err.data === undefined && err.currentTarget.readyState === 3){
                events.handleCreateCustomEvents('onhandleAuthFailureWebsocket')
              }
            }
            reject(err);
          };
          conn.onmessage = (evt) => {
            if (instance.onMessage) {
              instance.onMessage(evt);
            }
          };
          _socket = conn;
        })).catch((err)=>{
          //do nothing
        })
      },

      disconnect() {
        if (_socket) {
          _reconnect_closed = true;
          _socket.close();
        }
        _socket = null;
      },
      pingNotReceived(){
        if (_socket) {
            _socket.close();
          }
          _socket = null;
      },
      sendText(msg) {
        return new Promise(((resolve, reject) => {
          if (_socket && (_socket.readyState === _socket.OPEN)) {
            _socket.send(msg);
            resolve();
          } else {
            let err = { error: "Websocket is not connected" };
            reject(err);
          }
        }));
      },
      isConnected() {
        return (_socket && (_socket.readyState === 1));
      },
    };
  };
  const init_lp = () => {
    // eslint-disable-next-line
    const XDR_UNSENT = 0;//  Client has been created. open() not called yet.
    // eslint-disable-next-line
    const XDR_OPENED = 1; //  open() has been called.
    // eslint-disable-next-line
    const XDR_HEADERS_RECEIVED = 2; // send() has been called, and headers and status are available.
    // eslint-disable-next-line
    const XDR_LOADING = 3; // Downloading; responseText holds partial data.
    // eslint-disable-next-line
    const XDR_DONE = 4; // The operation is complete.
    // Fully composed endpoint URL, with API key & SID
    let _lpURL = null;

    let _poller = null;
    let _sender = null;
    const lp_sender = (url_) => {
      const sender = xdreq();
      sender.onreadystatechange = () => {
        if (sender.readyState === XDR_DONE && sender.status >= 400) {
          // Some sort of error response
          throw new Error(`LP sender failed, ${sender.status}`);
        }
      };

      sender.open('POST', url_, true);
      return sender;
    };
    const lp_poller = (url_, resolve, reject) => {
      let poller = xdreq();

      poller.onreadystatechange = () => {

        if (poller.readyState === XDR_DONE) {
          if (poller.status === 201) { // 201 === HTTP.Created, get SID
            const pkt = JSON.parse(poller.responseText, jsonParseHelper);
            // eslint-disable-next-line
            const text = poller.responseText;

            _lpURL = `${url_}&sid=${pkt.ctrl.params.sid}`;
            poller = lp_poller(_lpURL);
            poller.send(null);
            if (instance.onOpen) {
              instance.onOpen();
            }

            if (resolve) {
              resolve();
            }
          } else if (poller.status === 200) { // 200 = HTTP.OK
            if (instance.onMessage) {
              instance.onMessage(poller.responseText);
            }
            poller = lp_poller(_lpURL);
            poller.send(null);
          } else {
            // Don't throw an error here, gracefully handle server errors
            if (reject) {
              reject(poller.responseText);
            }
            if (instance.onMessage) {
              instance.onMessage(poller.responseText);
            }
            if (instance.onDisconnect) {
              instance.onDisconnect(new Error(`${poller.status} ${poller.responseText}`));
            }
          }
        }
      };
      poller.open('GET', url_, true);
      return poller;
    };
    return {
      connect(host_) {
        if (host_) {
          host = host_;
        }

        return new Promise(((resolve, reject) => {
          const url = makeBaseUrl(host, secure ? "https" : "http", token);
          log("Connecting to: " + url);
          _poller = lp_poller(url, resolve, reject);
          _poller.send(null);
        })).catch(() => {
          // Do nothing
        });
      },
      disconnect() {
        if (_sender) {
          _sender.abort();
          _sender = null;
        }
        if (_poller) {
          _poller.abort();
          _poller = null;
        }
        if (instance.onDisconnect) {
          instance.onDisconnect(null);
        }
        // Ensure it's reconstructed
        _lpURL = null;
      },
      sendText(msg) {
        _sender = lp_sender(_lpURL);
        if (_sender && (_sender.readyState === 1)) { // 1 === OPENED
          _sender.send(msg);
        } else {
          throw new Error("Long poller failed to connect");
        }
      },
      isConnected() {
        return (_poller && true);
      },
    };
  };

  if (transport_ === "lp") {
    instance = init_lp();
  } else if (transport_ === "ws") {
    instance = init_ws();
  } else {
    if (!window.WebSocket) {
      instance = init_lp();
    } else {
      instance = init_ws();
    }
  }

  instance.setup = (host_, secure_, token_) => {
    host = host_;
    secure = secure_;
    token = token_;
  };
  instance.onMessage = undefined;
  instance.onDisconnect = undefined;
  instance.onOpen = undefined;
  instance.logger = undefined;
  return instance;
};
