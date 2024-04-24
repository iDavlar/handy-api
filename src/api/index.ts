import { HandyAPI } from '../_APICORE';
import {
  Branch,
  HAMPState,
  HSSPSetupResult,
  HSSPState,
  Mode,
  Model,
  ModeUpdateResponse,
  UpdateStatusResponse,
} from '../enums';
import {
  ConnectedResponse,
  ConnectionKey,
  HAMPStartResponse,
  HAMPStopResponse,
  HAMPVelocityPercent,
  HAMPVelocityPercentResponse,
  HandyState,
  HDSPResponse,
  HSSPPlay,
  HSSPPlayResponse,
  InfoResponse,
  LoopSettingResponse,
  LoopSettingUpdate,
  ModeUpdate,
  NextXAT,
  NextXAVA,
  NextXPT,
  NextXPVA,
  NextXPVP,
  OffsetResponse,
  OffsetUpdate,
  OtaLatestResponse,
  Outliers,
  PositionAbsoluteResponse,
  RPCResult,
  ServerTimeResponse,
  SettingsResponse,
  Setup,
  SlideResponse,
  SlideSettings,
  SlideUpdateResponse,
  StatusResponse,
  SyncCount,
  UpdatePerform,
} from '../types';
import { pushToBuffer } from './buffer';
import { Handy } from '../handy';

const APIWrapper = (handy: Handy) => {
  const config = handy.getConfig();
  const API = new HandyAPI({ BASE: config.API });

  return {
    get: {
      mode: (connectionKey: ConnectionKey, noStateUpdate = false) =>
        new Promise<RPCResult & { mode: Mode }>((res, rej) => {
          pushToBuffer({
            handy,
            noStateUpdate,
            request: () => API.base.getMode(connectionKey),
            callback: { res, rej },
          });
        }),
      connected: (connectionKey: ConnectionKey, noStateUpdate = false) =>
        new Promise<ConnectedResponse>((res, rej) => {
          pushToBuffer({
            handy,
            noStateUpdate,
            request: () => API.base.isConnected(connectionKey),
            callback: { res, rej },
          });
        }),
      info: (connectionKey: ConnectionKey, noStateUpdate = false) =>
        new Promise<InfoResponse>((res, rej) => {
          pushToBuffer({
            handy,
            noStateUpdate,
            sub: 'info',
            request: () => API.base.getInfo(connectionKey),
            callback: { res, rej },
          });
        }),
      settings: (connectionKey: ConnectionKey, noStateUpdate = false) =>
        new Promise<SettingsResponse>((res, rej) => {
          pushToBuffer({
            handy,
            noStateUpdate,
            request: () => API.base.getSettings(connectionKey),
            updateState: (handy, settings) => {
              handy.updateState({
                slide: { max: settings.slideMax, min: settings.slideMin },
              });
            },
            callback: { res, rej },
          });
        }),
      status: (connectionKey: ConnectionKey, noStateUpdate = false) =>
        new Promise<StatusResponse>((res, rej) => {
          pushToBuffer({
            handy,
            noStateUpdate,
            request: () => API.base.getStatus(connectionKey),
            updateState: (handy, { mode, state }) => {
              const change: Partial<HandyState> = { mode };
              if (mode === Mode.HSSP) {
                change.hssp = { state: state as HSSPState };
              }
              if (mode === Mode.HAMP) {
                change.hamp = { state: state as HAMPState };
              }
              handy.updateState(change);
            },
            callback: { res, rej },
          });
        }),
      slide: (connectionKey: ConnectionKey, noStateUpdate = false) =>
        new Promise<SlideResponse>((res, rej) => {
          pushToBuffer({
            handy,
            noStateUpdate,
            sub: 'slide',
            request: () => API.slide.getSlide(connectionKey),
            callback: { res, rej },
          });
        }),
      slidePositionAbsolute: (
        connectionKey: ConnectionKey,
        noStateUpdate = false,
      ) =>
        new Promise<PositionAbsoluteResponse>((res, rej) => {
          pushToBuffer({
            handy,
            noStateUpdate,
            sub: 'slide',
            request: () => API.slide.getPositionAbs(connectionKey),
            callback: { res, rej },
          });
        }),
      serverTime: () =>
        new Promise<ServerTimeResponse>((res, rej) => {
          pushToBuffer({
            request: () => API.timesync.getServerTime(),
            callback: { res, rej },
          });
        }),
      HAMP: {
        velocity: (connectionKey: ConnectionKey, noStateUpdate = false) =>
          new Promise<HAMPVelocityPercentResponse>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              sub: 'hamp',
              request: () => API.hamp.getHampVelocityPercent(connectionKey),
              callback: { res, rej },
            });
          }),
        state: (connectionKey: ConnectionKey, noStateUpdate = false) =>
          new Promise<RPCResult & { state: HAMPState }>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              sub: 'hamp',
              request: () => API.hamp.getHampState(connectionKey),
              callback: { res, rej },
            });
          }),
      },
      HDSP: {},
      HSSP: {
        state: (connectionKey: ConnectionKey, noStateUpdate = false) =>
          new Promise<RPCResult & { state: HSSPState }>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              sub: 'hssp',
              request: () => API.hssp.getHsspState(connectionKey),
              callback: { res, rej },
            });
          }),
        loop: (connectionKey: ConnectionKey, noStateUpdate = false) =>
          new Promise<LoopSettingResponse>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              request: () => API.hssp.getLoopSetting(connectionKey),
              updateState: (handy, { activated }) =>
                handy.updateState({ hssp: { loop: activated } }),
              callback: { res, rej },
            });
          }),
      },
      HSTP: {
        time: (connectionKey: ConnectionKey, noStateUpdate = false) =>
          new Promise<RPCResult & { time: number }>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              sub: 'hstp',
              request: () => API.hstp.getDeviceTime(connectionKey),
              callback: { res, rej },
            });
          }),
        offset: (connectionKey: ConnectionKey, noStateUpdate = false) =>
          new Promise<OffsetResponse>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              sub: 'hstp',
              request: () => API.hstp.getOffset(connectionKey),
              callback: { res, rej },
            });
          }),
        rtd: (connectionKey: ConnectionKey, noStateUpdate = false) =>
          new Promise<RPCResult & { rtd: number }>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              sub: 'hstp',
              request: () => API.hstp.getRoundTripDelay(connectionKey),
              callback: { res, rej },
            });
          }),
        sync: (
          connectionKey: ConnectionKey,
          syncCount?: SyncCount,
          outliers?: Outliers,
          noStateUpdate = false,
        ) =>
          new Promise<RPCResult & { time?: number; rtd?: number }>(
            (res, rej) => {
              pushToBuffer({
                handy,
                noStateUpdate,
                sub: 'hstp',
                request: () =>
                  API.hstp.sync(connectionKey, syncCount, outliers),
                callback: { res, rej },
              });
            },
          ),
      },
      MAINTENANCE: {
        getUpdateStatus: (connectionKey: ConnectionKey) =>
          new Promise<UpdateStatusResponse>((res, rej) => {
            pushToBuffer({
              request: () => API.maintenance.getUpdateStatus(connectionKey),
              callback: { res, rej },
            });
          }),
      },
      OTA: {
        latest: (model: Model, branch: Branch, noStateUpdate = false) =>
          new Promise<OtaLatestResponse>((res, rej) => {
            pushToBuffer({
              handy,
              noStateUpdate,
              sub: 'ota',
              request: () => API.ota.latest(model, branch),
              callback: { res, rej },
            });
          }),
      },
    },
    put: {
      mode: (connectionKey: ConnectionKey, requestBody: ModeUpdate) =>
        new Promise<ModeUpdateResponse>((res, rej) => {
          pushToBuffer({
            handy,
            request: () => API.base.setMode(connectionKey, requestBody),
            callback: { res, rej },
          });
        }),
      slide: (connectionKey: ConnectionKey, requestBody: SlideSettings) =>
        new Promise<SlideUpdateResponse>((res, rej) => {
          pushToBuffer({
            handy,
            request: () => API.slide.setSlide(connectionKey, requestBody),
            callback: { res, rej },
          });
        }),
      HAMP: {
        start: (connectionKey: ConnectionKey) =>
          new Promise<HAMPStartResponse>((res, rej) => {
            pushToBuffer({
              handy,
              request: () => API.hamp.start(connectionKey),
              callback: { res, rej },
            });
          }),
        stop: (connectionKey: ConnectionKey) =>
          new Promise<HAMPStopResponse>((res, rej) => {
            pushToBuffer({
              handy,
              request: () => API.hamp.hampStop(connectionKey),
              callback: { res, rej },
            });
          }),
        velocity: (
          connectionKey: ConnectionKey,
          requestBody: HAMPVelocityPercent,
        ) =>
          new Promise<RPCResult>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.hamp.setHampVelocityPercent(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
      },
      HDSP: {
        xava: (connectionKey: ConnectionKey, requestBody: NextXAVA) =>
          new Promise<HDSPResponse>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.hdsp.nextPostionAbsVelocityAbs(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
        xpva: (connectionKey: ConnectionKey, requestBody: NextXPVA) =>
          new Promise<HDSPResponse>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.hdsp.nextPositionPercentVelocityAbsolute(
                  connectionKey,
                  requestBody,
                ),
              callback: { res, rej },
            });
          }),
        xpvp: (connectionKey: ConnectionKey, requestBody: NextXPVP) =>
          new Promise<HDSPResponse>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.hdsp.nextPositionPercentVelocityPercent(
                  connectionKey,
                  requestBody,
                ),
              callback: { res, rej },
            });
          }),
        xat: (connectionKey: ConnectionKey, requestBody: NextXAT) =>
          new Promise<HDSPResponse>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.hdsp.nextPositionAbsInTime(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
        xpt: (connectionKey: ConnectionKey, requestBody: NextXPT) =>
          new Promise<HDSPResponse>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.hdsp.nextPositionPercentInTime(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
      },
      HSSP: {
        loop: (connectionKey: ConnectionKey, requestBody: LoopSettingUpdate) =>
          new Promise<RPCResult>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.hssp.setLoopSetting(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
        play: (connectionKey: ConnectionKey, requestBody: HSSPPlay) =>
          new Promise<HSSPPlayResponse>((res, rej) => {
            pushToBuffer({
              handy,
              skip: true,
              request: () => API.hssp.play(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
        stop: (connectionKey: ConnectionKey) =>
          new Promise<RPCResult>((res, rej) => {
            pushToBuffer({
              handy,
              request: () => API.hssp.hsspStop(connectionKey),
              callback: { res, rej },
            });
          }),
        setup: (connectionKey: ConnectionKey, requestBody: Setup) =>
          new Promise<{ result: HSSPSetupResult }>((res, rej) => {
            pushToBuffer({
              handy,
              request: () => API.hssp.setup(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
      },
      HSTP: {
        offset: (connectionKey: ConnectionKey, requestBody: OffsetUpdate) =>
          new Promise<RPCResult>((res, rej) => {
            pushToBuffer({
              handy,
              request: () => API.hstp.setOffset(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
      },
      MAINTENANCE: {
        restart: (
          connectionKey: ConnectionKey,
          requestBody?: { reconnect: boolean },
        ) =>
          new Promise<RPCResult>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.maintenance.restart(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
        updatePerformFw: (
          connectionKey: ConnectionKey,
          requestBody: UpdatePerform,
        ) =>
          new Promise<RPCResult>((res, rej) => {
            pushToBuffer({
              handy,
              request: () =>
                API.maintenance.updatePerformFw(connectionKey, requestBody),
              callback: { res, rej },
            });
          }),
      },
    },
  };
};

export default APIWrapper;
