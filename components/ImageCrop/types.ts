export interface ImageCropModalProps {
  visible: boolean;
  imageUri: string;
  aspectRatio: '1:1' | '4:3';
  mode: 'profile' | 'toki';
  onCrop: (croppedImageUri: string) => void;
  onCancel: () => void;
  onAspectRatioChange?: (ratio: '1:1' | '4:3') => void;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AspectRatioButton {
  key: '1:1' | '4:3';
  label: string;
  active: boolean;
}

export type LogLevelName = 'debug' | 'info' | 'warn' | 'error';
