import { Message } from 'discord.js';
import { p, lp } from 'logscribe';
import { Client as IRCClient } from 'irc-upd';

export const cmdDisconnect = (
  message: Message,
  linksDb: Nedb,
  ircClient: IRCClient
): void => {
  try {
    p('Executing cmdDisconnect...');
    linksDb.findOne({ discordChannel: message.channel.id }, (err, doc) => {
      if (err) {
        lp(err);
      } else if (doc) {
        linksDb.remove(
          { discordChannel: message.channel.id },
          {},
          (err, num) => {
            if (err) {
              lp(err);
            } else if (num) {
              p(`Disconnected channel ${message.channel.id}.`);
              ircClient.part(doc.ircChannel, 'Discord link was removed. Bye!');
              message.channel
                .send('This channel is no longer linked.')
                .catch((err) => lp(err));
            } else {
              lp('Failed to remove linking.');
            }
          }
        );
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
