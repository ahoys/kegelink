import { Message, Client } from 'discord.js';
import { p, lp } from 'logscribe';
import { Client as IRCClient } from 'irc-upd';

export const cmdExit = (
  message: Message,
  discordClient: Client,
  ircClient: IRCClient
): void => {
  try {
    p('Executing exit...');
    message.channel
      .send('Goodbye.')
      .then(() => {
        discordClient.destroy();
        process.exit(0);
      })
      .catch((err) => {
        lp(err);
      });
  } catch (err) {
    lp(err);
  }
};
