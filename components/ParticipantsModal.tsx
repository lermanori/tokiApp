import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { X, UserMinus } from 'lucide-react-native';

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
}

interface ParticipantsModalProps {
  visible: boolean;
  participants: Participant[];
  search: string;
  onChangeSearch: (text: string) => void;
  isLoading: boolean;
  isHost: boolean;
  onClose: () => void;
  onRemoveParticipant: (participantId: string) => void;
}

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  visible,
  participants,
  search,
  onChangeSearch,
  isLoading,
  isHost,
  onClose,
  onRemoveParticipant,
}) => {
  // Helper function to get user initials
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const filteredParticipants = participants.filter((participant) => {
    const name = participant.name.toLowerCase();
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
        <View style={styles.participantsModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search participants..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={onChangeSearch}
          />

          <ScrollView style={{ maxHeight: 400 }}>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : (
              filteredParticipants.map((participant) => {
                const initials = getInitials(participant.name);
                
                return (
                  <View key={participant.id} style={styles.participantRow}>
                    <View style={styles.participantInfo}>
                      {participant.avatar ? (
                        <Image
                          source={{ uri: participant.avatar }}
                          style={styles.participantAvatar}
                        />
                      ) : (
                        <View style={[styles.participantAvatar, styles.participantFallbackAvatar]}>
                          <Text style={styles.participantFallbackInitials}>
                            {initials}
                          </Text>
                        </View>
                      )}
                      <View style={styles.participantDetails}>
                        <Text style={styles.participantName}>{participant.name}</Text>
                        {participant.isHost && (
                          <Text style={styles.hostLabel}>Host</Text>
                        )}
                      </View>
                    </View>
                    
                    {isHost && !participant.isHost && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => onRemoveParticipant(participant.id)}
                      >
                        <UserMinus size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.participantCount}>
              {filteredParticipants.length} participant{filteredParticipants.length !== 1 ? 's' : ''}
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
  participantsModalContainer: {
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
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantFallbackAvatar: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  participantFallbackInitials: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
    marginBottom: 2,
  },
  hostLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  participantCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ParticipantsModal;
