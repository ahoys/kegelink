const fs = require('fs');
const { setLogDirPath } = require('logscribe');
const { lp, p } = require('logscribe').default('General');
const path = require('path');

setLogDirPath('./');

// These are the default auth configs.
const auth = {
  token: '',
  id: '',
  owner: '',
};

/**
 * Read custom authentication data.
 */
const authPath = path.resolve('./configs/auth.json');
if (fs.existsSync(authPath)) {
  const obj = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  Object.keys(auth).forEach(key => {
    if (obj[key] && typeof obj[key] === typeof auth[key]) {
      auth[key] = obj[key];
    }
  });
  p(`Successfully read auth.json for ${auth.id}.`);
} else {
  p("configs/auth.json was not found. Can't continue.");
  process.exit(1);
}

// These are the default settings.
const settings = {
  irc_server: '127.0.0.1',
  irc_port: '6667',
  irc_password: 'password', // For the server, not channel.
  irc_nickname: 'Kegelink',
  irc_userName: 'Kegelink',
  irc_realName: 'Ketsune "Gerald" Link',
  irc_encoding: 'utf-8',
  links: [], // Mapping of connected channels.
  filteredIRCnicknames: [],
};

/**
 * Read custom settings data.
 */
const settingsPath = path.resolve('./configs/settings.json');
if (fs.existsSync(settingsPath)) {
  const obj = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  Object.keys(settings).forEach(key => {
    if (obj[key] && typeof obj[key] === typeof settings[key]) {
      settings[key] = obj[key];
    }
  });
  p('Successfully read settings.json.');
} else {
  p('configs/settings.json was not found. Using defaults instead.');
}

/**
 * Shallowly validate channel links.
 */
const tempLinks = [];
settings.links.forEach(link => {
  if (
    typeof link.dis_guild === 'string' &&
    link.dis_guild.trim() !== '' &&
    typeof link.dis_channel === 'string' &&
    link.dis_channel.trim() !== '' &&
    typeof link.irc_channel === 'string' &&
    link.irc_channel.trim() !== ''
  ) {
    // At least the syntax is good.
    link.irc_channel_pw =
      typeof link.irc_channel_pw === 'string' ? link.irc_channel_pw : '';
    tempLinks.push(link);
  }
});
settings.links = tempLinks;

// There must be links for the bot to use.
if (!settings.links[0]) {
  lp('No links added to configs/settings.json. The bot has no purpose.');
  process.exit(1);
}

/**
 * Discord.js & Irc
 */
const Discord = require('discord.js');
const Irc = require('irc-upd');
let discordClient = new Discord.Client(),
  links,
  timeout,
  ircClient,
  ircErrorBalance;

/**
 * Initializes the base variables and logs in.
 */
const initialize = () => {
  links = [];
  timeout = undefined;
  ircClient = undefined;
  ircErrorBalance = 0;
  // Map Discord events.
  discordClient.on('ready', handleDiscordReady);
  discordClient.on('message', Message => handleDiscordMessage(Message));
  discordClient.on('error', handleDiscordError);
  // IRC will connect when Discord is ready.
  logInDiscord();
};

// DISCORD --------------------------------------------------------------------

/**
 * Logs in to Discord.
 * The communication process starts from here.
 */
const logInDiscord = () => {
  try {
    p('Logging in...');
    discordClient.login(auth.token).catch(() => {
      lp('Failed to log-in Discord!');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logInDiscord();
      }, 10240);
    });
  } catch (e) {
    lp('logInDiscord failed.', e);
  }
};

/**
 * Finds the actual Guilds and Channels and maps them.
 * Later on these maps are used to route the communication to
 * the correct channels.
 * @param {*} Client
 */
const mapLinks = Client => {
  try {
    settings.links.forEach(link => {
      const Guild = Client.guilds.find(g => g.id === link.dis_guild);
      if (Guild) {
        const Channel = Guild.channels.find(c => c.id === link.dis_channel);
        if (Channel) {
          // Discord side of the link is validated.
          // Store the Discord.js entities.
          links.push({
            Guild,
            Channel,
            irc_channel: link.irc_channel,
            irc_channel_pw: link.irc_channel_pw,
          });
        }
      }
    });
  } catch (e) {
    lp('mapLinks failed.', e);
  }
};

/**
 * Makes sure the given guilds and channels exist
 * and if so, then triggers the IRC-connection.
 */
const handleDiscordReady = () => {
  try {
    p('Discord connection is ready.');
    mapLinks(discordClient);
    if (links[0] && !ircClient) {
      // Discord is ready. Log-in to IRC.
      logInIRC();
    } else if (ircClient) {
      p('No need to log-in to IRC as ircClient already exists.');
    } else {
      p('No valid Discord channels. The bot has no purpose.');
      process.exit(1);
    }
  } catch (e) {
    lp('on.ready failed.', e);
  }
};

/**
 * Receives a Discord message.
 * Validates it and asks to send it to IRC.
 */
const handleDiscordMessage = Message => {
  try {
    const { guild, author, channel } = Message;
    // Don't repeat your own messages!
    if (author && author.id !== discordClient.user.id) {
      if (guild && channel) {
        // We are only interested in validated links.
        const link = links.find(
          l => l.Guild.id === guild.id && l.Channel.id === channel.id
        );
        if (link) {
          // Success!
          ircClient.say(
            link.irc_channel,
            translateDiscordMessageToIRC(Message)
          );
          if (Message.isMentioned(discordClient.user)) {
            handleBotMentions(link, Message);
          }
        }
      } else if (!guild && channel && author.id === auth.owner) {
        // DM or GroupDM, owner is speaking.
        handleOwnerActions(Message);
      }
    }
  } catch (e) {
    lp('on.message failed.', e);
  }
};

/**
 * Handles discord errors.
 */
const handleDiscordError = () => {
  try {
    // This usually happens when the connection is lost.
    // The only way to recover is to re-login asap.
    logInDiscord();
  } catch (e) {
    lp('on.error failed.', e);
  }
};

/**
 * Translates Discord messages to more suitable for IRC.
 * @param {object} Message - Discord.js Message object.
 */
const translateDiscordMessageToIRC = Message => {
  try {
    const { author, content, attachments, mentions } = Message;
    let str = '';
    if (content.startsWith('_') && content.endsWith('_')) {
      // A /me message.
      const ncontent = content.slice(1, content.length - 1);
      str = `${author.username} ${ncontent}`;
    } else if (content.startsWith('||') && content.endsWith('||')) {
      // A spoiler message.
      const ncontent = content.slice(2, content.length - 2);
      str = `<${author.username}> \1,1${ncontent}\`;
    } else {
      // A regular message.
      str = `<${author.username}> ${content}`;
    }
    // Handle new lines.
    str = str.replace(/\n\n+/g, '\n').replace(/\r?\n/g, `\n<${author.username}> `);
    // Translate attachments to links.
    if (attachments.size) {
      attachments.array().forEach((att, i) => {
        const prefix = content[0] ? ' ' : '';
        const filename =
          att.filename === 'unknown.png' ? 'PrintScreen' : att.filename;
        const filesize = att.filesize % 1000;
        str +=
          i === 0
            ? `${prefix}[${filename}][${filesize}KB] ${att.url}`
            : `, [${filename}][${filesize}KB] ${att.url}`;
      });
    }
    // Translate <@123...> user mentions to usernames.
    if (mentions && mentions.users && mentions.users.size) {
      mentions.users.array().forEach(User => {
        str = str.replace(`<@${User.id}>`, `@${User.username}`);
      });
    }
    // Translate <@123...> role mentions to usernames.
    if (mentions && mentions.roles && mentions.roles.size) {
      mentions.roles.array().forEach(Role => {
        str = str.replace(`<@&${Role.id}>`, `@&${Role.name}`);
      });
    }
    // Translate <@123...> channel mentions to usernames.
    if (mentions && mentions.channels && mentions.channels.size) {
      mentions.channels.array().forEach(Channel => {
        str = str.replace(`<#${Channel.id}>`, `#${Channel.name}`);
      });
    }
    return str;
  } catch (e) {
    lp('translateDiscordMessage failed.', e);
  }
};

// IRC ------------------------------------------------------------------------

/**
 * When a new IRC message is read.
 * @param {string} nick - Author of the message.
 * @param {string} to - Channel of the message.
 * @param {string} text - Content of the message.
 */
const onIRCMessage = (nick, to, text) => {
  try {
    const link = links.find(l => l.irc_channel === to);
    if (
      link &&
      text.toString().trim() !== '' &&
      !nick.includes(settings.irc_nickname) &&
      !settings.filteredIRCnicknames.includes(nick.toLowerCase())
    ) {
      // Success!
      let msg = `<${nick}> ${text}`;
      if (text.startsWith('||') && text.endsWith('||')) {
        // Spoiler tag.
        let nText = text;
        nText = nText.slice(2, nText.length - 2);
        msg = `||<${nick}> ${nText}||`;
      }
      link.Channel.send(msg).catch(e => {
        lp(
          `Sending a message to a discord channel (${
            link.Channel.name
          }) failed.`,
          e
        );
      });
    }
  } catch (e) {
    lp('onIRCMessage failed.', e);
  }
};

/**
 * IRC has encountered an error.
 * @param {string} message - The error message.
 */
const onIRCError = message => {
  try {
    ircErrorBalance += 1;
    lp('IRC returned an error message.', message);
  } catch (e) {
    lp('onIRCError failed.', e);
  }
};

/**
 * Logs in to IRC and maps the event listeners.
 */
const logInIRC = () => {
  try {
    const linkedChannels = links.map(l =>
      l.irc_channel_pw.trim() === ''
        ? l.irc_channel
        : `${l.irc_channel} ${l.irc_channel_pw}`
    );
    p(`IRC connecting to: ${linkedChannels}...`);
    ircClient = new Irc.Client(
      settings.irc_server,
      settings.irc_nickname.trim(),
      {
        userName: settings.irc_userName,
        realName: settings.irc_realName,
        channels: linkedChannels,
        port: settings.irc_port,
        password: settings.irc_password,
        autoConnect: false,
        autoRejoin: true,
        autoRenick: true,
        encoding: settings.irc_encoding,
        retryDelay: settings.irc_retry_delay,
      }
    );
    // Remove old listeners to avoid echoing.
    ircClient.removeAllListeners('message');
    ircClient.removeAllListeners('error');
    ircClient.connect(settings.irc_retry_count, () => {
      // Event: Registered.
      ircClient.addListener('message', onIRCMessage);
      ircClient.addListener('error', onIRCError);
      p('IRC connection is ready!');
    });
  } catch (e) {
    lp('logInIRC failed.', e);
  }
};

/**
 * Handles owner given actions.
 * The owner can give actions via DM or GroupDM.
 * @param {Message} Message - Discord.js Message.
 */
const handleOwnerActions = Message => {
  try {
    const action = Message.content
      .toString()
      .trim()
      .toLowerCase()
      .split(' ');
    // Close the bot.
    if (['help'].includes(action[0])) {
      p('Author triggered help.');
      Message.channel
        .send(
          'Commands: help, exit, version, links, ping, reconnect, filter <name>, filtered.'
        )
        .catch(e => {
          lp(
            `Sending a message to a discord channel (${
              Message.channel.name
            }) failed.`,
            e
          );
        });
    }
    // Close the bot.
    if (['exit', 'close'].includes(action[0])) {
      p('Author triggered exit.');
      Message.channel
        .send('Goodbye.')
        .then(() => {
          process.exit(0);
        })
        .catch(e => {
          lp(
            `Sending a message to a discord channel (${
              Message.channel.name
            }) failed.`,
            e
          );
        });
    }
    // Reply bot version.
    if (['version'].includes(action[0])) {
      p('Author triggered version.');
      const packagePath = path.resolve('./package.json');
      if (fs.existsSync(packagePath)) {
        const obj = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (obj && typeof obj.version === 'string') {
          Message.channel.send(obj.version).catch(e => {
            lp(
              `Sending a message to a discord channel (${
                Message.channel.name
              }) failed.`,
              e
            );
          });
        }
      }
    }
    // Returns linked channels.
    if (['settings', 'links', 'channels'].includes(action[0])) {
      p('Author triggered channels.');
      links.forEach(link => {
        Message.channel
          .send(
            `${link.Guild.name}/${link.Channel.name} <> ${link.irc_channel}`
          )
          .catch(e => {
            lp(
              `Sending a message to a discord channel (${
                Message.channel.name
              }) failed.`,
              e
            );
          });
      });
    }
    // Pings Discord.
    if (['ping'].includes(action[0])) {
      p('Author triggered ping.');
      Message.channel
        .send(
          `Discord: ${
            discordClient.ping
          }ms. IRC error balance ${ircErrorBalance}.`
        )
        .catch(e => {
          lp(
            `Sending a message to a discord channel (${
              Message.channel.name
            }) failed.`,
            e
          );
        });
    }
    // Reconnect Discord & IRC.
    if (['reconnect'].includes(action[0])) {
      p('Author triggered reconnect.');
      if (ircClient) {
        ircClient.disconnect('Bye!');
        p('IRC disconnected.');
      }
      if (discordClient) {
        discordClient.destroy().then(() => {
          discordClient = new Discord.Client();
          p('Discord connection destroyed.');
          p('Cooldown of 5 seconds...');
          setTimeout(() => {
            initialize();
          }, 5000);
        });
      } else {
        discordClient = new Discord.Client();
        p('Discord client did not exist. No need to disconnect.');
        p('Cooldown of 5 seconds...');
        setTimeout(() => {
          initialize();
        }, 5000);
      }
    }
    // Filter an IRC-user.
    if (['filter'].includes(action[0])) {
      p('Filtering new user:', action[1]);
      if (action[1]) {
        const msg = `User (${action[1]}) is now filtered.`;
        settings.filteredIRCnicknames.push(action[1]);
        Message.channel.send(msg).catch(e => {
          lp(
            `Sending a message to a discord channel (${
              Message.channel.name
            }) failed.`,
            e
          );
        });
      }
    }
    // Display filtered users.
    if (['filtered'].includes(action[0])) {
      p('Filtered users triggered.');
      const msg = `The following IRC-users are filtered: ${
        settings.filteredIRCnicknames
      }.`;
      Message.channel.send(msg).catch(e => {
        lp(
          `Sending a message to a discord channel (${
            Message.channel.name
          }) failed.`,
          e
        );
      });
    }
  } catch (e) {
    lp('handleOwnerActions failed.', e);
  }
};

/**
 * Users can trigger actions by mentioning the bot.
 * @param {object} link - Discord <> IRC mapping.
 * @param {object} Message - Discord.js Message.
 */
const handleBotMentions = (link, Message) => {
  try {
    const action = Message.content
      .toString()
      .trim()
      .toLowerCase()
      .split(' ');
    p('Action attempt:', action[1]);
    if (['kuka', 'kukas', 'who'].includes(action[1])) {
      // Triggers greeting.
      p('Greeting triggered.');
      const part0 = ['itämaista', 'länsimaista', 'ulkomaista', 'kotimaista'];
      const part1 = [
        'hiomapaperihiontaa',
        'keppikiillotusta',
        'purukeräntää',
        'Passelia',
        'rahinivontaa',
        'narun halkaisua',
      ];
      const rN0 = Math.floor(Math.random() * part0.length);
      const rN1 = Math.floor(Math.random() * part1.length);
      const hobby = `${part0[rN0]} ${part1[rN1]}`;
      const msg =
        `Olen ${settings.irc_realName}, eli ${settings.irc_nickname}. ` +
        `Harrastan purjelentämistä, pötköttelyä ja ${hobby}. ` +
        'Tehtäväni täällä on yhdistää Discord ja IRC.';
      Message.channel.send(msg).catch(e => {
        lp(
          `Sending a message to a discord channel (${
            Message.channel.name
          }) failed.`,
          e
        );
      });
      ircClient.say(link.irc_channel, msg);
    } else if (['fu'].includes(action[1])) {
      p('Fu triggered.');
      const msg = 'fu2';
      Message.channel.send(msg).catch(e => {
        lp(
          `Sending a message to a discord channel (${
            Message.channel.name
          }) failed.`,
          e
        );
      });
      ircClient.say(link.irc_channel, msg);
    }
  } catch (e) {
    lp('handleBotMentions failed.', e);
  }
};

// Start the process.
initialize();
