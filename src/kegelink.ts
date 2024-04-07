import DiscordJs from 'discord.js';
import { Client } from 'irc-upd';
import { config } from 'dotenv';
import { p } from 'logscribe';
import { getDataStore } from './db';
import { cmdConnect } from './commands/cmd.connect';
import { cmdExit } from './commands/cmd.exit';
import { cmdFilter } from './commands/cmd.filter';
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
let previousActionChannelId = '';

// --- IRC ---

/**
 * Handles IRC message events.
 * @param nick Who said it.
 * @param to To what IRC-channel.
 * @param text What was said.
 */
const onIRCMessage = (nick: string, to: string, text: string) => {
  try {
    if (
      discordClient &&
      filtersDb &&
      linksDb &&
      typeof nick === 'string' &&
      typeof to === 'string' &&
      typeof text === 'string'
    ) {
      // Filtered people may not speak.
      filtersDb.findOne(
        { userId: nick.toLowerCase() },
        (err: Error | null, doc: TFiltersDoc) => {
          if (err) {
            p(err);
          } else if (!doc) {
            linksDb.findOne(
              { ircChannel: to },
              (err: Error | null, doc: TLinksDoc) => {
                if (err) {
                  p(err);
                } else if (doc) {
                  const channel: any = discordClient.channels.cache.get(
                    doc.discordChannel
                  );
                  if (channel && channel.type === 'text' && channel.send) {
                    channel.send(`<${nick}> ${text}`);
                  }
                }
              }
            );
          }
        }
      );
    }
  } catch (err) {
    p(err);
  }
};

/**
 * Handles IRC error event.
 */
const onIRCError = (errorMessage: { [key: string]: string }) => {
  try {
    p('IRC related error: ', JSON.stringify(errorMessage));
    if (
      discordClient &&
      typeof errorMessage === 'object' &&
      previousActionChannelId !== ''
    ) {
      // Invalid IRC-channel password.
      if (errorMessage.command === 'err_badchannelkey') {
        const channel: any = discordClient.channels.cache.get(
          previousActionChannelId
        );
        if (channel && channel.type === 'text' && channel.send) {
          channel
            .send('Invalid IRC-channel key given (or missing).')
            .catch((err: Error) => p(err));
        }
      }
    }
  } catch (err) {
    p(err);
  }
};

/**
 * Establishes the IRC-connection.
 */
const logInIRC = () => {
  try {
    p('Creating a new IRC client...');
    ircClient = new Client(envs.IRC_SERVER, envs.IRC_NICKNAME, {
      userName: envs.IRC_USERNAME,
      realName: envs.IRC_REAL_NAME,
      channels: [],
      port: Number(envs.IRC_PORT) ?? 6667,
      password: envs.IRC_PASSWORD ?? null,
      autoConnect: false,
      autoRejoin: true,
      autoRenick: true,
      secure: envs.IRC_SECURE === 'true',
      selfSigned: envs.IRC_SELF_SIGNED === 'true',
      encoding: envs.IRC_ENCODING,
      retryCount: null,
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
      // Join to requested IRC-channels.
      linksDb?.find({}, (err: Error, docs: TLinksDocs) => {
        if (err) {
          p(err);
        } else if (docs) {
          const channels = Object.values(docs).map((d) =>
            d.ircChannelPw ? `${d.ircChannel} ${d.ircChannelPw}` : d.ircChannel
          );
          if (channels.length) {
            p(`Joining to ${channels.length} channels...`);
            channels.forEach((ch) =>
              ircClient?.join(ch, () => p(`Joined ${ch}.`))
            );
          }
        }
      });
    });
  } catch (err) {
    p(err);
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
 * A new Discord message read.
 * 1. Send message to linked IRC-channels.
 * 2. If the message contains a command, execute it.
 */
discordClient.on('message', (Message) => {
  try {
    // Make sure not to repeat your own messages (bot's messages).
    const authorId = Message?.author?.id; // Author of the Discord message.
    const botId = discordClient?.user?.id; // Discord id of this bot.
    const onGuild = !!Message?.guild; // Whether this message was sent to a guild (not dm).
    if (Message && authorId && botId && authorId !== botId) {
      // Is this a message to be sent or a command to be
      // executed?
      if (
        Message &&
        (Message.mentions?.has(botId) || !onGuild) &&
        !Message.mentions?.everyone &&
        authorId === envs.OWNER_ID &&
        discordClient &&
        ircClient &&
        linksDb &&
        filtersDb
      ) {
        // This is an owner given command.
        previousActionChannelId = Message.channel.id;
        const cmdIndex = Message?.guild ? 1 : 0;
        const cmd = Message.cleanContent?.split(' ')[cmdIndex];
        if (cmd === 'status' && !onGuild) {
          cmdStatus(Message, linksDb, filtersDb);
        } else if (cmd === 'connect' && onGuild) {
          cmdConnect(Message, linksDb, ircClient);
        } else if (cmd === 'disconnect' && onGuild) {
          cmdDisconnect(Message, linksDb, ircClient);
        } else if (cmd === 'filter' && !onGuild) {
          cmdFilter(Message, filtersDb);
        } else if (cmd === 'exit' && !onGuild) {
          cmdExit(Message, discordClient, ircClient);
        } else {
          Message.channel
            .send(
              'Supported commands are:\n\n' +
                'cmd: `status`\nin: `direct message`\nDisplays all active links and filters.\n\n' +
                'cmd: `@bot connect <#irc-channel> <optional password>`\nin: `channel`\nEstablishes a new link. All messages sent to this channel will be sent to IRC and vice versa. You can change the password by re-entering the channel with the new password.\n\n' +
                'cmd: `@bot disconnect`\nin: `channel`\nRemoves all linkings specific to the Discord-channel.\n\n' +
                'cmd: `filter <discord id or irc nickname>`\nin: `direct message`\nMessages by this user are ignored. Discord id or IRC nickname. Re-entering the user will remove the filter.\n\n' +
                'cmd: `exit`\nin: `direct message`\nGracefully terminates the bot.'
            )
            .catch((err) => p(err));
        }
      } else if (Message && onGuild && linksDb && filtersDb) {
        // A new message read in Discord. Pass it to IRC.
        // Make sure this author isn't filtered.
        filtersDb.findOne(
          { userId: Message.author?.id },
          (err: Error | null, doc: TFiltersDoc) => {
            if (err) {
              p(err);
            } else if (!doc) {
              linksDb.findOne(
                { discordChannel: Message.channel.id },
                (err: Error | null, doc: TLinksDoc) => {
                  if (err) {
                    p(err);
                  } else if (
                    doc &&
                    typeof doc.ircChannel === 'string' &&
                    doc.ircChannel.length
                  ) {
                    // Format the message.
                    const content = Message.cleanContent;
                    const authorTag = `<${Message.author.username}> `;
                    // Send to IRC.
                    if (content.trim().length) {
                      ircClient?.say(doc.ircChannel, `${authorTag}${content}`);
                    }
                    // Send attachments to IRC.
                    Message.attachments.array().forEach((attachment) => {
                      if (attachment && attachment.url) {
                        ircClient?.say(
                          doc.ircChannel,
                          `${authorTag}${attachment.url}`
                        );
                      }
                    });
                  }
                }
              );
            }
          }
        );
      }
    }
  } catch (err) {
    p(err);
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
    p(err);
  }
});

// Initialize the connection.
if (linksDb && filtersDb) {
  login();
}
