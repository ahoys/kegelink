import DiscordJs from 'discord.js';
import { Client } from 'irc-upd';
import { config } from 'dotenv';
import { p, lp } from 'logscribe';
import { getDataStore } from './db';
import { cmdConnect } from './commands/cmd.connect';
import { cmdExit } from './commands/cmd.exit';
import { cmdFilter } from './commands/cmd.filter';
import { cmdReconnect } from './commands/cmd.reconnect';
import { cmdReset } from './commands/cmd.reset';
import { cmdDisconnect } from './commands/cmd.disconnect';
import { cmdStatus } from './commands/cmd.status';

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
const filtersDb = getDataStore('filters.nedb');
const linksDb = getDataStore('links.nedb');
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
      secure: true,
      selfSigned: true,
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
 * When Discord disconnects.
 * Note that this is not deliberate.
 */
discordClient.on('disconnect', () => {
  p('Discord disconnected.');
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
        authorId === envs.OWNER_ID &&
        discordClient &&
        ircClient &&
        linksDb &&
        filtersDb
      ) {
        // This is an owner given command.
        const cmdIndex = Message?.guild ? 1 : 0;
        const cmd = Message.content?.split(' ')[cmdIndex];
        if (cmd === 'status' && !onGuild) {
          cmdStatus(Message, linksDb, filtersDb);
        } else if (cmd === 'connect' && onGuild) {
          cmdConnect(Message, linksDb);
        } else if (cmd === 'disconnect' && onGuild) {
          cmdDisconnect(Message, linksDb);
        } else if (cmd === 'reconnect' && !onGuild) {
          cmdReconnect(Message, discordClient, ircClient);
        } else if (cmd === 'filter' && !onGuild) {
          cmdFilter(Message, filtersDb);
        } else if (cmd === 'reset' && !onGuild) {
          cmdReset(Message, linksDb, filtersDb);
        } else if (cmd === 'exit' && !onGuild) {
          cmdExit(Message, discordClient, ircClient);
        } else {
          Message.channel.send(
            'Supported commands are:\n\n' +
              'cmd: `status`\nin: `direct message`\nDisplays all active links and filters.\n\n' +
              'cmd: `@bot connect <#irc-channel> <optional password>`\nin: `channel`\nEstablishes a new link. All messages sent to this channel will be sent to IRC and vice versa. You can change the password by re-entering the channel with the new password.\n\n' +
              'cmd: `@bot disconnect`\nin: `channel`\nRemoves all linkings specific to the Discord-channel.\n\n' +
              'cmd: `reconnect`\nin: `direct message`\nReconnects Discord and IRC.\n\n' +
              'cmd: `filter <discord id or irc nickname>`\nin: `direct message`\nMessages by this user are ignored. Discord id or IRC nickname. Re-entering the user will remove the filter.\n\n' +
              'cmd: `reset`\nin: `direct message`\nClears all data. All links and filters will be lost.\n\n' +
              'cmd: `exit`\nin: `direct message`\nGracefully terminates the bot.'
          );
        }
      } else if (onGuild && linksDb && filtersDb) {
        // This message may require re-sending to IRC.
        p('A message that should be read.');
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
