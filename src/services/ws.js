/* eslint-disable */

import msgpack from 'msgpack-lite';
import OpusPlayer from '../utils/opus-player';
import { Connection } from './connection';
import { channel_type, message_type, TEST_CONNETION_TIME_OUT, TEST_CONNETION_TIME,PING_CONNETION_TIME_OUT } from '../utils/config';
import {events} from '../sharedPreferences/eventHandlers';

const VERSION = "1.0";
const LIBRARY = `VoicePing ${VERSION}`;

let _routerURI;
let _connection;
let _token;
let _connected = false;
let _messageId;
let _appName = "Undefined";
let _platform = "undefined";
let _pendingPromises = {};
let _loggingEnabled = false;
let _inPacketCount = 0;
let _cache = {};
let _myid;
let _initsend = false;
let _incomingAudioBuffer;
let _sentTestMessage = false;
let _response_test_message = null;
let _test_connection_timer_counter = 0;
let start_timestamp_ping = null;
let receive_timestamp_ping = null;

if (typeof navigator !== 'undefined') {
  _platform = navigator.platform;
}

function cacheMap(func, context) {
  for (const idx in _cache) {
    if (func(_cache[idx], idx, context)) {
      break;
    }
  }
}
const makePromise = function (id) {
  let promise = null;
  if (id) {
    promise = new Promise(((resolve, reject) => {
      // Stored callbacks will be called when the response packet with this Id arrives
      _pendingPromises[id] = {
        resolve: resolve,
        reject: reject,
      };
    }));
  }
  return promise;
};
const sendWithPromise = (pkt, id) => {
  const promise = makePromise(id);
  pkt = msgpack.encode(pkt);
  _connection.sendText(pkt);
  return promise;
};
const getNextMessageId = () => {
  let id = (_messageId !== 0) ? `${_messageId++}` : undefined;
  if (id === "NaN") {
    id = '0';
  }
  return id;
};
const getUserAgent = () => {
  return `${LIBRARY}.`;
};
const makePacket = (what, topic, from, to, payload) => {
  _initsend = false;
  switch (what) {
    case "test-connection":
      _test_connection_timer_counter = 0;
      return { id: getNextMessageId(), data: [channel_type.group, message_type.connection_test, parseInt(from, 10), parseInt(to, 10)] };
      case "sample-connection":
      _test_connection_timer_counter = 0;
      return { id: getNextMessageId(), data: [channel_type.private, message_type.text, parseInt(from, 10), parseInt(to, 10), "This is a test message sent from WEB"] };
    case "connection":
      _initsend = true;
      return { id: getNextMessageId(), data: [channel_type.group, message_type.connection, parseInt(from, 10), parseInt(to, 10)] };
    case "acc":
      return { acc: { id: getNextMessageId(), user: null, scheme: null, secret: null, login: false, tags: null, desc: {}, cred: {} } };
    case "login":
      return { login: { id: getNextMessageId(), scheme: null, secret: null } };
    case "sub":
      return { sub: { id: getNextMessageId(), topic, set: {}, get: {} } };
    case "leave":
      return { leave: { id: getNextMessageId(), topic, unsub: false } };
    case "pub":
      return { pub: { id: getNextMessageId(), topic, params: {}, content: {} } };
    case "get":
      return { get: { id: getNextMessageId(), topic, what: null, desc: {}, sub: {}, data: {} } };
    case "set":
      return { set: { id: getNextMessageId(), topic, desc: {}, sub: {} } };
    case "del":
      return { del: { id: getNextMessageId(), topic } };
    case "note":
      return { note: { topic, what: null, seq: undefined } };
    case "start_talking":
      return { id: getNextMessageId(), data: [channel_type.private, message_type.start_talking, parseInt(from, 10), parseInt(to, 10)] };
    case "stop_talking":
      return { id: getNextMessageId(), data: [channel_type.private, message_type.stop_talking, parseInt(from, 10), parseInt(to, 10)] };
    case "audio":
      return { id: getNextMessageId(), data: [channel_type.private, message_type.audio, parseInt(from, 10), parseInt(to, 10), payload]};
    default:
      throw new Error(`Unknown packet type requested: ${what}`);
  }
};
const log = (str, object) => {
  if (_loggingEnabled) {
    const d = new Date();
    const dateString = `${(`0${d.getUTCHours()}`).slice(-2)}:${
      (`0${d.getUTCMinutes()}`).slice(-2)}:${
      (`0${d.getUTCSeconds()}`).slice(-2)}`;
    if (object) {
      console.log(`---------------- [${dateString}] ${str} ----------------`, object);
    } else {
      console.log(`[${dateString}] ${str}`);
    }
  }
};
const _upDateConnectionStatus = () => {
  let status = Boolean(_response_test_message);
  let time = _test_connection_timer_counter * TEST_CONNETION_TIME / 1000;
  if (status && ws.upDateConnectionStatus) {
    ws.upDateConnectionStatus(status, time);
  }
  if (PING_CONNETION_TIME_OUT <= _test_connection_timer_counter * TEST_CONNETION_TIME && !status) {
    ws.upDateConnectionStatus(status, time);
   // events.handleCreateCustomEvents('onNotReceivePing5sec');
  }
};


const opusPlayer = new OpusPlayer({
  channels: 1,
  sampleRate: 16000
});


const _duplicateogin = () => {
  events.handleCreateCustomEvents('onDuplicateLogin');
}


const dispatchMessage = (evt) => {
  let data = msgpack.decode(new Uint8Array(evt.data));
  console.log(data);
  _inPacketCount++;
  if (ws.onConnect && _initsend) {
    _initsend = false;
    ws.onConnect();
  }

  switch (data[1]) {
    case 1:
      log('start talking');
      console.log('start talking : '+data[1]);
      break;
    case 2:
      log('end talking');
      console.log('end talking : '+data[1]);
      break;
    case 3:
      log('audio received');
      console.log('audio recived : '+data[1]);
      opusPlayer.feed(data[4]);
      break;
    case 4:
      log('connection');
      break;
    case 5:
      log('status');
      break;
    case 6:
      log('ack_start');
      break;
    case 7:
      log('ack_stop');
      break;
    case 8:
      log('ack_start_failed');
      break;
    case 9:
      log('duplicate_login');
      _duplicateogin();
      break;
    case 10:
      log('user_update');
      break;
    case 11:
      log('user_delete');
      break;
    case 12:
      log('channel_update');
      break;
    case 13:
      log('channel_delete');
      break;
    case 14:
      log('trial_expired');
      break;
    case 15:
      log('channel_add_user');
      break;
    case 16:
      log('channel_remove_user');
      break;
    case 17:
      log('text');
      break;
    case 18:
      log('image');
      break;
    case 19:
      log('offline_message');
      break;
    case 20:
      log('delivered_message');
      break;
    case 21:
      log('read_message');
      break;
    case 22:
      log('ack_text');
      break;
    case 26:
      log('connection_ack');
      if (_sentTestMessage) {
        onPingChecker(data);
      }
      break;
    default:
      log(`Unknown message type received`);
  }
};

const handleRegisterToSend = () => {
  const pkt = makePacket("connection", null, _myid, 23637);
  sendWithPromise(pkt.data, pkt.id);
};
const handleDisconnect = (err) => {
  _inPacketCount = 0;
  cacheMap((obj, key) => {
    if (key.lastIndexOf("topic:", 0) === 0) {
      obj._resetSub();
    }
  });

  if (ws.onDisconnect) {
    ws.onDisconnect(err);
  }
};

const onPingChecker = (data) => {
  receive_timestamp_ping = new Date().getTime();
  
  console.log('sent ping time: '+start_timestamp_ping);
  console.log('receive ping time: '+receive_timestamp_ping);
  console.log('difference is: '+(receive_timestamp_ping - start_timestamp_ping));

  if(receive_timestamp_ping - start_timestamp_ping <= 5000){
    _sentTestMessage = false;
    _response_test_message = data;
  }else{
    ws.pingReConnect();
  }
}

export const ws = {
  setup: ({ appname, transport, protocol, host_, token, myid }) => {
    if (appname) {
      _appName = appname;
    } else {
      _appName = "Undefined";
    }

    if (_connection) {
      _connection.disconnect();
    }

    _token = token;
    _routerURI = host_;
    _myid = myid;
    _connection = Connection(transport, true);
    _connection.logger = log;
    _connection.onMessage = dispatchMessage;
    _connection.onDisconnect = handleDisconnect;
    _connection.onOpen = handleRegisterToSend;
    _connection.setup(_routerURI, (protocol || window.location.protocol === 'https:'), _token);
  },
  connect: () => {
    return _connection.connect();
  },
  pingReConnect: () => {
    console.log('5 sec Over .Websocket Disconnected and Retry initiated');
    return _connection.pingNotReceived();
  },
  disconnect: () => {
    if(_connection.isConnected()){
      console.log('disconnected');
      _initsend = true;
      if (_connection) {
        _connection.disconnect();
      }
    }
  },
  setWS: (data) => {
    console.log(data);
    _token = data.uuid;
    _routerURI = data.socket_url;
  },
  enableLogging: (enabled) => {
    _loggingEnabled = enabled;
  },
  isConnected: () => {
    return _connected;
  },
  doConnectionTest: () => {
    start_timestamp_ping = new Date().getTime();
    sessionStorage.setItem('start_timestamp_ping', start_timestamp_ping);
    const pkt = makePacket("test-connection", null, _myid, 23637);
    sendWithPromise(pkt.data, pkt.id);
    _sentTestMessage = true;
    _response_test_message = null;
    const _test_connection_timer = setInterval(
      () => {
        _test_connection_timer_counter++;
        _upDateConnectionStatus();
        if (PING_CONNETION_TIME_OUT <= _test_connection_timer_counter * TEST_CONNETION_TIME || Boolean(_response_test_message)) {
          window.clearTimeout(_test_connection_timer);
        }
      }, TEST_CONNETION_TIME);
  },
  sendSampleMessage: () => {
    const pkt = makePacket("sample-connection", null, _myid, 23676);
    sendWithPromise(pkt.data, pkt.id);
    _sentTestMessage = true;
    _response_test_message = null;
    const _test_connection_timer = setInterval(
      () => {
        _test_connection_timer_counter++;
        _upDateConnectionStatus();
        if (TEST_CONNETION_TIME_OUT <= _test_connection_timer_counter * TEST_CONNETION_TIME || Boolean(_response_test_message)) {
          window.clearTimeout(_test_connection_timer);
        }
      }, TEST_CONNETION_TIME);
  },
  sendAudioMessage: (data) => {
      const pkt = makePacket(data.type, null, _myid, 23676, data.payload);
      console.log(pkt);
      sendWithPromise(pkt.data, pkt.id);
  },
  receiveAudioMessage: null,
  onDisconnect: null,
  onConnect: null,
  upDateConnectionStatus: null,
};
