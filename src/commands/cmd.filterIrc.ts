import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdFilterIrc = (message: Message): void => {
  try {
    p('Executing cmdFilterIrc...');
  } catch (err) {
    lp(err);
  }
};
