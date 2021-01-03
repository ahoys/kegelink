import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdFilter = (message: Message, db: Nedb): void => {
  try {
    const valueIndex = message?.guild ? 2 : 1;
    const userId = message.content?.split(' ')[valueIndex];
    db.findOne({ userId }, (err, doc) => {
      if (err) {
        lp(err);
      } else if (doc) {
        db.remove({ userId }, (err) => {
          if (err) {
            lp(err);
          } else {
            message.reply(`User ${userId} is no longer filtered.`);
          }
        });
      } else {
        db.insert({ userId }, (err) => {
          if (err) {
            lp(err);
          } else {
            message.reply(`User ${userId} is now filtered.`);
          }
        });
      }
    });
    p('Executing cmdFilterIrc...');
  } catch (err) {
    lp(err);
  }
};