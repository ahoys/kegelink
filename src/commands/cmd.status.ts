import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdStatus = (message: Message): void => {
  try {
    p('Executing cmdStatus...');
  } catch (err) {
    lp(err);
  }
};
