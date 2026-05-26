// Phase-2 hook extraction from app/toki-details.tsx.
// Owns: showInviteModal, modalMode, inviteConnections, selectedInviteeIds, isLoadingInvites,
//       inviteSearch, hiddenCount, inviteLinks, activeInviteLink, isLoadingInviteLinks,
//       inviteLinkMessage, inviteLinkMaxUses.
// Handles: handleInvitePress, handleInviteModalConfirm, sendInvites, toggleInvitee, handleUnhideUser,
//          loadInviteLinks, handleGenerate/Regenerate/Create/Deactivate/CopyInviteLink, reconstructInviteLink.

import { useState } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { generateInviteLinkUrl } from '@/utils/tokiUrls';
import { TokiDetails } from '../data';

interface UseInviteFlowArgs {
  toki: TokiDetails | null;
  actions: any;
}

export function useInviteFlow({ toki, actions }: UseInviteFlowArgs) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [modalMode, setModalMode] = useState<'invite' | 'hide'>('invite');
  const [inviteConnections, setInviteConnections] = useState<any[]>([]);
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<Set<string>>(new Set());
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [hiddenCount, setHiddenCount] = useState<number>(0);

  // Invite Link Management
  const [inviteLinks, setInviteLinks] = useState<any[]>([]);
  const [activeInviteLink, setActiveInviteLink] = useState<any>(null);
  const [isLoadingInviteLinks, setIsLoadingInviteLinks] = useState(false);
  const [inviteLinkMessage, setInviteLinkMessage] = useState('');
  const [inviteLinkMaxUses, setInviteLinkMaxUses] = useState<number | null>(null);

  const reconstructInviteLink = (link: any) => {
    if (!link) return null;
    if (link.inviteCode) {
      return {
        ...link,
        inviteUrl: generateInviteLinkUrl(link.inviteCode)
      };
    }
    return link;
  };

  const loadInviteLinks = async () => {
    if (!toki) return;
    try {
      setIsLoadingInviteLinks(true);
      const data = await actions.getInviteLinksForToki(toki.id);
      const reconstructedLinks = (data.links || []).map((link: any) => reconstructInviteLink(link));
      const reconstructedActiveLink = data.activeLink ? reconstructInviteLink(data.activeLink) : null;
      setInviteLinks(reconstructedLinks);
      setActiveInviteLink(reconstructedActiveLink);
    } catch (e) {
      console.error('Failed to load invite links:', e);
    } finally {
      setIsLoadingInviteLinks(false);
    }
  };

  const handleInvitePress = async () => {
    if (!toki) return;

    if (!actions.requireAuthForIntent({
      route: '/toki-details',
      params: { tokiId: toki.id },
    })) {
      return;
    }

    const canInvite = toki.isHostedByUser || (toki.visibility === 'public' && toki.joinStatus === 'approved');
    if (!canInvite) {
      Alert.alert('Cannot invite', 'Only hosts or attendees of public events can invite users.');
      return;
    }

    try {
      setIsLoadingInvites(true);
      setModalMode('invite');
      const { connections } = await actions.getConnectionsForToki(toki.id);

      const participantIds = new Set((toki.participants || []).map((p: any) => p.user?.id || p.id));

      const connectionsWithStatus = (connections || []).map((conn: any) => ({
        ...conn,
        isParticipant: participantIds.has(conn.user?.id || conn.id),
      }));

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
        const { connections } = await actions.getConnectionsForToki(toki.id);
        setInviteConnections(connections || []);
        const list = await actions.listHiddenUsers(toki.id);
        setHiddenCount((list || []).length);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to unhide user');
    }
  };

  const sendInvites = async () => {
    if (!toki) return;
    if (selectedInviteeIds.size === 0) {
      Alert.alert('Select connections', 'Pick at least one connection to invite.');
      return;
    }

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

  const handleGenerateInviteLink = async () => {
    if (!toki) return;
    try {
      setIsLoadingInviteLinks(true);
      const link = await actions.generateInviteLink(toki.id, {
        maxUses: inviteLinkMaxUses || null,
        message: inviteLinkMessage || null
      });
      if (link) {
        await loadInviteLinks();
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
        const reconstructedLink = reconstructInviteLink(link.data);
        setActiveInviteLink(reconstructedLink);
        await loadInviteLinks();
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
        const reconstructedLink = reconstructInviteLink(link.data);
        setActiveInviteLink(reconstructedLink);
        await loadInviteLinks();
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
        await loadInviteLinks();
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

  return {
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
    inviteLinks,
    activeInviteLink,
    isLoadingInviteLinks,
    inviteLinkMessage,
    setInviteLinkMessage,
    inviteLinkMaxUses,
    setInviteLinkMaxUses,
    handleInvitePress,
    handleInviteModalConfirm,
    sendInvites,
    toggleInvitee,
    handleUnhideUser,
    loadInviteLinks,
    handleGenerateInviteLink,
    handleRegenerateInviteLink,
    handleCreateInviteLink,
    handleDeactivateInviteLink,
    handleCopyInviteLink,
    reconstructInviteLink,
  };
}
