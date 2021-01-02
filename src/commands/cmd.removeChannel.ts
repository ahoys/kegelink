import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdRemoveChannel = (message: Message) => {
  try {
    p('Executing cmdRemoveChannel...');
  } catch (err) {
    lp(err);
  }
};
