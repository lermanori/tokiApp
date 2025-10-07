import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { Link, Copy, RefreshCw, X } from 'lucide-react-native';

type ModalMode = 'invite' | 'hide';

export interface InviteConnection {
  id?: string;
  name?: string;
  avatar?: string;
  user?: { id?: string; name?: string; avatar?: string; avatar_url?: string };
  isHidden?: boolean;
  isParticipant?: boolean;
}

interface InviteModalProps {
  visible: boolean;
  mode: ModalMode;
  connections: any[];
  selectedIds: Set<string>;
  search: string;
  onChangeSearch: (text: string) => void;
  isLoading: boolean;
  activeInviteLink: { inviteUrl: string } | null;
  onCreateInviteLink: () => void;
  onRegenerateInviteLink: () => void;
  onCopyInviteLink: (url: string) => void;
  onToggleInvitee: (userId: string) => void;
  onUnhideUser: (userId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({
  visible,
  mode,
  connections,
  selectedIds,
  search,
  onChangeSearch,
  isLoading,
  activeInviteLink,
  onCreateInviteLink,
  onRegenerateInviteLink,
  onCopyInviteLink,
  onToggleInvitee,
  onUnhideUser,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.pickerBackdrop}>
        <View style={styles.inviteModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.sectionTitle}>{mode === 'invite' ? 'Invite Users' : 'Manage Visibility'}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.inviteSearch}
            placeholder="Search connections..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={onChangeSearch}
          />

          <ScrollView style={{ maxHeight: 280 }}>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : (
              connections
                .filter((c: any) => {
                  const name = (c.user?.name || c.name || '').toLowerCase();
                  return name.includes((search || '').toLowerCase());
                })
                .map((c: any) => {
                  const id = c.user?.id || c.id;
                  const name = c.user?.name || c.name || 'Unknown';
                  const avatar = c.user?.avatar || c.user?.avatar_url || c.avatar || '';
                  const selected = selectedIds.has(id);
                  const isHidden = !!c.isHidden;
                  const isParticipant = !!c.isParticipant;
                  const initials = String(name)
                    .split(' ')
                    .slice(0, 2)
                    .map((n: string) => (n ? n.charAt(0).toUpperCase() : ''))
                    .join('');

                  if (mode === 'hide') {
                    const canHide = !isHidden && !isParticipant;
                    return (
                      <View key={id} style={[styles.connectionRow, isHidden && styles.connectionRowHidden, isParticipant && styles.connectionRowParticipant]}>
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={[styles.connectionAvatar, isHidden && styles.connectionAvatarHidden]} />
                        ) : (
                          <View style={[styles.connectionAvatar, styles.connectionAvatarFallback, isHidden && styles.connectionAvatarHidden]}>
                            <Text style={[styles.connectionAvatarInitials, isHidden && styles.connectionAvatarInitialsHidden]}>{initials}</Text>
                          </View>
                        )}
                        <View style={styles.connectionInfo}>
                          <Text style={[styles.connectionName, isHidden && styles.connectionNameHidden]}>{name}</Text>
                          {isHidden && <Text style={styles.hiddenLabel}>Hidden from this toki</Text>}
                          {isParticipant && <Text style={styles.participantLabel}>Already Joined</Text>}
                        </View>
                        <View style={styles.actionButtons}>
                          {isHidden ? (
                            <TouchableOpacity style={styles.unhideButton} onPress={() => onUnhideUser(id)}>
                              <Text style={styles.unhideButtonText}>Unhide</Text>
                            </TouchableOpacity>
                          ) : isParticipant ? (
                            <View style={styles.joinedIndicator}>
                              <Text style={styles.joinedText}>✓</Text>
                            </View>
                          ) : (
                            <TouchableOpacity style={[styles.inviteCheck, selected && styles.inviteCheckOn]} onPress={() => onToggleInvitee(id)}>
                              <Text style={[styles.inviteCheckText, selected && styles.inviteCheckTextOn]}>✓</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  }

                  const canInvite = !isHidden && !isParticipant;
                  return (
                    <View key={id} style={[styles.connectionRow, selected && styles.connectionRowSelected, isHidden && styles.connectionRowHidden, isParticipant && styles.connectionRowParticipant]}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={[styles.connectionAvatar, isHidden && styles.connectionAvatarHidden]} />
                      ) : (
                        <View style={[styles.connectionAvatar, styles.connectionAvatarFallback, isHidden && styles.connectionAvatarHidden]}>
                          <Text style={[styles.connectionAvatarInitials, isHidden && styles.connectionAvatarInitialsHidden]}>{initials}</Text>
                        </View>
                      )}
                      <View style={styles.connectionInfo}>
                        <Text style={[styles.connectionName, isHidden && styles.connectionNameHidden]}>{name}</Text>
                        {isHidden && <Text style={styles.hiddenLabel}>Hidden from this toki</Text>}
                        {isParticipant && <Text style={styles.participantLabel}>Already Joined</Text>}
                      </View>
                      <View style={styles.actionButtons}>
                        {canInvite ? (
                          <TouchableOpacity style={[styles.inviteCheck, selected && styles.inviteCheckOn]} onPress={() => onToggleInvitee(id)}>
                            <Text style={[styles.inviteCheckText, selected && styles.inviteCheckTextOn]}>✓</Text>
                          </TouchableOpacity>
                        ) : isParticipant ? (
                          <View style={styles.joinedIndicator}>
                            <Text style={styles.joinedText}>✓</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })
            )}
          </ScrollView>

          <View style={styles.inviteLinkSection}>
            <Text style={styles.inviteLinkTitle}>Invite Link</Text>
            {activeInviteLink ? (
              <View style={styles.inviteLinkContainer}>
                <TextInput
                  style={styles.inviteLinkInput}
                  value={activeInviteLink.inviteUrl}
                  editable={false}
                  selectTextOnFocus={true}
                />
                <View style={styles.inviteLinkActions}>
                  <TouchableOpacity style={styles.copyButton} onPress={() => onCopyInviteLink(activeInviteLink.inviteUrl)}>
                    <Copy size={16} color="#8B5CF6" />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.regenerateButton} onPress={onRegenerateInviteLink}>
                    <RefreshCw size={16} color="#8B5CF6" />
                    <Text style={styles.regenerateButtonText}>Regenerate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.createLinkButton} onPress={onCreateInviteLink}>
                <Link size={16} color="#FFFFFF" />
                <Text style={styles.createLinkButtonText}>Create Invite Link</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>{mode === 'invite' ? 'Send Invites' : `Apply`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default InviteModal;

const styles = StyleSheet.create({
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inviteModalContainer: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  inviteSearch: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 12,
    color: '#1C1C1C',
    fontFamily: 'Inter-Regular',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  connectionRowSelected: {
    backgroundColor: '#F5F3FF',
  },
  connectionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  connectionAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionAvatarHidden: {
    opacity: 0.5,
  },
  connectionAvatarInitials: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  connectionAvatarInitialsHidden: {
    color: '#9CA3AF',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
  connectionNameHidden: {
    color: '#9CA3AF',
  },
  connectionRowHidden: {
    opacity: 0.5,
    backgroundColor: '#F9F9F9',
  },
  participantLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    marginTop: 2,
  },
  hiddenLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 2,
  },
  connectionRowParticipant: {
    backgroundColor: '#F0FDF4',
  },
  joinedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  actionButtons: {
    marginLeft: 'auto',
  },
  unhideButton: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unhideButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  inviteCheck: {
    marginLeft: 'auto',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteCheckOn: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  inviteCheckText: {
    fontSize: 12,
    color: '#666666',
  },
  inviteCheckTextOn: {
    color: '#FFFFFF',
  },
  inviteLinkSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inviteLinkTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  inviteLinkContainer: {
    gap: 12,
  },
  inviteLinkInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  inviteLinkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  copyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  regenerateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  createLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
  },
  createLinkButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B49AFF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});


