import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Constants from 'expo-constants';

// Lazy load modules to prevent crashes in dev builds
let WebBrowser: typeof import('expo-web-browser') | null = null;
let Google: typeof import('expo-auth-session/providers/google') | null = null;

try {
  WebBrowser = require('expo-web-browser');
  Google = require('expo-auth-session/providers/google');
  // Note: maybeCompleteAuthSession() is called at the app root (_layout.tsx)
} catch (e) {
  console.log('expo-auth-session not available');
}

export type GoogleSignInButtonProps = {
  onSuccess: (credentials: { idToken: string; accessToken?: string }) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
};

// Wrapper component that only renders when Google module is available
const GoogleSignInButtonInner: React.FC<GoogleSignInButtonProps & { webClientId: string; iosClientId: string }> = ({
  onSuccess,
  onError,
  disabled = false,
  webClientId,
  iosClientId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const hasClientIds = !!webClientId || !!iosClientId;

  // This will only be called when Google is available
  // Use a dummy client ID if none provided (will fail gracefully on use)
  const [request, response, promptAsync] = Google!.useIdTokenAuthRequest({
    clientId: webClientId || 'not-configured',
    iosClientId: iosClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;

      if (id_token) {
        onSuccess({
          idToken: id_token,
          accessToken: access_token,
        });
      } else {
        onError(new Error('Google Sign-In failed: No ID token received'));
      }
      setIsLoading(false);
    } else if (response?.type === 'error') {
      console.error('Google Sign-In error:', response.error);
      onError(new Error(response.error?.message || 'Google Sign-In failed'));
      setIsLoading(false);
    } else if (response?.type === 'dismiss') {
      // User cancelled
      console.log('Google Sign-In cancelled by user');
      setIsLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    if (disabled || isLoading) return;

    // Check if client IDs are configured
    if (!hasClientIds) {
      onError(new Error('Google Sign-In not configured. Please set GOOGLE_WEB_CLIENT_ID in environment variables.'));
      return;
    }

    if (!request) {
      onError(new Error('Google Sign-In is initializing. Please try again.'));
      return;
    }

    setIsLoading(true);

    try {
      await promptAsync();
    } catch (error) {
      console.error('Google Sign-In prompt error:', error);
      onError(error instanceof Error ? error : new Error('Google Sign-In failed'));
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={handleGoogleSignIn}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color="#1F1F1F" size="small" />
      ) : (
        <>
          <View style={styles.iconContainer}>
            <GoogleIcon />
          </View>
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = (props) => {
  // Get client IDs from app config
  const extra = Constants.expoConfig?.extra || {};
  const webClientId = extra.GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = extra.GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  // Check if Google Sign-In module is available
  if (!Google) {
    return null;
  }

  // On web, show button even without client IDs (will show error when clicked)
  // On native, require client IDs
  const hasClientIds = !!webClientId || !!iosClientId;
  if (!hasClientIds && Platform.OS !== 'web') {
    return null;
  }

  return (
    <GoogleSignInButtonInner
      {...props}
      webClientId={webClientId || ''}
      iosClientId={iosClientId || ''}
    />
  );
};

// Google "G" logo as SVG-like component
const GoogleIcon: React.FC = () => (
  <View style={styles.googleIconContainer}>
    <Text style={styles.googleIconText}>G</Text>
  </View>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 12,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F1F1F',
  },
});

export default GoogleSignInButton;
