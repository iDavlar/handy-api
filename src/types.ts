import { Handy } from './handy';
import { Status } from './enums';
import {
  BaseService,
  Connected,
  ConnectionKey,
  ErrorResponse,
  HampService,
  HAMPState,
  HdspService,
  HsspService,
  HSSPState,
  HstpService,
  InfoResponse,
  Looping,
  MaintenanceService,
  Mode,
  Offset,
  OtaLatestResponse,
  OtaService,
  PercentValue,
  PositionAbsolute,
  SlideService,
  SlideSettings,
  Timestamp,
  TimesyncService,
} from './_APICORE';

export type {
  Connected,
  ConnectedResponse,
  ConnectionKey,
  Duration,
  ErrorResponse,
  FirmwareVersion,
  FixedPos,
  GenericError,
  GenericResultResponse,
  HAMPResponse,
  HAMPStartResponse,
  HAMPStopResponse,
  HAMPVelocityPercent,
  HAMPVelocityPercentResponse,
  HardwareVersion,
  HDSPRequest,
  HDSPResponse,
  HDSPTimeRequest,
  HSSPPlay,
  HSSPPlayResponse,
  HSSPResponse,
  InfoResponse,
  Looping,
  LoopSettingResponse,
  LoopSettingUpdate,
  ModeUpdate,
  NextXAT,
  NextXAVA,
  NextXPT,
  NextXPVA,
  NextXPVP,
  Offset,
  OffsetResponse,
  OffsetUpdate,
  OtaLatest,
  OtaLatestResponse,
  Outliers,
  PercentValue,
  PositionAbsolute,
  PositionAbsoluteResponse,
  RPCResult,
  ServerTimeResponse,
  SettingsResponse,
  Setup,
  Sha256,
  SlideResponse,
  SlideResultResponse,
  SliderMaxResponse,
  SliderMinResponse,
  SlideSettings,
  SlideUpdateResponse,
  StatusResponse,
  SyncCount,
  SyncResponse,
  Timestamp,
  UpdatePerform,
  UpdateStatusResponse,
  Url,
  VelocityAbsolute,
} from './_APICORE';

export type UUITheme = 'default' | 'dark';

export interface UUISettings {
  URL: string;
  theme: UUITheme;
  compact?: boolean;
  slim?: boolean;
  storeURL: string;
  errorAlign: 'left' | 'center' | 'right';
}

export interface SyncSettings {
  syncCount: number;
  outliers: number;
}

export interface LSSettings {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export interface HandyConfig {
  API: string;
  scriptAPI: string;
  UUI: UUISettings;
  syncClientServerTime: boolean;
  syncClient: SyncSettings;
  syncHandy: SyncSettings;
  videoPlayerDelayForSecondPlay: number;
  timeBetweenSyncs: number;
  throttleDelay: number;
  localStorage?: LSSettings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceMethod<T extends new (...args: any) => any> = ReturnType<
  InstanceType<T>[Exclude<keyof InstanceType<T>, 'httpRequest'>]
>;

export type Method =
  | ServiceMethod<typeof BaseService>
  | ServiceMethod<typeof HampService>
  | ServiceMethod<typeof HdspService>
  | ServiceMethod<typeof HsspService>
  | ServiceMethod<typeof HstpService>
  | ServiceMethod<typeof MaintenanceService>
  | ServiceMethod<typeof OtaService>
  | ServiceMethod<typeof SlideService>
  | ServiceMethod<typeof TimesyncService>;

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
export type Response<T extends Method> = Exclude<Awaited<T>, ErrorResponse>;

export interface HandyBuffer<T extends Method = Method> {
  callback: {
    res: (value: Response<T>) => void;
    rej: (error: unknown) => void;
  };
  request: () => T;
  timestamp: number;
  sub?: keyof Pick<
    HandyState,
    'info' | 'hamp' | 'hssp' | 'hstp' | 'slide' | 'ota'
  >;
  skip?: boolean;
  handy?: Handy;
  noStateUpdate?: boolean;
  updateState?: (handy: Handy, change: Response<T>) => void;
}

export interface ClientServerLatency {
  avgOffset: number;
  avgRtd: number;
  lastSyncTime: number;
}

export interface HandyState {
  connectionKey?: ConnectionKey;
  connected?: Connected;
  connecting?: boolean;
  status: Status;
  mode?: Mode;
  info?: InfoResponse;
  hamp?: {
    velocity?: PercentValue;
    state?: HAMPState;
  };
  hssp?: {
    state?: HSSPState;
    loop?: Looping;
    scriptSet?: boolean;
  };
  hstp?: {
    time?: Timestamp;
    offset?: Offset;
    rtd?: Timestamp;
  };
  slide?: {
    min?: PercentValue;
    max?: PercentValue;
    position?: PositionAbsolute;
  };
  ota?: OtaLatestResponse;
  latency?: ClientServerLatency;
  uuiOpen?: boolean;
  settingScript?: boolean;
  lastInfoUpdate: number;
  error?: string;
}

export interface Funscript {
  actions: Action[];
  metadata?: FunscriptMetadata;
  inverted?: boolean;
  range?: number;
  version?: string;
  info?: string;
}

export interface FunscriptMetadata {
  duration?: number;
  average_speed?: number;
  creator?: string;
  description?: string;
  license?: string;
  notes?: string;
  performers?: string[];
  script_url?: string;
  tags?: string[];
  title?: string;
  type?: string;
  video_url?: string;
}

export interface Action {
  at: number;
  pos: number;
  subActions?: Action[];
  type?: 'first' | 'last' | 'pause' | 'prepause' | 'apex';
}

export interface LocalStorage {
  clientServerLatency: ClientServerLatency;
  handyStates: HandyState[];
}

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};

export type Events = {
  state: {
    state: HandyState;
    change: Partial<HandyState>;
  };
  connect: undefined;
  disconnect: undefined;
};

export type Actions =
  | { action: 'init'; result: HandyState; data: undefined }
  | { action: 'getStoredKey'; result: string | undefined; data: undefined }
  | { action: 'connect'; result: undefined; data: string }
  | { action: 'disconnect'; result: undefined; data: undefined }
  | { action: 'setStrokeZone'; result: undefined; data: SlideSettings }
  | { action: 'setOffset'; result: undefined; data: number }
  | { action: 'sync'; result: undefined; data: undefined }
  | { action: 'state'; result: HandyState; data: undefined };

export interface Throttled {
  timer?: NodeJS.Timeout;
  promise?: Promise<unknown>;
}
