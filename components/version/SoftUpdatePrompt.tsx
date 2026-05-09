import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SoftUpdatePromptProps {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  onClose: () => void;
}

export const SoftUpdatePrompt = ({
  visible,
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  onClose,
}: SoftUpdatePromptProps) => {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} testID="soft-update-modal">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            testID="soft-update-primary-button"
            style={styles.primaryButton}
            onPress={onPrimaryPress}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
});
