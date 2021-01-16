import { Message } from 'discord.js';
import { p, lp } from 'logscribe';
import { Client as IRCClient } from 'irc-upd';

/**
 * Links discord channel to irc channel.
 * This will enable message exchange.
 * @param message Discord.js Message object.
 * @param linksDb Links Nedb-database.
 * @param ircClient IRC-client.
 */
export const cmdConnect = (
  message: Message,
  linksDb: Nedb,
  ircClient: IRCClient
): void => {
  try {
    p('Executing cmdConnect...');
    const split = message.cleanContent?.split(' ');
    if (split[2] && split[2].length >= 1) {
      // Add # if missing. This may be deliberate as
      // the user may try to avoid typing discord channel's
      // name that conflicts with the irc channel.
      // E.g. #test and #test
      const ircChannel = split[2][0] === '#' ? split[2] : '#' + split[2];
      // And here is the optional password for the irc-channel.
      const pw =
        typeof split[3] === 'string' && split[3] !== '' ? split[3] : undefined;
      // Append with a password, if it exists.
      const ircChannelWithPw = pw ? `${ircChannel} ${pw}` : ircChannel;
      // There can be two outcomes here:
      // 1) We add a new link.
      // 2) We update an existing link.
      linksDb.findOne({ discordChannel: message.channel.id }, (err, doc) => {
        if (err) {
          lp(err);
        } else if (doc) {
          // The link exists, so we are updating.
          linksDb.update(
            {
              discordChannel: message.channel.id,
            },
            {
              discordChannel: message.channel.id,
              ircChannel: ircChannel,
              ircChannelPw: pw,
            },
            {},
            (err, num) => {
              if (err) {
                lp(err);
              } else if (num) {
                p(`Updating ${message.channel.id} link to ${ircChannel}.`);
                if (doc.ircChannel !== ircChannel) {
                  ircClient.part(
                    doc.ircChannel,
                    `Discord link redirected to ${ircChannel}. Bye!`
                  );
                }
                if (doc.ircChannel !== ircChannel || doc.ircPassword !== pw) {
                  ircClient.join(ircChannelWithPw);
                }
                message.channel
                  .send('An existing link updated.')
                  .catch((err) => lp(err));
              } else {
                message.channel
                  .send('Failed to update. Unable to access the database.')
                  .catch((err) => lp(err));
              }
            }
          );
        } else {
          // The link does not exist, add a new one.
          linksDb.insert(
            {
              discordChannel: message.channel.id,
              ircChannel: ircChannel,
              ircChannelPw: pw,
            },
            (err, doc) => {
              if (err) {
                lp(err);
              } else if (doc) {
                p(`Added a new link ${message.channel.id} <-> ${ircChannel}.`);
                ircClient.join(ircChannelWithPw);
                message.channel
                  .send('Added a new link.')
                  .catch((err) => lp(err));
              } else {
                message.channel
                  .send('Failed to add. Unable to access the database.')
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
