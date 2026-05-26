// Phase-2 hook extraction from app/toki-details.tsx.
// Owns: showShareModal, editableMessage, shareUrl, stickerRef, backgroundRef,
//       isPreparingStoryShare, instagramAvailable.
// Handles: shareTokiLink, shareTokiToStoryFlow, handleShareToki, handleShareToStory,
//          shareTo{Twitter,Facebook,LinkedIn,WhatsApp,Telegram}, copyToClipboard, copyMessageToClipboard.

import { useEffect, useRef, useState } from 'react';
import { View, Share as RNShare, Platform, Linking } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import {
  shareTokiToInstagramStory,
  isInstagramAvailable,
  InstagramNotAvailableError,
} from '@/services/instagramShare';
import { generateTokiShareUrl, generateTokiShareOptions } from '@/utils/tokiUrls';
import { TokiDetails } from '../data';

interface UseShareFlowArgs {
  toki: TokiDetails | null;
}

export function useShareFlow({ toki }: UseShareFlowArgs) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const stickerRef = useRef<View>(null);
  const backgroundRef = useRef<View>(null);
  const [isPreparingStoryShare, setIsPreparingStoryShare] = useState(false);
  const [instagramAvailable, setInstagramAvailable] = useState(false);

  // Check Instagram availability once on mount (native only)
  useEffect(() => {
    let cancelled = false;
    if (Platform.OS === 'web') return;
    isInstagramAvailable()
      .then((ok) => { if (!cancelled) setInstagramAvailable(ok); })
      .catch(() => { if (!cancelled) setInstagramAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  // Share link via the platform's default share UI / custom modal
  const shareTokiLink = async () => {
    if (!toki) return;
    const url = generateTokiShareUrl(toki);

    if (Platform.OS === 'ios') {
      await RNShare.share({
        message: `${url}`,
        title: toki.title,
      });
      return;
    }

    const shareOptions = generateTokiShareOptions(toki);
    setEditableMessage(shareOptions.message);
    setShareUrl(shareOptions.url);
    setShowShareModal(true);
  };

  // Capture sticker + background and hand off to Instagram Stories
  const shareTokiToStoryFlow = async () => {
    if (!toki) return;
    setIsPreparingStoryShare(true);
    try {
      await new Promise((r) => setTimeout(r, 50));

      const [stickerBase64, backgroundBase64] = await Promise.all([
        captureRef(stickerRef as any, { format: 'png', quality: 1, result: 'base64' }),
        captureRef(backgroundRef as any, { format: 'png', quality: 0.9, result: 'base64' }),
      ]);

      await shareTokiToInstagramStory({
        stickerBase64,
        backgroundBase64,
        attributionUrl: generateTokiShareUrl(toki),
      });
    } catch (error) {
      console.error('[SHARE] Instagram story share failed', error);
      if (error instanceof InstagramNotAvailableError) {
        Toast.show({ type: 'info', text1: 'Instagram not installed', text2: 'Falling back to share menu' });
        await shareTokiLink();
        return;
      }
      Toast.show({ type: 'error', text1: 'Share failed', text2: 'Could not open Instagram. Try again.' });
    } finally {
      setIsPreparingStoryShare(false);
    }
  };

  const handleShareToki = async () => {
    if (!toki) return;
    try {
      await shareTokiLink();
    } catch (e) {
      console.error('[SHARE] link share failed', e);
    }
  };

  const handleShareToStory = () => {
    if (!toki || isPreparingStoryShare) return;
    shareTokiToStoryFlow();
  };

  const shareToTwitter = (shareOptions: any) => {
    const text = encodeURIComponent(shareOptions.twitter.message);
    const url = encodeURIComponent(shareOptions.url);
    const shareUrlOut = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
      window.open(shareUrlOut, '_blank');
    } else {
      Linking.openURL(shareUrlOut).catch(err => console.error('Failed to open Twitter:', err));
    }
  };

  const shareToFacebook = (shareOptions: any) => {
    const url = encodeURIComponent(shareOptions.url);
    const shareUrlOut = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
      window.open(shareUrlOut, '_blank');
    } else {
      Linking.openURL(shareUrlOut).catch(err => console.error('Failed to open Facebook:', err));
    }
  };

  const shareToLinkedIn = (shareOptions: any) => {
    const url = encodeURIComponent(shareOptions.url);
    const title = encodeURIComponent(shareOptions.title);
    const summary = encodeURIComponent(shareOptions.message);
    const shareUrlOut = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
      window.open(shareUrlOut, '_blank');
    } else {
      Linking.openURL(shareUrlOut).catch(err => console.error('Failed to open LinkedIn:', err));
    }
  };

  const shareToWhatsApp = (shareOptions: any) => {
    const text = encodeURIComponent(shareOptions.whatsapp.message);
    const shareUrlOut = `https://wa.me/?text=${text}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
      window.open(shareUrlOut, '_blank');
    } else {
      Linking.openURL(shareUrlOut).catch(err => console.error('Failed to open WhatsApp:', err));
    }
  };

  const shareToTelegram = (shareOptions: any) => {
    const text = encodeURIComponent(shareOptions.message);
    const url = encodeURIComponent(shareOptions.url);
    const shareUrlOut = `https://t.me/share/url?url=${url}&text=${text}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
      window.open(shareUrlOut, '_blank');
    } else {
      Linking.openURL(shareUrlOut).catch(err => console.error('Failed to open Telegram:', err));
    }
  };

  const copyToClipboard = async (shareOptions: any) => {
    await Clipboard.setStringAsync(shareOptions.url);
    Toast.show({
      type: 'success',
      text1: 'Link copied!',
      text2: 'The event link has been copied to your clipboard'
    });
  };

  const copyMessageToClipboard = async () => {
    const messageWithUrl = `${editableMessage}\n\n${shareUrl}`;
    await Clipboard.setStringAsync(messageWithUrl);
    Toast.show({
      type: 'success',
      text1: 'Share message copied!',
      text2: 'The message with link has been copied to your clipboard'
    });
  };

  return {
    showShareModal,
    setShowShareModal,
    editableMessage,
    setEditableMessage,
    shareUrl,
    setShareUrl,
    stickerRef,
    backgroundRef,
    isPreparingStoryShare,
    instagramAvailable,
    shareTokiLink,
    shareTokiToStoryFlow,
    handleShareToki,
    handleShareToStory,
    shareToTwitter,
    shareToFacebook,
    shareToLinkedIn,
    shareToWhatsApp,
    shareToTelegram,
    copyToClipboard,
    copyMessageToClipboard,
  };
}
