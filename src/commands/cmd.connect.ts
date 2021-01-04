import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdConnect = (message: Message, db: Nedb, links: TLinks): void => {
  try {
    p('Executing cmdConnect...');
    const split = message.content?.split(' ');
    if (split[2] && split[2].length >= 1) {
      // Add # if missing. This may be deliberate as
      // the user may try to avoid typing discord channel's
      // name that conflicts with the irc channel.
      // E.g. #test and #test
      const ircChannel = split[2].includes('#')
        ? split[2].trim()
        : '#' + split[2].trim();
      // Append with a password, if it exists.
      const cpw =
        typeof split[3] === 'string' && split[3].trim() !== ''
          ? `${ircChannel} ${split[3].trim()}`
          : ircChannel;
      db.findOne({ discordChannel: message.channel.id }, (err, doc) => {
        if (err) {
          lp(err);
        } else if (doc) {
          db.update(
            { discordChannel: message.channel.id },
            { discordChannel: message.channel.id, ircChannel: cpw },
            {},
            (err, num) => {
              if (err) {
                lp(err);
              } else if (num) {
                p(`Updating ${message.channel.id} link to ${cpw}.`);
                links[message.channel.id] = cpw;
                message.channel
                  .send('An existing link updated.')
                  .catch((err) => lp(err));
              }
            }
          );
        } else {
          db.insert(
            { discordChannel: message.channel.id, ircChannel: cpw },
            (err, doc) => {
              if (err) {
                lp(err);
              } else if (doc) {
                p(`Added a new link ${message.channel.id} <-> ${cpw}.`);
                links[message.channel.id] = cpw;
                message.channel
                  .send('Added a new link.')
                  .catch((err) => lp(err));
              }
            }
          );
        }
      });
    }
  } catch (err) {
    lp(err);
  }
};
