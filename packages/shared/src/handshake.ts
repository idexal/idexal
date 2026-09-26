export interface HelloMessage {
  type: "idexal-hello";
  version: string;
  platform: string;
  arch: string;
  pid: number;
}

export interface HelloAckMessage {
  type: "idexal-hello-ack";
  version: string;
  clientId: string;
}
