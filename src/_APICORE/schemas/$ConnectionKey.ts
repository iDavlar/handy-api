/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ConnectionKey = {
  type: 'string',
  maxLength: 64,
  minLength: 5,
  pattern: '^[a-zA-Z0-9]{5,64}$',
} as const;
