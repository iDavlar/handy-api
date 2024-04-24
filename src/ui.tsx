import { render } from 'preact';
import UUI from './components/UUI/UUI';
import { HandyError } from './error';
import { Handy } from './handy';

export function renderUUI(handy: InstanceType<typeof Handy>, uuiId: string) {
  const element = document.getElementById(uuiId);
  if (!element || !element.parentElement) {
    throw new HandyError(`Element with ${uuiId} ID is not found`);
  }
  render(<UUI handy={handy} />, element.parentElement, element);
}
