import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdReconnect = (message: Message): void => {
  try {
    p('Executing reconnect...');
  } catch (err) {
    lp(err);
  }
};
