// Phase-2 hook extraction from app/toki-details.tsx.
// Owns: toki, isLoading, isLiked, isSaving, lastProcessedTokiId ref.
// Handles: loadTokiData, checkSavedStatus, handleSaveToggle.
// Effects: load on tokiId change, focus refresh, force reload on fromCreate, saved status mount check.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import { apiService } from '@/services/api';
import { calculateDistance } from '@/utils/distance';
import { TokiDetails, tokiDetailsMap } from '../data';

interface UseTokiDataArgs {
  effectiveParams: { tokiId?: string };
  fromCreate: boolean;
  state: any;
  actions: any;
}

export function useTokiData({ effectiveParams, fromCreate, state, actions }: UseTokiDataArgs) {
  const [toki, setToki] = useState<TokiDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastProcessedTokiId = useRef<string | null>(null);

  const checkSavedStatus = async () => {
    if (!apiService.hasToken()) {
      setIsLiked(false);
      return;
    }
    try {
      console.log('🔍 Checking saved status for Toki:', effectiveParams.tokiId);
      const saved = await actions.checkIfSaved(effectiveParams.tokiId as string);
      console.log('💾 Toki saved status:', saved);
      setIsLiked(saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSaveToggle = async () => {
    if (isSaving || !effectiveParams.tokiId) return;

    if (!actions.requireAuthForIntent({
      route: '/toki-details',
      params: {
        tokiId: effectiveParams.tokiId as string,
        resumeAction: 'save',
        nextSavedState: isLiked ? 'unsave' : 'save',
      },
    })) {
      return;
    }

    console.log('💝 Toggling save status for Toki:', effectiveParams.tokiId, 'Current state:', isLiked);

    try {
      setIsSaving(true);
      if (isLiked) {
        console.log('🗑️ Unsaving Toki...');
        const success = await actions.unsaveToki(effectiveParams.tokiId as string);
        if (success) {
          setIsLiked(false);
          console.log('✅ Toki unsaved successfully');
        }
      } else {
        console.log('💾 Saving Toki...');
        const success = await actions.saveToki(effectiveParams.tokiId as string);
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
    if (!tokiId) {
      console.log('🚨 [FLOW DEBUG] [TOKI DETAILS] loadTokiData called with no tokiId');
      return;
    }

    console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] Loading toki data for:', tokiId, `(attempt ${retryCount + 1})`);
    setIsLoading(true);
    try {
      const isAuthenticated = apiService.hasToken();
      const tokiData: any = isAuthenticated
        ? await apiService.getToki(tokiId)
        : await apiService.getPublicToki(tokiId);

      // Fetch friends attending data BEFORE creating transformedToki
      let friendsAttending: Array<{ id: string; name: string; avatar?: string; isFriend?: boolean }> = [];
      if (isAuthenticated) {
        try {
          friendsAttending = await actions.getFriendsAttendingToki(tokiId);
        } catch (error) {
          console.error('Error loading friends attending:', error);
        }
      }

      // Transform backend data to match our interface
      const transformedToki: TokiDetails = {
        id: tokiData.id,
        title: tokiData.title,
        description: tokiData.description,
        location: tokiData.location,
        time: tokiData.timeSlot,
        scheduledTime: tokiData.scheduledTime,
        attendees: tokiData.currentAttendees || 0,
        maxAttendees: tokiData.maxAttendees ?? null,
        category: tokiData.category || 'social',
        tags: tokiData.tags || [],
        host: {
          id: tokiData.host?.id || '',
          name: tokiData.host?.name || 'Unknown',
          avatar: tokiData.host?.avatar,
          rating: tokiData.host?.rating,
          bio: tokiData.host?.bio,
        },
        hostId: tokiData.host?.id,
        image: tokiData.imageUrl || '',
        distance: (() => {
          if (tokiData.distance) {
            return typeof tokiData.distance === 'object'
              ? `${tokiData.distance.km} km`
              : tokiData.distance;
          }
          const tokiFromState = state.tokis.find((t: any) => t.id === tokiData.id);
          if (tokiFromState?.distance) {
            return tokiFromState.distance;
          }
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
        joinStatus: tokiData.joinStatus || 'not_joined',
        link: tokiData.externalLink || undefined,
        latitude: tokiData.latitude,
        longitude: tokiData.longitude,
        participants: (tokiData.participants || []).map((p: any) => ({
          id: p?.user?.id || p?.id || '',
          name: p?.user?.name || p?.name || 'Unknown',
          avatar: p?.user?.avatar || p?.avatar || undefined,
        })),
        friendsAttending,
        isPaid: tokiData.isPaid || false,
        isBoosted: tokiData.isBoosted || false,
        boostId: tokiData.boostId || null,
      };

      setToki(transformedToki);
      console.log('✅ [FLOW DEBUG] [TOKI DETAILS] Toki data loaded successfully:', tokiId);

      // Check saved status after Toki data is loaded
      if (isAuthenticated) {
        checkSavedStatus();
      }

      // If newly created and distance missing/0, retry
      const hasNoDistance = !tokiData.distance || (typeof tokiData.distance === 'object' && (tokiData.distance.km === 0 || tokiData.distance.km === null));
      if (fromCreate && hasNoDistance && retryCount < 3) {
        console.log(`📍 [TOKI DETAILS] No distance found for newly created toki, retrying in 1.5 seconds... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          loadTokiData(tokiId, retryCount + 1);
        }, 1500);
      }

      // If newly created without images, retry
      if (!tokiData.imageUrl && retryCount < 3) {
        console.log(`📸 [TOKI DETAILS] No images found, retrying in 2 seconds... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          loadTokiData(tokiId, retryCount + 1);
        }, 2000);
      }
    } catch (error) {
      console.error('Error loading Toki data:', error);
      const fallbackData = tokiDetailsMap[tokiId];
      if (fallbackData) {
        setToki(fallbackData);
        checkSavedStatus();
      } else if (!apiService.hasToken()) {
        actions.clearAnonymousLanding();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check saved status whenever tokiId changes
  useEffect(() => {
    if (effectiveParams.tokiId) {
      checkSavedStatus();
    }
  }, [effectiveParams.tokiId]);

  // Load Toki data when component mounts or tokiId changes
  useEffect(() => {
    const tokiId = effectiveParams.tokiId as string;
    console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] Component effect triggered, tokiId:', tokiId, 'lastProcessedTokiId:', lastProcessedTokiId.current);

    if (tokiId && tokiId !== lastProcessedTokiId.current) {
      lastProcessedTokiId.current = tokiId;
      console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] ✅ Valid tokiId found, loading data:', tokiId);
      if (!state.currentUser?.id && apiService.hasToken()) {
        console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] Waiting for current user to load...');
        actions.loadCurrentUser().then(() => {
          loadTokiData(tokiId);
        });
      } else {
        loadTokiData(tokiId);
      }
    } else if (!tokiId) {
      console.log('🚨 [FLOW DEBUG] [TOKI DETAILS] ❌ NO tokiId found! Component will not load.');
    }
  }, [effectiveParams.tokiId, state.currentUser?.id]);

  // Force reload when coming from create
  useEffect(() => {
    if (fromCreate && effectiveParams.tokiId) {
      const tokiId = effectiveParams.tokiId as string;
      const timer = setTimeout(() => {
        console.log('📍 [TOKI DETAILS] Forcing fresh data load after creation');
        loadTokiData(tokiId, 0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [fromCreate, effectiveParams.tokiId]);

  // Refresh data when screen regains focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      const tokiId = effectiveParams.tokiId as string;
      if (tokiId && !fromCreate) {
        loadTokiData(tokiId);
      }
    }, [effectiveParams.tokiId, fromCreate])
  );

  return {
    toki,
    setToki,
    isLoading,
    isLiked,
    setIsLiked,
    isSaving,
    loadTokiData,
    handleSaveToggle,
    checkSavedStatus,
  };
}
