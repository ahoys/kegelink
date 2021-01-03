import { Message, Client } from 'discord.js';
import { p, lp } from 'logscribe';
import { Client as IRCClient } from 'irc-upd';

export const cmdReconnect = (
  message: Message,
  discordClient: Client,
  ircClient: IRCClient
): void => {
  try {
    p('Executing reconnect...');
  } catch (err) {
    lp(err);
  }
};
