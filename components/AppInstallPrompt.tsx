import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface AppInstallPromptProps {
  /** Current page URL to pass to app */
  currentUrl?: string;
  /** Show the prompt automatically on mount */
  autoShow?: boolean;
}

/**
 * Detect if the current browser is an in-app WebView (WhatsApp, Instagram, etc.)
 * These browsers can't handle custom URL schemes and won't trigger universal links
 * for same-domain navigation.
 */
function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  // Common in-app browser indicators
  return /FBAN|FBAV|Instagram|WhatsApp|Line|Snapchat|Twitter|wv|WebView/i.test(ua);
}

/**
 * Inject a Smart App Banner meta tag to let iOS show a native "OPEN" banner.
 * Works in Safari and SFSafariViewController.
 */
function injectSmartAppBanner(appArgument?: string) {
  if (typeof document === 'undefined') return;
  // Remove existing smart app banner meta if any
  const existing = document.querySelector('meta[name="apple-itunes-app"]');
  if (existing) existing.remove();

  const meta = document.createElement('meta');
  meta.name = 'apple-itunes-app';
  let content = 'app-id=6754792262';
  if (appArgument) {
    content += `, app-argument=${appArgument}`;
  }
  meta.content = content;
  document.head.appendChild(meta);
}

export default function AppInstallPrompt({
  currentUrl,
  autoShow = true
}: AppInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    // Only show on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Detect iOS (improved to handle iPad "Request Desktop Website")
    const userAgent = window.navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(!!iOS);
    setInAppBrowser(isInAppBrowser());

    if (!iOS || !autoShow) {
      return;
    }

    // Inject Smart App Banner (works in Safari, may work in SFSafariViewController)
    const url = currentUrl || window.location.href;
    try {
      const urlObj = new URL(url);
      const shareMatch = urlObj.pathname.match(/^\/share\/(.+)$/);
      if (shareMatch) {
        injectSmartAppBanner(`tokimap:/toki-details?tokiId=${shareMatch[1]}`);
      } else {
        injectSmartAppBanner(`tokimap:/${urlObj.pathname}${urlObj.search}`);
      }
    } catch {
      injectSmartAppBanner();
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

    // If we're in an in-app browser (WhatsApp, Instagram, etc.), we can't open the app
    // directly. Custom schemes cause "Cannot Connect" and universal links don't work
    // for same-domain navigation. The user needs to open in Safari.
    if (inAppBrowser) {
      console.log('📱 [APP PROMPT] In-app browser detected — cannot open app directly');
      // Can't do anything programmatically in WKWebView to open Safari.
      // The UI will already show the Safari guide, but if somehow this handler
      // is called, just do nothing (the guide is already visible).
      return;
    }

    // Regular Safari: use custom URL scheme
    try {
      const urlObj = new URL(url);

      // Handle /share/:id URLs — rewrite to /toki-details path for the app
      let appPath = urlObj.pathname;
      const shareMatch = appPath.match(/^\/share\/(.+)$/);
      if (shareMatch) {
        appPath = `/toki-details?tokiId=${shareMatch[1]}`;
      } else if (urlObj.search) {
        appPath = `${appPath}${urlObj.search}`;
      }

      const customSchemeUrl = `tokimap://toki-app.com/${appPath.replace(/^\//, '')}`;
      console.log('🔗 [APP PROMPT] Opening app via custom scheme:', customSchemeUrl);

      const now = Date.now();
      window.location.href = customSchemeUrl;

      // If the app opens, the page will be backgrounded and this timeout won't fire.
      // If the app is NOT installed, redirect to App Store.
      setTimeout(() => {
        if (Date.now() - now < 2000) {
          console.log('📱 [APP PROMPT] App did not open, redirecting to App Store');
          window.location.href = 'https://apps.apple.com/app/id6754792262';
        }
      }, 1500);
    } catch (error) {
      console.error('❌ [APP PROMPT] Error opening app:', error);
      window.location.href = 'https://apps.apple.com/app/id6754792262';
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

  // In-app browser: show instructions to open in Safari
  if (inAppBrowser) {
    return (
      <View style={styles.overlay}>
        <View style={styles.prompt}>
          <View style={styles.header}>
            <Text style={styles.title}>Open in Safari</Text>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.description}>
            To open this event in the Toki app, you need to open this page in Safari first.
          </Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Tap the <Text style={styles.bold}>⋯</Text> or <Text style={styles.bold}>share</Text> icon at the bottom of your screen
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Select <Text style={styles.bold}>"Open in Safari"</Text> or <Text style={styles.bold}>"Open in Browser"</Text>
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>The app will open automatically!</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleDismiss}
          >
            <Text style={styles.cancelText}>Continue in Browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Regular Safari: show Open in App button
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
    marginBottom: 20,
    lineHeight: 24,
  },
  stepsContainer: {
    marginBottom: 20,
    gap: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8B5CF6',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    lineHeight: 26,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 22,
  },
  bold: {
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
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
