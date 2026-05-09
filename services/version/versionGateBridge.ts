import type { UnsupportedVersionPayload } from './types';

type UnsupportedVersionHandler = (payload: UnsupportedVersionPayload) => void;

let unsupportedVersionHandler: UnsupportedVersionHandler | null = null;

export const registerUnsupportedVersionHandler = (
  handler: UnsupportedVersionHandler | null,
): void => {
  unsupportedVersionHandler = handler;
};

export const notifyUnsupportedVersion = (payload: UnsupportedVersionPayload): void => {
  unsupportedVersionHandler?.(payload);
};
