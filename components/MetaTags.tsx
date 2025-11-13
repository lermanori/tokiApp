import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { TokiMetaData, generateTokiMetaTags } from '@/utils/metaTags';

// App Store ID - Update this with your actual App Store ID from App Store Connect
const APP_STORE_ID = 'YOUR_APP_STORE_ID'; // TODO: Replace with actual App Store ID

interface MetaTagsProps {
  tokiData?: TokiMetaData;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export default function MetaTags({ 
  tokiData, 
  title, 
  description, 
  image, 
  url, 
  type = 'website' 
}: MetaTagsProps) {
  useEffect(() => {
    // Only run on web platform where document is available
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let metaTags;

    if (tokiData) {
      // Generate meta tags from Toki data
      metaTags = generateTokiMetaTags(tokiData);
    } else {
      // Use provided data or defaults
      metaTags = {
        title: title || 'Toki - Connect Through Events',
        description: description || 'Discover and join amazing events in your area with Toki',
        image: image || 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
        url: url || 'https://toki.app',
        type,
        siteName: 'Toki',
        locale: 'en_US',
      };
    }

    // Update document title
    document.title = metaTags.title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
      }
      if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update all meta tags
    updateMetaTag('title', metaTags.title);
    updateMetaTag('description', metaTags.description);
    updateMetaTag('og:type', metaTags.type);
    updateMetaTag('og:url', metaTags.url);
    updateMetaTag('og:title', metaTags.title);
    updateMetaTag('og:description', metaTags.description);
    updateMetaTag('og:image', metaTags.image);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:image:alt', metaTags.title);
    updateMetaTag('og:site_name', metaTags.siteName);
    updateMetaTag('og:locale', metaTags.locale);
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:url', metaTags.url);
    updateMetaTag('twitter:title', metaTags.title);
    updateMetaTag('twitter:description', metaTags.description);
    updateMetaTag('twitter:image', metaTags.image);
    updateMetaTag('twitter:image:alt', metaTags.title);

    // Add Smart App Banner for iOS (more prominent than universal link banner)
    const updateSmartAppBanner = () => {
      // Only add if App Store ID is configured
      if (APP_STORE_ID === 'YOUR_APP_STORE_ID') {
        console.log('⚠️ [META TAGS] App Store ID not configured, skipping Smart App Banner');
        return;
      }

      let smartBanner = document.querySelector('meta[name="apple-itunes-app"]') as HTMLMetaElement;
      if (!smartBanner) {
        smartBanner = document.createElement('meta');
        smartBanner.setAttribute('name', 'apple-itunes-app');
        document.head.appendChild(smartBanner);
      }
      
      // Get current URL for app-argument
      const currentUrl = typeof window !== 'undefined' && window.location?.href 
        ? window.location.href 
        : metaTags.url;
      
      // Format: app-id=APP_STORE_ID, app-argument=UNIVERSAL_LINK_URL
      smartBanner.setAttribute('content', `app-id=${APP_STORE_ID}, app-argument=${currentUrl}`);
      console.log('✅ [META TAGS] Smart App Banner added:', currentUrl);
    };

    updateSmartAppBanner();

    console.log('✅ [META TAGS] Updated meta tags:', metaTags.title);
  }, [tokiData, title, description, image, url, type]);

  // Return null since this component only updates meta tags
  return null;
}
