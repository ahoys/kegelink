import { existsSync, readFileSync } from 'fs';
import logscribe, { p } from 'logscribe';
import { resolve } from 'path';

// const { p } = logscribe('General');

/**
 * Read authentication data.
 */
const auth = { id: '', owner: '', token: '' };
const authPath = resolve('./configs/auth.json');
if (existsSync(authPath)) {
  const obj = JSON.parse(readFileSync(authPath, 'utf8'));
  if (obj.token && obj.id && obj.owner) {
    auth.token = obj.token || '';
    auth.id = obj.id || '';
    auth.owner = obj.owner || '';
    logscribe('Authentication', '\x1b[32m').p(
      `Successfully read auth.json for ${auth.id}.`
    );
  } else {
    logscribe('Authentication', '\x1b[31m').lp('Failed to read auth.json.');
    logscribe('Authentication', '\x1b[31m').p(
      'Create configs/auth.json and add token, id and owner into it.'
    );
    process.exit(1);
  }
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

/**
 * Read configs data.
 */
const settings: Isettings = {
  irc_server: '',
  irc_port: '',
  irc_channel: '',
  irc_password: 'Kegelink',
  irc_nickname: '',
  dis_channel: ''
};
const settingsPath = resolve('./configs/settings.json');
if (existsSync(settingsPath)) {
  const obj = JSON.parse(readFileSync(settingsPath, 'utf8'));
  Object.keys(settings).forEach((key) => {
    if (obj[key]) {
      settings[key] = obj[key].toString();
    }
  });
} else {
  logscribe('Settings', '\x1b[31m')
    .lp('configs/settings.json was not found. Using defaults instead.');
}
