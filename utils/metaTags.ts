import { config } from '@/services/config';

export interface TokiMetaData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  timeSlot?: string;
  category?: string;
  hostName?: string;
  imageUrl?: string;
  maxAttendees?: number;
  currentAttendees?: number;
}

export interface MetaTagData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
  locale: string;
}

const getBaseUrl = (): string => {
  try {
    return config.frontend.baseUrl;
  } catch {
    return 'http://localhost:8081';
  }
};

export const generateTokiMetaTags = (toki: TokiMetaData): MetaTagData => {
  const baseUrl = getBaseUrl();
  const tokiUrl = `${baseUrl}/toki-details?tokiId=${toki.id}`;
  
  // Generate title
  const title = `${toki.title} | Toki`;
  
  // Generate description
  let description = `Join "${toki.title}" on Toki!`;
  
  if (toki.description) {
    description = toki.description.length > 120 
      ? `${toki.description.substring(0, 117)}...`
      : toki.description;
  } else {
    const details = [];
    if (toki.location) details.push(`📍 ${toki.location}`);
    if (toki.timeSlot) details.push(`⏰ ${toki.timeSlot}`);
    if (toki.category) details.push(`🏷️ ${toki.category}`);
    if (toki.hostName) details.push(`👤 Hosted by ${toki.hostName}`);
    
    if (details.length > 0) {
      description += `\n\n${details.join('\n')}`;
    }
  }
  
  // Generate image URL with enhanced fallbacks
  let imageUrl = toki.imageUrl;
  if (!imageUrl) {
    // Fallback to category-based image or default
    const categoryImages: Record<string, string> = {
      'coffee': 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'food': 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'dinner': 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'sports': 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'music': 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'art': 'https://images.pexels.com/photos/102127/pexels-photo-102127.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'culture': 'https://images.pexels.com/photos/102127/pexels-photo-102127.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'travel': 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'nature': 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'technology': 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'work': 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'networking': 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'education': 'https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'wellness': 'https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'yoga': 'https://images.pexels.com/photos/1591055/pexels-photo-1591055.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'beach': 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'sunset': 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'jazz': 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'morning': 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'walking': 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
      'drinks': 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    };
    
    imageUrl = toki.category && categoryImages[toki.category.toLowerCase()] 
      ? categoryImages[toki.category.toLowerCase()]
      : 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop';
  }
  
  return {
    title,
    description,
    image: imageUrl,
    url: tokiUrl,
    type: 'website',
    siteName: 'Toki',
    locale: 'en_US',
  };
};

export const generateOpenGraphTags = (metaData: MetaTagData): string => {
  return `
    <!-- Primary Meta Tags -->
    <title>${metaData.title}</title>
    <meta name="title" content="${metaData.title}">
    <meta name="description" content="${metaData.description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${metaData.type}">
    <meta property="og:url" content="${metaData.url}">
    <meta property="og:title" content="${metaData.title}">
    <meta property="og:description" content="${metaData.description}">
    <meta property="og:image" content="${metaData.image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${metaData.title}">
    <meta property="og:site_name" content="${metaData.siteName}">
    <meta property="og:locale" content="${metaData.locale}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${metaData.url}">
    <meta property="twitter:title" content="${metaData.title}">
    <meta property="twitter:description" content="${metaData.description}">
    <meta property="twitter:image" content="${metaData.image}">
    <meta property="twitter:image:alt" content="${metaData.title}">
    
    <!-- Additional Meta Tags -->
    <meta name="robots" content="index, follow">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
  `.trim();
};

export const generateTokiSharePreview = (toki: TokiMetaData): {
  title: string;
  description: string;
  image: string;
  url: string;
} => {
  const metaData = generateTokiMetaTags(toki);
  return {
    title: metaData.title,
    description: metaData.description,
    image: metaData.image,
    url: metaData.url,
  };
};
