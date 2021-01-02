import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdFilterDiscord = (message: Message): void => {
  try {
    p('Executing cmdFilterDiscord...');
  } catch (err) {
    lp(err);
  }
};
