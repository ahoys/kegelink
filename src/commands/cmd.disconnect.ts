import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdDisconnect = (
  message: Message,
  db: Nedb,
  links: TLinks
): void => {
  try {
    p('Executing cmdDisconnect...');
    db.findOne({ discordChannel: message.channel.id }, (err, doc) => {
      if (err) {
        lp(err);
      } else if (doc) {
        db.remove({ discordChannel: message.channel.id }, {}, (err, num) => {
          if (err) {
            lp(err);
          } else if (num) {
            p(`Disconnected channel ${message.channel.id}.`);
            delete links[message.channel.id];
            message.channel
              .send('This channel is no longer linked.')
              .catch((err) => lp(err));
          } else {
            lp('Failed to remove linking.');
          }
        });
      } else {
        message.channel
          .send('This channel is not linked. No actions required.')
          .catch((err) => lp(err));
      }
    });
  } catch (err) {
    lp(err);
  }
};
