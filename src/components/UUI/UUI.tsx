import { FunctionalComponent } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { withNaming } from '@bem-react/classname';
import { Status } from '../../enums';
import { Handy } from '../../handy';
import { Actions, Events } from '../../types';
import './UUI.scss';

const cn = withNaming({ e: '__', m: '--' });

const colors: { [key in Status]: string } = {
  [Status.NOT_CONNECTED]: 'blue',
  [Status.CONNECTING]: 'orange',
  [Status.CONNECTION_FAILED]: 'red',
  [Status.CONNECTED]: 'green',
  [Status.UPDATE]: 'green',
  [Status.DEPRECATED]: 'green',
  [Status.SETTING_SCRIPT]: 'green',
};

const texts: { [key in Status]: string } = {
  [Status.NOT_CONNECTED]: location.href.includes('handyfeeling.com')
    ? 'Connect'
    : 'The Handy',
  [Status.CONNECTING]: 'Connecting...',
  [Status.CONNECTION_FAILED]: 'Error',
  [Status.CONNECTED]: 'Connected',
  [Status.UPDATE]: 'Update',
  [Status.DEPRECATED]: 'Update',
  [Status.SETTING_SCRIPT]: 'Setting script...',
};

const modifiers: { [key in Status]: string } = {
  [Status.NOT_CONNECTED]: 'not-connected',
  [Status.CONNECTING]: 'connecting',
  [Status.CONNECTION_FAILED]: 'failed',
  [Status.CONNECTED]: 'connected',
  [Status.UPDATE]: 'update',
  [Status.DEPRECATED]: 'deprecated',
  [Status.SETTING_SCRIPT]: 'setting-script',
};

const heights: { [key in Status]?: number } = {
  [Status.UPDATE]: 338,
  [Status.DEPRECATED]: 189,
};

const IFRAME_MAGRIN = 20;
const ARROW_MAGRIN = 20;

const HEIGHT = 295;

const CONNECT_RETRIES = 5;
const UPDATE_INFO_TIMEOUT = 30000;

const ERROR_TIMEOUT = 3000;
const ERROR_FADE_TIMEOUT = 300;

interface Props {
  handy: InstanceType<typeof Handy>;
}

const UUI: FunctionalComponent<Props> = ({ handy }) => {
  const uuiCls = cn('uui');
  const button = useRef<HTMLButtonElement>(null);
  const arrow = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const retries = useRef(CONNECT_RETRIES);
  const timer = useRef<number>();
  const errorTimeout = useRef<number>();

  const [hidden, setHidden] = useState(true);
  const [left, setLeft] = useState<number>();
  const [arrowLeft, setArrowLeft] = useState<number>();
  const [width, setWidth] = useState<number>();
  const [height, setHeight] = useState(HEIGHT);
  const [status, setStatus] = useState(Status.NOT_CONNECTED);
  const [error, setError] = useState<string>();
  const [showError, setShowError] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const {
    URL: UUIURL,
    theme,
    compact,
    slim,
    storeURL,
    errorAlign,
  } = handy.getConfig().UUI;
  const iframeURL = new URL(UUIURL);
  iframeURL.searchParams.set('theme', theme);
  iframeURL.searchParams.set('storeURL', storeURL);

  const respond = useCallback(
    <T extends Actions>(action: T['action'], result: T['result']) => {
      iframe.current?.contentWindow?.postMessage({ action, result }, UUIURL);
    },
    [UUIURL],
  );

  useEffect(() => {
    const relocateIframe = () => {
      if (!button.current || !arrow.current) return;
      let newHidden = hidden;
      const frameSize = Math.min(innerWidth - IFRAME_MAGRIN * 2, 780);
      const arrowPos = arrow.current.getBoundingClientRect();
      const btnPos = button.current.getBoundingClientRect();

      const limit = frameSize / 2 + IFRAME_MAGRIN;
      const spaceLeft = btnPos.left + btnPos.width / 2;
      const spaceRight = window.innerWidth - btnPos.right + btnPos.width / 2;

      let newLeft = -(frameSize / 2 - btnPos.width / 2);
      if (spaceLeft <= limit) newLeft += limit - spaceLeft;
      else if (spaceRight <= limit) newLeft -= limit - spaceRight;

      let newArrowLeft = -(arrowPos.width / 2 - btnPos.width / 2);
      const leftLimit = newLeft + ARROW_MAGRIN;
      const rightLimit =
        newLeft +
        frameSize -
        ARROW_MAGRIN -
        arrowPos.width -
        arrowPos.width / 2;

      if (newArrowLeft < leftLimit) {
        if (leftLimit + arrowPos.left - ARROW_MAGRIN > btnPos.width) {
          newHidden = true;
        } else newArrowLeft = leftLimit;
      } else if (newArrowLeft > rightLimit) {
        if (rightLimit < 0) newHidden = true;
        else newArrowLeft = rightLimit;
      }

      handy.toggleUUI(!newHidden);
      setWidth(frameSize);
      setLeft(newLeft);
      setArrowLeft(newArrowLeft);
    };

    window.addEventListener('load', relocateIframe);
    window.addEventListener('scroll', relocateIframe);
    window.addEventListener('resize', relocateIframe);
    relocateIframe();

    return () => {
      window.removeEventListener('load', relocateIframe);
      window.removeEventListener('scroll', relocateIframe);
      window.removeEventListener('resize', relocateIframe);
    };
  }, [handy, hidden]);

  useEffect(() => {
    const handleOnline = (event: Event) => {
      setOnline(event.type === 'online');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOnline);
    };
  }, []);

  useEffect(() => {
    const handleUpdate = ({ state }: Events['state']) => {
      respond('state', state);

      setHidden(!state.uuiOpen);

      setStatus(state.status);
      setHeight(heights[state.status] || HEIGHT);

      const newError = state.error;
      clearTimeout(errorTimeout.current);
      setShowError(!!newError);
      if (newError) {
        setError(state.error);
        errorTimeout.current = window.setTimeout(
          () => setShowError(false),
          ERROR_TIMEOUT,
        );
      } else {
        errorTimeout.current = window.setTimeout(
          () => setError(void 0),
          ERROR_FADE_TIMEOUT,
        );
      }
    };
    handy.on('state', handleUpdate);
    return () => {
      handy.off('state', handleUpdate);
      clearTimeout(errorTimeout.current);
    };
  }, [handy, respond]);

  useEffect(() => {
    if ([Status.NOT_CONNECTED, Status.CONNECTION_FAILED].includes(status)) {
      clearTimeout(timer.current);
      timer.current = void 0;
      return;
    }

    if (timer.current) return;

    const updateInfo = () => {
      timer.current = window.setTimeout(async () => {
        try {
          const connectionKey = handy.getState().connectionKey;
          if (!connectionKey) throw new Error('No connection key');

          const { connected } = await handy.API.get.connected(
            connectionKey,
            true,
          );
          if (!connected) throw new Error('Not connected');

          const info = await handy.API.get.info(connectionKey);
          if (info.fwVersion >= '3.2') await handy.getOffset();
          if (info.fwVersion >= '3') await handy.getStrokeZone();

          handy.updateState({ connected, connecting: false });
          retries.current = CONNECT_RETRIES;
        } catch {
          if (!retries.current) {
            return handy.updateState({ connected: false, connecting: false });
          }

          handy.updateState({ connecting: true });
          retries.current--;
        } finally {
          updateInfo();
        }
      }, UPDATE_INFO_TIMEOUT);
    };

    updateInfo();
  }, [handy, status]);

  useEffect(() => {
    if (hidden) return;

    const closeContent = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !content.current?.contains(target) &&
        !content.current?.contains(target)
      ) {
        handy.toggleUUI(false);
      }
    };
    window.addEventListener('click', closeContent);

    return () => window.removeEventListener('click', closeContent);
  }, [handy, hidden]);

  useEffect(() => {
    const handleMessage = async ({ data }: MessageEvent<Actions>) => {
      if (data.action === 'getStoredKey') {
        respond(data.action, await handy.getStoredKey());
      } else if (data.action === 'connect') {
        handy.connect(data.data);
      } else if (data.action === 'disconnect') {
        handy.disconnect();
      } else if (data.action === 'setStrokeZone') {
        await handy.setStrokeZone(data.data);
      } else if (data.action === 'setOffset') {
        await handy.setOffset(data.data);
      } else if (data.action === 'sync') {
        handy.sync().then(() => respond(data.action, void 0));
      } else if (data.action === 'init') {
        respond('init', handy.getState());
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handy, respond]);

  return (
    <div
      className={uuiCls({
        [theme]: true,
        [modifiers[status]]: true,
        compact,
        slim,
      })}
    >
      <button
        type="button"
        className={uuiCls('button')}
        onClick={() => handy.toggleUUI(hidden)}
        ref={button}
      >
        <span className={uuiCls('button-status', { [colors[status]]: true })} />
        <svg
          className={uuiCls('button-icon')}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 595.3 794.2"
        >
          <path
            d="M288.8 215.2v269.2a73 73 0 0 1-75.6 73.4 72.4 72.4 0 0 1-68.9-72.2V216.3a73 73 0 0 1 69.4-73.3 72 72 0 0 1 53.8 21.2 72 72 0 0 1 21.3 51zM451 387.8v162.7H306.6V387.8a72.4 72.4 0 0 1 72.2-72.2 72.4 72.4 0 0 1 72.2 72.2z"
            fill="#fff"
          />
        </svg>
        {!compact && (
          <span className={uuiCls('button-text')}>{texts[status]}</span>
        )}
      </button>
      <div
        className={uuiCls('popup', {
          hidden:
            hidden ||
            left === undefined ||
            width === undefined ||
            arrowLeft === undefined,
        })}
      >
        <div
          className={uuiCls('popup-arrow')}
          ref={arrow}
          style={{ left: `${arrowLeft}px` }}
        />
        <div
          className={uuiCls('popup-content')}
          ref={content}
          style={{
            left: `${left}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          {online ? (
            <iframe src={iframeURL.toString()} ref={iframe} />
          ) : (
            <div className={uuiCls('popup-offline')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="m7.73 10 8 8H6a4 4 0 0 1-4-4 4 4 0 0 1 4-4M3 5.27 5.75 8C2.56 8.15 0 10.77 0 14a6 6 0 0 0 6 6h11.73l2 2L21 20.73 4.27 4m15.08 6.03A7.49 7.49 0 0 0 12 4c-1.5 0-2.85.43-4 1.17l1.45 1.46C10.21 6.23 11.08 6 12 6a5.5 5.5 0 0 1 5.5 5.5v.5H19a3 3 0 0 1 3 3c0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.97Z" />
              </svg>
              <p>
                <b>Offline Mode</b>
              </p>
              <p>We can’t reach Handy servers at the moment.</p>
            </div>
          )}
        </div>
      </div>
      <div
        className={uuiCls('error', {
          [errorAlign]: true,
          hidden: !showError || !hidden,
        })}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="5.49 4.54 51.16 51.24"
          className={uuiCls('error-icon')}
        >
          <circle
            cx="31.07"
            cy="30.16"
            r="24.5"
            fill="none"
            stroke="#f27474"
            stroke-width="2.5"
          />
          <path
            stroke="#f27474"
            stroke-linecap="round"
            stroke-width="2.5"
            d="m22.55 21.52 17.33 17.54M39.66 21.52l-17.08 17.1"
          />
        </svg>
        <span>{error}</span>
      </div>
    </div>
  );
};

export default UUI;
