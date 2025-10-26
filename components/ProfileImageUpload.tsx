import React from 'react';
import ImageUpload, { ImageUploadConfig } from './ImageUpload';

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  onImageUpdate: (imageUrl: string) => void;
  size?: number;
  showEditButton?: boolean;
}

export default function ProfileImageUpload({
  currentImageUrl,
  onImageUpdate,
  size = 80,
  showEditButton = true,
}: ProfileImageUploadProps) {
  const uploadConfig: ImageUploadConfig = {
    endpoint: '/api/profile-images/upload',
    method: 'POST',
    successMessage: 'Profile image updated successfully!',
    errorMessage: 'Failed to upload profile image. Please try again.',
  };

  return (
    <ImageUpload
      currentImageUrl={currentImageUrl}
      onImageUpdate={onImageUpdate}
      size={size}
      showEditButton={showEditButton}
      uploadConfig={uploadConfig}
      aspectRatio="1:1"
      mode="crop"
      circular={true}
    />
  );
}