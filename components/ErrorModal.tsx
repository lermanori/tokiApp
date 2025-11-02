import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';

export type ErrorModalProps = {
  visible: boolean;
  title?: string;
  message: string;
  details?: string[];
  statusCode?: number;
  onClose: () => void;
  primaryCta?: {
    label: string;
    onPress: () => void;
  };
};

/**
 * Cross-platform error modal with branded styling
 * Shows error title, message, optional bullet points, and action buttons
 */
const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title = 'Something went wrong',
  message,
  details,
  statusCode,
  onClose,
  primaryCta,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header with close button */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <AlertCircle size={24} color="#EF4444" />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Optional details as bullet points */}
            {details && details.length > 0 && (
              <View style={styles.detailsContainer}>
                {details.map((detail, index) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.detailText}>{detail}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Optional status code for debugging */}
            {statusCode && __DEV__ && (
              <Text style={styles.debugInfo}>Error code: {statusCode}</Text>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {primaryCta && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  primaryCta.onPress();
                  onClose();
                }}
              >
                <Text style={styles.primaryButtonText}>{primaryCta.label}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.secondaryButton, !primaryCta && styles.secondaryButtonFull]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Got it</Text>
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
    maxHeight: '80%',
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
    backgroundColor: '#FEF2F2',
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
    paddingBottom: 12,
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
    marginBottom: 12,
  },
  detailsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginRight: 8,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  debugInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
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
  secondaryButtonFull: {
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
});

export default ErrorModal;

