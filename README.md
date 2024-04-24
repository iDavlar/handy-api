# Handy SDK v2

The Handy SDK is a JavaScript library and a collection of examples to get you started with developing apps for the Handy.

## Installation

### From NPM

To install the latest release:

```
npm i @ohdoki/handy-sdk
```

To install a specific version:

```
npm install @ohdoki/handy-sdk@version
```

Usage:

```ts
import * as Handy from '@ohdoki/handy-sdk';

const HANDY = Handy.init();
```

### From a CDN

You can also include the client bundle from a CDN:

```html
<script src="https://unpkg.com/@ohdoki/handy-sdk"></script>
<script>
  const HANDY = Handy.init();
</script>
```

## Handy options

### `API`

Default value: `https://www.handyfeeling.com/api/handy/v2`

API URL

### `scriptAPI`

Default value: `https://scripts01.handyfeeling.com/api/script/v0`

URL to temporary upload scripts

### `UUI`

Default value:

```ts
{
  URL: 'https://universalui.handyfeeling.com',
  theme: 'default',
  compact: false,
  slim: false,
  storeURL: 'https://thehandy.com/',
  errorAlign: 'left',
}
```

Settings for universal UI

- `URL` `<string>` – URL of universal UI instance
- `theme` `<'default' | 'dark'>` – Theme of the universal UI
- `compact` `boolean` – Whether universal UI should use a compact layout (status text hidden in button)
- `slim` `boolean` – Whether universal UI should use a slim layout (reduced height of button)
- `storeURL` `string` – URL to the Handy store
- `errorAlign` `<'left' | 'center' | 'right'>` – Alignment of the error message

### `syncClientServerTime`

Default value: `true`

Whether to recalculate RTD and offset between client and server on Handy connect

### `syncClient`

Default value: `{ syncCount: 30, outliers: 10 }`

Settings for client-server sync

- `syncCount` `<number>` – The number of round-trip samples to use in synchronization
- `outliers` `<number>` – The number of sample outliers to discard in synchronization

### `syncHandy`

Default value: `{ syncCount: 30, outliers: 10 }`

Settings for Handy-server sync

- `syncCount` `<number>` – The number of round-trip samples to use in synchronization
- `outliers` `<number>` – The number of sample outliers to discard in synchronization

### `videoPlayerDelayForSecondPlay`

Default value: `2500` (ms)

Delay before second play event after a play event to adjust for video player issues

### `timeBetweenSyncs`

Default value: `3,600,000` (1 hour in ms)

Minimum time between to trigger client-server RTD and offset recalculation

### `throttleDelay`

Default value: `200` (ms)

Minimum time between asynchronous methods call

### `localStorage`

Default value:

```ts
{
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
}
```

Methods for custom storage

- `getItem` `<(key: string) => string | null | Promise<string | null>>` – Method to read from storage
- `setItem` `<(key: string, value: string) => void | Promise<void>>` – Method to write to storage
- `removeItem` `<(key: string) => void | Promise<void>>` – Method to remove item from storage

## Available methods

### `handy.connect(connectionKey)`

- `connectionKey` `<string>`
- **Returns** [`<Promise<ConnectResult>>`](#connectresult)

Connects Handy to the Handy servers

### `handy.disconnect([all])`

- `all` `<boolean>`
- **Returns** `<Promise>`

Disconnects Handy from the Handy servers. If `all` is `true` the states of all previously connected Handys saved in local storage are removed. If `all` is `false` only the state of currently connected Handy is removed. Defaults to `true`.

### `handy.on(event, handler)`

- `event` [`<Event>`](#events)
- `handler` – function that receives [`Event`](#events) data

Sets up a function that will be called whenever an event of the specified type occurs

```html
<script src="https://unpkg.com/@ohdoki/handy-sdk"></script>
<script>
  const HANDY = Handy.init();

  HANDY.on('state', ({ state, change }) => {
    console.log(state, change);
  });
</script>
```

### `handy.off(event, handler)`

- `event` [`<Event>`](#events)
- `handler` – function that receives [`Event`](#events) data

Removes listener previously registered with `handy.on()`

### `handy.attachUUI([uuiId])`

- `uuiId` `<string>` (Default `handy-ui`)

Attaches universal UI to the element with the given ID

### `handy.toggleUUI([open])`

- `open` `<boolean>` (Default `true`)
- **Returns** `<Promise>`

Opens/closes universal UI

### `handy.getClientServerLatency()`

- **Returns** `<Object>`
  - `avgOffset` `<number>`
  - `avgRtd` `<number>`
  - `lastSyncTime` `<number>`

Returns average offset and RTD between client and server

### `handy.getStoredKey()`

- **Returns** `<Promise<string | undefined>>`

Returns the connection key of the last connected Handy from the local storage

### `handy.setVideoPlayer([videoPlayer])`

- `videoPlayer` `<HTMLVideoElement>`

Adds play and pause event listeners to the element with received ID to start or stop Handy correspondingly if the script is set. Overwrites previously set listeners. If `videoPlayer` is not provided, just removed listeners

### `handy.setMode(mode)`

- `mode` [`<Mode>`](#mode)
- **Returns** `<Promise>`
  - `result` [`<ModeUpdateResult>`](#modeupdateresult)

Sets the current mode of the device

### `handy.getMode()`

- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)
  - `mode` [`<Mode>`](#mode)

Gets the current mode of the device

### `handy.syncClientServerTime([settings])`

- `settings` [`<SyncSettings>`](#syncsettings)
- **Returns** `<Promise>`

Calculates RTD and offset between client and server

### `handy.syncHandyServerTime([settings])`

- `settings` [`<SyncSettings>`](#syncsettings)
- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)
  - `time` `<number | undefined>`
  - `rtd` `<number | undefined>`

Calculates RTD and offset between Handy and server

### `handy.sync([clientSettings, handySettings])`

- `clientSettings` [`<SyncSettings>`](#syncsettings)
- `handySettings` [`<SyncSettings>`](#syncsettings)
- **Returns** `<Promise>`

Calculates RTD and offset between both client and server and Handy and server

### `handy.getHandyRtd()`

- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)
  - `rtd` `<number>`

Gets the round-trip-delay-time (rtd) between the device and the server. The rtd is calculated when the synchronization of the server and device time is triggered

### `handy.setOffset(offset)`

- `offset` `<number>`
- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)

Sets the HSTP offset of the device

The purpose of the offset value is to provide a way to manually adjust the device/server clock synchronization

### `handy.getOffset()`

- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)
  - `offset` `<number>`

Gets the HSTP offset of the device

The purpose of the offset value is to provide a way to manually adjust the device/server clock synchronization

### `handy.setStrokeZone(slide)`

- `slide` [`<SlideSettings>`](#slidesettings)
- **Returns** `<Promise>`
  - `result` [`<SlideResult>`](#slideresult)

Sets the slide min and max position. The slide's min and max position decide the range of the movement of the slide. You can update min and max individually or set both values. The `fixed` flag can be set to move the current min-max-range relative to a new min or max value. If `fixed` is `true`, the current min-max range will be shifted relative to the new value

### `handy.getStrokeZone()`

- **Returns** `<Promise>`
  - `min` [`<PercentValue>`](#percentvalue)
  - `max` [`<PercentValue>`](#percentvalue)

Gets the slide min and max position

### `handy.getAbsolutePosition()`

- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)
  - `position` `<number>`

Gets the current slide position in millimeter (mm)

### `handy.hampPlay()`

- **Returns** `<Promise>`
  - `result` [`<StateResult>`](#stateresult)

Starts alternating motion. No effect if the device is already moving

### `handy.hampStop()`

- **Returns** `<Promise>`
  - `result` [`<StateResult>`](#stateresult)

Stops alternating motion. No effect if the device is already stopped

### `handy.setHampVelocity(velocity)`

- `velocity` [`<PercentValue>`](#percentvalue)
- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)

Sets the HAMP velocity setting of the alternating motion in percent

NOTE: The velocity can only be set when HAMP mode is enabled (mode=2) and when the slide is moving (HAMP state=2). Attempting to set the velocity outside of this mode/state will result in an error response

### `handy.getHampVelocity()`

- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)
  - `velocity` [`<PercentValue>`](#percentvalue)

Gets the HAMP velocity setting of the device in percent

### `handy.setScript(scriptUrl)`

- `scriptUrl` `<string>`
- **Returns** `<Promise>`
  - `result` [`<HSSPSetupResult>`](#hsspsetupresult)

Prepares Handy for video sync by providing the device with an URL from where the script can be downloaded. This method will put your Handy on HSSP mode if it is not already

### `handy.setScriptFromData(script)`

- `script` `<Funscript | string>`
- **Returns** `<Promise>`
  - `result` [`<HSSPSetupResult>`](#hsspsetupresult)

Uploads the script to the server and prepares Handy for video sync by providing the device with an URL from which the script can be downloaded. This method will put your Handy on HSSP mode if it is not already

### `handy.hsspPlay([startTime, estimatedServerTime])`

- `startTime` `<number>` (Default `0`)
- `estimatedServerTime` `<number>` (Default result of [`Handy.getEstimatedServerTime()`](#handygetestimatedservertime))
- **Returns** `<Promise>`
  - `result` [`<HSSPPlayResult>`](#hsspplayresult)

Starts script playing from a specified time index.

For the script and a video to be correctly synchronized, the client must provide a client-side-estimated-server-time.

### `handy.hsspStop()`

- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)

Stops script playing

### `handy.setHsspLoop([loop])`

- `loop` `<boolean>` (Default `true`)
- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)

Sets the HSSP loop setting of the device. If looping is enabled, the device will start replaying the script from the beginning when the end of the script is reached

### `handy.getHsspLoop()`

- **Returns** `<Promise>`
  - `result` [`<GenericResult>`](#genericresult)
  - `loop` `<boolean>`

Gets the HSSP loop setting of the device

### `handy.hdsp(position, speed, positionType, speedType, stopOnTarget)`

- `position` `<number>`
- `speed` `<number>`
- `positionType` `<'absolute' | 'percent'>`
- `speedType` `<'time' | 'absolute' | 'percent'>`
- `stopOnTarget` `<boolean>`
- `immediateResponse` `<boolean>`
- **Returns** `<Promise>`
  - `result` [`<HDSPResult>`](#hdspresult)

Sets the next absolute/percent position of the device, and the time/absolute velocity/percent velocity the device should use to reach the position

### `Handy.uploadDataToServer(script[, scriptAPI])`

- `script` `<Funscript | string>`
- `scriptAPI` `<string>` (Default [`scriptAPI`](#scriptapi) config default value)
- **Returns** `<Promise<string>>`

Uploads the script to the server and returns a URL that could be used on the device

### `Handy.isValidCSV(data)`

- `data` `<string>`
- **Returns** `<boolean>`

Checks wehther string is valid CSV

### `Handy.convertDataToCSV(script[, lineTerminator])`

- `script` `<Funscript | string>`
- `lineTerminator` `<string>` (Default `\n`)
- **Returns** `<string>`

Converts script to CSV

### `Handy.getEstimatedServerTime()`

- **Returns** `<number>`

Estimates server time

### APIv2 methods

You can access directly all available [APIv2 methods](https://handyfeeling.com/api/handy/v2/docs/) accessing the API object in the following way:

```ts
import * as Handy from '@ohdoki/handy-sdk';

const HANDY = Handy.init();
const getModeResponse = await HANDY.API.get.mode(connectionKey);
```

## Types

### GenericResult

- `-1` - `ERROR`
- `0` - `SUCCESS`

### Mode

- `0` - `HAMP`
- `1` - `HSSP`
- `2` - `HDSP`
- `3` - `MAINTENANCE`

### ConnectResult

- `0` - `NOT_CONNECTED`
- `1` - `CONNECTED`

### SlideResult

- `0` - `ACCEPTED`
- `1` - `ACCEPTED_ROUNDED_DOWN`
- `2` - `ACCEPTED_ROUNDED_UP`

### Events

**Event**: `state` - triggered on state update

**Data**: `<Object>`

- `state` `<HandyState>` – new state of the Handy
- `change` `<Partial<HandyState>>` – change in the state

**Event**: `connect` - triggered on Handy connect

**Event**: `disconnect` - triggered on Handy disconnect

### ModeUpdateResult

- `-1` - `ERROR`
- `0` - `SUCCESS_NEW_MODE`
- `1` - `SUCCESS_SAME_MODE`

### StateResult

- `-1` - `ERROR`
- `0` - `SUCCESS_NEW_STATE`
- `1` - `SUCCESS_SAME_STATE`

### HSSPSetupResult

- `0` - `USING_CACHED`
- `1` - `DOWNLOADED`

### HSSPPlayResult

- `-1` - `ERROR`
- `0` - `SUCCESS`

### HDSPResult

- `-3` - `ERROR`
- `0` - `SUCCESS_POSITION_REACHED`
- `1` - `SUCCESS_POSITION_NOT_REACHED`
- `2` - `SUCCESS_ALREADY_AT_POSITION`
- `3` - `SUCCESS_INTERRTUPTED`

### PercentValue

- type: `double`
- minimum: `100`
- maximum: `0`
- example: `10.5`

### SyncSettings

```ts
{
  syncCount?: number;
  outliers?: number;
}
```

### SlideSettings

```ts
{
  min: PercentValue;
  max: PercentValue;
}
```

OR

```ts
{
  min: PercentValue;
  fixed?: boolean;
}
```

OR

```ts
{
  max: PercentValue;
  fixed?: boolean;
}
```

## Development

1. Run `npm run dev`. It will start watcher which will rebuild code automatically on any file change
1. Link file from `/dist/handy.umd.js` wherever you need it

## License

[MIT](https://choosealicense.com/licenses/mit/)
