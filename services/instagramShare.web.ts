export class InstagramNotAvailableError extends Error {
  constructor(message = 'Instagram is not available on web') {
    super(message);
    this.name = 'InstagramNotAvailableError';
  }
}

export interface ShareToStoryInput {
  stickerBase64: string;
  backgroundBase64: string;
  attributionUrl: string;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
}

export const isInstagramAvailable = async (): Promise<boolean> => false;

export const shareTokiToInstagramStory = async (
  _input: ShareToStoryInput,
): Promise<void> => {
  throw new InstagramNotAvailableError();
};
