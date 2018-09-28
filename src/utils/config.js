/* eslint-disable */

export const APP_NAME = "VoicePing/0.15";
export const KNOWN_HOSTS = { hosted: "api.tinode.co1", local: "api.tinode.co" };
// export const KNOWN_HOSTS = { hosted: "api.tinode.co1", local: "2359media-router.voiceoverping.net" };
export const DEFAULT_HOST = KNOWN_HOSTS.hosted;
export const PROTOCOL = 'wss'; // Default value must be false or null
export const POP_SOUND = new Audio('audio/msg.mp3');
export const DEL_CHAR = "\u2421";
export const API_KEY = "AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K"; // AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K
export const KEYPRESS_DELAY = 3 * 1000;
export const RECEIVED_DELAY = 500;
export const READ_DELAY = 1000;
export const MIN_TAG_LENGTH = 4;
export const MEDIA_BREAKPOINT = 640;
export const REM_SIZE = 13;
export const AVATAR_SIZE = 128;
export const MESSAGES_PAGE = 24;
export const MAX_ATTACHMENT_SIZE = 1 << 17;
export const MAX_IMAGE_SIZE = 768;
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/gif', 'image/png', 'image/svg', 'image/svg+xml'];
export const MIME_EXTENSIONS = ['jpg', 'gif', 'png', 'svg', 'svg'];
export const Received = { UNDEF: -2, SENDING: -1, SERVER: 0, CLIENT: 1, READ: 2 };
export const TEST_CONNETION_TIME_OUT = 5000;
export const PING_CONNETION_TIME_OUT = 1400;
export const TEST_CONNETION_TIME = 1;

export const channel_type = { group: 0, private: 1 };
export const message_type = {
  start_talking: 1,
  stop_talking: 2,
  audio: 3,
  connection: 4,
  status: 5,
  ack_start: 6, //  (only sent from the server side)
  ack_stop: 7, //  (only sent from the server side)
  ack_start_failed: 8, //  (only sent from the server side)
  duplicate_login: 9, //  (only sent from the server side)
  user_update: 10, //  (only sent from the server side)
  user_delete: 11, //  (only sent from the server side)
  channel_update: 12, //  (only sent from the server side)
  channel_delete: 13, //  (only sent from the server side)
  trial_expired: 14, //  (only sent from the server side)
  channel_add_user: 15, //  (internal usage on the server side)
  channel_remove_user: 16, //  (internal usage on the server side)
  text: 17,
  image: 18,
  offline_message: 19,
  delivered_message: 20,
  read_message: 21,
  ack_text: 22, // (only sent from the server side)
  connection_test: 25,
  connection_ack: 26
};
