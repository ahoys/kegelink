import DiscordJs from 'discord.js';
import { Client } from 'irc-upd';
import { config } from 'dotenv';
import { p, lp } from 'logscribe';
import { cmdConnect } from './commands/cmd.connect';
import { cmdExit } from './commands/cmd.exit';
import { cmdFilter } from './commands/cmd.filter';
import { cmdReconnect } from './commands/cmd.reconnect';
import { cmdRemoveChannel } from './commands/cmd.removeChannel';
import { cmdRemoveGuild } from './commands/cmd.removeGuild';
import { cmdStatus } from './commands/cmd.status';
import { getDataStore } from './db';

config({ path: __dirname + '/.env' });

// Make sure all environment variables are present.
const envs: { [key: string]: string } = {};
const mandatoryEnvs = [
  'APP_TOKEN',
  'APP_ID',
  'OWNER_ID',
  'IRC_SERVER',
  'IRC_PORT',
  'IRC_PASSWORD',
  'IRC_NICKNAME',
  'IRC_USERNAME',
  'IRC_REAL_NAME',
  'IRC_ENCODING',
  'IRC_RETRY_DELAY',
];

mandatoryEnvs.forEach((mEnv) => {
  if (
    typeof process.env[mEnv] === 'string' &&
    process.env[mEnv]?.trim() !== ''
  ) {
    envs[mEnv] = process.env[mEnv] ?? '';
  } else {
    throw new Error(`Environment variable missing: ${mEnv}.`);
  }
});

p(envs);

// Let's go and initialize a new Discord client.
const filtersIrcDb = getDataStore('filters-irc.nedb');
const filtersDiscordDb = getDataStore('filters-discord.nedb');
const guildsDb = getDataStore('guilds.nedb');
const channelsDb = getDataStore('channels.nedb');
const discordClient = new DiscordJs.Client();
let ircClient: undefined | Client;

// --- IRC ---
const onIRCMessage = (nick: string, to: string, text: string) => {
  try {
    p('New IRC message:', nick, to);
  } catch (err) {
    lp(err);
  }
};

const onIRCError = (message: string) => {
  try {
    lp('IRC returned an error message:', message);
  } catch (err) {
    lp(err);
  }
};

const logInIRC = () => {
  try {
    p('Creating a new IRC client...');
    ircClient = new Client(envs.IRC_SERVER, envs.IRC_NICKNAME, {
      userName: envs.IRC_USERNAME,
      realName: envs.IRC_REAL_NAME,
      channels: [],
      port: Number(envs.IRC_PORT) ?? 6667,
      password: envs.IRC_PASSWORD,
      autoConnect: false,
      autoRejoin: true,
      autoRenick: true,
      encoding: envs.IRC_ENCODING,
      retryDelay: Number(envs.IRC_RETRY_DELAY) ?? 10240,
      floodProtection: true,
      floodProtectionDelay: 1024,
    });
    ircClient.removeAllListeners('message');
    ircClient.removeAllListeners('error');
    p('Connecting to IRC...');
    ircClient.connect(null, () => {
      // Event: Registered.
      p('Successfully connected to IRC!');
      ircClient?.addListener('message', onIRCMessage);
      ircClient?.addListener('error', onIRCError);
    });
  } catch (err) {
    lp(err);
  }
};

// --- DISCORD ---

/**
 * Logs into Discord.
 */
let reconnect: any = null;
const login = () => {
  p('Connecting to Discord...');
  discordClient.login(envs.APP_TOKEN).catch((err) => {
    p(err);
    console.error('Failed to login.');
    clearTimeout(reconnect);
    reconnect = setTimeout(() => {
      login();
    }, 10240);
  });
};

/**
 * The bot is ready to function.
 * Inform the user about it.
 */
discordClient.on('ready', () => {
  p(
    'Successfully connected to Discord!\n' +
      `Username: ${discordClient.user?.username}\n` +
      `Id: ${discordClient.user?.id}\n` +
      `Verified: ${discordClient.user?.verified}`
  );
  if (!ircClient) {
    logInIRC();
  }
});

/**
 * A new message read.
 * Messages are used to control the bot.
 */
discordClient.on('message', (Message) => {
  try {
    // Don't repeat your own messages!
    const authorId = Message?.author?.id;
    const botId = discordClient?.user?.id;
    const onGuild = !!Message?.guild;
    if (Message && authorId && botId && authorId !== botId) {
      // Is this a message to be sent or a command to be
      // executed?
      if (
        (Message.mentions?.has(botId) || !onGuild) &&
        authorId === envs.OWNER_ID
      ) {
        const cmdIndex = Message?.guild ? 1 : 0;
        const cmd = Message.content?.split(' ')[cmdIndex];
        if (cmd === 'connect' && onGuild) {
          cmdConnect(Message);
        } else if (cmd === 'status' && onGuild) {
          cmdStatus(Message);
        } else if (cmd === 'remove_channel' && onGuild) {
          cmdRemoveChannel(Message);
        } else if (cmd === 'remove_guild' && onGuild) {
          cmdRemoveGuild(Message);
        } else if (cmd === 'filter_irc' && filtersIrcDb) {
          cmdFilter(Message, filtersIrcDb);
        } else if (cmd === 'filter_discord' && filtersDiscordDb) {
          cmdFilter(Message, filtersDiscordDb);
        } else if (cmd === 'reconnect') {
          cmdReconnect(Message);
        } else if (cmd === 'exit') {
          cmdExit(Message, discordClient);
        } else {
          p('Invalid command given.');
          Message.channel.send(
            'Supported commands are:\n\n' +
              '`connect <#irc-channel> <optional password>`\nEstablishes a new link. All messages sent to this channel will be sent to IRC and vice versa. You can change the password by re-entering the channel with the new password.\n\n' +
              '`status`\nDisplays all active links and filters of the guild.\n\n' +
              '`remove_channel`\nRemoves all channel specific links.\n\n' +
              '`remove_guild`\nRemoves all guild specific links.\n\n' +
              '`filter_irc <name>`\nFilters messages of an IRC user. Re-entering the name removes the filter.\n\n' +
              '`filter_discord <id>`\nFilters messages of a Discord user. Re-entering the id removes the filter.\n\n' +
              '`reconnect`\nReconnects Discord and IRC.\n\n' +
              '`exit`\nTerminates the bot.'
          );
        }
      }
    }
  } catch (err) {
    lp(err);
  }
});

/**
 * Something went wrong with Discord.
 * Probably Internet related issues.
 */
discordClient.on('error', () => {
  try {
    login();
  } catch (err) {
    lp(err);
  }
});

login();
