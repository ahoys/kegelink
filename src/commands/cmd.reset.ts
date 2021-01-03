import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdReset = (
  message: Message,
  linksDb: Nedb,
  filtersDb: Nedb
): void => {
  try {
    p('Executing cmdReset...');
  } catch (err) {
    lp(err);
  }
};
