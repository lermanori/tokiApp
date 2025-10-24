import React, { useEffect } from 'react';
import { TokiMetaData, generateTokiMetaTags } from '@/utils/metaTags';

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
    if (typeof window === 'undefined') return;

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

    console.log('✅ [META TAGS] Updated meta tags:', metaTags.title);
  }, [tokiData, title, description, image, url, type]);

  // Return null since this component only updates meta tags
  return null;
}
