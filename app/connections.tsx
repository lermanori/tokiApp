import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, MessageCircle, UserPlus, Calendar, RefreshCw, AlertTriangle, UserX, UserCheck, MapPin, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { apiService } from '@/services/api';
import { getBackendUrl } from '@/services/config';

// Helper function to get user initials from name
const getUserInitials = (name: string): string => {
  if (!name) return '?';
  const names = name.trim().split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

interface Connection {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  rating: string;
  tokisCreated: number;
  mutualConnections: number;
  tokisAttended: number;
  lastSeen: string;
}

// Interface for backend connection data
interface BackendConnection {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    location?: string;
    rating?: string;
    tokisCreated?: number;
  };
}

// Interface for search results (new people)
interface SearchUser {
  id: string;
  name: string;
  bio?: string;
  location?: string;
  avatar?: string;
  verified: boolean;
  rating: string;
  memberSince: string;
  connectionsCount: number;
  tokisCreated: number;
  isConnected: boolean;
}

// Interface for connection status
interface ConnectionStatus {
  status: 'none' | 'pending' | 'accepted' | 'declined';
  isRequester?: boolean;
}

// Unified user interface for display
interface UnifiedUser {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  rating: string;
  tokisCreated: number;
  userType: 'friend' | 'new' | 'pending' | 'blocked';
  connectionStatus?: ConnectionStatus;
  mutualConnections?: number;
  lastSeen?: string;
}

export default function ConnectionsScreen() {
  const { state, actions } = useApp();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingConnections, setPendingConnections] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent'>('all');
  const [selectedTab, setSelectedTab] = useState<'connections' | 'pending' | 'blocked'>('connections');
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom prompt states
  const [showBlockPrompt, setShowBlockPrompt] = useState(false);
  const [showUnblockPrompt, setShowUnblockPrompt] = useState(false);
  const [showRemovePrompt, setShowRemovePrompt] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  // Load connections from backend
  useEffect(() => {
    loadConnections();
    loadPendingConnections();
    loadBlockedUsers();
  }, []);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const searchTimeout = setTimeout(() => {
        searchUsers();
      }, 300); // Debounce search
      
      return () => clearTimeout(searchTimeout);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadConnections = async () => {
    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to load connections. Please check your connection and try again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await actions.getConnections();
      const backendConnections = response.connections;
      
      // Transform backend data to match our interface
      const transformedConnections: Connection[] = backendConnections.map((conn: BackendConnection) => ({
        id: conn.user.id,
        name: conn.user.name,
        avatar: conn.user.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        bio: conn.user.bio || 'No bio available',
        location: conn.user.location || 'Location not set',
        rating: conn.user.rating || 'N/A',
        tokisCreated: conn.user.tokisCreated || 0,
        mutualConnections: 0,
        tokisAttended: 0,
        lastSeen: 'Recently',
      }));
      
      setConnections(transformedConnections);
    } catch (error) {
      console.error('Failed to load connections:', error);
      Alert.alert('Error', 'Failed to load connections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingConnections = async () => {
    if (!state.isConnected) {
      return;
    }

    try {
      const pendingConnections = await actions.getPendingConnections();
      setPendingConnections(pendingConnections);
    } catch (error) {
      console.error('Failed to load pending connections:', error);
    }
  };

  const loadBlockedUsers = async () => {
    if (!state.isConnected) {
      console.log('🚫 [LOAD BLOCKED] No connection, skipping');
      return;
    }

    try {
      const backendUrl = getBackendUrl();
      const accessToken = apiService.getAccessToken();
      
      console.log('🚫 [LOAD BLOCKED] Loading blocked users...');
      console.log('🚫 [LOAD BLOCKED] Backend URL:', backendUrl);
      console.log('🚫 [LOAD BLOCKED] Access Token exists:', !!accessToken);
      
      const response = await fetch(`${backendUrl}/api/blocks/blocked-users`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🚫 [LOAD BLOCKED] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🚫 [LOAD BLOCKED] Success, blocked users:', data.data.blockedUsers.length);
        setBlockedUsers(data.data.blockedUsers);
      } else {
        const errorData = await response.text();
        console.log('🚫 [LOAD BLOCKED] Error response:', errorData);
      }
    } catch (error) {
      console.error('🚫 [LOAD BLOCKED] Exception error:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('🔍 Searching users...');
    setIsSearching(true);
    try {
      const foundUsers = await actions.searchUsers(searchQuery);
      console.log('📱 Users found:', foundUsers.length);
      setSearchResults(foundUsers);
    } catch (error) {
      console.error('Failed to search users:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Get unified results combining connections, search results, and pending
  const getUnifiedResults = (): UnifiedUser[] => {
    const results: UnifiedUser[] = [];
    
    // Add existing connections first (priority)
    connections.forEach(conn => {
      results.push({
        ...conn,
        userType: 'friend',
        mutualConnections: conn.mutualConnections,
        lastSeen: conn.lastSeen,
      });
    });
    
    // Add search results (new people)
    searchResults.forEach(user => {
      // Don't add if already in connections
      if (!connections.find(c => c.id === user.id)) {
        results.push({
          id: user.id,
          name: user.name,
          avatar: user.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
          bio: user.bio || 'No bio available',
          location: user.location || 'Location not set',
          rating: user.rating || 'N/A',
          tokisCreated: user.tokisCreated || 0,
          userType: 'new',
        });
      }
    });
    
    // Add pending connections
    pendingConnections.forEach(pending => {
      results.push({
        id: pending.requester?.id || pending.id,
        name: pending.requester?.name || 'Unknown User',
        avatar: pending.requester?.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        bio: pending.requester?.bio || 'No bio available',
        location: pending.requester?.location || 'Location not set',
        rating: pending.requester?.rating || 'N/A',
        tokisCreated: pending.requester?.tokisCreated || 0,
        userType: 'pending',
      });
    });
    
    return results;
  };

  const filters = [
    { key: 'all', label: 'All', count: getUnifiedResults().length },
    { key: 'recent', label: 'Recent', count: connections.length },
  ];

  const filteredResults = getUnifiedResults().filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.bio.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || selectedFilter === 'recent';
    
    return matchesSearch && matchesFilter;
  });

  const handleConnectionPress = (user: UnifiedUser) => {
    console.log('View profile:', user.name);
    router.push({
      pathname: '/user-profile/[userId]',
      params: { userId: user.id }
    });
  };

  const handleAvatarPress = (user: UnifiedUser) => {
    handleConnectionPress(user);
  };

  const handleNamePress = (user: UnifiedUser) => {
    handleConnectionPress(user);
  };

  const handleMessagePress = async (user: UnifiedUser) => {
    try {
      router.push({
        pathname: '/chat',
        params: { 
          otherUserId: user.id,
          otherUserName: user.name,
          isGroup: 'false'
        }
      });
    } catch (error) {
      console.error('Error opening chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  const handleConnect = async (userId: string, userName: string) => {
    try {
      console.log('🔍 Sending connection request to:', userId, userName);
      
      const success = await actions.sendConnectionRequest(userId);
      if (success) {
        Alert.alert('Success', `Connection request sent to ${userName}`);
        // Reload data to show updated status
        loadConnections();
        loadPendingConnections();
        // Clear search to show updated results
        setSearchQuery('');
      } else {
        Alert.alert('Error', 'Failed to send connection request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    }
  };

  const handleAcceptRequest = async (requesterId: string, requesterName: string) => {
    try {
      const success = await actions.acceptConnectionRequest(requesterId);
      if (success) {
        Alert.alert('Success', `Accepted connection request from ${requesterName}`);
        loadConnections();
        loadPendingConnections();
      } else {
        Alert.alert('Error', 'Failed to accept connection request. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      Alert.alert('Error', 'Failed to accept connection request. Please try again.');
    }
  };

  const handleDeclineRequest = async (requesterId: string, requesterName: string) => {
    try {
      const success = await actions.declineConnectionRequest(requesterId);
      if (success) {
        Alert.alert('Success', `Declined connection request from ${requesterName}`);
        loadPendingConnections();
      } else {
        Alert.alert('Error', 'Failed to decline connection request. Please try again.');
      }
    } catch (error) {
      console.error('Error declining connection request:', error);
      Alert.alert('Error', 'Failed to decline connection request. Please try again.');
    }
  };

  const handleRemoveConnection = async (connectionId: string, connectionName: string) => {
    console.log('🔗 [REMOVE] Button pressed for:', connectionName, 'ID:', connectionId);
    setSelectedUser({ id: connectionId, name: connectionName });
    setShowRemovePrompt(true);
  };

  const confirmRemoveConnection = async () => {
    if (!selectedUser) return;
    
    console.log('🔗 [REMOVE] Confirmed removal for:', selectedUser.name);
    try {
      const success = await actions.removeConnection(selectedUser.id);
      console.log('🔗 [REMOVE] API response:', success);
      if (success) {
        // Show success message
        console.log('🔗 [REMOVE] Successfully removed connection:', selectedUser.name);
        loadConnections();
      } else {
        console.error('🔗 [REMOVE] Failed to remove connection');
      }
    } catch (error) {
      console.error('🔗 [REMOVE] Error removing connection:', error);
    } finally {
      setShowRemovePrompt(false);
      setSelectedUser(null);
    }
  };

  const handleBlockUser = async (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setShowBlockPrompt(true);
  };

  const confirmBlockUser = async () => {
    if (!selectedUser) return;
    
    console.log('🚫 [BLOCK] Starting block process for:', selectedUser.name, 'ID:', selectedUser.id);
    
    try {
      console.log('🚫 [BLOCK] Proceeding with block...');
      
      const backendUrl = getBackendUrl();
      const accessToken = apiService.getAccessToken();
      
      console.log('🚫 [BLOCK] Backend URL:', backendUrl);
      console.log('🚫 [BLOCK] Access Token exists:', !!accessToken);
      console.log('🚫 [BLOCK] Making request to:', `${backendUrl}/api/blocks/users/${selectedUser.id}`);
      
      const response = await fetch(`${backendUrl}/api/blocks/users/${selectedUser.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'User requested block'
        })
      });
      
      console.log('🚫 [BLOCK] Response status:', response.status);
      console.log('🚫 [BLOCK] Response ok:', response.ok);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('🚫 [BLOCK] Success response:', responseData);
        console.log('🚫 [BLOCK] Block successful! Reloading data...');
        
        await loadConnections();
        await loadBlockedUsers();
        
        console.log('🚫 [BLOCK] Data reloaded successfully');
      } else {
        const errorData = await response.text();
        console.log('🚫 [BLOCK] Error response:', errorData);
        console.log('🚫 [BLOCK] Block failed with status:', response.status);
      }
    } catch (error) {
      console.error('🚫 [BLOCK] Exception error:', error);
      console.log('🚫 [BLOCK] Block failed with exception:', error instanceof Error ? error.message : String(error));
    } finally {
      setShowBlockPrompt(false);
      setSelectedUser(null);
    }
  };

  const handleUnblockUser = async (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setShowUnblockPrompt(true);
  };

  const confirmUnblockUser = async () => {
    if (!selectedUser) return;
    
    console.log('🔓 [UNBLOCK] Starting unblock process for:', selectedUser.name, 'ID:', selectedUser.id);
    
    try {
      const backendUrl = getBackendUrl();
      const accessToken = apiService.getAccessToken();
      
      console.log('🔓 [UNBLOCK] Backend URL:', backendUrl);
      console.log('🔓 [UNBLOCK] Access Token exists:', !!accessToken);
      console.log('🔓 [UNBLOCK] Making request to:', `${backendUrl}/api/blocks/users/${selectedUser.id}`);
      
      const response = await fetch(`${backendUrl}/api/blocks/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔓 [UNBLOCK] Response status:', response.status);
      console.log('🔓 [UNBLOCK] Response ok:', response.ok);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('🔓 [UNBLOCK] Success response:', responseData);
        console.log('🔓 [UNBLOCK] Unblock successful! Reloading data...');
        
        await loadConnections();
        await loadBlockedUsers();
        
        console.log('🔓 [UNBLOCK] Data reloaded successfully');
      } else {
        const errorData = await response.text();
        console.log('🔓 [UNBLOCK] Error response:', errorData);
        console.log('🔓 [UNBLOCK] Unblock failed with status:', response.status);
      }
    } catch (error) {
      console.error('🔓 [UNBLOCK] Exception error:', error);
      console.log('🔓 [UNBLOCK] Unblock failed with exception:', error instanceof Error ? error.message : String(error));
    } finally {
      setShowUnblockPrompt(false);
      setSelectedUser(null);
    }
  };

  // Get action buttons based on user type
  const getActionButtons = (user: UnifiedUser) => {
    switch (user.userType) {
      case 'friend':
        return (
          <View style={styles.connectionActions}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={() => handleMessagePress(user)}
            >
              <MessageCircle size={20} color="#B49AFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => {
                console.log('🔗 [REMOVE] Button onPress triggered for:', user.name);
                handleRemoveConnection(user.id, user.name);
              }}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'new':
        return (
          <View style={styles.connectionActions}>
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={() => handleConnect(user.id, user.name)}
            >
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.viewProfileButton}
              onPress={() => handleConnectionPress(user)}
            >
              <Text style={styles.viewProfileButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'pending':
        return (
          <View style={styles.pendingActions}>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => handleAcceptRequest(user.id, user.name)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.declineButton}
              onPress={() => handleDeclineRequest(user.id, user.name)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  // Get badge for user type
  const getUserBadge = (user: UnifiedUser) => {
    switch (user.userType) {
      case 'friend':
        return <View style={styles.friendBadge}><Text style={styles.friendBadgeText}>Friend</Text></View>;
      case 'pending':
        return <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.title}>Connections</Text>
          <TouchableOpacity onPress={loadConnections} disabled={isLoading}>
            <RefreshCw size={24} color={isLoading ? "#CCCCCC" : "#B49AFF"} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search connections and find new people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {isSearching && (
            <View style={styles.searchingIndicator}>
              <RefreshCw size={16} color="#B49AFF" style={styles.spinning} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'connections' && styles.tabButtonActive
          ]}
          onPress={() => setSelectedTab('connections')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'connections' && styles.tabTextActive
          ]}>
            All ({filteredResults.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'pending' && styles.tabButtonActive
          ]}
          onPress={() => setSelectedTab('pending')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'pending' && styles.tabTextActive
          ]}>
            Pending ({pendingConnections.length})
          </Text>
        </TouchableOpacity>
        {/* Blocked tab hidden for now */}
        {/* <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'blocked' && styles.tabButtonActive
          ]}
          onPress={() => setSelectedTab('blocked')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'blocked' && styles.tabTextActive
          ]}>
            Blocked ({blockedUsers.length})
          </Text>
        </TouchableOpacity> */}
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter.key && styles.filterTextActive
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'connections' ? (
          // All Results Tab (Connections + New People + Pending)
          filteredResults.length === 0 ? (
            <View style={styles.emptyState}>
              <UserPlus size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No results found' : 'No connections yet'}
              </Text>
              <Text style={styles.emptyDescription}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Join Tokis to meet new people and build connections'
                }
              </Text>
              {!searchQuery && (
                <TouchableOpacity 
                  style={styles.exploreButton} 
                  onPress={() => router.push('/(tabs)')}
                >
                  <Text style={styles.exploreButtonText}>Explore Tokis</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.connectionsContainer}>
              {filteredResults.map((user) => (
                <View
                  key={user.id}
                  style={styles.connectionCard}
                >
                  <View style={styles.connectionHeader}>
                    <TouchableOpacity 
                      style={styles.avatarContainer}
                      onPress={() => handleAvatarPress(user)}
                    >
                      {user.avatar && user.avatar !== 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2' ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarInitials}>{getUserInitials(user.name)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    
                    <View style={styles.connectionInfo}>
                      <View style={styles.nameRow}>
                        <TouchableOpacity onPress={() => handleNamePress(user)}>
                          <Text style={styles.connectionName}>{user.name}</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.connectionBio}>{user.bio}</Text>
                      
                      <View style={styles.connectionMeta}>
                        <View style={styles.metaItem}>
                          <MapPin size={12} color="#9CA3AF" />
                          <Text style={styles.metaText}>{user.location}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Calendar size={12} color="#9CA3AF" />
                          <Text style={styles.metaText}>{user.tokisCreated || 0} Tokis</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.ratingText}>⭐ {user.rating}</Text>
                        </View>
                      </View>
                      
                      {user.userType === 'friend' && (
                        <Text style={styles.lastSeen}>Last active {user.lastSeen}</Text>
                      )}
                    </View>
                    
                    {getActionButtons(user)}
                  </View>
                  
                  {user.userType === 'friend' && (
                    <View style={styles.connectionStats}>
                      <Text style={styles.mutualConnections}>
                        {user.mutualConnections || 0} mutual connection{(user.mutualConnections || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  
                  {/* User Type Badge - Bottom Right */}
                  {getUserBadge(user)}
                </View>
              ))}
            </View>
          )
        ) : selectedTab === 'pending' ? (
          // Pending Connections Tab
          pendingConnections.length === 0 ? (
            <View style={styles.emptyState}>
              <UserPlus size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptyDescription}>
                You don't have any pending connection requests at the moment.
              </Text>
            </View>
          ) : (
            <View style={styles.connectionsContainer}>
              {pendingConnections.map((request: any) => (
                <View key={request.id} style={styles.connectionCard}>
                  <View style={styles.connectionHeader}>
                    <TouchableOpacity style={styles.avatarContainer}>
                      {request.requester?.avatar && request.requester.avatar !== 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2' ? (
                        <Image source={{ uri: request.requester.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarInitials}>{getUserInitials(request.requester?.name || 'Unknown User')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    
                    <View style={styles.connectionInfo}>
                      <Text style={styles.connectionName}>
                        {request.requester?.name || 'Unknown User'}
                      </Text>
                      <Text style={styles.connectionBio}>
                        {request.requester?.bio || 'No bio available'}
                      </Text>
                      <View style={styles.connectionMeta}>
                        <Text style={styles.ratingText}>⭐ {request.requester?.rating || 'N/A'}</Text>
                        <View style={styles.metaItem}>
                          <Calendar size={12} color="#9CA3AF" />
                          <Text style={styles.metaText}>{request.requester?.tokisCreated || 0} Tokis</Text>
                        </View>
                      </View>
                      <Text style={styles.lastSeen}>
                        Requested {new Date(request.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pendingActions}>
                    <TouchableOpacity 
                      style={styles.acceptButton}
                      onPress={() => handleAcceptRequest(request.requester?.id, request.requester?.name)}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.declineButton}
                      onPress={() => handleDeclineRequest(request.requester?.id, request.requester?.name)}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Pending Badge */}
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          // Blocked Users Tab - Hidden for now
          <View style={styles.emptyState}>
            <UserPlus size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Blocked users feature is temporarily disabled</Text>
            <Text style={styles.emptyDescription}>
              This feature is not available at the moment.
            </Text>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Custom Block Prompt Modal */}
      <Modal
        visible={showBlockPrompt}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={32} color="#EF4444" />
              <Text style={styles.modalTitle}>Block User</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to block <Text style={styles.userNameHighlight}>{selectedUser?.name}</Text>?
            </Text>
            
            <Text style={styles.modalSubtext}>
              This will:
              {'\n'}• Remove them from your connections
              {'\n'}• Prevent them from messaging you
              {'\n'}• Hide your Tokis from them
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={() => setShowBlockPrompt(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={confirmBlockUser}
              >
                <UserX size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Block User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Unblock Prompt Modal */}
      <Modal
        visible={showUnblockPrompt}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnblockPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <UserCheck size={32} color="#10B981" />
              <Text style={styles.modalTitle}>Unblock User</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to unblock <Text style={styles.unblockUserNameHighlight}>{selectedUser?.name}</Text>?
            </Text>
            
            <Text style={styles.modalSubtext}>
              This will:
              {'\n'}• Restore their ability to message you
              {'\n'}• Make your Tokis visible to them again
              {'\n'}• Allow them to send connection requests
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={() => setShowUnblockPrompt(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.unblockModalButtonPrimary}
                onPress={confirmUnblockUser}
              >
                <UserCheck size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Unblock User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Remove Connection Prompt Modal */}
      <Modal
        visible={showRemovePrompt}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRemovePrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <UserX size={32} color="#EF4444" />
              <Text style={styles.modalTitle}>Remove Connection</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to remove <Text style={styles.userNameHighlight}>{selectedUser?.name}</Text> from your connections?
            </Text>
            
            <Text style={styles.modalSubtext}>
              This will:
              {'\n'}• Remove them from your connections list
              {'\n'}• They will no longer see your Tokis
              {'\n'}• You can reconnect later if needed
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={() => setShowRemovePrompt(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={confirmRemoveConnection}
              >
                <UserX size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Remove Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#B49AFF',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#B49AFF',
    fontFamily: 'Inter-SemiBold',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  filterButtonActive: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#B49AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  connectionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  connectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  connectionInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  connectionName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    flex: 1,
  },
  connectionBio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
    lineHeight: 18,
  },
  connectionMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  lastSeen: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  messageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
  },
  connectionStats: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mutualConnections: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4DC4AA',
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4DC4AA',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  bottomSpacing: {
    height: 20,
  },
  findPeopleButton: {
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  findPeopleText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  blockReason: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 4,
  },
  unblockButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unblockButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  connectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  removeButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginLeft: 12,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'left',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    flex: 1,
    marginRight: 10,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    textAlign: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 10,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  userNameHighlight: {
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  // Unblock modal specific styles
  unblockModalButtonPrimary: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 10,
  },
  unblockUserNameHighlight: {
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  searchingIndicator: {
    position: 'absolute',
    right: 15,
    top: 10,
  },
  spinning: {
    // Note: Animation would need to be handled with Animated API in React Native
    // For now, we'll just use a static style
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#B49AFF',
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    alignItems: 'center',
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#B49AFF',
  },
  friendBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#B49AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  friendBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  pendingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  blockedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  blockedBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});