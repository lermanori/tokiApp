import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Clock, Users, Heart, Share, MessageCircle, UserPlus, Edit, Trash2, CheckCircle, Lock } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import RatingPrompt from '@/components/RatingPrompt';
import { apiService } from '@/services/api';
import { getBackendUrl } from '@/services/config';
import { getActivityPhoto } from '@/utils/activityPhotos';

const { width } = Dimensions.get('window');

// Helper function to get user initials from name
const getInitials = (name: string): string => {
  if (!name) return '?';
  const names = name.trim().split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

// Helper function to get activity emoji
const getActivityEmoji = (category: string): string => {
  switch (category) {
    case 'sports': return '⚽';
    case 'coffee': return '☕';
    case 'music': return '🎵';
    case 'food': return '🍕';
    case 'work': return '💼';
    case 'art': return '🎨';
    case 'nature': return '🌿';
    case 'drinks': return '🍹';
    case 'beach': return '🏖️';
    case 'sunset': return '🌅';
    case 'jazz': return '🎷';
    case 'networking': return '🤝';
    case 'wellness': return '🧘';
    case 'yoga': return '🧘‍♀️';
    case 'morning': return '🌅';
    case 'walking': return '🚶';
    case 'culture': return '🏛️';
    case 'social': return '👥';
    case 'volleyball': return '🏐';
    case 'mindfulness': return '🧘‍♂️';
    case 'coworking': return '💻';
    default: return '🎉';
  }
};

// Helper function to get activity label
const getActivityLabel = (category: string): string => {
  switch (category) {
    case 'sports': return 'Sports';
    case 'coffee': return 'Coffee';
    case 'music': return 'Music';
    case 'food': return 'Food';
    case 'work': return 'Work';
    case 'art': return 'Art';
    case 'nature': return 'Nature';
    case 'drinks': return 'Drinks';
    case 'beach': return 'Beach';
    case 'sunset': return 'Sunset';
    case 'jazz': return 'Jazz';
    case 'networking': return 'Networking';
    case 'wellness': return 'Wellness';
    case 'yoga': return 'Yoga';
    case 'morning': return 'Morning';
    case 'walking': return 'Walking';
    case 'culture': return 'Culture';
    case 'social': return 'Social';
    case 'volleyball': return 'Volleyball';
    case 'mindfulness': return 'Mindfulness';
    case 'coworking': return 'Coworking';
    default: return 'Activity';
  }
};

// Helper function to format location for compact display
const formatLocationDisplay = (fullLocation: string): string => {
  if (!fullLocation) return '';

  // Split by commas and clean up
  const parts = fullLocation.split(',').map(part => part.trim());

  if (parts.length >= 2) {
    // Try to extract city and landmark/area name
    const city = parts[parts.length - 2]; // Usually the city is second to last
    const landmark = parts[0]; // First part is usually the landmark/area name

    // If we have a city and landmark, format as "City, Landmark"
    if (city && landmark && city !== landmark) {
      return `${city}, ${landmark}`;
    }

    // Fallback: just show first two meaningful parts
    const meaningfulParts = parts.filter(part =>
      part &&
      !part.includes('Subdistrict') &&
      !part.includes('District') &&
      part.length > 2
    );

    if (meaningfulParts.length >= 2) {
      return `${meaningfulParts[0]}, ${meaningfulParts[1]}`;
    }
  }

  // If all else fails, just show the first meaningful part
  return parts[0] || fullLocation;
};

interface TokiDetails {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
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
  distance: string;
  visibility?: 'public' | 'private' | 'connections' | 'friends';
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined' | 'completed';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
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

  // Function to format time display smartly
  const formatTimeDisplay = (time: string | undefined, scheduledTime?: string): string => {
    // If we have scheduled time, use it for smart display
    if (scheduledTime) {
      try {
        const date = new Date(scheduledTime);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // Format time as HH:MM
        const timeString = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // Check if it's today, tomorrow, or later
        if (eventDate.getTime() === today.getTime()) {
          return `today at ${timeString}`;
        } else if (eventDate.getTime() === tomorrow.getTime()) {
          return `tomorrow at ${timeString}`;
        } else {
          // Format as DD/MM/YY HH:MM
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear().toString().slice(-2);
          return `${day}/${month}/${year} at ${timeString}`;
        }
      } catch (error) {
        // Fallback to original time if parsing fails
        return time || 'Time TBD';
      }
    }

    // If no scheduled time, handle the time parameter safely
    if (!time) {
      return 'Time TBD';
    }

    // For relative time slots, show as is
    if (['Now', '30 min', '1 hour', '2 hours', '3 hours', 'Tonight', 'Tomorrow'].includes(time)) {
      return time;
    }

    // For specific time slots like "9:00 AM", show as is
    if (time.includes(':')) {
      return time;
    }

    // For generic slots like "morning", "afternoon", "evening"
    return time;
  };

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
          distance: '0.5 km', // Default distance
          visibility: tokiData.visibility,
          isHostedByUser: tokiData.host?.id === state.currentUser?.id,
          joinStatus: tokiData.joinStatus || 'not_joined', // Use backend join status
          participants: tokiData.participants || [], // Ensure participants are loaded
        };

        console.log('🔍 Ownership check:', {
          hostId: tokiData.host?.id,
          currentUserId: state.currentUser?.id,
          isHostedByUser: tokiData.host?.id === state.currentUser?.id,
          hasCurrentUser: !!state.currentUser?.id,
          hasHostId: !!tokiData.host?.id
        });

        setToki(transformedToki);

        // Check saved status after Toki data is loaded
        checkSavedStatus();

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

  // Refresh data when screen comes into focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      const tokiId = params.tokiId as string;
      if (tokiId) {
        loadTokiData(tokiId);
      }
    }, [params.tokiId])
  );

  const handleJoinRequest = async () => {
    if (!toki) return;

    if (toki.isHostedByUser) {
      Alert.alert('Your Event', 'This is your event! You can manage it from your profile.');
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
          // Send join request using the backend
          const requestSuccess = await actions.sendJoinRequest(toki.id);
          if (requestSuccess) {
            setToki(prev => prev ? ({ ...prev, joinStatus: 'pending' }) : null);
            Alert.alert('Request Sent', 'Your join request has been sent to the host. You\'ll be notified when they respond.');
            console.log('✅ Join request sent for Toki:', toki.id);
          } else {
            Alert.alert('Error', 'Failed to send join request. Please try again.');
          }
          break;

        case 'pending':
          Alert.alert('Request Pending', 'Your join request is waiting for host approval.');
          break;

        case 'approved':
          // Join the event using the backend
          const success = await actions.joinToki(toki.id);
          if (success) {
            // Update join status locally, but refresh attendee count from backend
            setToki(prev => prev ? ({
              ...prev,
              joinStatus: 'joined',
            }) : null);

            // Refresh data from backend to get accurate attendee count
            setTimeout(() => {
              loadTokiData(toki.id);
            }, 500);

            Alert.alert('Welcome!', 'You\'ve joined the event! You can now access the group chat.');
            console.log('✅ Successfully joined Toki:', toki.id);
          } else {
            Alert.alert('Error', 'Failed to join the event. Please try again.');
          }
          break;

        case 'joined':
          Alert.alert('Already Joined', 'You\'re already part of this event!');
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
  const [inviteConnections, setInviteConnections] = useState<any[]>([]);
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<Set<string>>(new Set());
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [hiddenCount, setHiddenCount] = useState<number>(0);

  const handleInvitePress = async () => {
    if (!toki) return;
    if (!toki.isHostedByUser) {
      Alert.alert('Only hosts can invite', 'Ask the host to invite users.');
      return;
    }
    try {
      setIsLoadingInvites(true);
      const { connections } = await actions.getConnections();
      setInviteConnections(connections || []);
      setSelectedInviteeIds(new Set());
      setShowInviteModal(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load connections');
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const toggleInvitee = (userId: string) => {
    setSelectedInviteeIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const sendInvites = async () => {
    if (!toki) return;
    if (selectedInviteeIds.size === 0) {
      Alert.alert('Select connections', 'Pick at least one connection to invite.');
      return;
    }
    try {
      setIsLoadingInvites(true);
      for (const userId of selectedInviteeIds) await actions.createInvite(toki.id, userId);
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
      case 'approved': return 'Join Event';
      case 'joined': return 'You\'re In!';
      default: return 'I want to join';
    }
  };

  const getJoinButtonColor = () => {
    if (!toki) return '#4DC4AA';
    if (toki.isHostedByUser) return '#B49AFF';

    switch (toki.joinStatus) {
      case 'not_joined': return '#4DC4AA'; // I want to join - pastel green
      case 'pending': return '#F9E79B'; // Request pending - soft yellow
      case 'approved': return '#A7F3D0'; // Approved - light pastel green
      case 'joined': return '#EC4899'; // You're in - friendly pink
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
            if (router.canGoBack()) {
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={{...styles.content,width: '100%', maxWidth: 1000, alignSelf: 'center'}} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: toki.image || getActivityPhoto(toki.category || 'social')
            }}
            style={styles.headerImage}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent']}
            style={styles.headerGradient}
          />
          <TouchableOpacity style={styles.backButtonHeader} onPress={() => {
            // Try to go back, but if that fails, go to the main tabs
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)');
            }
          }}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionButton, isLiked && styles.likedButton]}
              onPress={handleSaveToggle}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={styles.loadingSpinner}>
                  <Text style={styles.loadingText}>...</Text>
                </View>
              ) : (
                <Heart
                  size={20}
                  color={isLiked ? "#8B5CF6" : "#FFFFFF"}
                  fill={isLiked ? "#8B5CF6" : "transparent"}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Share size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Invite modal */}
        <Modal
          transparent
          visible={showInviteModal}
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={styles.pickerBackdrop}>
            <View style={styles.inviteModalContainer}>
              <Text style={styles.sectionTitle}>Manage Visibility</Text>
              <TextInput
                style={styles.inviteSearch}
                placeholder="Search connections..."
                placeholderTextColor="#9CA3AF"
                value={inviteSearch}
                onChangeText={setInviteSearch}
              />
              <ScrollView style={{ maxHeight: 320 }}>
                {isLoadingInvites ? (
                  <Text style={styles.loadingText}>Loading...</Text>
                ) : (
                  inviteConnections
                    .filter((c: any) => {
                      const name = (c.user?.name || c.name || '').toLowerCase();
                      return name.includes(inviteSearch.toLowerCase());
                    })
                    .map((c: any) => {
                      const id = c.user?.id || c.id;
                      const name = c.user?.name || c.name || 'Unknown';
                      const avatar = c.user?.avatar || c.user?.avatar_url || '';
                      const selected = selectedInviteeIds.has(id);
                      const initials = name.split(' ').slice(0,2).map((n:string)=>n.charAt(0).toUpperCase()).join('');
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.connectionRow, selected && styles.connectionRowSelected]}
                          onPress={() => toggleInvitee(id)}
                        >
                          {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.connectionAvatar} />
                          ) : (
                            <View style={[styles.connectionAvatar, styles.connectionAvatarFallback]}>
                              <Text style={styles.connectionAvatarInitials}>{initials}</Text>
                            </View>
                          )}
                          <Text style={styles.connectionName}>{name}</Text>
                          <View style={[styles.inviteCheck, selected && styles.inviteCheckOn]}>
                            <Text style={[styles.inviteCheckText, selected && styles.inviteCheckTextOn]}>✓</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                )}
              </ScrollView>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowInviteModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={async () => {
                  if (!toki) return;
                  if (selectedInviteeIds.size === 0) { Alert.alert('Select connections'); return; }
                  setIsLoadingInvites(true);
                  try {
                    // Decide whether we are inviting or hiding based on which opener was used.
                    // If the modal opened from Hide button, prefer hiding.
                    // Heuristic: if hide button opened last, we set a flag; else invite.
                    // For now, use a simple dual-action approach: invite by default; pressing Hide opens same modal and we call hide.
                    for (const userId of selectedInviteeIds) {
                      await actions.hideUser(toki.id, userId);
                    }
                    setShowInviteModal(false);
                    Alert.alert('Hidden from selected users');
                  } catch (e) {
                    Alert.alert('Error', 'Failed to apply hide');
                  } finally {
                    setIsLoadingInvites(false);
                  }
                }}>
                  <Text style={styles.confirmButtonText}>Hide Users</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.detailsContainer}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{toki.title}</Text>
            {toki.visibility === 'private' && (
              <View style={styles.privateBadge}>
                <Lock size={14} color="#FFFFFF" />
                <Text style={styles.privateBadgeText}>Private</Text>
              </View>
            )}
            {toki.isHostedByUser && hiddenCount > 0 && (
              <View style={styles.hiddenBadge}>
                <Text style={styles.hiddenBadgeText}>Hidden {hiddenCount}</Text>
              </View>
            )}
            <Text style={styles.distance}>{toki.distance} away</Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <MapPin size={18} color="#B49AFF" />
              <Text style={styles.infoText}>{formatLocationDisplay(toki.location)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Clock size={18} color="#B49AFF" />
              <Text style={styles.infoText}>{formatTimeDisplay(toki.time, toki.scheduledTime)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Users size={18} color="#B49AFF" />
              <Text style={styles.infoText}>
                {toki.attendees}/{toki.maxAttendees} people
              </Text>
            </View>
          </View>

          {/* Participants Section */}
          {toki.participants && toki.participants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={styles.sectionTitle}>Participants</Text>
              <View style={styles.participantsList}>
                {toki.participants.map((participant, index) => (
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
                  </View>
                ))}
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
                <Image source={{ uri: toki.host.avatar }} style={styles.hostAvatar} />
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
            <TouchableOpacity style={styles.inviteButton} onPress={handleInvitePress}>
              <UserPlus size={20} color="#B49AFF" />
              <Text style={styles.inviteText}>Invite</Text>
            </TouchableOpacity>

            {/* Hide button (host-only) */}
            {toki.isHostedByUser && (
              <TouchableOpacity style={styles.hideButton} onPress={async () => {
                try {
                  setIsLoadingInvites(true);
                  const { connections } = await actions.getConnections();
                  setInviteConnections(connections || []);
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
    </SafeAreaView>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
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
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
  participantStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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

});