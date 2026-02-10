import React, { useEffect } from 'react';
import { X, User } from 'lucide-react';
import { router } from 'expo-router';
import { UserPhotoData } from './types';
import ZoomableImage from './ZoomableImage.web';

interface UserPhotoViewerModalProps {
  visible: boolean;
  userData: UserPhotoData | null;
  onClose: () => void;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const UserPhotoViewerModal: React.FC<UserPhotoViewerModalProps> = ({
  visible,
  userData,
  onClose,
}) => {
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      window.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [visible, onClose]);

  const handleViewProfile = () => {
    if (userData?.userId) {
      onClose();
      setTimeout(() => {
        router.push(`/user-profile/${userData.userId}`);
      }, 300);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!visible || !userData) return null;

  const hasAvatar = Boolean(userData.avatarUrl);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '60px',
          left: '20px',
          zIndex: 10,
          width: '44px',
          height: '44px',
          borderRadius: '22px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={28} color="#FFFFFF" />
      </button>

      {/* Profile Navigation Button */}
      <button
        onClick={handleViewProfile}
        style={{
          position: 'absolute',
          top: '60px',
          right: '20px',
          zIndex: 10,
          backgroundColor: 'rgba(139, 92, 246, 0.9)',
          border: 'none',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingTop: '10px',
          paddingBottom: '10px',
          borderRadius: '20px',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <User size={20} color="#FFFFFF" />
        <span
          style={{
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          View Profile
        </span>
      </button>

      {/* Image or Fallback */}
      {hasAvatar ? (
        <ZoomableImage imageUrl={userData.avatarUrl!} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '100px',
              backgroundColor: '#8B5CF6',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            >
              {getInitials(userData.userName)}
            </span>
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#FFFFFF',
              marginBottom: '8px',
            }}
          >
            No profile photo available
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#A0A0A0',
            }}
          >
            {userData.userName}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPhotoViewerModal;
