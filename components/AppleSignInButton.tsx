import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';

// Lazy load native modules to prevent crashes in dev builds without native support
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
let Crypto: typeof import('expo-crypto') | null = null;

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

export type AppleSignInButtonProps = {
  onSuccess: (credentials: {
    identityToken: string;
    authorizationCode: string;
    user?: { email?: string; name?: { firstName?: string; lastName?: string } };
    nonce: string;
  }) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
};

const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS !== 'ios') {
        setIsAvailable(false);
        return;
      }

      if (!AppleAuthentication || !Crypto) {
        setIsAvailable(false);
        return;
      }

      try {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAvailable(available);
      } catch {
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  const handleAppleSignIn = async () => {
    if (disabled || isLoading || !isAvailable) return;
    if (!AppleAuthentication || !Crypto) {
      onError(new Error('Apple Sign-In requires a native app rebuild'));
      return;
    }

    setIsLoading(true);

    try {
      // Generate a cryptographically secure nonce
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36).substring(2, 15)
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      if (!credential.identityToken || !credential.authorizationCode) {
        throw new Error('Apple Sign-In failed: Missing credentials');
      }

      onSuccess({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        user: credential.email || credential.fullName
          ? {
              email: credential.email || undefined,
              name: credential.fullName
                ? {
                    firstName: credential.fullName.givenName || undefined,
                    lastName: credential.fullName.familyName || undefined,
                  }
                : undefined,
            }
          : undefined,
        nonce,
      });
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, don't treat as error
        console.log('Apple Sign-In cancelled by user');
      } else {
        console.error('Apple Sign-In error:', error);
        onError(error instanceof Error ? error : new Error('Apple Sign-In failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Web implementation using Apple Sign in with Apple JS
  if (Platform.OS === 'web') {
    const handleWebAppleSignIn = async () => {
      if (disabled || isLoading) return;
      setIsLoading(true);

      try {
        // Load Apple JS SDK if not already loaded
        if (typeof window !== 'undefined' && !(window as any).AppleID) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Apple Sign-In SDK'));
            document.head.appendChild(script);
          });
        }

        const AppleID = (window as any).AppleID;
        if (!AppleID) {
          throw new Error('Apple Sign-In SDK not available');
        }

        // Check for HTTPS (required by Apple)
        if (window.location.protocol !== 'https:') {
          throw new Error('Apple Sign-In requires HTTPS. Use ngrok or deploy to a production domain.');
        }

        // Generate a nonce for security
        const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Initialize Apple Sign-In
        AppleID.auth.init({
          clientId: 'com.toki.socialmap.web', // Your Services ID
          scope: 'name email',
          redirectURI: window.location.origin + '/login', // Current page
          usePopup: true,
          nonce: nonce,
        });

        // Trigger sign-in
        const response = await AppleID.auth.signIn();

        if (response.authorization?.id_token && response.authorization?.code) {
          onSuccess({
            identityToken: response.authorization.id_token,
            authorizationCode: response.authorization.code,
            user: response.user ? {
              email: response.user.email,
              name: response.user.name ? {
                firstName: response.user.name.firstName,
                lastName: response.user.name.lastName,
              } : undefined,
            } : undefined,
            nonce: nonce,
          });
        } else {
          throw new Error('Apple Sign-In failed: Missing credentials');
        }
      } catch (error: any) {
        if (error?.error === 'popup_closed_by_user') {
          console.log('Apple Sign-In cancelled by user');
        } else {
          console.error('Apple Sign-In error:', error);
          onError(error instanceof Error ? error : new Error(error?.error || 'Apple Sign-In failed'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handleWebAppleSignIn}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.appleIcon}></Text>
            </View>
            <Text style={styles.buttonText}>Sign in with Apple</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Show loading state while checking availability on iOS
  if (isAvailable === null) {
    return (
      <View style={[styles.button, styles.loadingButton]}>
        <ActivityIndicator color="#FFFFFF" size="small" />
      </View>
    );
  }

  // Don't render on iOS if not available (native modules missing or not supported)
  if (!isAvailable || !AppleAuthentication) {
    return null;
  }

  // On iOS, use the native Apple button
  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={[styles.button, styles.loadingButton]}>
          <ActivityIndicator color="#FFFFFF" size="small" />
        </View>
      ) : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
  },
  loadingButton: {
    backgroundColor: '#000000',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 12,
  },
  appleIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

export default AppleSignInButton;
