import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Modal, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Clock, Users, Heart, Share, MessageCircle, UserPlus, Edit, Trash2, CheckCircle, Lock, Link, Copy, RefreshCw, X } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import RatingPrompt from '@/components/RatingPrompt';
import InviteModal from '@/components/InviteModal';
import ParticipantsModal from '@/components/ParticipantsModal';
import { apiService } from '@/services/api';
import { getBackendUrl } from '@/services/config';
import { getActivityPhoto } from '@/utils/activityPhotos';
import { generateTokiShareUrl, generateTokiShareMessage, generateTokiShareOptions } from '@/utils/tokiUrls';
import { formatDistanceDisplay, calculateDistance } from '@/utils/distance';
import { getInitials, getActivityEmoji, getActivityLabel, formatLocationDisplay, formatTimeDisplay, canUserInvite, canUserManage, getJoinButtonText, getJoinButtonStyle } from '@/utils/tokiUtils';
import MetaTags from '@/components/MetaTags';
import TokiHeader from '@/components/TokiHeader';
import { Share as RNShare } from 'react-native';

const { width } = Dimensions.get('window');

// Constants
const MAX_PARTICIPANTS_DISPLAY = 2; // Maximum number of participants to show before "View more" button


interface TokiDetails {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  timeSlot?: string; // Add timeSlot for compatibility
  scheduledTime?: string; // Add scheduled time for smart display
  attendees: number;
  maxAttendees: number;
  category: string; // Add category for activity photos
  tags: string[];
  host: {
    id: string;
    name: string;
    avatar: string;
    rating?: number;
    bio?: string;
  };
  hostId?: string; // Alternative way to store host ID
  image: string;
  distance?: string | { km: number; miles: number };
  visibility?: 'public' | 'private' | 'connections' | 'friends';
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined' | 'completed';
  link?: string;
  latitude?: number;
  longitude?: number;
  participants?: Array<{
    id: string;
    name: string;
    avatar?: string;
    // isHost?: boolean; // not used
  }>;
}

// Fallback data for different Tokis
const tokiDetailsMap: { [key: string]: TokiDetails } = {
  '1': {
    id: '1',
    title: 'Sunset Beach Volleyball',
    description: 'Join us for a fun and casual beach volleyball game as the sun sets over the beautiful Tel Aviv coastline. Perfect for all skill levels - whether you\'re a pro or just want to have fun! We\'ll play a few games, enjoy the sunset, and maybe grab drinks afterward.',
    location: 'Gordon Beach, Tel Aviv',
    time: '6:30 PM - 8:30 PM',
    attendees: 8,
    maxAttendees: 12,
    category: 'sports',
    tags: ['sports', 'beach', 'sunset', 'volleyball'],
    host: {
      id: 'host-1',
      name: 'Maya Cohen',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.8,
      bio: 'Beach volleyball enthusiast and sunset lover. Organizing fun games for 3+ years!',
    },
    image: '', // Use getActivityPhoto fallback
    distance: '0.3 km',
    isHostedByUser: true,
    joinStatus: 'joined',
  },
  '2': {
    id: '2',
    title: 'Morning Yoga in the Park',
    description: 'Start your day with peaceful yoga session in beautiful Yarkon Park. All levels welcome! Bring your own mat or rent one on-site. We\'ll focus on gentle stretches and mindfulness to set a positive tone for your day.',
    location: 'Yarkon Park, Tel Aviv',
    time: '7:00 AM - 8:30 AM',
    attendees: 12,
    maxAttendees: 20,
    category: 'wellness',
    tags: ['wellness', 'yoga', 'morning', 'mindfulness'],
    host: {
      id: 'host-2',
      name: 'Maya Cohen',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.9,
      bio: 'Certified yoga instructor passionate about wellness and community building.',
    },
    image: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '1.5 km',
    isHostedByUser: true,
    joinStatus: 'joined',
  },
  '3': {
    id: '3',
    title: 'Rothschild Coffee & Work',
    description: 'Join fellow digital nomads and remote workers for a productive coworking session at one of Tel Aviv\'s most charming cafés. Bring your laptop, grab a great coffee, and enjoy the company of like-minded professionals. Perfect for networking and getting work done in a vibrant atmosphere.',
    location: 'Rothschild Boulevard, Tel Aviv',
    time: '2:00 PM - 6:00 PM',
    attendees: 5,
    maxAttendees: 8,
    category: 'coffee',
    tags: ['coffee', 'work', 'networking', 'coworking'],
    host: {
      id: 'host-3',
      name: 'Daniel Levy',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.6,
      bio: 'Tech entrepreneur and coffee enthusiast. Love connecting with fellow creatives and professionals.',
    },
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '0.8 km',
    isHostedByUser: false,
    joinStatus: 'approved',
  },
  '4': {
    id: '4',
    title: 'Jazz Night at Dizengoff',
    description: 'Experience the magic of live jazz in an intimate setting on Dizengoff Street. Tonight features a local trio playing classic standards and modern interpretations. Great drinks, amazing music, and wonderful company guaranteed. Perfect for jazz lovers and those looking to discover something new.',
    location: 'Dizengoff Street, Tel Aviv',
    time: '8:00 PM - 11:00 PM',
    attendees: 16,
    maxAttendees: 20,
    category: 'music',
    tags: ['music', 'jazz', 'drinks', 'nightlife'],
    host: {
      id: 'host-4',
      name: 'Yael Rosenberg',
      avatar: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.9,
      bio: 'Jazz aficionado and event organizer. Passionate about bringing people together through music.',
    },
    image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '1.2 km',
    isHostedByUser: false,
    joinStatus: 'not_joined',
  },
  '5': {
    id: '5',
    title: 'Tech Meetup & Networking',
    description: 'Join fellow tech enthusiasts for an evening of networking, knowledge sharing, and collaboration. Whether you\'re a developer, designer, product manager, or just interested in tech, this is the perfect opportunity to connect with like-minded professionals.',
    location: 'WeWork, Rothschild Boulevard',
    time: '7:00 PM - 9:00 PM',
    attendees: 7,
    maxAttendees: 15,
    category: 'work',
    tags: ['tech', 'networking', 'professional', 'collaboration'],
    host: {
      id: 'host-5',
      name: 'David Chen',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.7,
      bio: 'Senior software engineer and tech community organizer. Passionate about fostering meaningful connections in the tech world.',
    },
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '0.9 km',
    isHostedByUser: false,
    joinStatus: 'not_joined',
  }
};

export default function TokiDetailsScreen() {
  const { state, actions } = useApp();
  const params = useLocalSearchParams();
  const [toki, setToki] = useState<TokiDetails | null>(null);
  const fromEdit = params.fromEdit === 'true';
  const fromCreate = params.fromCreate === 'true';
  const [isLoading, setIsLoading] = useState(true);
  
  const [isLiked, setIsLiked] = useState(false);

  // Web-compatible alert helper
  const showAlert = (title: string, message: string) => {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}: ${message}`);
    } else {
      console.log(`${title}: ${message}`);
    }
  };
  const [isJoining, setIsJoining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [participantsForRating, setParticipantsForRating] = useState<Array<{
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
  }>>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastProcessedTokiId = useRef<string | null>(null);
  const [showHostOnlyConfirm, setShowHostOnlyConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  
  // Invite Link Management (integrated into invite modal)
  const [inviteLinks, setInviteLinks] = useState<any[]>([]);
  const [activeInviteLink, setActiveInviteLink] = useState<any>(null);
  const [isLoadingInviteLinks, setIsLoadingInviteLinks] = useState(false);
  const [inviteLinkMessage, setInviteLinkMessage] = useState('');
  const [inviteLinkMaxUses, setInviteLinkMaxUses] = useState<number | null>(null);
  
  // Remove Participant Confirmation
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<{id: string, name: string} | null>(null);

  // Function to format time display smartly

  // Check if Toki is saved on mount
  useEffect(() => {
    if (params.tokiId) {
      checkSavedStatus();
    }
  }, [params.tokiId]);

  const checkSavedStatus = async () => {
    try {
      console.log('🔍 Checking saved status for Toki:', params.tokiId);
      const saved = await actions.checkIfSaved(params.tokiId as string);
      console.log('💾 Toki saved status:', saved);
      setIsLiked(saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSaveToggle = async () => {
    if (isSaving || !params.tokiId) return;

    console.log('💝 Toggling save status for Toki:', params.tokiId, 'Current state:', isLiked);

    try {
      setIsSaving(true);
      if (isLiked) {
        console.log('🗑️ Unsaving Toki...');
        const success = await actions.unsaveToki(params.tokiId as string);
        if (success) {
          setIsLiked(false);
          console.log('✅ Toki unsaved successfully');
        }
      } else {
        console.log('💾 Saving Toki...');
        const success = await actions.saveToki(params.tokiId as string);
        if (success) {
          setIsLiked(true);
          console.log('✅ Toki saved successfully');
        }
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
      Alert.alert('Error', 'Failed to update saved status. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  const loadTokiData = async (tokiId: string, retryCount = 0) => {
    if (!tokiId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/tokis/${tokiId}`, {
        headers: {
          'Authorization': `Bearer ${apiService.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tokiData = data.data;

        // Transform backend data to match our interface
        const transformedToki: TokiDetails = {
          id: tokiData.id,
          title: tokiData.title,
          description: tokiData.description,
          location: tokiData.location,
          time: tokiData.timeSlot,
          scheduledTime: tokiData.scheduledTime, // Ensure scheduledTime is loaded
          attendees: tokiData.currentAttendees || 0,        // Ensure it's not undefined
          maxAttendees: tokiData.maxAttendees || 0,        // Ensure it's not undefined
          category: tokiData.category || 'social', // Add category from backend
          tags: tokiData.tags || [],
          host: {
            id: tokiData.host?.id || '', // Ensure host ID is always present
            name: tokiData.host?.name || 'Unknown',
            avatar: tokiData.host?.avatar,
            rating: tokiData.host?.rating,
            bio: tokiData.host?.bio,
          },
          hostId: tokiData.host?.id, // Store host ID for potential use
          image: tokiData.imageUrl || '', // Let Image component use getActivityPhoto fallback
          distance: (() => {
            // Priority 1: Use distance from API response (most accurate, always up-to-date)
            if (tokiData.distance) {
              return typeof tokiData.distance === 'object' 
                ? `${tokiData.distance.km} km` 
                : tokiData.distance;
            }
            
            // Priority 2: Try to get distance from state.tokis (matches card display)
            const tokiFromState = state.tokis.find(t => t.id === tokiData.id);
            if (tokiFromState?.distance) {
              return tokiFromState.distance;
            }
            
            // Priority 3: Calculate distance from user's location to toki location if both have coordinates
            const userLat = (state.currentUser as any)?.latitude;
            const userLng = (state.currentUser as any)?.longitude;
            const tokiLat = tokiData.latitude;
            const tokiLng = tokiData.longitude;
            
            if (userLat && userLng && tokiLat && tokiLng) {
              const distanceKm = calculateDistance(userLat, userLng, tokiLat, tokiLng);
              return `${distanceKm} km`;
            }
            
            return undefined;
          })(),
          visibility: tokiData.visibility,
          isHostedByUser: tokiData.host?.id === state.currentUser?.id,
          joinStatus: tokiData.joinStatus || 'not_joined', // Use backend join status
          link: tokiData.externalLink || undefined,
          latitude: tokiData.latitude,
          longitude: tokiData.longitude,
          participants: (tokiData.participants || []).map((p: any) => ({
            id: p?.user?.id || p?.id || '',
            name: p?.user?.name || p?.name || 'Unknown',
            avatar: p?.user?.avatar || p?.avatar || undefined,
          })),
        };

        console.log('🔍 Ownership check:', {
          hostId: tokiData.host?.id,
          currentUserId: state.currentUser?.id,
          isHostedByUser: tokiData.host?.id === state.currentUser?.id,
          hasCurrentUser: !!state.currentUser?.id,
          hasHostId: !!tokiData.host?.id
        });
        
        console.log('🔍 Toki data for invite button:', {
          visibility: tokiData.visibility,
          joinStatus: tokiData.joinStatus,
          isHostedByUser: tokiData.host?.id === state.currentUser?.id
        });

        setToki(transformedToki);

        // Check saved status after Toki data is loaded
        checkSavedStatus();

        // If this is a newly created Toki and distance is missing or 0, retry after a delay
        // This handles the case where the toki was just created and needs to be fully persisted
        const hasNoDistance = !tokiData.distance || (typeof tokiData.distance === 'object' && (tokiData.distance.km === 0 || tokiData.distance.km === null));
        
        if (fromCreate && hasNoDistance && retryCount < 3) {
          console.log(`📍 [TOKI DETAILS] No distance found for newly created toki, retrying in 1.5 seconds... (attempt ${retryCount + 1}/3)`);
          setTimeout(() => {
            loadTokiData(tokiId, retryCount + 1);
          }, 1500);
        }

        // If this is a newly created Toki and it doesn't have images yet, retry after a delay
        // This handles the case where images are still being uploaded
        if (!tokiData.imageUrl && retryCount < 3) {
          console.log(`📸 [TOKI DETAILS] No images found, retrying in 2 seconds... (attempt ${retryCount + 1}/3)`);
          setTimeout(() => {
            loadTokiData(tokiId, retryCount + 1);
          }, 2000);
        }
      } else {
        console.error('Failed to load Toki data');
        // Fallback to predefined data
        const fallbackData = tokiDetailsMap[tokiId];
        if (fallbackData) {
          setToki(fallbackData);
          // Check saved status for fallback data too
          checkSavedStatus();
        }
      }
    } catch (error) {
      console.error('Error loading Toki data:', error);
      // Fallback to predefined data
      const fallbackData = tokiDetailsMap[tokiId];
      if (fallbackData) {
        setToki(fallbackData);
        // Check saved status for fallback data too
        checkSavedStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when component mounts or tokiId changes
  useEffect(() => {
    const tokiId = params.tokiId as string;

    if (tokiId && tokiId !== lastProcessedTokiId.current) {
      lastProcessedTokiId.current = tokiId;
      // Ensure current user is loaded before loading Toki data
      if (!state.currentUser?.id) {
        actions.loadCurrentUser().then(() => {
          loadTokiData(tokiId);
        });
      } else {
        loadTokiData(tokiId);
      }
    }
  }, [params.tokiId, state.currentUser?.id]);

  // Force reload when coming from create (works on all platforms)
  useEffect(() => {
    if (fromCreate && params.tokiId) {
      const tokiId = params.tokiId as string;
      // Add a small delay to ensure database is ready, then force a fresh fetch
      const timer = setTimeout(() => {
        console.log('📍 [TOKI DETAILS] Forcing fresh data load after creation');
        loadTokiData(tokiId, 0); // Start fresh, retry logic will handle distance
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [fromCreate, params.tokiId]);

  // Refresh data when screen comes into focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      const tokiId = params.tokiId as string;
      if (tokiId && !fromCreate) {
        // Only auto-refresh on focus if not coming from create (we handle that separately)
        loadTokiData(tokiId);
      }
    }, [params.tokiId, fromCreate])
  );

  const handleJoinRequest = async () => {
    if (!toki) return;

    if (toki.isHostedByUser) {
      Alert.alert('Your Event', 'This is your event! You can manage it from your profile.');
      return;
    }

    // If user is already joined/approved, navigate to chat
    if (toki.joinStatus === 'joined' || toki.joinStatus === 'approved') {
      handleChatPress();
      return;
    }

    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to join. Please check your connection and try again.');
      return;
    }

    setIsJoining(true);

    try {
      switch (toki.joinStatus) {
        case 'not_joined':
          // Send join request using the backend; backend may auto-join if invited
          const joinResultStatus = await actions.sendJoinRequest(toki.id);
          if (joinResultStatus === 'joined') {
            setToki(prev => prev ? ({ ...prev, joinStatus: 'joined' }) : null);
            setTimeout(() => { loadTokiData(toki.id); }, 300);
            console.log('✅ Auto-joined via invite for Toki:', toki.id);
          } else if (joinResultStatus === 'pending') {
            setToki(prev => prev ? ({ ...prev, joinStatus: 'pending' }) : null);
            console.log('✅ Join request pending for Toki:', toki.id);
          } else {
            Alert.alert('Error', 'Failed to send join request. Please try again.');
          }
          break;

        case 'pending':
          Alert.alert('Request Pending', 'Your join request is waiting for host approval.');
          break;
      }
    } catch (error) {
      console.error('❌ Error joining Toki:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleChatPress = () => {
    if (!toki) return;

    // Only allow chat access if user is approved or joined
    if (toki.joinStatus === 'approved' || toki.joinStatus === 'joined' || toki.isHostedByUser) {
      router.push({
        pathname: '/chat',
        params: {
          tokiId: toki.id,
          otherUserName: toki.title,
          isGroup: 'true'
        }
      });
    } else {
      Alert.alert(
        'Chat Access Restricted',
        'You need to be approved by the host to access the group chat. Please send a join request first.'
      );
    }
  };

  // Invite flow will use a modal with connections selection
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantsSearch, setParticipantsSearch] = useState('');
  const [isRemovingParticipant, setIsRemovingParticipant] = useState(false);
  const [modalMode, setModalMode] = useState<'invite' | 'hide'>('invite');
  const [inviteConnections, setInviteConnections] = useState<any[]>([]);
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<Set<string>>(new Set());
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [hiddenCount, setHiddenCount] = useState<number>(0);

  const handleInvitePress = async () => {
    if (!toki) return;
    
    // Allow hosts or attendees of public tokis to invite
    const canInvite = toki.isHostedByUser || (toki.visibility === 'public' && (toki.joinStatus === 'joined' || toki.joinStatus === 'approved'));
    if (!canInvite) {
      Alert.alert('Cannot invite', 'Only hosts or attendees of public events can invite users.');
      return;
    }
    
    try {
      setIsLoadingInvites(true);
      setModalMode('invite');
      const { connections } = await actions.getConnectionsForToki(toki.id);
      
      // Build participant set from the currently loaded toki data
      const participantIds = new Set((toki.participants || []).map((p: any) => p.user?.id || p.id));
      
      // Mark participants in connections
      const connectionsWithStatus = (connections || []).map((conn: any) => ({
        ...conn,
        isParticipant: participantIds.has(conn.user?.id || conn.id),
      }));
      
      // For non-hosts, filter out hidden users since they can't see them
      const filteredConnections = toki.isHostedByUser 
        ? connectionsWithStatus 
        : connectionsWithStatus.filter((conn: any) => !conn.isHidden);
      
      setInviteConnections(filteredConnections);
      setSelectedInviteeIds(new Set());
      setShowInviteModal(true);
      
      // Load active invite link
      await loadInviteLinks();
    } catch (e) {
      Alert.alert('Error', 'Failed to load connections');
    } finally {
      setIsLoadingInvites(false);
    }
  };

  // New share function for sharing URLs
  const handleShareToki = async () => {
    console.log('🔍 [SHARE] ===== SHARE FUNCTION CALLED =====');
    console.log('🔍 [SHARE] Share button pressed');
    if (!toki) {
      console.log('🔍 [SHARE] No Toki data available to share.');
      return;
    }
    console.log('🔍 [SHARE] Toki data:', { id: toki.id, title: toki.title });
    
    try {
      console.log('🔍 [SHARE] Generating share options...');
      const shareOptions = generateTokiShareOptions(toki);
      console.log('🔍 [SHARE] Share options generated:', shareOptions);
      
      // Initialize editable message and URL
      setEditableMessage(shareOptions.message);
      setShareUrl(shareOptions.url);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error sharing Toki:', error);
      
      // Fallback to simple share
      try {
        const shareUrl = generateTokiShareUrl(toki);
        await RNShare.share({
          message: shareUrl,
          url: shareUrl,
          title: toki.title
        });
      } catch (shareError) {
        console.error('Error with fallback share:', shareError);
        // Final fallback to clipboard
        try {
          const shareUrl = generateTokiShareUrl(toki);
          await Clipboard.setStringAsync(shareUrl);
          Toast.show({
            type: 'success',
            text1: 'Link copied!',
            text2: 'The event link has been copied to your clipboard'
          });
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError);
          Toast.show({
            type: 'error',
            text1: 'Share failed',
            text2: 'Unable to share the event. Please try again.'
          });
        }
      }
    }
  };

  // Social media share functions
  const shareToTwitter = (shareOptions: any) => {
    const text = encodeURIComponent(shareOptions.twitter.message);
    const url = encodeURIComponent(shareOptions.url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToFacebook = (shareOptions: any) => {
    const url = encodeURIComponent(shareOptions.url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareToLinkedIn = (shareOptions: any) => {
    const url = encodeURIComponent(shareOptions.url);
    const title = encodeURIComponent(shareOptions.title);
    const summary = encodeURIComponent(shareOptions.message);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank');
  };

  const shareToWhatsApp = (shareOptions: any) => {
    const text = encodeURIComponent(shareOptions.whatsapp.message);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToTelegram = (shareOptions: any) => {
    const text = encodeURIComponent(shareOptions.message);
    const url = encodeURIComponent(shareOptions.url);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
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

  const toggleInvitee = (userId: string) => {
    setSelectedInviteeIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleUnhideUser = async (userId: string) => {
    if (!toki) return;
    try {
      const success = await actions.unhideUser(toki.id, userId);
      if (success) {
        // Refresh the connections list to update hidden status
        const { connections } = await actions.getConnectionsForToki(toki.id);
        setInviteConnections(connections || []);
        
        // Update hidden count
        const list = await actions.listHiddenUsers(toki.id);
        setHiddenCount((list || []).length);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to unhide user');
    }
  };

  const handleInviteModalConfirm = async () => {
    if (!toki) return;
    if (selectedInviteeIds.size === 0) {
      Alert.alert('Select connections');
      return;
    }
    setIsLoadingInvites(true);
    try {
      if (modalMode === 'invite') {
        await sendInvites();
      } else {
        const participantUserIds = new Set(
          inviteConnections
            .filter((c: any) => c.isParticipant)
            .map((c: any) => c.user?.id || c.id)
        );
        const validHideIds = Array.from(selectedInviteeIds).filter(id => !participantUserIds.has(id));
        if (validHideIds.length === 0) {
          Alert.alert('No valid users', 'All selected users are already participants and cannot be hidden.');
          return;
        }
        for (const userId of validHideIds) {
          await actions.hideUser(toki.id, userId);
        }
        setShowInviteModal(false);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to ${modalMode === 'invite' ? 'send invites' : 'hide users'}`);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const handleRemoveParticipant = (userId: string, participantName: string) => {
    console.log('🔴 Remove participant button pressed for:', userId, participantName);
    if (!toki) {
      console.log('❌ No toki found');
      return;
    }
    
    setParticipantToRemove({ id: userId, name: participantName });
    setShowRemoveConfirm(true);
  };

  const handleRemoveParticipantFromModal = async (participantId: string) => {
    if (!toki?.id) return;
    
    setIsRemovingParticipant(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/tokis/${toki.id}/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove participant from local state
        setToki(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants?.filter(p => p.id !== participantId) || [],
            attendees: Math.max(0, (prev.attendees || 0) - 1)
          };
        });
        
        Toast.show({
          type: 'success',
          text1: 'Participant Removed',
          text2: 'The participant has been removed from the event'
        });
      } else {
        const errorData = await response.json();
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: errorData.message || 'Failed to remove participant'
        });
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove participant'
      });
    } finally {
      setIsRemovingParticipant(false);
    }
  };

  const handleOpenParticipantsModal = () => {
    setParticipantsSearch('');
    setShowParticipantsModal(true);
  };

  const confirmRemoveParticipant = async () => {
    if (!toki || !participantToRemove) return;
    
    console.log('🔴 User confirmed removal, calling API...');
    try {
      const success = await actions.removeParticipant(toki.id, participantToRemove.id);
      if (success) {
        console.log('✅ Participant removed successfully');
        Toast.show({
          type: 'success',
          text1: 'Participant Removed',
          text2: `${participantToRemove.name} has been removed from the event`,
          position: 'top',
          visibilityTime: 3000,
          topOffset: 60,
        });
      } else {
        console.log('❌ Failed to remove participant');
        Toast.show({
          type: 'error',
          text1: 'Remove Failed',
          text2: 'Failed to remove participant',
          position: 'top',
          visibilityTime: 4000,
          topOffset: 60,
        });
      }
    } catch (e) {
      console.error('❌ Error removing participant:', e);
      Toast.show({
        type: 'error',
        text1: 'Remove Failed',
        text2: 'Failed to remove participant',
        position: 'top',
        visibilityTime: 4000,
        topOffset: 60,
      });
    } finally {
      setShowRemoveConfirm(false);
      setParticipantToRemove(null);
    }
  };

  const cancelRemoveParticipant = () => {
    setShowRemoveConfirm(false);
    setParticipantToRemove(null);
  };

  // Invite Link Management Functions
  const loadInviteLinks = async () => {
    if (!toki) return;
    try {
      setIsLoadingInviteLinks(true);
      const data = await actions.getInviteLinksForToki(toki.id);
      setInviteLinks(data.links || []);
      setActiveInviteLink(data.activeLink || null);
    } catch (e) {
      console.error('Failed to load invite links:', e);
    } finally {
      setIsLoadingInviteLinks(false);
    }
  };


  const handleGenerateInviteLink = async () => {
    if (!toki) return;
    try {
      setIsLoadingInviteLinks(true);
      const link = await actions.generateInviteLink(toki.id, {
        maxUses: inviteLinkMaxUses || null,
        message: inviteLinkMessage || null
      });
      if (link) {
        await loadInviteLinks(); // Refresh the list
        setInviteLinkMessage('');
        setInviteLinkMaxUses(null);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate invite link');
    } finally {
      setIsLoadingInviteLinks(false);
    }
  };

  const handleRegenerateInviteLink = async () => {
    if (!toki) return;
    try {
      setIsLoadingInviteLinks(true);
      const link = await actions.regenerateInviteLink(toki.id, {
        maxUses: inviteLinkMaxUses || null,
        message: inviteLinkMessage || null
      });
      if (link) {
        setActiveInviteLink(link.data);
        await loadInviteLinks(); // Refresh the list
        setInviteLinkMessage('');
        setInviteLinkMaxUses(null);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to regenerate invite link');
    } finally {
      setIsLoadingInviteLinks(false);
    }
  };

  const handleCreateInviteLink = async () => {
    if (!toki) return;
    try {
      setIsLoadingInviteLinks(true);
      const link = await actions.generateInviteLink(toki.id, {
        maxUses: inviteLinkMaxUses || null,
        message: inviteLinkMessage || null
      });
      if (link) {
        setActiveInviteLink(link.data);
        await loadInviteLinks(); // Refresh the list
        setInviteLinkMessage('');
        setInviteLinkMaxUses(null);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create invite link');
    } finally {
      setIsLoadingInviteLinks(false);
    }
  };

  const handleDeactivateInviteLink = async (linkId: string) => {
    try {
      const success = await actions.deactivateInviteLink(linkId);
      if (success) {
        await loadInviteLinks(); // Refresh the list
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to deactivate invite link');
    }
  };

  const handleCopyInviteLink = async (inviteUrl: string) => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      Toast.show({
        type: 'success',
        text1: 'Link Copied!',
        text2: 'Invite link copied to clipboard',
        position: 'top',
        visibilityTime: 3000,
        topOffset: 60,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Toast.show({
        type: 'error',
        text1: 'Copy Failed',
        text2: 'Failed to copy link to clipboard',
        position: 'top',
        visibilityTime: 4000,
        topOffset: 60,
      });
    }
  };

  const sendInvites = async () => {
    if (!toki) return;
    if (selectedInviteeIds.size === 0) {
      Alert.alert('Select connections', 'Pick at least one connection to invite.');
      return;
    }
    
    // Filter out hidden users and participants from selected invitees
    const hiddenUserIds = new Set(
      inviteConnections
        .filter((c: any) => c.isHidden)
        .map((c: any) => c.user?.id || c.id)
    );
    
    const participantUserIds = new Set(
      inviteConnections
        .filter((c: any) => c.isParticipant)
        .map((c: any) => c.user?.id || c.id)
    );
    
    const validInviteeIds = Array.from(selectedInviteeIds).filter(id => 
      !hiddenUserIds.has(id) && !participantUserIds.has(id)
    );
    
    if (validInviteeIds.length === 0) {
      Alert.alert('No valid connections', 'All selected users are either hidden from this toki or already joined.');
      return;
    }
    
    try {
      setIsLoadingInvites(true);
      for (const userId of validInviteeIds) await actions.createInvite(toki.id, userId);
      setShowInviteModal(false);
      Alert.alert('Invites sent');
    } catch (e) {
      Alert.alert('Error', 'Failed to send some invites');
    } finally {
      setIsLoadingInvites(false);
    }
  };

  // Reuse same modal for Hide by switching CTA handler when Hide button pressed
  // For simplicity, we always show "Send Invites"; host Hide uses the lock button handler above

  const handleEditPress = () => {
    if (!toki) return;

    console.log('Edit Toki pressed for:', toki.id);
    router.push(`/edit-toki?tokiId=${toki.id}`);
  };

  const handleDeletePress = () => {
    if (!toki) return;

    console.log('🗑️ Delete button pressed for Toki:', toki.id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!toki) return;

    console.log('🗑️ User confirmed delete for Toki:', toki.id);
    try {
      console.log('🗑️ Calling deleteTokiBackend...');
      const success = await actions.deleteTokiBackend(toki.id);
      console.log('🗑️ Delete result:', success);
      if (success) {
        console.log('✅ Delete successful, navigating back');
        router.back();
      } else {
        console.log('❌ Delete failed');
        // You could show a toast or error message here
      }
    } catch (error) {
      console.error('❌ Error deleting Toki:', error);
      // You could show a toast or error message here
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    console.log('❌ Delete cancelled');
    setShowDeleteConfirm(false);
  };

  const handleCompleteEvent = async () => {
    if (!toki || !state.currentUser) return;
    if (!toki.isHostedByUser) {
      Alert.alert('Permission Denied', 'Only the host can complete the event.');
      return;
    }

    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to complete event. Please check your connection and try again.');
      return;
    }

    // Prepare participants data for rating
    const participants: Array<{
      id: string;
      name: string;
      avatar?: string;
      isHost: boolean;
    }> = [];

    // Add other participants from the Toki (exclude current user)
    if (toki.participants && Array.isArray(toki.participants)) {
      console.log('🎯 Participants from backend:', toki.participants);
      toki.participants.forEach(participant => {
        if (participant.id !== state.currentUser.id) {
          participants.push({
            id: participant.id,
            name: participant.name,
            avatar: participant.avatar,
            isHost: false,
          });
        }
      });
    } else {
      console.log('⚠️ No participants data from backend:', toki.participants);
    }

    console.log('🎯 Final participants for rating:', participants);

    // Check if all participants are already rated
    if (participants.length > 0) {
      try {
        const ratingsCheck = await actions.checkRatingsForToki(toki.id);
        if (ratingsCheck.success && ratingsCheck.data) {
          const alreadyRatedIds = ratingsCheck.data.data.alreadyRatedUserIds || [];
          const unratedParticipants = participants.filter(p => !alreadyRatedIds.includes(p.id));

          console.log('🎯 Already rated participants:', alreadyRatedIds);
          console.log('🎯 Unrated participants:', unratedParticipants.map(p => p.id));

          if (unratedParticipants.length === 0) {
            // All participants are already rated, complete event immediately
            console.log('🎯 All participants already rated, completing event directly');
            await completeEventAfterRatings();
            return;
          } else {
            // Some participants still need rating
            setParticipantsForRating(unratedParticipants);
            setShowRatingPrompt(true);
          }
        } else {
          // Fallback: show rating prompt for all participants
          setParticipantsForRating(participants);
          setShowRatingPrompt(true);
        }
      } catch (error) {
        console.error('❌ Error checking ratings:', error);
        // Fallback: show rating prompt for all participants
        setParticipantsForRating(participants);
        setShowRatingPrompt(true);
      }
    } else {
      // No participants to rate, complete event immediately
      console.log('🚀 No participants to rate, completing event immediately...');
      await completeEventAfterRatings();
    }
  };

  const completeEventAfterRatings = async () => {
    if (!toki) return;

    console.log('🚀 Starting completeEventAfterRatings for Toki:', toki.id);
    setIsJoining(true);

    try {
      console.log('🚀 Calling actions.completeToki...');
      const success = await actions.completeToki(toki.id);
      console.log('🚀 completeToki result:', success);

      if (success) {
        console.log('🚀 Updating local state...');
        setToki(prev => prev ? ({
          ...prev,
          joinStatus: 'completed',
        }) : null);

        console.log('🚀 Showing success alert...');
        Alert.alert(
          'Event Completed',
          'Your event has been marked as completed!',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('🚀 Navigating to explore page...');
                // Navigate to the explore page after successful completion
                router.push('/(tabs)');
              }
            }
          ]
        );

        // Also add a fallback navigation in case the alert doesn't work
        setTimeout(() => {
          console.log('🚀 Fallback navigation to explore page...');
          router.push('/(tabs)');
        }, 2000); // 2 second fallback
        console.log('✅ Event completed for Toki:', toki.id);
      } else {
        console.log('❌ completeToki returned false');
        Alert.alert('Error', 'Failed to complete the event. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error completing event:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const getJoinButtonText = () => {
    if (!toki) return 'Join';
    if (toki.isHostedByUser) return 'Your Event';

    switch (toki.joinStatus) {
      case 'not_joined': return 'I want to join';
      case 'pending': return 'Request Pending';
      case 'approved': return 'Join Chat';
      case 'joined': return 'Join Chat';
      default: return 'I want to join';
    }
  };

  const getJoinButtonColor = () => {
    if (!toki) return '#4DC4AA';
    if (toki.isHostedByUser) return '#B49AFF';

    switch (toki.joinStatus) {
      case 'not_joined': return '#4DC4AA'; // I want to join - pastel green
      case 'pending': return '#F9E79B'; // Request pending - soft yellow
      case 'approved': return '#4DC4AA'; // Join Chat - pastel green
      case 'joined': return '#4DC4AA'; // Join Chat - pastel green
      default: return '#4DC4AA';
    }
  };

  const canAccessChat = () => {
    if (!toki) return false;
    return toki.isHostedByUser || toki.joinStatus === 'approved' || toki.joinStatus === 'joined';
  };

  if (!toki && isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Toki...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!toki) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Toki not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            // If coming from edit or create, go to home page instead of back to form
            if (fromEdit || fromCreate) {
              router.push('/(tabs)');
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)');
            }
          }}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <MetaTags 
        tokiData={toki ? {
          id: toki.id,
          title: toki.title,
          description: toki.description,
          location: toki.location,
          timeSlot: toki.time,
          category: toki.category,
          hostName: toki.host.name,
          imageUrl: toki.image,
          maxAttendees: toki.maxAttendees,
          currentAttendees: toki.attendees,
        } : undefined}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={{...styles.content,width: '100%', maxWidth: 1000, alignSelf: 'center'}} showsVerticalScrollIndicator={false}>
        <TokiHeader
          toki={{
            id: toki.id,
            image: toki.image,
            category: toki.category
          }}
          fromEdit={fromEdit}
          isLiked={isLiked}
          isSaving={isSaving}
          onSaveToggle={handleSaveToggle}
          onShare={handleShareToki}
          onBack={() => {
            // If coming from edit or create, go to home page instead of back to form
            if (fromEdit || fromCreate) {
              router.push('/(tabs)');
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)');
            }
          }}
        />

        <InviteModal
          visible={showInviteModal}
          mode={modalMode}
          connections={inviteConnections}
          selectedIds={selectedInviteeIds}
          search={inviteSearch}
          onChangeSearch={setInviteSearch}
          isLoading={isLoadingInvites}
          activeInviteLink={activeInviteLink}
          onCreateInviteLink={handleCreateInviteLink}
          onRegenerateInviteLink={handleRegenerateInviteLink}
          onCopyInviteLink={handleCopyInviteLink}
          onToggleInvitee={toggleInvitee}
          onUnhideUser={handleUnhideUser}
          onClose={() => setShowInviteModal(false)}
          onConfirm={handleInviteModalConfirm}
        />

        <ParticipantsModal
          visible={showParticipantsModal}
          participants={toki?.participants?.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            isHost: p.id === toki?.host?.id
          })) || []}
          search={participantsSearch}
          onChangeSearch={setParticipantsSearch}
          isLoading={false}
          isHost={toki?.isHostedByUser || false}
          onClose={() => setShowParticipantsModal(false)}
          onRemoveParticipant={handleRemoveParticipantFromModal}
        />

        <View style={styles.detailsContainer}>
          {/* Event Title and Badges */}
          <View style={styles.eventHeaderSection}>
            <View style={styles.eventTitleRow}>
              <Text style={styles.eventTitle}>{toki.title}</Text>
              <View style={styles.eventBadgesContainer}>
                {toki.visibility === 'private' && (
                  <View style={styles.eventPrivateBadge}>
                    <Lock size={14} color="#8B5CF6" />
                    <Text style={styles.eventPrivateBadgeText}>Private</Text>
                  </View>
                )}
                {toki.isHostedByUser && hiddenCount > 0 && (
                  <View style={styles.eventHiddenBadge}>
                    <Text style={styles.eventHiddenBadgeText}>Hidden {hiddenCount}</Text>
                  </View>
                )}
                <Text style={styles.eventDistance}>
                  {toki.distance ? `${formatDistanceDisplay(toki.distance)} away` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Event Info Section */}
          <View style={styles.eventInfoSection}>
            <TouchableOpacity 
              style={styles.eventInfoItem}
              onPress={() => {
                if (toki.latitude && toki.longitude) {
                  router.push({
                    pathname: '/(tabs)/discover',
                    params: { highlightTokiId: toki.id }
                  });
                } else {
                  Toast.show({
                    type: 'error',
                    text1: 'Location not available',
                    text2: 'Location coordinates are not available for this event',
                    position: 'top',
                    visibilityTime: 3000,
                    topOffset: 60,
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <MapPin size={18} color="#B49AFF" />
              <Text style={styles.eventInfoText}>{formatLocationDisplay(toki.location)}</Text>
            </TouchableOpacity>
            <View style={styles.eventInfoItem}>
              <Clock size={18} color="#B49AFF" />
              <Text style={styles.eventInfoText}>{formatTimeDisplay(toki.time, toki.scheduledTime)}</Text>
            </View>
            <View style={styles.eventInfoItem}>
              <Users size={18} color="#B49AFF" />
              <Text style={styles.eventInfoText}>
                {toki.attendees}/{toki.maxAttendees} people
              </Text>
            </View>
            {toki.link && (
              <View style={styles.eventInfoItem}>
                <Link size={18} color="#B49AFF" />
                <TouchableOpacity 
                  onPress={() => Linking.openURL(toki.link!)}
                  style={styles.linkContainer}
                >
                  <Text 
                    style={[styles.eventInfoText, styles.linkText]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {toki.link}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Participants Section */}
          {toki.participants && toki.participants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.sectionTitle}>Participants</Text>
              <View style={styles.participantsList}>
                {toki.participants.slice(0, MAX_PARTICIPANTS_DISPLAY).map((participant, index) => (
                  <View key={participant.id} style={styles.participantItem}>
                    {participant.avatar ? (
                      <Image
                        source={{ uri: participant.avatar }}
                        style={styles.participantAvatar}
                      />
                    ) : (
                      <View style={[styles.participantAvatar, styles.participantFallbackAvatar]}>
                        <Text style={styles.participantFallbackInitials}>
                          {getInitials(participant.name)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.participantInfo}>
                      <TouchableOpacity
                        onPress={() => {
                          if (participant.id !== state.currentUser?.id) {
                            router.push({
                              pathname: '/user-profile/[userId]',
                              params: { userId: participant.id }
                            });
                          }
                        }}
                        disabled={participant.id === state.currentUser?.id}
                      >
                        <Text style={[
                          styles.participantName,
                          participant.id !== state.currentUser?.id && { textDecorationLine: 'underline' }
                        ]}>
                          {participant.name || `Participant ${index + 1}`}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.participantStatus}>
                        {participant.id === toki.host?.id ? 'Host' : 'Attendee'}
                      </Text>
                    </View>
                    {/* Remove button for hosts (only show for non-host participants) */}
                    {(() => {
                      const shouldShow = toki.isHostedByUser && participant.id !== toki.host?.id;
                      return shouldShow;
                    })() && (
                      <TouchableOpacity
                        style={styles.removeParticipantButton}
                        onPress={() => {
                          handleRemoveParticipant(participant.id, participant.name);
                        }}
                        activeOpacity={0.7}
                      >
                        <X size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                
                {toki.participants.length > MAX_PARTICIPANTS_DISPLAY && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={handleOpenParticipantsModal}
                  >
                    <Text style={styles.showMoreText}>
                      View more ({toki.participants.length - MAX_PARTICIPANTS_DISPLAY} more)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.tagsSection}>
            {toki.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About this Toki</Text>
            <Text style={styles.description}>{toki.description}</Text>
          </View>

          <View style={styles.hostSection}>
            <Text style={styles.sectionTitle}>
              {toki.isHostedByUser ? 'You are hosting' : 'Hosted by'}
            </Text>
            <View style={styles.hostInfo}>
              {toki.host.avatar ? (
                <Image source={{ uri: toki.host.avatar }} style={styles.hostAvatar} resizeMode="cover" />
              ) : (
                <View style={[styles.hostAvatar, styles.fallbackAvatar]}>
                  <Text style={styles.fallbackInitials}>
                    {getInitials(toki.host.name)}
                  </Text>
                </View>
              )}
              <View style={styles.hostDetails}>
                <TouchableOpacity
                  onPress={() => {
                    if (!toki.isHostedByUser) {
                      router.push({
                        pathname: '/user-profile/[userId]',
                        params: { userId: toki.host.id }
                      });
                    }
                  }}
                  disabled={toki.isHostedByUser}
                >
                  <Text style={[
                    styles.hostName,
                    !toki.isHostedByUser && { textDecorationLine: 'underline' }
                  ]}>
                    {toki.isHostedByUser ? 'You' : toki.host.name}
                  </Text>
                </TouchableOpacity>
                {toki.host.bio && (
                  <Text style={styles.hostBio}>{toki.host.bio}</Text>
                )}
              </View>

              {/* Chat with host button - only show if not hosting yourself */}
              {!toki.isHostedByUser && (
                <TouchableOpacity
                  style={styles.hostChatButton}
                  onPress={async () => {
                    try {
                      // Get the host ID from the Toki data
                      const hostId = toki.host.id || toki.hostId;
                      if (hostId) {
                        router.push({
                          pathname: '/chat',
                          params: {
                            otherUserId: hostId,
                            otherUserName: toki.host.name,
                            isGroup: 'false'
                          }
                        });
                      } else {
                        Alert.alert('Error', 'Unable to identify host for chat.');
                      }
                    } catch (error) {
                      console.error('Error starting conversation with host:', error);
                      Alert.alert('Error', 'Failed to open chat with host. Please try again.');
                    }
                  }}
                >
                  <Text style={styles.hostChatButtonText}>Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.actionsSection}>
            {/* Invite button - show for hosts or attendees of public tokis */}
            {(() => {
              const isHost = toki.isHostedByUser;
              const isPublicAttendee = toki.visibility === 'public' && (toki.joinStatus === 'joined' || toki.joinStatus === 'approved');
              const canInvite = isHost || isPublicAttendee;
              
              
              return canInvite;
            })() && (
              <TouchableOpacity style={styles.inviteButton} onPress={handleInvitePress}>
                <UserPlus size={20} color="#B49AFF" />
                <Text style={styles.inviteText}>Invite</Text>
              </TouchableOpacity>
            )}

            {/* Hide button (host-only) */}
            {toki.isHostedByUser && (
              <TouchableOpacity style={styles.hideButton} onPress={async () => {
                try {
                  setIsLoadingInvites(true);
                  setModalMode('hide');
                  const { connections } = await actions.getConnectionsForToki(toki.id);
                  
                  // Build participant set from the currently loaded toki data
                  const participantIds = new Set((toki.participants || []).map((p: any) => p.user?.id || p.id));
                  
                  // Mark participants in connections and filter them out for hiding
                  const connectionsWithStatus = (connections || []).map((conn: any) => ({
                    ...conn,
                    isParticipant: participantIds.has(conn.user?.id || conn.id),
                  }));
                  
                  setInviteConnections(connectionsWithStatus);
                  setSelectedInviteeIds(new Set());
                  setInviteSearch('');
                  const list = await actions.listHiddenUsers(toki.id);
                  setHiddenCount((list || []).length);
                  setShowInviteModal(true);
                } catch (e) {
                  Alert.alert('Error', 'Failed to load connections');
                } finally {
                  setIsLoadingInvites(false);
                }
              }}>
                <Lock size={20} color="#EF4444" />
                <Text style={styles.hideText}>Hide</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.chatButton,
                !canAccessChat() && styles.chatButtonDisabled
              ]}
              onPress={handleChatPress}
            >
              <MessageCircle size={20} color={canAccessChat() ? "#666666" : "#9CA3AF"} />
              <Text style={[
                styles.chatText,
                !canAccessChat() && styles.chatTextDisabled
              ]}>
                {canAccessChat() ? 'Join Chat' : 'Chat Locked'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Host Actions - Only show for Tokis hosted by current user */}
          {toki.isHostedByUser && (
            <View style={styles.hostActionsSection}>
              {!showDeleteConfirm ? (
                <>
                  <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
                    <Edit size={20} color="#4DC4AA" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>


                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => {
                      try {
                        const otherParticipantsCount = Array.isArray(toki.participants)
                          ? toki.participants.length
                          : Math.max((toki.attendees || 0) - 1, 0);
                        const isHostOnlyEvent = !!toki.isHostedByUser && otherParticipantsCount === 0;
                        if (isHostOnlyEvent) {
                          setShowHostOnlyConfirm(true);
                          return;
                        }
                      } catch {}
                      handleCompleteEvent();
                    }}
                  >
                    <CheckCircle size={20} color="#10B981" />
                    <Text style={styles.completeText}>Complete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePress}>
                    <Trash2 size={20} color="#EF4444" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelDelete}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmDeleteButton} onPress={handleConfirmDelete}>
                    <Trash2 size={20} color="#FFFFFF" />
                    <Text style={styles.confirmDeleteText}>Confirm Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Host-only confirmation modal */}
      <Modal
        transparent
        visible={showHostOnlyConfirm}
        animationType="fade"
        onRequestClose={() => setShowHostOnlyConfirm(false)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmTitle}>Complete event?</Text>
            <Text style={styles.confirmSubtitle}>
              Only you are listed as a participant. Are you sure you want to mark this Toki as completed?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowHostOnlyConfirm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  setShowHostOnlyConfirm(false);
                  handleCompleteEvent();
                }}
              >
                <Text style={styles.confirmButtonText}>Complete Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.joinButton,
            {
              backgroundColor: getJoinButtonColor(),
              opacity: isJoining ? 0.6 : 1
            }
          ]}
          onPress={handleJoinRequest}
          disabled={isJoining}
        >
          <Text style={styles.joinButtonText}>
            {isJoining ? 'Joining...' : getJoinButtonText()}
          </Text>
        </TouchableOpacity>
      </View>

      <RatingPrompt
        visible={showRatingPrompt}
        tokiId={toki?.id || ''}
        tokiTitle={toki?.title || ''}
        participants={participantsForRating}
        onClose={() => setShowRatingPrompt(false)}
        onRatingsSubmitted={completeEventAfterRatings}
        onNavigateToExplore={() => router.push('/(tabs)')}
      />
      
      {/* Remove Participant Confirmation Modal */}
      <Modal
        visible={showRemoveConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelRemoveParticipant}
      >
        <View style={styles.removeModalOverlay}>
          <View style={styles.removeConfirmModal}>
            <Text style={styles.removeConfirmTitle}>Remove Participant</Text>
            <Text style={styles.removeConfirmMessage}>
              Are you sure you want to remove {participantToRemove?.name} from this event?
            </Text>
            <View style={styles.removeConfirmButtons}>
              <TouchableOpacity
                style={[styles.removeConfirmButton, styles.removeCancelButton]}
                onPress={cancelRemoveParticipant}
              >
                <Text style={styles.removeCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.removeConfirmButton, styles.removeConfirmRemoveButton]}
                onPress={confirmRemoveParticipant}
              >
                <Text style={styles.removeConfirmRemoveButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Toast 
        config={{
          success: (props) => (
            <View style={{
              backgroundColor: '#10B981',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginHorizontal: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginBottom: 4,
              }}>
                {props.text1}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#FFFFFF',
              }}>
                {props.text2}
              </Text>
            </View>
          ),
          error: (props) => (
            <View style={{
              backgroundColor: '#EF4444',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginHorizontal: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginBottom: 4,
              }}>
                {props.text1}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#FFFFFF',
              }}>
                {props.text2}
              </Text>
            </View>
          ),
        }}
      />

      {/* Custom Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModal}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Share Event</Text>
              <TouchableOpacity 
                style={styles.shareModalClose}
                onPress={() => setShowShareModal(false)}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.shareModalContent}>
              <View style={styles.eventPreview}>
                <Text style={styles.shareEventTitle}>"{toki?.title}"</Text>
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailRow}>
                    <MapPin size={14} color="#8B5CF6" />
                    <Text style={styles.eventDetailText} numberOfLines={1}>{toki?.location}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Clock size={14} color="#8B5CF6" />
                    <Text style={styles.eventDetailText}>{toki?.timeSlot || 'TBD'}</Text>
                  </View>
                </View>
              </View>
              
              {/* URL Display */}
              <View style={styles.urlContainer}>
                <View style={styles.urlHeader}>
                  <Text style={styles.urlLabel}>🔗 Share Link</Text>
                  <TouchableOpacity 
                    style={styles.copyUrlButton}
                    onPress={async () => {
                      await Clipboard.setStringAsync(shareUrl);
                      Toast.show({
                        type: 'success',
                        text1: 'Link copied!',
                        text2: 'Ready to paste anywhere'
                      });
                    }}
                  >
                    <Link size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.urlBox}>
                  <Text style={styles.urlText} numberOfLines={2}>{shareUrl}</Text>
                </View>
              </View>

              {/* Editable Message */}
              <View style={styles.messageContainer}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageLabel}>✏️ Your Message</Text>
                  <Text style={styles.messageHint}>Customize how you share this event</Text>
                </View>
                <TextInput
                  style={styles.messageInput}
                  value={editableMessage}
                  onChangeText={setEditableMessage}
                  multiline={true}
                  numberOfLines={3}
                  placeholder="Write your own message about this event..."
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.shareSection}>
                <Text style={styles.shareSectionTitle}>🚀 Share to Social Media</Text>
                <View style={styles.shareButtonsGrid}>
                  <TouchableOpacity 
                    style={[styles.shareButton, styles.twitterButton]}
                    onPress={() => {
                      const text = encodeURIComponent(editableMessage);
                      const url = encodeURIComponent(shareUrl);
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                      setShowShareModal(false);
                    }}
                  >
                    <Text style={[styles.shareButtonIcon, { color: '#1DA1F2' }]}>🐦</Text>
                    <Text style={styles.shareButtonText}>Twitter</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.shareButton, styles.facebookButton]}
                    onPress={() => {
                      const url = encodeURIComponent(shareUrl);
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                      setShowShareModal(false);
                    }}
                  >
                    <Text style={[styles.shareButtonIcon, { color: '#1877F2' }]}>📘</Text>
                    <Text style={styles.shareButtonText}>Facebook</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.shareButton, styles.linkedinButton]}
                    onPress={() => {
                      const url = encodeURIComponent(shareUrl);
                      const title = encodeURIComponent(toki?.title || '');
                      const summary = encodeURIComponent(editableMessage);
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank');
                      setShowShareModal(false);
                    }}
                  >
                    <Text style={[styles.shareButtonIcon, { color: '#0077B5' }]}>💼</Text>
                    <Text style={styles.shareButtonText}>LinkedIn</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.shareButton, styles.whatsappButton]}
                    onPress={() => {
                      const text = encodeURIComponent(`${editableMessage}\n\n${shareUrl}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                      setShowShareModal(false);
                    }}
                  >
                    <Text style={[styles.shareButtonIcon, { color: '#25D366' }]}>💬</Text>
                    <Text style={styles.shareButtonText}>WhatsApp</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.shareButton, styles.telegramButton]}
                    onPress={() => {
                      const text = encodeURIComponent(editableMessage);
                      const url = encodeURIComponent(shareUrl);
                      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
                      setShowShareModal(false);
                    }}
                  >
                    <Text style={[styles.shareButtonIcon, { color: '#0088CC' }]}>✈️</Text>
                    <Text style={styles.shareButtonText}>Telegram</Text>
                  </TouchableOpacity>
                  
                </View>
              </View>
              
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    backgroundColor: '#B49AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 1200,       // cap on wide screens
    alignSelf: 'center',
  },
  headerImage: {
    width: '100%',
    // height: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
    maxHeight: 600,
  },
  fallbackHeaderImage: {
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  fallbackHeaderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  fallbackHeaderText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButtonHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedButton: {
    backgroundColor: '#B49AFF',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  eventHeaderSection: {
    marginBottom: 24,
  },
  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    flex: 1,
  },
  eventBadgesContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  eventPrivateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  eventPrivateBadgeText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  eventHiddenBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  eventHiddenBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  eventDistance: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  privateBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  hiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6B7280',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  hiddenBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    flex: 1,
  },
  distance: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
    marginLeft: 12,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    marginLeft: 12,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#B49AFF',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
  },
  hostSection: {
    marginBottom: 24,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  fallbackAvatar: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  fallbackInitials: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 2,
  },
  hostBio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#B49AFF',
  },
  inviteText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#B49AFF',
    marginLeft: 8,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
  },
  chatButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  chatText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginLeft: 8,
  },
  chatTextDisabled: {
    color: '#9CA3AF',
  },
  participantsSection: {
    marginBottom: 24,
  },
  eventInfoSection: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  eventInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  linkText: {
    color: '#8B5CF6',
    textDecorationLine: 'underline',
    flex: 1,
  },
  linkContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 16,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#B49AFF',
    minWidth: 140,
  },
  participantAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  participantFallbackAvatar: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  participantFallbackInitials: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
  },
  participantInfo: {
    flexShrink: 1,
    marginRight: 4,
  },
  participantName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
    maxWidth: 160,
  },
  participantStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  removeParticipantButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  showMoreButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  hostActionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4DC4AA',
  },
  editText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4DC4AA',
    marginLeft: 8,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  completeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  confirmDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    maxWidth: 1000,
    margin: 'auto',
  },
  joinButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  hostChatButton: {
    backgroundColor: '#B49AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  hostChatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 420,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 16,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmButton: {
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  inviteModalContainer: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  inviteLinkSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inviteLinkTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  inviteLinkContainer: {
    gap: 12,
  },
  inviteLinkInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  inviteLinkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  copyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  regenerateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  createLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
  },
  createLinkButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  hideText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  inviteSearch: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 12,
    color: '#1C1C1C',
    fontFamily: 'Inter-Regular',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  connectionRowSelected: {
    backgroundColor: '#F5F3FF',
  },
  connectionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  connectionAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionAvatarInitials: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  connectionName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionRowHidden: {
    opacity: 0.5,
    backgroundColor: '#F9F9F9',
  },
  connectionAvatarHidden: {
    opacity: 0.5,
  },
  connectionAvatarInitialsHidden: {
    color: '#9CA3AF',
  },
  connectionNameHidden: {
    color: '#9CA3AF',
  },
  hiddenLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 2,
  },
  participantLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    marginTop: 2,
  },
  connectionRowParticipant: {
    backgroundColor: '#F0FDF4',
  },
  joinedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  actionButtons: {
    marginLeft: 'auto',
  },
  unhideButton: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unhideButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  inviteCheck: {
    marginLeft: 'auto',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteCheckOn: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  inviteCheckText: {
    fontSize: 12,
    color: '#666666',
  },
  inviteCheckTextOn: {
    color: '#FFFFFF',
  },

  
  // Remove Participant Confirmation Modal Styles
  removeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  removeConfirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  removeConfirmTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 12,
    textAlign: 'center',
  },
  removeConfirmMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  removeConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  removeConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  removeCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  removeConfirmRemoveButton: {
    backgroundColor: '#EF4444',
  },
  removeConfirmRemoveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    },
  
    // Share Modal Styles
    shareModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    shareModal: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      width: '95%',
      maxWidth: 800,
      maxHeight: '85%',
      alignSelf: 'center',
    },
    shareModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    shareModalTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: '#1C1C1C',
    },
    shareModalClose: {
      padding: 4,
    },
    shareModalContent: {
      gap: 20,
    },
    eventPreview: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#8B5CF6',
    },
    shareEventTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: '#1C1C1C',
      marginBottom: 8,
    },
    eventDetails: {
      gap: 6,
    },
    eventDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    eventDetailText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#666',
      flex: 1,
    },
    urlContainer: {
      gap: 12,
    },
    urlHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    urlLabel: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#1C1C1C',
    },
    urlBox: {
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    urlText: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: '#6B7280',
    },
    copyUrlButton: {
      padding: 8,
      backgroundColor: '#8B5CF6',
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageContainer: {
      gap: 12,
    },
    messageHeader: {
      gap: 4,
    },
    messageLabel: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#1C1C1C',
    },
    messageHint: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: '#8B5CF6',
    },
    messageInput: {
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#1C1C1C',
      textAlignVertical: 'top',
      minHeight: 120,
    },
    shareSection: {
      gap: 12,
    },
    shareSectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#1C1C1C',
    },
    shareButtonsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      justifyContent: 'flex-start',
    },
    shareButton: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      width: 95,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 3,
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    shareButtonIcon: {
      fontSize: 16,
    },
    shareButtonText: {
      fontSize: 10,
      fontFamily: 'Inter-Medium',
      color: '#4B5563',
      textAlign: 'center',
    },
    twitterButton: {
      backgroundColor: '#F0F9FF',
      borderColor: '#1DA1F2',
    },
    facebookButton: {
      backgroundColor: '#F0F4FF',
      borderColor: '#1877F2',
    },
    linkedinButton: {
      backgroundColor: '#F0F7FF',
      borderColor: '#0077B5',
    },
    whatsappButton: {
      backgroundColor: '#F0FDF4',
      borderColor: '#25D366',
    },
    telegramButton: {
      backgroundColor: '#F0F9FF',
      borderColor: '#0088CC',
    },
  
  });