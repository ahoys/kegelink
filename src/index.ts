import { existsSync, readFileSync } from 'fs';
import logscribe from 'logscribe';
import { resolve } from 'path';

interface Iauth {
  [key:string]: string;
  token: string;
  id: string;
  owner: string;
}

const auth: Iauth = {
  token: '',
  id: '',
  owner: '',
}

/**
 * Read authentication data.
 */
const authPath = resolve('./configs/auth.json');
if (existsSync(authPath)) {
  const obj = JSON.parse(readFileSync(authPath, 'utf8'));
  Object.keys(auth).forEach((key) => {
    if (obj[key]) {
      auth[key] = obj[key];
    }
  });
  logscribe('Authentication', '\x1b[32m').p(
    `Successfully read auth.json for ${auth.id}.`
  );
} else {
  logscribe('Authentication', '\x1b[31m')
    .lp('configs/auth.json was not found. Can\'t continue.');
  process.exit(1);
}

interface Isettings {
  [key:string]: string;
  irc_server: string;
  irc_port: string;
  irc_channel: string;
  irc_password: string;
  irc_nickname: string;
  dis_channel: string;
}

const settings: Isettings = {
  irc_server: '',
  irc_port: '',
  irc_channel: '',
  irc_password: 'Kegelink',
  irc_nickname: '',
  dis_channel: ''
};

/**
 * Read settings data.
 */
const settingsPath = resolve('./configs/settings.json');
if (existsSync(settingsPath)) {
  const obj = JSON.parse(readFileSync(settingsPath, 'utf8'));
  Object.keys(settings).forEach((key) => {
    if (obj[key]) {
      settings[key] = obj[key].toString();
    }
  });
  logscribe('Settings', '\x1b[32m').p(
    `Successfully read settings.json.`
  );
} else {
  logscribe('Settings', '\x1b[31m')
    .lp('configs/settings.json was not found. Using defaults instead.');
}
