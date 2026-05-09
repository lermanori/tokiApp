import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const APP_STORE_URL = 'https://apps.apple.com/il/app/toki-social-map/id6754792262';

export default function LandingNativeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Toki Landing</Text>
        <Text style={styles.title}>The full landing experience is available on web at `/landing`.</Text>
        <Text style={styles.body}>
          On native, you can go straight into the app or open the iOS App Store listing.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.primaryButtonText}>Open App</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL(APP_STORE_URL)}>
          <Text style={styles.secondaryButtonText}>Open App Store</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#140C28',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  eyebrow: {
    color: '#B890D8',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Inter-Bold',
  },
  body: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#28C870',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
