interface IIRCOptions {
  userName: string;
  realName: string;
  channels: string[];
  port: number;
  password: string;
  autoConnect: boolean;
  autoRejoin: boolean;
  autoRenick: boolean;
  secure: boolean;
  selfSigned: boolean;
  encoding: string;
  retryDelay: number;
  floodProtection: boolean;
  floodProtectionDelay: number;
}

type TCallback = () => void;

declare module 'irc-upd' {
  export class Client {
    constructor(server: string, nick: string, options: IIRCOptions);
    public addListener: (
      event: 'message' | 'error',
      listener: (...args: string[]) => void
    ) => void;
    public removeAllListeners: (event: string) => void;
    public connect: (retryCount: number | null, callback: TCallback) => void;
    public disconnect: (callback: TCallback) => void;
  }
}

declare type TLinksDocs = Array<{
  _id: string;
  discordChannel: string;
  ircChannel: string;
}>;

declare type TFiltersDocs = Array<{
  _id: string;
  userId: string;
}>;

declare type TFilters = string[];

declare type TLinks = { [key: string]: string };
