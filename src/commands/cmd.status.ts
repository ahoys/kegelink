import { Message } from 'discord.js';
import { p, lp } from 'logscribe';

export const cmdStatus = (
  message: Message,
  links: TLinks,
  filters: TFilters
): void => {
  try {
    p('Executing cmdStatus...');
    const linksLen = Object.keys(links).length;
    const filtersLen = filters.length;
    if (linksLen + filtersLen === 0) {
      message.channel.send('No links or filters set.').catch((err) => lp(err));
    } else {
      let str = '```';
      if (linksLen > 0) {
        str += '\nLinks:\n';
        Object.keys(links).forEach((link, i) => {
          const ircChannel = links[link];
          str +=
            i === 0
              ? `${link} <-> ${ircChannel}`
              : `\n${link} <-> ${ircChannel}`;
        });
      }
      if (linksLen && filtersLen) {
        str += '\n';
      }
      if (filtersLen > 0) {
        str += '\nFilters:\n';
        filters.forEach((filter, i) => {
          str += i === filtersLen - 1 ? `${filter}.` : `${filter}, `;
        });
      }
      message.channel.send(str + '```').catch((err) => lp(err));
    }
  } catch (err) {
    lp(err);
  }
};
