import { Message } from 'discord.js';
import { p } from 'logscribe';

export const cmdFilter = (message: Message, filtersDb: Nedb): void => {
  try {
    const valueIndex = message?.guild ? 2 : 1;
    const userId = message.content?.split(' ')[valueIndex].toLowerCase();
    filtersDb.findOne({ userId }, (err, doc) => {
      if (err) {
        p(err);
      } else if (doc) {
        filtersDb.remove({ userId }, (err) => {
          if (err) {
            p(err);
          } else {
            message.reply(`User ${userId} is no longer filtered.`);
          }
        });
      } else {
        filtersDb.insert({ userId }, (err) => {
          if (err) {
            p(err);
          } else {
            message.reply(`User ${userId} is now filtered.`);
          }
        });
      }
    });
    p('Executing cmdFilterIrc...');
  } catch (err) {
    p(err);
  }
};
