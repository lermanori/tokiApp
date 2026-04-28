import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isFriend?: boolean;
}

interface FriendsGoingOverlayProps {
  friends: Participant[];
  onPress?: () => void;
}

// Helper function to get user initials from name
const getInitials = (name: string): string => {
  if (!name) return '?';
  const names = name.trim().split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const FriendsGoingOverlay: React.FC<FriendsGoingOverlayProps> = ({ friends, onPress }) => {
  if (!friends || friends.length === 0) {
    return null;
  }

  const displayParticipants = friends.slice(0, 3);
  const remainingCount = friends.length - displayParticipants.length;
  
  // Check if we should show "friends" or "joined" label
  // If there's at least one friend in the list, we treat it as a "friends going" overlay
  const hasFriends = friends.some(p => p.isFriend);

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={styles.overlay}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.avatarsContainer}>
        {displayParticipants.map((participant, index) => (
          <View
            key={participant.id}
            style={[
              styles.avatarWrapper,
              { zIndex: displayParticipants.length - index },
              index > 0 && styles.overlappingAvatar
            ]}
          >
            {participant.avatar ? (
              <Image
                source={{ uri: participant.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.fallbackAvatar]}>
                <Text style={styles.fallbackInitials}>
                  {getInitials(participant.name)}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
      <Text style={styles.text}>
        {hasFriends ? (
          remainingCount > 0
            ? `+${remainingCount} friend${remainingCount !== 1 ? 's are' : ' is'} going`
            : friends.length === 1
            ? '1 friend is going'
            : `${friends.length} friends are going`
        ) : (
          remainingCount > 0
            ? `+${remainingCount} people are going`
            : friends.length === 1
            ? '1 person is going'
            : `${friends.length} people are going`
        )}
      </Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F3F4F6',
  },
  overlappingAvatar: {
    marginLeft: -8,
  },
  fallbackAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B49AFF',
    borderColor: '#FFFFFF',
  },
  fallbackInitials: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
});

export default FriendsGoingOverlay;