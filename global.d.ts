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
      listener: (...args: any) => void
    ) => void;
    public removeAllListeners: (event: string) => void;
    public connect: (retryCount: number | null, callback: TCallback) => void;
    public disconnect: (callback: TCallback) => void;
    public say: (target: string, message: string) => void;
    public join: (channelList: string, callback?: TCallback) => void;
    public part: (
      channelList: string,
      message?: string,
      callback?: TCallback
    ) => void;
  }
}

declare type TLinksDoc = {
  _id: string;
  discordChannel: string;
  ircChannel: string;
  ircChannelPw: string | undefined;
};

declare type TLinksDocs = Array<TLinksDoc>;

declare type TFiltersDoc = {
  _id: string;
  userId: string;
};

declare type TFiltersDocs = Array<TFiltersDoc>;
