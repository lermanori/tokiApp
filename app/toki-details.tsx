// Phase-2 refactor: 7 custom hooks extract handler groups + their local state.
// See app/_toki-details/hooks/ for the implementations.
// JSX preserved verbatim from the pre-Phase-2 file (~860 lines).

import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Modal, TextInput, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Clock, Users, Heart, Share, MessageCircle, UserPlus, Edit, Trash2, CheckCircle, Lock, Link, Copy, RefreshCw, X, Flag, Tag } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import RatingPrompt from '@/components/RatingPrompt';
import InviteModal from '@/components/InviteModal';
import ParticipantsModal from '@/components/ParticipantsModal';
import FriendsGoingModal from '@/components/FriendsGoingModal';
import FriendsGoingOverlay from '@/components/FriendsGoingOverlay';
import ReportModal from '@/components/ReportModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useNotificationOptIn } from '@/hooks/useNotificationOptIn';
import { apiService } from '@/services/api';
import { getActivityPhoto } from '@/utils/activityPhotos';
import { generateTokiShareUrl, generateTokiShareMessage, generateTokiShareOptions, generateInviteLinkUrl } from '@/utils/tokiUrls';
import { formatDistanceDisplay, calculateDistance } from '@/utils/distance';
import { getInitials, getActivityEmoji, getActivityLabel, formatLocationDisplay, formatTimeDisplay, canUserInvite, canUserManage } from '@/utils/tokiUtils';
import MetaTags from '@/components/MetaTags';
import AppInstallPrompt from '@/components/AppInstallPrompt';
import TokiHeader from '@/components/TokiHeader';
import { Share as RNShare } from 'react-native';
import { stripResumeParams } from '@/utils/anonymousLanding';
import TokiStorySticker from '@/components/TokiStorySticker';
import TokiStoryBackground from '@/components/TokiStoryBackground';

import { MAX_PARTICIPANTS_DISPLAY, TokiDetails, tokiDetailsMap } from './_toki-details/data';
import { styles } from './_toki-details/styles';

// Phase-2 hooks
import { useTokiData } from './_toki-details/hooks/useTokiData';
import { useJoinFlow } from './_toki-details/hooks/useJoinFlow';
import { useShareFlow } from './_toki-details/hooks/useShareFlow';
import { useInviteFlow } from './_toki-details/hooks/useInviteFlow';
import { useParticipantFlow } from './_toki-details/hooks/useParticipantFlow';
import { useTokiLifecycle } from './_toki-details/hooks/useTokiLifecycle';
import { useReportFlow } from './_toki-details/hooks/useReportFlow';

const { width } = Dimensions.get('window');

export default function TokiDetailsScreen() {
  const { state, actions } = useApp();
  const features = useFeatures();
  const params = useLocalSearchParams();
  const notifOptIn = useNotificationOptIn();
  const hasTrackedView = useRef(false);
  const hasTrackedOpen = useRef<string | null>(null);
  const resumeActionHandledRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fallback to read URL parameters directly (for web deep linking)
  const getUrlParams = () => {
    if (typeof window === 'undefined') return {};
    if (typeof window.location === 'undefined') return {};
    if (!window.location.href) return {};
    try {
      const href = window.location.href;
      if (typeof href !== 'string' || !href.startsWith('http')) {
        return {};
      }
      const url = new URL(href);
      const urlParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });
      return urlParams;
    } catch (error) {
      return {};
    }
  };

  const urlParams = getUrlParams();
  const effectiveParams = {
    ...params,
    tokiId: (params.tokiId as string) || urlParams.tokiId,
    title: (params.title as string) || urlParams.title,
    location: (params.location as string) || urlParams.location,
    time: (params.time as string) || urlParams.time,
    fromEdit: (params.fromEdit as string) || urlParams.fromEdit,
    fromCreate: (params.fromCreate as string) || urlParams.fromCreate,
    resumeAction: (params.resumeAction as string) || urlParams.resumeAction,
    nextSavedState: (params.nextSavedState as string) || urlParams.nextSavedState,
  };

  const fromEdit = effectiveParams.fromEdit === 'true';
  const fromCreate = effectiveParams.fromCreate === 'true';

  // Web-compatible alert helper
  const showAlert = (title: string, message: string) => {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}: ${message}`);
    } else {
      console.log(`${title}: ${message}`);
    }
  };

  // --- Hooks (Phase-2 extraction) ---
  const tokiData = useTokiData({ effectiveParams, fromCreate, state, actions });
  const { toki, setToki, isLoading, isLiked, isSaving, loadTokiData, handleSaveToggle } = tokiData;

  const joinFlow = useJoinFlow({ toki, setToki, state, actions, features, notifOptIn, loadTokiData });
  const {
    isJoining,
    showCancelRequestModal,
    setShowCancelRequestModal,
    handleJoinRequest,
    handleCancelRequest,
    handleChatPress,
    openHostChat,
    navigateToExplore,
    navigateToUserProfile,
    canAccessChat,
    getJoinButtonText,
    getJoinButtonColor,
  } = joinFlow;

  const shareFlow = useShareFlow({ toki });
  const {
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
    handleShareToki,
    handleShareToStory,
    shareToTwitter,
    shareToFacebook,
    shareToLinkedIn,
    shareToWhatsApp,
    shareToTelegram,
    copyToClipboard,
    copyMessageToClipboard,
  } = shareFlow;

  const inviteFlow = useInviteFlow({ toki, actions });
  const {
    showInviteModal,
    setShowInviteModal,
    modalMode,
    setModalMode,
    inviteConnections,
    setInviteConnections,
    selectedInviteeIds,
    setSelectedInviteeIds,
    isLoadingInvites,
    setIsLoadingInvites,
    inviteSearch,
    setInviteSearch,
    hiddenCount,
    setHiddenCount,
    inviteLinkMessage,
    setInviteLinkMessage,
    inviteLinkMaxUses,
    setInviteLinkMaxUses,
    activeInviteLink,
    handleInvitePress,
    handleInviteModalConfirm,
    toggleInvitee,
    handleUnhideUser,
    handleCreateInviteLink,
    handleRegenerateInviteLink,
    handleCopyInviteLink,
  } = inviteFlow;

  const participantFlow = useParticipantFlow({ toki, setToki, actions });
  const {
    showParticipantsModal,
    setShowParticipantsModal,
    showRemoveConfirm,
    participantsSearch,
    setParticipantsSearch,
    participantToRemove,
    handleRemoveParticipant,
    handleOpenParticipantsModal,
    handleRemoveParticipantFromModal,
    confirmRemoveParticipant,
    cancelRemoveParticipant,
  } = participantFlow;

  const lifecycle = useTokiLifecycle({ toki, setToki, state, actions });
  const {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showRatingPrompt,
    setShowRatingPrompt,
    participantsForRating,
    isCompleting,
    showHostOnlyConfirm,
    setShowHostOnlyConfirm,
    handleEditPress,
    handleDeletePress,
    handleConfirmDelete,
    handleCancelDelete,
    handleCompleteEvent,
    completeEventAfterRatings,
    handleBoostManagePress,
  } = lifecycle;

  const reportFlow = useReportFlow({ toki, actions });
  const { showReportModal, setShowReportModal, handleReportToki } = reportFlow;

  // Small leftover screen-level UI state (used only inside JSX)
  const [showFriendsModal, setShowFriendsModal] = React.useState(false);
  const [friendsSearch, setFriendsSearch] = React.useState('');

  // --- Tracking & orchestration effects (kept in screen since they involve multiple hooks) ---

  // Mount log
  useEffect(() => {
    console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] ===== COMPONENT MOUNTED =====');
    console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] URL:',
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : 'N/A (native)');
    console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] effectiveParams:', effectiveParams);

    return () => {
      console.log('🔍 [FLOW DEBUG] [TOKI DETAILS] ===== COMPONENT UNMOUNTING =====');
    };
  }, []);

  // Track view once per mount/tokiId
  useEffect(() => {
    const tokiId = effectiveParams.tokiId as string;
    if (tokiId && !hasTrackedView.current) {
      hasTrackedView.current = true;
      console.log('📊 [TOKI DETAILS] Recording view for analytics:', tokiId);
      actions.viewToki(tokiId);
    }
  }, [effectiveParams.tokiId]);

  // Track open engagement (boosts feature)
  useEffect(() => {
    if (!features.boosts) return;
    if (!toki?.id || !state.currentUser?.id) {
      return;
    }
    if (hasTrackedOpen.current === toki.id) {
      return;
    }
    hasTrackedOpen.current = toki.id;
    apiService.trackEngagement(toki.id, 'open').catch((error: any) => {
      console.warn('⚠️ Failed to track toki open engagement:', error);
    });
  }, [features.boosts, toki?.id, state.currentUser?.id]);

  // Resume action after login (calls handlers from multiple hooks — stays in screen)
  useEffect(() => {
    const tokiId = effectiveParams.tokiId as string;
    const resumeAction = effectiveParams.resumeAction as string | undefined;

    if (!resumeAction || !tokiId || !state.currentUser?.id) {
      return;
    }

    const resumeKey = `${resumeAction}:${tokiId}:${effectiveParams.nextSavedState || ''}`;
    if (resumeActionHandledRef.current === resumeKey) {
      return;
    }
    resumeActionHandledRef.current = resumeKey;

    const executeResumeAction = async () => {
      if (resumeAction === 'save') {
        if (effectiveParams.nextSavedState === 'unsave') {
          await actions.unsaveToki(tokiId);
          tokiData.setIsLiked(false);
        } else {
          await actions.saveToki(tokiId);
          tokiData.setIsLiked(true);
        }
        router.replace({
          pathname: '/toki-details',
          params: stripResumeParams(params as Record<string, any>),
        });
        return;
      }

      if (resumeAction === 'join') {
        handleJoinRequest();
        return;
      }

      if (resumeAction === 'chat') {
        handleChatPress();
      }
    };

    executeResumeAction();
  }, [effectiveParams.resumeAction, effectiveParams.tokiId, effectiveParams.nextSavedState, state.currentUser?.id, params]);

  // --- Early returns ---
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

  // Get current URL for app install prompt
  const getCurrentUrl = () => {
    if (typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }
    if (toki?.id) {
      const baseUrl = 'https://toki-app.com';
      return `${baseUrl}/toki-details?tokiId=${toki.id}`;
    }
    return undefined;
  };

  // --- JSX (preserved verbatim from pre-Phase-2 file) ---
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
      <AppInstallPrompt currentUrl={getCurrentUrl()} />
      <SafeAreaView style={styles.container}>
        <ScrollView testID="toki-details-scroll" style={{ ...styles.content, width: '100%', maxWidth: 1000, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
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
            onShareToStory={instagramAvailable ? handleShareToStory : undefined}
            friendsAttending={toki?.friendsAttending}
            onFriendsPress={() => setShowFriendsModal(true)}
            onBack={() => {
              if (state.anonymousLanding.isAnonymousLanding) {
                navigateToExplore();
                return;
              }

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
            isHost={toki.isHostedByUser || false}
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

          <FriendsGoingModal
            visible={showFriendsModal}
            friends={toki?.friendsAttending || []}
            search={friendsSearch}
            onChangeSearch={setFriendsSearch}
            isLoading={false}
            onClose={() => setShowFriendsModal(false)}
          />

          <View style={styles.detailsContainer}>
            {/* Event Title and Badges */}
            <View style={styles.eventHeaderSection}>
              <View style={styles.eventTitleRow}>
                <Text style={styles.eventTitle}>{toki.title}</Text>
                <View style={styles.eventBadgesContainer}>
                  {features.boosts && toki.isBoosted && (
                    <View style={styles.eventFeaturedBadge}>
                      <Text style={styles.eventFeaturedBadgeText}>Featured</Text>
                    </View>
                  )}
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
                    if (!actions.requireAuthForIntent({ route: '/exMap' })) {
                      return;
                    }
                    router.push({
                      pathname: '/(tabs)/exMap',
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
                  {toki.attendees}/{toki.maxAttendees === null ? '∞' : toki.maxAttendees} people
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
              <View style={styles.eventInfoItem}>
                <Tag size={18} color="#B49AFF" />
                <Text style={styles.eventInfoText}>
                  {toki.isPaid ? 'Paid Event' : 'Free Event'}
                </Text>
              </View>
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
                              navigateToUserProfile(participant.id);
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
                    testID="toki-details-host-link"
                    onPress={() => {
                      if (!toki.isHostedByUser) {
                        navigateToUserProfile(toki.host.id);
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
                    onPress={openHostChat}
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
                const isPublicAttendee = toki.visibility === 'public' && toki.joinStatus === 'approved';
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
                <TouchableOpacity
                  style={styles.boostButton}
                  onPress={handleBoostManagePress}
                  testID="toki-details-boost-button"
                >
                  <Text style={styles.boostButtonEmoji}>▲</Text>
                  <Text style={styles.boostButtonText}>Boost</Text>
                </TouchableOpacity>
              )}

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



            {/* Report Button - Only show for Tokis not hosted by current user */}
            {!toki.isHostedByUser && (
              <View style={styles.reportSection}>
                <TouchableOpacity
                  testID="toki-details-report-button"
                  style={styles.reportButton}
                  onPress={() => {
                    if (!actions.requireAuthForIntent({
                      route: '/toki-details',
                      params: { tokiId: toki.id },
                    })) {
                      return;
                    }
                    setShowReportModal(true);
                  }}
                >
                  <Flag size={20} color="#EF4444" />
                  <Text style={styles.reportText}>Report Toki</Text>
                </TouchableOpacity>
              </View>
            )}

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
                        } catch { }
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
          onNavigateToExplore={navigateToExplore}
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
                        const shareUrl_full = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
                        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
                          window.open(shareUrl_full, '_blank');
                        } else {
                          Linking.openURL(shareUrl_full).catch(err => console.error('Failed to open Twitter:', err));
                        }
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
                        const shareUrl_full = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
                          window.open(shareUrl_full, '_blank');
                        } else {
                          Linking.openURL(shareUrl_full).catch(err => console.error('Failed to open Facebook:', err));
                        }
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
                        const shareUrl_full = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`;
                        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
                          window.open(shareUrl_full, '_blank');
                        } else {
                          Linking.openURL(shareUrl_full).catch(err => console.error('Failed to open LinkedIn:', err));
                        }
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
                        const shareUrl_full = `https://wa.me/?text=${text}`;
                        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
                          window.open(shareUrl_full, '_blank');
                        } else {
                          Linking.openURL(shareUrl_full).catch(err => console.error('Failed to open WhatsApp:', err));
                        }
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
                        const shareUrl_full = `https://t.me/share/url?url=${url}&text=${text}`;
                        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
                          window.open(shareUrl_full, '_blank');
                        } else {
                          Linking.openURL(shareUrl_full).catch(err => console.error('Failed to open Telegram:', err));
                        }
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

        {/* Report Modal */}
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportToki}
          title="Report Toki"
          subtitle="Please let us know why this Toki is inappropriate. This helps us maintain a safe community."
          contentType="Toki"
        />
        <ConfirmModal
          visible={showCancelRequestModal}
          title="Request Pending"
          message="Your join request is waiting for host approval."
          icon="clock"
          confirmLabel="Cancel Request"
          cancelLabel="Keep Waiting"
          confirmStyle="destructive"
          onConfirm={handleCancelRequest}
          onCancel={() => setShowCancelRequestModal(false)}
        />
        <ConfirmModal
          visible={notifOptIn.visible}
          title="You're in!"
          message="Want a reminder when it starts?"
          icon="clock"
          confirmLabel={notifOptIn.mode === 'openSettings' ? 'Open Settings' : 'Yes, remind me'}
          cancelLabel="Not now"
          confirmStyle="primary"
          onConfirm={notifOptIn.handleConfirm}
          onCancel={notifOptIn.handleDismiss}
        />

        {/* Offscreen render targets for Instagram Story capture */}
        {toki && (Platform.OS === 'ios' || Platform.OS === 'android') ? (
          <View
            pointerEvents="none"
            style={styles.offscreenCaptureHost}
            collapsable={false}
          >
            <TokiStoryBackground ref={backgroundRef} imageUri={toki.image} />
            <TokiStorySticker
              ref={stickerRef}
              toki={{
                id: toki.id,
                title: toki.title,
                image: toki.image,
                location: toki.location,
                scheduledTime: toki.scheduledTime,
                timeSlot: toki.timeSlot,
                category: toki.category,
                distance: toki.distance,
              }}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}
