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
    if (Message.author.id !== discordClient.user.id) {
      ircClient.say(
        settings.irc_channel,
        `${Message.author.username}: ${Message.content}`
      );
    }
  } catch (e) {
    lp(e);
  }
});

const logInIrc = () => {
  ircClient = new Irc.Client(settings.irc_server, `ch-${discordChannel.name}`, {
    userName: 'Kegelink',
    realName: 'Ketsune "Gerald" Link',
    channels: [settings.irc_channel],
    port: settings.irc_port,
    password: settings.irc_password,
    autoConnect: false,
    autoRejoin: true,
    autoRenick: true,
  });
  ircClient.connect();
  ircClient.addListener('registered', () => {
    try {
      p('Irc connection is ready.');
      ircClient.join(settings.irc_channel);
      ircClient.say(
        settings.irc_channel,
        'Pim pom! Keijoyhteysväylä rakennettu!'
      );
    } catch (e) {
      lp(e);
    }
  });

  ircClient.addListener(`message${settings.irc_channel}`, (from, message) => {
    try {
      discordChannel.send(`<${from}> ${message}`);
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

logInDiscord();
