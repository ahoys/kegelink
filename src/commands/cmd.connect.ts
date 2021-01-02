import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdConnect = (message: Message) => {
  try {
    p('Executing cmdConnect...');
  } catch (err) {
    lp(err);
  }
};
