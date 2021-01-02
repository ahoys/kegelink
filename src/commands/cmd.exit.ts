import { Client, Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdExit = (message: Message, discordClient: Client): void => {
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
