import {
  ChannelClient,
  MessagePortProtocol,
  ProxyChannel,
  type MessagePortLike,
  type MessagePortPayload,
} from "@idexal/rpc";
import {
  IIdexalTaskService,
  type IIdexalTaskService as IIdexalTaskServiceShape,
} from "#src/session/idexalTaskService.js";
import {
  IIdexalAgentService,
  type IIdexalAgentService as IIdexalAgentServiceShape,
} from "#src/idexal-agent/idexalAgent.js";
import {
  IIdexalSessionService,
  type IIdexalSessionService as IIdexalSessionServiceShape,
} from "#src/idexal-session/idexalSession.js";
import {
  IModelSelectionService,
  type IModelSelectionService as IModelSelectionServiceShape,
} from "#src/model-provider/providerFacadeServices.js";

interface PortLike {
  on?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  off?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  addEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  removeEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  postMessage(message: MessagePortPayload): void;
  start?(): void;
  close?(): void;
}

function toMessagePortLike(port: PortLike): MessagePortLike {
  return {
    addEventListener(type, listener) {
      if (port.addEventListener) {
        port.addEventListener(type, listener);
        return;
      }
      port.on?.(type, listener);
    },
    removeEventListener(type, listener) {
      if (port.removeEventListener) {
        port.removeEventListener(type, listener);
        return;
      }
      port.off?.(type, listener);
    },
    postMessage(data) {
      port.postMessage(data);
    },
    start() {
      port.start?.();
    },
    close() {
      port.close?.();
    },
  };
}

export interface RemoteBotWorkspaceRuntimeServices {
  idexalAgentService: IIdexalAgentServiceShape;
  idexalTaskService: IIdexalTaskServiceShape;
  idexalSessionService: IIdexalSessionServiceShape;
  modelSelectionService: IModelSelectionServiceShape;
}

export function createRemoteRuntimeServicesFromPort(
  port: unknown,
): RemoteBotWorkspaceRuntimeServices {
  const protocol = new MessagePortProtocol(toMessagePortLike(port as PortLike));
  const client = new ChannelClient(protocol);
  return {
    idexalAgentService: ProxyChannel.toService<IIdexalAgentServiceShape>(
      client.getChannel(IIdexalAgentService.channelName),
    ),
    idexalTaskService: ProxyChannel.toService<IIdexalTaskServiceShape>(
      client.getChannel(IIdexalTaskService.channelName),
    ),
    idexalSessionService: ProxyChannel.toService<IIdexalSessionServiceShape>(
      client.getChannel(IIdexalSessionService.channelName),
    ),
    modelSelectionService: ProxyChannel.toService<IModelSelectionServiceShape>(
      client.getChannel(IModelSelectionService.channelName),
    ),
  };
}
