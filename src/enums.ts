export {
  BASEModeErrors,
  Branch,
  FirmwareStatus,
  GenericResult,
  HAMPModeErrors,
  HAMPState,
  HDSPModeErrors,
  HDSPResult,
  HSSPModeErrors,
  HSSPPlayResult,
  HSSPSetupResult,
  HSSPState,
  MAINTENANCEModeErrors,
  Mode,
  Model,
  ModeUpdateResponse,
  SlideResult,
  StateResult,
  UpdateStatusResponse,
} from './_APICORE';

export enum ConnectResult {
  NOT_CONNECTED = 0,
  CONNECTED = 1,
}

export enum Status {
  NOT_CONNECTED,
  CONNECTING,
  CONNECTION_FAILED,
  CONNECTED,
  UPDATE,
  DEPRECATED,
  SETTING_SCRIPT,
}
