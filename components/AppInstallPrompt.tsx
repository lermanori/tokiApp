import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';

interface AppInstallPromptProps {
  /** Current page URL to pass to app */
  currentUrl?: string;
  /** Show the prompt automatically on mount */
  autoShow?: boolean;
}

export default function AppInstallPrompt({ 
  currentUrl, 
  autoShow = true
}: AppInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only show on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    if (!iOS || !autoShow) {
      return;
    }

    // Check if we should show the prompt (not dismissed in this session)
    const hasSeenPrompt = sessionStorage.getItem('toki-app-prompt-dismissed');
    if (hasSeenPrompt) {
      return;
    }

    // Check if we've already attempted auto-open in this session (prevents refresh loop)
    const hasAttempted = sessionStorage.getItem('toki-app-auto-open-attempted');
    if (hasAttempted) {
      // Already attempted, just show prompt if app didn't open
      setShowPrompt(true);
      return;
    }

    // Get the current URL
    const url = currentUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (!url) {
      return;
    }

    // Mark that we've attempted (prevents loop even if page refreshes)
    sessionStorage.setItem('toki-app-auto-open-attempted', 'true');

    // iOS blocks programmatic universal link triggers, so just show the prompt
    // Universal links require real user interaction to work
    console.log('ℹ️ [APP PROMPT] iOS detected - showing prompt (universal links require user interaction)');
    setShowPrompt(true);
  }, [currentUrl, autoShow]);

  const handleOpenApp = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const url = currentUrl || window.location.href;
    if (!url) return;

    console.log('🚀 [APP PROMPT] User clicked "Open in App" with URL:', url);
    
    // Use window.location.href directly - this works because it's a real user action
    // iOS allows universal links when triggered by user interaction
    try {
      window.location.href = url;
    } catch (error) {
      console.error('❌ [APP PROMPT] Error opening app:', error);
      
      // Fallback: Try using custom scheme (from app.config.js: scheme: "myapp")
      const customSchemeUrl = url.replace('https://', 'myapp://').replace('http://', 'myapp://');
      console.log('🔄 [APP PROMPT] Trying custom scheme:', customSchemeUrl);
      
      Linking.openURL(customSchemeUrl).catch((err) => {
        console.error('❌ [APP PROMPT] Custom scheme also failed:', err);
        // If both fail, user doesn't have app installed - they can dismiss
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('toki-app-prompt-dismissed', 'true');
      console.log('✅ [APP PROMPT] Prompt dismissed for this session');
    }
  };

  if (!showPrompt || Platform.OS !== 'web' || !isIOS) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.prompt}>
        <View style={styles.header}>
          <Text style={styles.title}>Open in Toki App</Text>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>
          Get the best experience by opening this in the Toki app
        </Text>
        <View style={styles.buttons}>
          <TouchableOpacity 
            style={styles.openButton} 
            onPress={handleOpenApp}
          >
            <Text style={styles.openButtonText}>Open in App</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleDismiss}
          >
            <Text style={styles.cancelText}>Continue in Browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  prompt: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 28,
    color: '#666666',
    lineHeight: 28,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttons: {
    gap: 12,
  },
  openButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  openButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
});

