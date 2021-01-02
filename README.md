# Kegelink
### A Discord to IRC communication link.
# <a href='https://github.com/ahoys/kegelink'><img src='assets/kegelink.png?raw=true' height='192' alt='Kegelink' /></a>

**This version is still work in progress!**

Ketsune "Gerald" Link, alias Kegelink, is a bot that's sole purpose was to connect my IRC-pal, Kegetys, to Discord. Now I've rewritten it in TypeScript for everyone's enjoyment.

## Development

### Setting up a test IRC-server

1. [Download and install unrealircd](https://www.unrealircd.org/download)
2. [Download test server -configs](https://github.com/ahoys/kegelink/blob/master/assets/unrealircd.conf)
3. Place the downloaded configs to `...\UnrealIRCd 4\conf`
4. Start the server (via start menu or alike)
5. Make sure configs/settings.json are the following and start the bot:
```
{
  "irc_server": "127.0.0.1",
  "irc_port": "6667",
  "irc_channel": "#test",
  "irc_password": "password",
  "irc_nickname": "Kegelink",
  "dis_guild": "DISCORD GUILD ID HERE",
  "dis_channel": "DISCORD CHANNEL ID HERE"
}
```
