import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { router } from 'expo-router';

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

interface FriendsGoingModalProps {
  visible: boolean;
  friends: Friend[];
  search: string;
  onChangeSearch: (text: string) => void;
  isLoading: boolean;
  onClose: () => void;
}

const FriendsGoingModal: React.FC<FriendsGoingModalProps> = ({
  visible,
  friends,
  search,
  onChangeSearch,
  isLoading,
  onClose,
}) => {
  // Helper function to get user initials
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const filteredFriends = friends.filter((friend) => {
    const name = friend.name.toLowerCase();
    return name.includes((search || '').toLowerCase());
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.pickerBackdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.sectionTitle}>Friends Going</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={onChangeSearch}
          />

          <ScrollView style={{ maxHeight: 400 }}>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : filteredFriends.length === 0 ? (
              <Text style={styles.emptyText}>
                {search ? 'No friends found matching your search' : 'No friends are going to this event'}
              </Text>
            ) : (
              filteredFriends.map((friend) => {
                const initials = getInitials(friend.name);
                
                return (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendRow}
                    onPress={() => {
                      onClose();
                      router.push({
                        pathname: '/user-profile/[userId]',
                        params: { userId: friend.id }
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.friendInfo}>
                      {friend.avatar ? (
                        <Image
                          source={{ uri: friend.avatar }}
                          style={styles.friendAvatar}
                        />
                      ) : (
                        <View style={[styles.friendAvatar, styles.friendFallbackAvatar]}>
                          <Text style={styles.friendFallbackInitials}>
                            {initials}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.friendName}>{friend.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.friendCount}>
              {filteredFriends.length} friend{filteredFriends.length !== 1 ? 's' : ''} going
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  closeButton: {
    padding: 4,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendFallbackAvatar: {
    backgroundColor: '#B49AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  friendFallbackInitials: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  friendName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  friendCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default FriendsGoingModal;
