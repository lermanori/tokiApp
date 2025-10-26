import React from 'react';
import { Platform } from 'react-native';
import ImageCropModalIOS from './ImageCropModal.ios';
import ImageCropModalWeb from './ImageCropModal.web';
import { ImageCropModalProps } from './types';

export default function ImageCropModal(props: ImageCropModalProps) {
  if (Platform.OS === 'ios') {
    return <ImageCropModalIOS {...props} />;
  }
  return <ImageCropModalWeb {...props} />;
}

