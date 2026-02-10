import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserPhotoViewerContextType, UserPhotoData } from './types';
import UserPhotoViewerModal from './UserPhotoViewerModal';

const UserPhotoViewerContext = createContext<UserPhotoViewerContextType | undefined>(undefined);

interface UserPhotoViewerProviderProps {
  children: ReactNode;
}

export const UserPhotoViewerProvider: React.FC<UserPhotoViewerProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [userData, setUserData] = useState<UserPhotoData | null>(null);

  const openUserPhoto = (userId: string, userName: string, avatarUrl?: string) => {
    setUserData({ userId, userName, avatarUrl });
    setIsVisible(true);
  };

  const closeUserPhoto = () => {
    setIsVisible(false);
    // Delay clearing userData to allow modal exit animation
    setTimeout(() => setUserData(null), 300);
  };

  return (
    <UserPhotoViewerContext.Provider value={{ openUserPhoto, closeUserPhoto, isVisible, userData }}>
      {children}
      <UserPhotoViewerModal
        visible={isVisible}
        userData={userData}
        onClose={closeUserPhoto}
      />
    </UserPhotoViewerContext.Provider>
  );
};

export const useUserPhotoViewer = (): UserPhotoViewerContextType => {
  const context = useContext(UserPhotoViewerContext);
  if (!context) {
    throw new Error('useUserPhotoViewer must be used within UserPhotoViewerProvider');
  }
  return context;
};
