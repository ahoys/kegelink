import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdFilterDiscord = (message: Message) => {
  try {
    p('Executing cmdFilterDiscord...');
  } catch (err) {
    lp(err);
  }
};
