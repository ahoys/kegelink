# Kegelink

### A Discord to IRC communication link.

# <a href='https://github.com/ahoys/kegelink'><img src='assets/kegelink.png?raw=true' height='192' alt='Kegelink' /></a>

**This version is still work in progress!**

Ketsune "Gerald" Link, alias Kegelink, is a bot that's sole purpose was to connect my IRC-pal, Kegetys, to Discord. Now I've rewritten it in TypeScript for everyone's enjoyment.

## Deployment

### Requirements

- Your own server with Node.js (with npm) installed.
- A new bot initialized in [Discord's developers portal](https://discord.com/developers/applications/).
- [Invite the bot to your server.](https://discordpy.readthedocs.io/en/latest/discord.html#inviting-your-bot) The bot requires the following permissions: `send messages` and `add reactions`.

### Installation

1. Download the most recent [release package](https://github.com/ahoys/kegelink/releases) and unzip it.
2. Inside the unzipped folder, update the `.env` file with your own credentials and settings. `APP_ID` is the bot's id, `APP_TOKEN` is the bot's token. `OWNER_ID` is for example your own Discord id.
3. Run `npm install --production`. After that, you can start the bot with `node kegelink`. Make sure the console states that both Discord and IRC are connected. If not, check your connection settings.

### Usage

- In Discord type `@botsname help` for available commands. Read the descriptions carefully.

### Tips

- You don't have to make filters public. You can give them to the bot via a private channel.
- Only the owner is able to give commands, for security reasons.

## Development

### Setting up a test IRC-server

1. [Download and install unrealircd](https://www.unrealircd.org/download) (TLS/SSL needs to be enabled in unrealircd 5, use the installer to create a self-signed certs.)
2. [Download test server -configs](https://github.com/ahoys/kegelink/blob/master/assets/unrealircd.conf)
3. Place the downloaded configs to `...\UnrealIRCd 5\conf`
4. Start the UnrealIRCd server (via start menu or alike)
5. Make sure you have a `.dev.env` file set. Use the `.env` file as a template.

The example UnrealIRCd config starts the server with the following settings:

```
ip: 127.0.0.1
port: 6667
password: password
```

Here's an example for the `.dev.env`:

```
# Discord specific configs.
APP_TOKEN=replace_me
APP_ID=replace_me
OWNER_ID=replace_me
# IRC specific configs.
IRC_SERVER=127.0.0.1
IRC_PORT=6667
IRC_PASSWORD=password
IRC_NICKNAME=Kegelink
IRC_USERNAME=Kegelink
IRC_REAL_NAME=Kegelink
IRC_ENCODING=utf-8
IRC_RETRY_DELAY=5120
IRC_SECURE=false
IRC_SELF_SIGNED=false
```
