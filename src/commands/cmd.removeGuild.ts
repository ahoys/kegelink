import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdRemoveGuild = (message: Message) => {
  try {
    p('Executing cmdRemoveGuild...');
  } catch (err) {
    lp(err);
  }
};
