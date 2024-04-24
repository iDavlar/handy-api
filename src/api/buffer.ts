import { ErrorResponse, HandyBuffer, Method, Response } from '../types';

let isRunning = false;
let buffer: HandyBuffer<Method>[] = [];

export const pushToBuffer = <T extends Method>(
  tempCommand: Omit<HandyBuffer<T>, 'timestamp'>,
) => {
  const command = {
    ...tempCommand,
    callback: tempCommand.callback as HandyBuffer['callback'],
    updateState: tempCommand.updateState as HandyBuffer['updateState'],
    timestamp: Date.now(),
  };

  if (command.skip) return runCommand(command);

  buffer.push(command);

  if (buffer.length === 1 && !isRunning) return filterCmds();
};

const runCommand = async <T extends Method>(command: HandyBuffer<T>) => {
  const {
    callback: { res: resolve, rej: reject },
    request,
    handy,
    updateState,
    noStateUpdate,
  } = command;

  try {
    const reqres = await request();
    if (isError(reqres)) throw reqres.error;

    if (handy && !noStateUpdate) {
      if (updateState) updateState(handy, reqres as Response<T>);
      else {
        let rest: Omit<typeof reqres, 'result'> = reqres;

        if ('result' in reqres) {
          const { result: _result, ...noResultRest } = reqres;
          rest = noResultRest;
        }

        const state = handy.getState();
        const update = command.sub
          ? { [command.sub]: { ...state[command.sub], ...rest } }
          : { ...rest };
        handy.updateState(update);
      }
    }

    resolve(reqres as Response<T>);
  } catch (error) {
    reject(error);
  }
};

const filterCmds = async () => {
  isRunning = true;
  const nextCmd = filterBuffer();
  if (!nextCmd) {
    isRunning = false;
    return;
  }
  await runCommand(nextCmd);
  isRunning = false;
  buffer = buffer.filter(
    ({ request, handy }) =>
      request !== nextCmd.request || handy !== nextCmd.handy,
  );
  if (buffer.length) filterCmds();
};

const filterBuffer = () => {
  const sortedActions = buffer.sort((a, b) => a.timestamp - b.timestamp);

  const unique: HandyBuffer[] = [];
  for (const action of sortedActions) {
    const idx = unique.findIndex(
      ({ request, handy }) =>
        action.request === request && action.handy === handy,
    );
    if (idx === -1) unique.push(action);
  }

  return unique[0];
};

const isError = (response: object): response is ErrorResponse => {
  return 'error' in response;
};
