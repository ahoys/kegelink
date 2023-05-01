import { Message } from 'discord.js';
import { p } from 'logscribe';
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
        p(err);
      } else if (doc) {
        linksDb.remove(
          { discordChannel: message.channel.id },
          {},
          (err, num) => {
            if (err) {
              p(err);
            } else if (num) {
              p(`Disconnected channel ${message.channel.id}.`);
              ircClient.part(doc.ircChannel, 'Discord link was removed. Bye!');
              message.channel
                .send('This channel is no longer linked.')
                .catch((err) => p(err));
            } else {
              p('Failed to remove linking.');
            }
          }
        );
      } else {
        message.channel
          .send('This channel is not linked. No actions required.')
          .catch((err) => p(err));
      }
    });
  } catch (err) {
    p(err);
  }
};
