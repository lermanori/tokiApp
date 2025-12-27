import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface TermsAgreementModalProps {
  visible: boolean;
  onAccept: () => Promise<void>;
  onCancel: () => void;
}

export default function TermsAgreementModal({
  visible,
  onAccept,
  onCancel,
}: TermsAgreementModalProps) {
  const [accepting, setAccepting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    if (!termsAccepted) {
      return;
    }
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Terms of Use Agreement</Text>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>Updated Terms of Use</Text>
              <Text style={styles.paragraph}>
                Our Terms of Use have been updated. Please review and accept the new terms to continue using Toki.
              </Text>
              
              <Text style={styles.sectionTitle}>No Tolerance Policy</Text>
              <Text style={styles.paragraph}>
                Toki has a zero-tolerance policy for objectionable content, abusive behavior, harassment, and any form of harmful conduct. Users who violate these terms will face immediate account termination.
              </Text>
              
              <Text style={styles.sectionTitle}>Your Responsibilities</Text>
              <Text style={styles.paragraph}>
                By using Toki, you agree to:
              </Text>
              <Text style={styles.bulletPoint}>• Not post objectionable, harmful, or illegal content</Text>
              <Text style={styles.bulletPoint}>• Treat all users with respect</Text>
              <Text style={styles.bulletPoint}>• Report any violations you encounter</Text>
              <Text style={styles.bulletPoint}>• Accept that violations may result in immediate account termination</Text>
              
              <Text style={styles.paragraph}>
                By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by the full Terms of Use and Privacy Policy.
              </Text>

              <TouchableOpacity
                style={styles.viewFullTermsButton}
                onPress={() => {
                  router.push('/terms-of-use');
                }}
              >
                <Text style={styles.viewFullTermsText}>View Full Terms of Use</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I have read and agree to the Terms of Use and Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, (!termsAccepted || accepting) && styles.acceptButtonDisabled]}
              onPress={handleAccept}
              disabled={!termsAccepted || accepting}
            >
              {accepting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept and Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 8,
  },
  viewFullTermsButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewFullTermsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
