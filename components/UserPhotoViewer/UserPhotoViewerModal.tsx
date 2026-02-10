import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { UserPhotoData } from './types';
import ZoomableImage from './ZoomableImage';

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
  const [imageLoading, setImageLoading] = useState(true);

  // Reset loading state when userData changes
  useEffect(() => {
    if (userData?.avatarUrl) {
      setImageLoading(true);
    }
  }, [userData?.avatarUrl]);

  const handleViewProfile = () => {
    if (userData?.userId) {
      onClose();
      setTimeout(() => {
        router.push(`/user-profile/${userData.userId}`);
      }, 300);
    }
  };

  if (!userData) return null;

  const hasAvatar = Boolean(userData.avatarUrl);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backdrop}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Profile Navigation Button */}
        <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
          <User size={20} color="#FFFFFF" />
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>

        {/* Image or Fallback */}
        {hasAvatar ? (
          <>
            {imageLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            )}
            <ZoomableImage
              imageUrl={userData.avatarUrl!}
              onSwipeDown={onClose}
              onLoadEnd={() => setImageLoading(false)}
            />
          </>
        ) : (
          <View style={styles.noAvatarContainer}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{getInitials(userData.userName)}</Text>
            </View>
            <Text style={styles.noAvatarText}>No profile photo available</Text>
            <Text style={styles.userName}>{userData.userName}</Text>
          </View>
        )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    zIndex: 5,
  },
  noAvatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  avatarFallback: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarInitials: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noAvatarText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    color: '#A0A0A0',
  },
});

export default UserPhotoViewerModal;
