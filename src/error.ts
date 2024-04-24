export class HandyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandyError';
  }
}
