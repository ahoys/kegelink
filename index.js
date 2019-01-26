const fs = require('fs');
const { setLogDirPath } = require('logscribe');
const { lp, p } = require('logscribe').default('General');
const path = require('path');

setLogDirPath('./');

const auth = {
  token: '',
  id: '',
  owner: '',
};

/**
 * Read authentication data.
 */
const authPath = path.resolve('./configs/auth.json');
if (fs.existsSync(authPath)) {
  const obj = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  Object.keys(auth).forEach(key => {
    if (obj[key]) {
      auth[key] = obj[key];
    }
  });
  p(`Successfully read auth.json for ${auth.id}.`);
} else {
  p("configs/auth.json was not found. Can't continue.");
  process.exit(1);
}

const settings = {
  irc_server: '',
  irc_port: '',
  irc_channel: '',
  irc_password: 'Kegelink',
  irc_nickname: '',
  dis_guild: '',
  dis_channel: '',
};

/**
 * Read settings data.
 */
const settingsPath = path.resolve('./configs/settings.json');
if (fs.existsSync(settingsPath)) {
  const obj = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  Object.keys(settings).forEach(key => {
    if (obj[key]) {
      settings[key] = obj[key].toString();
    }
  });
  p('Successfully read settings.json.');
} else {
  p('configs/settings.json was not found. Using defaults instead.');
}

/**
 * Discord.js & Irc
 */
const Discord = require('discord.js');
const discordClient = new Discord.Client();
const Irc = require('irc-upd');
let discordChannel, timeout, ircClient;
const logInDiscord = () => {
  discordClient.login(auth.token).catch(() => {
    lp('Failed to log-in Discord!');
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      logInDiscord();
    }, 10240);
  });
};

discordClient.on('ready', () => {
  p('Discord connection is ready.');
  const Guild = discordClient.guilds.find(g => g.id === settings.dis_guild);
  if (Guild) {
    discordChannel = Guild.channels.find(c => c.id === settings.dis_channel);
    if (discordChannel) {
      logInIrc();
    } else {
      lp('Could not find the given channel!', settings.dis_channel);
    }
  } else {
    lp('Could not find the given guild!', settings.dis_guild);
  }
});

discordClient.on('message', Message => {
  try {
    if (
      Message.channel.id === discordChannel.id &&
      Message.author.id !== discordClient.user.id
    ) {
      if (Message.isMentioned(discordClient.user.id)) {
        doDiscordAction(Message.content);
      } else {
        ircClient.say(
          settings.irc_channel,
          `${Message.author.username}: ${Message.content}`
        );
      }
    }
  } catch (e) {
    lp(e);
  }
});

discordClient.on('error', () => {
  // This usually happens when the connection is lost.
  // Only way to recover is to re-login asap.
  logInDiscord();
});

const logInIrc = () => {
  ircClient = new Irc.Client(settings.irc_server, settings.irc_nickname, {
    userName: 'Kegelink',
    realName: 'Ketsune "Gerald" Link',
    channels: [settings.irc_channel],
    port: settings.irc_port,
    password: settings.irc_password,
    autoConnect: false,
    autoRejoin: true,
    autoRenick: true,
    encoding: 'utf-8',
  });
  ircClient.connect();
  ircClient.addListener('registered', () => {
    try {
      p('Irc connection is ready.');
      ircClient.join(settings.irc_channel);
    } catch (e) {
      lp(e);
    }
  });

  ircClient.addListener('message', (nick, to, text, message) => {
    try {
      discordChannel.send(`<${nick}> ${text}`);
    } catch (e) {
      lp(e);
    }
  });

  ircClient.addListener('error', msg => {
    try {
      lp(msg);
    } catch (e) {
      console.log(e);
    }
  });
};

/**
 * Executes an action if found.
 * These are Discord only.
 * @param {Message content} content - Message.content
 */
const doDiscordAction = content => {
  const str = content
    .toString()
    .trim()
    .toLowerCase()
    .split(' ');
  const a = str[1] ? str[1] : '';
  if (['who', 'kuka'].includes(a)) {
    const msg =
      'Hei! Nimeni on Ketsune "Gerald" Link. ' +
      'Voitte kutsua minua lyhyemmin Kegelinkiksi. ' +
      'Tulin tänne yhdistämään Discordin ja irkin!';
    ircClient.say(settings.irc_channel, msg);
    discordChannel.send(msg);
  }
};

logInDiscord();
