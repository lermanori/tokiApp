import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { AlertCircle, Clock, X } from 'lucide-react-native';

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'alert' | 'clock';
  confirmLabel: string;
  cancelLabel?: string;
  confirmStyle?: 'destructive' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Cross-platform confirmation modal with two action buttons
 * Works on both iOS and web (unlike Alert.alert)
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  icon = 'alert',
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmStyle = 'primary',
  onConfirm,
  onCancel,
}) => {
  const IconComponent = icon === 'clock' ? Clock : AlertCircle;
  const iconColor = icon === 'clock' ? '#F59E0B' : '#EF4444';
  const iconBgColor = icon === 'clock' ? '#FEF3C7' : '#FEF2F2';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header with icon and close button */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
              <IconComponent size={24} color={iconColor} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
            >
              <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                confirmStyle === 'destructive' && styles.destructiveButton
              ]}
              onPress={onConfirm}
            >
              <Text style={[
                styles.primaryButtonText,
                confirmStyle === 'destructive' && styles.destructiveButtonText
              ]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#B49AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  destructiveButton: {
    backgroundColor: '#FEE2E2',
  },
  destructiveButtonText: {
    color: '#DC2626',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
});

export default ConfirmModal;
