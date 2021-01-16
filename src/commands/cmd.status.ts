import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

/**
 * Displays the current status of the bot.
 * @param message Discord.js Message object.
 * @param linksDb Links Nedb-database.
 * @param filtersDb Filters Nedb-database.
 */
export const cmdStatus = (
  message: Message,
  linksDb: Nedb,
  filtersDb: Nedb
): void => {
  try {
    p('Executing cmdStatus...');
    linksDb.find({}, (err: Error, links: TLinksDocs) => {
      if (err) {
        lp(err);
      } else {
        filtersDb.find({}, (err: Error, filters: TFiltersDocs) => {
          if (err) {
            lp(err);
          } else {
            let str = '```';
            if (links.length) {
              str += '\nLinks:\n';
              Object.values(links).forEach((value, i) => {
                str +=
                  i === 0
                    ? `${value.discordChannel} <-> ${value.ircChannel}`
                    : `\n${value.discordChannel} <-> ${value.ircChannel}`;
              });
            }
            if (links.length && filters.length) {
              str += '\n';
            }
            if (filters.length) {
              str += '\nFilters:\n';
              Object.values(filters).forEach((value, i) => {
                str +=
                  i === filters.length - 1
                    ? `${value.userId}.`
                    : `${value.userId}, `;
              });
            }
            message.channel.send(str + '```').catch((err) => lp(err));
          }
        });
      }
    });
  } catch (err) {
    lp(err);
  }
};
