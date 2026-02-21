import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import AppleSignInButton from './AppleSignInButton';
import GoogleSignInButton from './GoogleSignInButton';
import { apiService, OAuthResponse } from '../services/api';

import Constants from 'expo-constants';

// Lazy load to prevent crashes when native modules aren't available
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
let Crypto: typeof import('expo-crypto') | null = null;
let Google: typeof import('expo-auth-session/providers/google') | null = null;

try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (e) {
  console.log('expo-apple-authentication not available');
}

try {
  Crypto = require('expo-crypto');
} catch (e) {
  console.log('expo-crypto not available');
}

try {
  Google = require('expo-auth-session/providers/google');
} catch (e) {
  console.log('expo-auth-session not available');
}

export type SocialLoginButtonsProps = {
  onSuccess: (response: OAuthResponse) => void;
  onError: (error: Error, provider: 'apple' | 'google') => void;
  onLoading?: (isLoading: boolean) => void;
  disabled?: boolean;
};

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onSuccess,
  onError,
  onLoading,
  disabled = false,
}) => {
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);

  // Check social login availability
  useEffect(() => {
    const checkAvailability = async () => {
      // Check Apple availability
      if (Platform.OS === 'web') {
        // Always show Apple button on web (will show config message when clicked)
        setIsAppleAvailable(true);
      } else if (Platform.OS === 'ios' && AppleAuthentication && Crypto) {
        try {
          const available = await AppleAuthentication.isAvailableAsync();
          setIsAppleAvailable(available);
        } catch {
          setIsAppleAvailable(false);
        }
      }

      // Check Google availability (needs client IDs and module)
      const extra = Constants.expoConfig?.extra || {};
      const webClientId = extra.GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      const iosClientId = extra.GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

      // On web, show Google button if module is available (even without client IDs for dev)
      // On iOS, require client ID
      const googleAvailable = Google && (
        Platform.OS === 'web' || !!webClientId || !!iosClientId
      );
      setIsGoogleAvailable(!!googleAvailable);

      setCheckingAvailability(false);
    };
    checkAvailability();
  }, []);

  const handleAppleSuccess = async (credentials: {
    identityToken: string;
    authorizationCode: string;
    user?: { email?: string; name?: { firstName?: string; lastName?: string } };
    nonce: string;
  }) => {
    setIsAppleLoading(true);
    onLoading?.(true);

    try {
      const response = await apiService.loginWithApple({
        identityToken: credentials.identityToken,
        authorizationCode: credentials.authorizationCode,
        user: credentials.user,
        nonce: credentials.nonce,
        isWeb: Platform.OS === 'web',
      });

      if (response.success) {
        onSuccess(response);
      } else {
        throw new Error(response.message || 'Apple Sign-In failed');
      }
    } catch (error) {
      console.error('Apple Sign-In API error:', error);
      onError(error instanceof Error ? error : new Error('Apple Sign-In failed'), 'apple');
    } finally {
      setIsAppleLoading(false);
      onLoading?.(false);
    }
  };

  const handleAppleError = (error: Error) => {
    onError(error, 'apple');
  };

  const handleGoogleSuccess = async (credentials: { idToken: string; accessToken?: string }) => {
    setIsGoogleLoading(true);
    onLoading?.(true);

    try {
      const response = await apiService.loginWithGoogle({
        idToken: credentials.idToken,
        accessToken: credentials.accessToken,
      });

      if (response.success) {
        onSuccess(response);
      } else {
        throw new Error(response.message || 'Google Sign-In failed');
      }
    } catch (error) {
      console.error('Google Sign-In API error:', error);
      onError(error instanceof Error ? error : new Error('Google Sign-In failed'), 'google');
    } finally {
      setIsGoogleLoading(false);
      onLoading?.(false);
    }
  };

  const handleGoogleError = (error: Error) => {
    onError(error, 'google');
  };

  const isLoading = isAppleLoading || isGoogleLoading;

  // Don't render anything while checking or if no social login is available
  if (checkingAvailability) {
    return null;
  }

  // Hide entire component if no social login options are available
  if (!isAppleAvailable && !isGoogleAvailable) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social login buttons */}
      <View style={styles.buttonsContainer}>
        {/* Apple Sign-In first (Apple HIG requirement) */}
        {isAppleAvailable && (
          <AppleSignInButton
            onSuccess={handleAppleSuccess}
            onError={handleAppleError}
            disabled={disabled || isLoading}
          />
        )}

        {/* Google Sign-In */}
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          disabled={disabled || isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    paddingHorizontal: 16,
  },
  buttonsContainer: {
    gap: 12,
  },
});

export default SocialLoginButtons;
