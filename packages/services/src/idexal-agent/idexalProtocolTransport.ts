import type { Event, IDisposable } from "@idexal/rpc";
import type { IdexalProtocolMessage } from "@idexal/shared";

export type IdexalProtocolTransportKind = "stdio" | "websocket" | "memory";

export interface IdexalProtocolTransportClosedEvent {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  reason?: string;
}

export interface IdexalProtocolTransport extends IDisposable {
  readonly kind: IdexalProtocolTransportKind;
  readonly onMessage: Event<IdexalProtocolMessage>;
  readonly onClose: Event<IdexalProtocolTransportClosedEvent>;
  send(message: IdexalProtocolMessage): Promise<void>;
  disposeAndWait?(): Promise<void>;
}
