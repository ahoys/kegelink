import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdDisconnect = (message: Message, db: Nedb): void => {
  try {
    p('Executing cmdDisconnect...');
  } catch (err) {
    lp(err);
  }
};
