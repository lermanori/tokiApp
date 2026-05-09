import React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ActionButton = {
  label: string;
  onPress: () => void;
  testID?: string;
};

interface VersionGateScreenProps {
  title: string;
  message: string;
  mode: 'loading' | 'blocked' | 'maintenance';
  primaryAction?: ActionButton;
  secondaryAction?: ActionButton;
}

export const VersionGateScreen = ({
  title,
  message,
  mode,
  primaryAction,
  secondaryAction,
}: VersionGateScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea} testID="version-gate-screen">
      <View style={styles.container}>
        {mode === 'loading' ? <ActivityIndicator size="large" color="#111827" /> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.actions}>
          {primaryAction ? (
            <TouchableOpacity
              testID={primaryAction.testID ?? 'version-gate-primary-button'}
              style={styles.primaryButton}
              onPress={primaryAction.onPress}
            >
              <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
            </TouchableOpacity>
          ) : null}
          {secondaryAction ? (
            <TouchableOpacity
              testID={secondaryAction.testID ?? 'version-gate-secondary-button'}
              style={styles.secondaryButton}
              onPress={secondaryAction.onPress}
            >
              <Text style={styles.secondaryButtonText}>{secondaryAction.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  actions: {
    marginTop: 28,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
});
