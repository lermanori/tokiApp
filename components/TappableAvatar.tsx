import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useUserPhotoViewer } from './UserPhotoViewer/UserPhotoViewerContext';

interface TappableAvatarProps {
  userId: string;
  userName: string;
  avatarUrl?: string;
  size?: number;
  onPress?: () => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  imageStyle?: ViewStyle;
  fallbackStyle?: ViewStyle;
  initialsStyle?: TextStyle;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const TappableAvatar: React.FC<TappableAvatarProps> = ({
  userId,
  userName,
  avatarUrl,
  size = 40,
  onPress,
  disabled = false,
  containerStyle,
  imageStyle,
  fallbackStyle,
  initialsStyle,
}) => {
  const { openUserPhoto } = useUserPhotoViewer();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!disabled && avatarUrl) {
      openUserPhoto(userId, userName, avatarUrl);
    }
  };

  const baseAvatarStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const baseFallbackStyle: ViewStyle = {
    ...baseAvatarStyle,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  };

  const baseInitialsStyle: TextStyle = {
    fontSize: size * 0.35,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled && !onPress}
      style={containerStyle}
      activeOpacity={0.7}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[baseAvatarStyle, imageStyle]}
          resizeMode="cover"
        />
      ) : (
        <View style={[baseFallbackStyle, fallbackStyle]}>
          <Text style={[baseInitialsStyle, initialsStyle]}>
            {getInitials(userName)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default TappableAvatar;
