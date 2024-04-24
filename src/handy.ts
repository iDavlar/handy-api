import mitt, {Handler} from 'mitt';
import {
    ConnectionKey,
    Events,
    Funscript,
    HandyConfig,
    HandyState,
    LocalStorage,
    Offset,
    PercentValue,
    RecursivePartial,
    SlideSettings,
    SyncSettings,
    Throttled,
} from './types';
import {defaultConfig, updateConfig} from './config';
import {
    ConnectResult,
    GenericResult,
    HAMPState,
    HSSPState,
    HSSPPlayResult,
    Mode,
    ModeUpdateResponse,
    StateResult,
    Status,
} from './enums';
import APIWrapper from './api';
import {HandyError} from './error';
import {renderUUI} from './ui';

const defaultState: HandyState = {
    lastInfoUpdate: 0,
    status: Status.NOT_CONNECTED,
};

type HandyKey = keyof InstanceType<typeof Handy>;

let clientServerLatency = {
    avgOffset: 0,
    avgRtd: 0,
    lastSyncTime: 0,
};
let isSyncingClientServerTime = false;

export class Handy {
    API: ReturnType<typeof APIWrapper>;
    playingTimer?: NodeJS.Timeout;
    // videoPlayer?: HTMLVideoElement;
    videoPlayer?: any;

    #state: HandyState;
    #config: HandyConfig;
    #throttled: { [key in HandyKey]?: Throttled } = {};
    #emitter = mitt<Events>();

    #playingListener?: () => void;
    #pauseListener?: () => void;

    constructor(initialConfig: RecursivePartial<HandyConfig> = {}) {
        this.#state = defaultState;
        this.#config = updateConfig(defaultConfig, initialConfig);
        this.API = APIWrapper(this);
    }

    async updateState(state: Partial<HandyState>) {
        if (!Object.keys(state).length) return;

        for (const stringKey in state) {
            const key = stringKey as keyof HandyState;
            const value = state[key];
            const prevValue = this.#state[key];
            if (typeof prevValue === 'object' && typeof value === 'object') {
                this.#state = {
                    ...this.#state,
                    [key]: Object.assign(prevValue, value),
                };
            } else {
                this.#state = {...this.#state, [key]: value};
            }
        }

        this.#state.status = this.#getStatus();

        this.#emitter.emit('state', {state: this.#state, change: state});
        if (this.#state.connectionKey) await this.#setData(this.#state);
    }

    getState(): HandyState {
        return this.#state;
    }

    updateConfig(config: RecursivePartial<HandyConfig>): void {
        this.#config = updateConfig(this.#config, config);
        this.API = APIWrapper(this);
    }

    getConfig(): HandyConfig {
        return this.#config;
    }

    async connect(connectionKey: ConnectionKey): Promise<ConnectResult> {
        const storedData = await this.#getData(connectionKey);

        if (this.#state.connected) {
            this.#pauseListener?.();
            this.#removeListeners();
            this.#emitter.emit('disconnect');
        }

        if (clientServerLatency.lastSyncTime === 0) {
            const clientSyncInLocalStorage = await this.#getLocalStorage(
                'clientServerLatency',
            );
            if (clientSyncInLocalStorage !== undefined) {
                clientServerLatency = clientSyncInLocalStorage;
            }
        }

        this.#state = {...defaultState, uuiOpen: this.#state.uuiOpen};
        await this.updateState({connecting: true, latency: clientServerLatency});

        let stateChange: RecursivePartial<HandyState> = {connecting: false};

        try {
            const {connected} = await this.API.get.connected(connectionKey, true);
            stateChange.connected = connected;

            stateChange.connectionKey = connectionKey;

            if (!connected) {
                await this.updateState({error: 'Device is not connected'});
                throw new HandyError('Device is not connected');
            }

            const info = await this.API.get.info(connectionKey, true);
            stateChange.info = info;

            stateChange.ota = await this.API.get.OTA.latest(
                info.model,
                info.branch,
                true,
            );

            const {syncClientServerTime, timeBetweenSyncs} = this.#config;

            if (storedData.info?.sessionId !== info.sessionId) {
                const {slideMin, slideMax} = await this.API.get.settings(
                    connectionKey,
                    true,
                );
                stateChange.slide = {min: slideMin, max: slideMax};

                const {mode, state} = await this.API.get.status(connectionKey, true);
                if (mode === Mode.HSSP) {
                    stateChange.hssp = {state: state as HSSPState};
                }
                if (mode === Mode.HAMP) {
                    stateChange.hamp = {state: state as HAMPState};
                }

                if (info.fwVersion >= '3.2') {
                    const {offset} = await this.API.get.HSTP.offset(
                        connectionKey,
                        true,
                    );
                    stateChange.hstp = {offset};
                }

                stateChange.lastInfoUpdate = Date.now();
            } else {
                stateChange = {...storedData, ...stateChange};
            }

            const timeSinceLastSync = Date.now() - clientServerLatency.lastSyncTime;
            if (
                syncClientServerTime &&
                !isSyncingClientServerTime &&
                timeSinceLastSync > timeBetweenSyncs
            ) {
                await this.syncClientServerTime();
            }

            await this.updateState(stateChange);
            this.#emitter.emit('connect');

            return ConnectResult.CONNECTED;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.updateState(stateChange);
            return ConnectResult.NOT_CONNECTED;
        }
    }

    async disconnect(all = true) {
        if (all) await this.#removeLocalStorage('handyStates');
        else {
            const allData = (await this.#getLocalStorage('handyStates')) || [];
            const newData = allData.filter(
                state => state.connectionKey !== this.#state.connectionKey,
            );
            await this.#setLocalStorage('handyStates', newData);
        }

        this.#state = {...defaultState, uuiOpen: this.#state.uuiOpen};
        this.#emitter.emit('disconnect');
        this.#emitter.emit('state', {state: this.#state, change: {}});
    }

    on<T extends keyof Events>(event: T, handler: Handler<Events[T]>) {
        this.#emitter.on(event, handler);
    }

    off<T extends keyof Events>(event: T, handler: Handler<Events[T]>) {
        this.#emitter.off(event, handler);
    }

    attachUUI(uuiId = 'handy-ui') {
        renderUUI(this, uuiId);
    }

    async toggleUUI(open = true) {
        if (open === this.#state.uuiOpen) return;
        await this.updateState({uuiOpen: open, error: void 0});
    }

    getClientServerLatency() {
        return clientServerLatency;
    }

    async getStoredKey() {
        const data = await this.#getLocalStorage('handyStates');
        return data?.length ? data[data.length - 1].connectionKey : void 0;
    }

    setVideoPlayer(videoPlayer?: any) {
        this.#removeListeners();

        if (!videoPlayer) return;

        // if (!(videoPlayer instanceof HTMLVideoElement)) {
        //   throw new HandyError(
        //     'Provided element is not instance of HTMLVideoElement',
        //   );
        // }

        // this.#playingListener = async () => {
        //   await this.hsspPlay(videoPlayer.currentTime * 1000);
        //   this.playingTimer = setTimeout(() => {
        //     this.hsspPlay(videoPlayer.currentTime * 1000);
        //   }, this.#config.videoPlayerDelayForSecondPlay);
        // };
        //
        // this.#pauseListener = () => {
        //   if (this.getState().hssp?.state === HSSPState.PLAYING) {
        //     this.hsspStop();
        //   }
        // };
        //
        // videoPlayer.addEventListener('playing', this.#playingListener);
        // videoPlayer.addEventListener('pause', this.#pauseListener);

        if ((videoPlayer instanceof HTMLVideoElement)) {

            this.#playingListener = async () => {
                console.log(videoPlayer.currentTime * 1000);
                await this.hsspPlay(videoPlayer.currentTime * 1000);
                this.playingTimer = setTimeout(() => {
                    this.hsspPlay(videoPlayer.currentTime * 1000);
                }, this.#config.videoPlayerDelayForSecondPlay);
            };

            this.#pauseListener = () => {
                if (this.getState().hssp?.state === HSSPState.PLAYING) {
                    this.hsspStop();
                }
            };

            videoPlayer.addEventListener('playing', this.#playingListener);
            videoPlayer.addEventListener('pause', this.#pauseListener);

        } else {

            this.#playingListener = async () => {
                videoPlayer.getCurrentTime((currentTime: number) => async () => {
                    console.log(currentTime)
                    await this.hsspPlay(currentTime * 1000);
                    this.playingTimer = setTimeout(() => {
                        this.hsspPlay(currentTime * 1000);
                    }, this.#config.videoPlayerDelayForSecondPlay);
                });

            };

            this.#pauseListener = () => {
                if (this.getState().hssp?.state === HSSPState.PLAYING) {
                    this.hsspStop();
                }
            };

            videoPlayer.on('play', this.#playingListener);
            videoPlayer.on('pause', this.#pauseListener);

        }

        this.videoPlayer = videoPlayer;
    }

    async setMode(mode: Mode) {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        return this.#throttle('setMode', async () => {
            const response = await this.API.put.mode(connectionKey, {mode});

            if (response.result !== ModeUpdateResponse.result.ERROR) {
                const change: Partial<HandyState> = {mode};
                if (this.#state.hssp?.scriptSet) change.hssp = {scriptSet: false};
                await this.updateState(change);
            }

            return response;
        });
    }

    async getMode() {
        const connectionKey = await this.#getKey();
        this.#updateRequired();
        return this.#throttle('getMode', () => this.API.get.mode(connectionKey));
    }

    async syncClientServerTime(settings?: Partial<SyncSettings>) {
        if (isSyncingClientServerTime) return;
        isSyncingClientServerTime = true;

        const {syncCount, outliers} = {...this.#config.syncClient, ...settings};

        const timeTable = [];
        while (timeTable.length < syncCount) {
            try {
                const times = await this.#getServerRTDandOffset();
                timeTable.push(times);
            } catch {
                isSyncingClientServerTime = false;
                return;
            }
        }
        timeTable.sort((a, b) => a.rtd - b.rtd);

        let maxIndex = Math.max(0, timeTable.length - outliers - 1);

        let aggOffset = 0;
        let aggRtd = 0;

        for (let i = 0; i < maxIndex; i++) {
            const curr = timeTable[i];
            if (!curr.offset || !curr.rtd) continue;

            aggOffset += curr.offset;
            aggRtd += curr.rtd;
        }

        if (maxIndex === 0) maxIndex = 1;

        const latency = {
            avgOffset: Math.round(aggOffset / maxIndex),
            avgRtd: Math.round(aggRtd / maxIndex),
            lastSyncTime: Date.now(),
        };

        await this.#setLocalStorage('clientServerLatency', latency);
        clientServerLatency = latency;
        isSyncingClientServerTime = false;

        await this.updateState({latency});
    }

    async syncHandyServerTime(settings?: Partial<SyncSettings>) {
        const connectionKey = await this.#getKey();
        this.#updateRequired('3.2');
        const {syncCount, outliers} = {...this.#config.syncHandy, ...settings};

        return this.#throttle('syncHandyServerTime', () =>
            this.API.get.HSTP.sync(connectionKey, syncCount, outliers),
        );
    }

    async sync(clientSettings?: SyncSettings, handySettings?: SyncSettings) {
        await Promise.all([
            this.syncClientServerTime(clientSettings),
            this.syncHandyServerTime(handySettings),
        ]);
    }

    async getHandyRtd() {
        const connectionKey = await this.#getKey();
        this.#updateRequired('3.2');
        return this.#throttle('getHandyRtd', () =>
            this.API.get.HSTP.rtd(connectionKey),
        );
    }

    async setOffset(offset: Offset) {
        const connectionKey = await this.#getKey();
        this.#updateRequired('3.2');

        return this.#throttle('setOffset', async () => {
            const response = await this.API.put.HSTP.offset(connectionKey, {
                offset,
            });

            if (response.result === GenericResult.SUCCESS) {
                await this.updateState({hstp: {offset}});
            }

            return response;
        });
    }

    async getOffset() {
        const connectionKey = await this.#getKey();
        this.#updateRequired('3.2');
        return this.#throttle('getOffset', () =>
            this.API.get.HSTP.offset(connectionKey),
        );
    }

    async setStrokeZone(slide: SlideSettings = {min: 0, max: 100}) {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        const hasMin = 'min' in slide;
        const hasMax = 'max' in slide;

        if (!hasMin && !hasMax) {
            throw new HandyError('Min or max position value is required');
        }
        if (hasMin && (slide.min < 0 || slide.min > 100)) {
            throw new HandyError(
                'Slide min position should be in range between 0 and 100',
            );
        }
        if (hasMax && (slide.max < 0 || slide.max > 100)) {
            throw new HandyError(
                'Slide max position should be in range between 0 and 100',
            );
        }

        return this.#throttle('setStrokeZone', async () => {
            const response = await this.API.put.slide(connectionKey, slide);
            await this.updateState({slide});
            return response;
        });
    }

    async getStrokeZone() {
        const connectionKey = await this.#getKey();
        this.#updateRequired();
        return this.#throttle('getStrokeZone', () =>
            this.API.get.slide(connectionKey),
        );
    }

    async getAbsolutePosition() {
        const connectionKey = await this.#getKey();
        this.#updateRequired();
        return this.#throttle('getAbsolutePosition', () =>
            this.API.get.slidePositionAbsolute(connectionKey),
        );
    }

    async hampPlay() {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        return this.#throttle('hampPlay', async () => {
            if (this.#state.mode !== Mode.HAMP) await this.setMode(Mode.HAMP);

            const response = await this.API.put.HAMP.start(connectionKey);

            if (response.result !== StateResult.ERROR) {
                await this.API.get.HAMP.state(connectionKey);
            }

            return response;
        });
    }

    async hampStop() {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        return this.#throttle('hampStop', async () => {
            if (this.#state.mode !== Mode.HAMP) await this.setMode(Mode.HAMP);

            const response = await this.API.put.HAMP.stop(connectionKey);

            if (response.result !== StateResult.ERROR) {
                const {state} = await this.API.get.HAMP.state(connectionKey, true);
                await this.updateState({hamp: {state, velocity: 0}});
            }

            return response;
        });
    }

    async setHampVelocity(velocity: PercentValue) {
        const connectionKey = await this.#getKey();
        this.#updateRequired();
        const {hamp, mode} = this.#state;
        if (hamp?.state !== HAMPState.MOVING) {
            throw new HandyError('Velocity can only be set when the slide is moving');
        }
        if (velocity < 0 || velocity > 100) {
            throw new HandyError('Velocity should be in range between 0 and 100');
        }

        return this.#throttle('setHampVelocity', async () => {
            if (mode !== Mode.HAMP) await this.setMode(Mode.HAMP);

            const response = await this.API.put.HAMP.velocity(connectionKey, {
                velocity,
            });

            if (response.result === GenericResult.SUCCESS) {
                await this.updateState({hamp: {velocity}});
            }

            return response;
        });
    }

    async getHampVelocity() {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        return this.#throttle('getHampVelocity', async () => {
            if (this.#state.mode !== Mode.HAMP) await this.setMode(Mode.HAMP);
            return this.API.get.HAMP.velocity(connectionKey);
        });
    }

    async setScript(scriptUrl: string) {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        return this.#throttle('setScript', async () => {
            await this.updateState({settingScript: true});
            if (this.#state.mode !== Mode.HSSP) await this.setMode(Mode.HSSP);

            const response = await this.API.put.HSSP.setup(connectionKey, {
                url: scriptUrl,
            });

            await this.API.get.HSSP.state(connectionKey);

            await this.updateState({
                hssp: {scriptSet: true},
                settingScript: false,
            });

            return response;
        });
    }

    setScriptFromData(script: Funscript | string) {
        return this.#throttle('setScriptFromData', async () => {
            const scriptUrl = await uploadDataToServer(
                script,
                this.#config.scriptAPI,
            );
            return this.setScript(scriptUrl);
        });
    }

    async hsspPlay(
        startTime = 0,
        estimatedServerTime = getEstimatedServerTime(),
    ) {
        const connectionKey = await this.#getKey();
        this.#updateRequired();
        const {hssp, mode} = this.#state;

        if (!hssp?.scriptSet) {
            await this.updateState({error: 'Script set is required'});
            throw new HandyError('Script set is required');
        }

        clearTimeout(this.playingTimer);

        return this.#throttle('hsspPlay', async () => {
            if (mode !== Mode.HSSP) await this.setMode(Mode.HSSP);

            const response = await this.API.put.HSSP.play(connectionKey, {
                startTime: Math.round(startTime),
                estimatedServerTime: Math.round(estimatedServerTime),
            });

            if (response.result === HSSPPlayResult.SUCCESS) {
                await this.API.get.HSSP.state(connectionKey);
            }

            return response;
        });
    }

    async hsspStop() {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        clearTimeout(this.playingTimer);

        return this.#throttle('hsspStop', async () => {
            if (this.#state.mode !== Mode.HSSP) await this.setMode(Mode.HSSP);

            const response = await this.API.put.HSSP.stop(connectionKey);

            if (response.result === GenericResult.SUCCESS) {
                await this.API.get.HSSP.state(connectionKey);
            }

            return response;
        });
    }

    async setHsspLoop(loop = true) {
        const connectionKey = await this.#getKey();
        this.#updateRequired('3.2');

        return this.#throttle('setHsspLoop', async () => {
            if (this.#state.mode !== Mode.HSSP) await this.setMode(Mode.HSSP);

            const response = await this.API.put.HSSP.loop(connectionKey, {
                activated: loop,
            });

            if (response.result === GenericResult.SUCCESS) {
                await this.updateState({hssp: {loop}});
            }

            return response;
        });
    }

    async getHsspLoop() {
        const connectionKey = await this.#getKey();
        this.#updateRequired('3.2');

        return this.#throttle('getHsspLoop', async () => {
            if (this.#state.mode !== Mode.HSSP) await this.setMode(Mode.HSSP);

            const {activated, ...restResponse} = await this.API.get.HSSP.loop(
                connectionKey,
            );

            return {...restResponse, loop: activated};
        });
    }

    async hdsp(
        position: number,
        speed: number,
        positionType: 'absolute' | 'percent',
        speedType: 'time' | 'absolute' | 'percent',
        stopOnTarget: boolean,
        immediateResponse: boolean,
    ) {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        return this.#throttle('hdsp', async () => {
            if (this.#state.mode !== Mode.HDSP) await this.setMode(Mode.HDSP);

            if (positionType === 'absolute' && speedType === 'percent') {
                throw new HandyError(
                    '"absolute" position type is not available for "percent" speed type',
                );
            }

            if (positionType === 'absolute') {
                if (position < 0) {
                    throw new HandyError('Position can not be negative');
                }
                if (speed < 0) {
                    throw new HandyError(
                        `${speedType === 'time' ? 'Time' : 'Velocity'} can not be negative`,
                    );
                }
                if (speedType === 'time') {
                    return this.API.put.HDSP.xat(connectionKey, {
                        stopOnTarget,
                        immediateResponse,
                        position,
                        duration: speed,
                    });
                }

                return this.API.put.HDSP.xava(connectionKey, {
                    stopOnTarget,
                    immediateResponse,
                    position,
                    velocity: speed,
                });
            }

            if (position < 0 || position > 100) {
                throw new HandyError('Position should be in range between 0 and 100');
            }

            if (speedType === 'time') {
                if (speed < 0) {
                    throw new HandyError('Time can not be negative');
                }
                return this.API.put.HDSP.xpt(connectionKey, {
                    stopOnTarget,
                    immediateResponse,
                    position,
                    duration: speed,
                });
            }

            if (speedType === 'absolute') {
                if (speed < 0) {
                    throw new HandyError('Velocity can not be negative');
                }
                return this.API.put.HDSP.xpva(connectionKey, {
                    stopOnTarget,
                    immediateResponse,
                    position,
                    velocity: speed,
                });
            }

            if (speed < 0 || speed > 100) {
                throw new HandyError('Velocity should be in range between 0 and 100');
            }

            return this.API.put.HDSP.xpvp(connectionKey, {
                stopOnTarget,
                immediateResponse,
                position,
                velocity: speed,
            });
        });
    }

    async restartHandy(reconnect = true) {
        const connectionKey = await this.#getKey();
        this.#updateRequired();

        return this.#throttle('restartHandy', async () => {
            if (this.#state.mode !== Mode.MAINTENANCE) {
                await this.setMode(Mode.MAINTENANCE);
            }

            return this.API.put.MAINTENANCE.restart(connectionKey, {reconnect});
        });
    }

    async #getServerRTDandOffset() {
        const sendTime = Date.now();
        const {serverTime} = await this.API.get.serverTime();
        const receiveTime = Date.now();
        const rtd = receiveTime - sendTime;
        const estimatedServerTimeNow = serverTime + rtd / 2;
        const offset = estimatedServerTimeNow - receiveTime;
        return {rtd, offset};
    }

    async #throttle<T>(name: HandyKey, fn: () => Promise<T>): Promise<T> {
        const setThrottled = (value: Throttled) => {
            this.#throttled[name] = {...this.#throttled[name], ...value};
        };

        clearTimeout(this.#throttled[name]?.timer);
        const promise = this.#throttled[name]?.promise;
        if (promise) {
            const timer = setTimeout(
                () => fn().finally(() => setThrottled({timer: void 0})),
                this.#config.throttleDelay,
            );
            setThrottled({timer});
            return promise as Promise<T>;
        }

        const newPromise = fn().finally(() =>
            setTimeout(
                () => setThrottled({promise: void 0}),
                this.#config.throttleDelay,
            ),
        );

        setThrottled({promise: newPromise});

        return newPromise;
    }

    async #getKey() {
        const {connectionKey} = this.#state;
        if (!connectionKey) {
            await this.updateState({error: 'No device connected'});
            throw new HandyError('No device connected');
        }
        return connectionKey;
    }

    #updateRequired(version = '3') {
        if (this.#minVersion(version)) return;
        throw new HandyError('Update required');
    }

    #minVersion(version: string) {
        const {info} = this.#state;
        return !!info?.fwVersion && info.fwVersion >= version;
    }

    #getStatus() {
        const {connecting, connected, connectionKey, info, ota, settingScript} =
            this.#state;
        if (connecting) return Status.CONNECTING;

        if (connected) {
            if (info) {
                if (info.fwVersion < '3') return Status.DEPRECATED;
                if (ota) {
                    const device = info.fwVersion.split('+')[0];
                    const latest = ota.fwVersion.split('+')[0];
                    if (device !== latest) return Status.UPDATE;
                }
            }
            if (settingScript) return Status.SETTING_SCRIPT;
            return Status.CONNECTED;
        }

        if (connectionKey) return Status.CONNECTION_FAILED;

        return Status.NOT_CONNECTED;
    }

    #removeListeners() {
        if (this.#playingListener) {
            this.videoPlayer?.removeEventListener('playing', this.#playingListener);
            this.#playingListener = void 0;
        }
        if (this.#pauseListener) {
            this.videoPlayer?.removeEventListener('pause', this.#pauseListener);
            this.#pauseListener = void 0;
        }
    }

    async #setLocalStorage<K extends keyof LocalStorage, V = LocalStorage[K]>(
        key: K,
        value: V,
        connectionKey?: ConnectionKey,
    ) {
        const {localStorage} = this.#config;
        if (!localStorage) return;

        let object = connectionKey ? {[connectionKey]: value} : value;
        if (connectionKey) {
            try {
                object = {
                    ...JSON.parse((await localStorage.getItem(key)) || ''),
                    ...object,
                };
            } catch {
            }
        }
        localStorage.setItem(key, JSON.stringify(object));
    }

    async #getLocalStorage<K extends keyof LocalStorage, V = LocalStorage[K]>(
        key: K,
    ): Promise<V | undefined> {
        const {localStorage} = this.#config;
        if (!localStorage) return;

        let value: V | undefined;
        try {
            value = JSON.parse((await localStorage.getItem(key)) || '');
        } catch {
        }
        return value;
    }

    async #removeLocalStorage<K extends keyof LocalStorage>(key: K) {
        const {localStorage} = this.#config;
        await localStorage?.removeItem(key);
    }

    async #getData(connectionKey: ConnectionKey) {
        const savedStates = await this.#getLocalStorage('handyStates');
        const savedState = savedStates?.find(
            state => state.connectionKey === connectionKey,
        );
        return savedState || defaultState;
    }

    async #setData(state: HandyState) {
        const {
            mode: _mode,
            uuiOpen: _uuiOpen,
            error: _error,
            settingScript: _settingScript,
            ...restState
        } = state;
        const allData = (await this.#getLocalStorage('handyStates')) || [];
        const newData = allData.filter(
            data => data.connectionKey !== state.connectionKey,
        );
        newData.push(restState);
        await this.#setLocalStorage('handyStates', newData);
    }
}

export function init(config: RecursivePartial<HandyConfig> = {}) {
    return new Handy(config);
}

export async function uploadDataToServer(
    script: Funscript | string,
    scriptAPI = defaultConfig.scriptAPI,
) {
    const csv = convertDataToCSV(script);
    const blob = new Blob([csv], {type: 'text/plain;charset=utf-8;'});
    const body = new FormData();

    body.append('file', blob, `${Math.round(Math.random() * 100000000)}.csv`);

    const res = await fetch(`${scriptAPI}/temp/upload`, {
        method: 'POST',
        headers: {accept: 'application/json'},
        body,
    });
    const response: { url: string } | { error: string } = await res.json();
    if ('error' in response) throw new HandyError(response.error);
    return response.url;
}

export function isValidCSV(data: string) {
    const actions = data
        .trim()
        .split('\n')
        .filter(line => line.trim()[0] !== '#');
    if (actions.length < 2) return false;

    for (const action of actions) {
        const validValues = action
            .trim()
            .split(',')
            .map(value => parseInt(value, 10))
            .filter(value => !isNaN(value));
        if (validValues.length !== 2) return false;
    }
    return true;
}

export function convertDataToCSV(
    script: Funscript | string,
    lineTerminator = '\n',
): string {
    if (typeof script === 'string') {
        try {
            return convertDataToCSV(JSON.parse(script));
        } catch {
            if (!isValidCSV(script)) throw new HandyError('Invalid CSV');
            return script;
        }
    } else {
        if (script.actions?.length < 2) {
            throw new HandyError('Need at least 2 points');
        }

        return script.actions.reduce((prev, curr) => {
            return `${prev}${Math.round(curr.at)},${Math.round(
                curr.pos,
            )}${lineTerminator}`;
        }, `#Created by Handy SDK v2\n`);
    }
}

export function getEstimatedServerTime() {
    return Date.now() + clientServerLatency.avgOffset;
}
