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

declare module 'irc-upd' {
  export class Client {
    constructor(server: string, nick: string, options: IIRCOptions);
    public addListener: (
      event: 'message' | 'error',
      listener: (...args: string[]) => void
    ) => void;
    public removeAllListeners: (event: string) => void;
    public connect: (
      retryCount: number | null,
      onRegistered: () => void
    ) => void;
  }
}
