/* eslint-disable */
import axios from 'axios';
import { auth } from './authentication'

const HOST = 'https://staging.voiceoverping.net';
const API_VIRSION = 'v2';

export const contacts = {
  getUsers: async () => {
    const users = await auth.sendRequest(HOST + '/api/' + API_VIRSION + '/users', 'get');
    return users;
  },
  getGroups: async () => {
    const groups = await auth.sendRequest(HOST + '/api/' + API_VIRSION + '/channels', 'get');
    return groups;
  },
};
