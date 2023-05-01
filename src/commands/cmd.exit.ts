import { Message, Client } from 'discord.js';
import { p } from 'logscribe';
import { Client as IRCClient } from 'irc-upd';

let running = false;

const disconnectDiscord = (message: Message, discordClient: Client): void => {
  try {
    message.channel
      .send('Goodbye!')
      .then(() => {
        p('Discord disconnected.');
        discordClient.destroy();
        process.exit(0);
      })
      .catch((err) => {
        p(err);
        running = false;
      });
  } catch (err) {
    p(err);
  }
};

export const cmdExit = (
  message: Message,
  discordClient: Client,
  ircClient: IRCClient
): void => {
  try {
    if (!running) {
      p('Executing cmdExit...');
      running = true;
      // Fallback if the ircClient.disconnect() is not working.
      // There seem to be some issues with it. It does disconnect
      // but the callback never triggers.
      const timeout = setTimeout(() => {
        p('IRC not responding, initializing a force shutdown.');
        disconnectDiscord(message, discordClient);
      }, 5120);
      message.channel
        .send('Shutting down...')
        .then(() => {
          ircClient.disconnect(() => {
            p('IRC disconnected.');
            clearTimeout(timeout);
            disconnectDiscord(message, discordClient);
          });
        })
        .catch((err) => {
          p(err);
        });
    } else {
      p('Command cmdExit is already running.');
    }
  } catch (err) {
    p(err);
    running = false;
  }
};
