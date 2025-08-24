import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, UserPlus, MapPin, Calendar, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';

interface User {
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

interface ConnectionStatus {
  status: 'none' | 'pending' | 'accepted' | 'declined';
  isRequester?: boolean;
}

export default function FindPeopleScreen() {
  const { state, actions } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, ConnectionStatus>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Load pending requests from storage on mount (for visual feedback only)
  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        const stored = await AsyncStorage.getItem('pendingConnectionRequests');
        if (stored) {
          const pendingArray = JSON.parse(stored) as string[];
          const pendingSet = new Set(pendingArray);
          setPendingRequests(pendingSet);
          console.log('📱 Loaded pending requests from storage:', pendingArray);
        }
      } catch (error) {
        console.error('❌ Failed to load pending requests:', error);
      }
    };
    loadPendingRequests();
  }, []);

  // Get real-time connection status for a user
  const getConnectionStatus = async (userId: string): Promise<ConnectionStatus> => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/connections/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${apiService.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('❌ Failed to get connection status:', error);
    }
    
    return { status: 'none' };
  };

  // Update connection status for all users
  const updateConnectionStatuses = async (users: User[]) => {
    const statuses = new Map<string, ConnectionStatus>();
    
    for (const user of users) {
      // If backend says they're connected, use that
      if (user.isConnected) {
        statuses.set(user.id, { status: 'accepted' });
      } else {
        // Otherwise, check real-time status
        const status = await getConnectionStatus(user.id);
        statuses.set(user.id, status);
      }
    }
    
    setConnectionStatuses(statuses);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('🔍 Searching users...');
    setIsLoading(true);
    try {
      const foundUsers = await actions.searchUsers(searchQuery);
      console.log('📱 Users found:', foundUsers.length);
      
      // Update connection statuses for all found users
      await updateConnectionStatuses(foundUsers);
      
      setUsers(foundUsers);
    } catch (error) {
      console.error('Failed to search users:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (userId: string, userName: string) => {
    try {
      console.log('🔍 Sending connection request to:', userId, userName);
      
      // Add to pending requests immediately for visual feedback
      const newPendingSet = new Set(pendingRequests);
      newPendingSet.add(userId);
      setPendingRequests(newPendingSet);
      
      // Save to storage
      await AsyncStorage.setItem('pendingConnectionRequests', JSON.stringify(Array.from(newPendingSet)));
      console.log('📝 Updated pending requests:', Array.from(newPendingSet));
      
      const success = await actions.sendConnectionRequest(userId);
      console.log('✅ Connection request result:', success);
      if (success) {
        // Update connection status to show pending
        setConnectionStatuses(prev => new Map(prev).set(userId, { 
          status: 'pending', 
          isRequester: true 
        }));
        console.log(`✅ Connection request sent to ${userName}`);
      } else {
        // Remove from pending if failed
        const updatedSet = new Set(pendingRequests);
        updatedSet.delete(userId);
        setPendingRequests(updatedSet);
        await AsyncStorage.setItem('pendingConnectionRequests', JSON.stringify(Array.from(updatedSet)));
        console.log('❌ Removed from pending (failed):', Array.from(updatedSet));
        Alert.alert('Error', 'Failed to send connection request. Please try again.');
      }
    } catch (error) {
      // Remove from pending if failed
      const updatedSet = new Set(pendingRequests);
      updatedSet.delete(userId);
      setPendingRequests(updatedSet);
      await AsyncStorage.setItem('pendingConnectionRequests', JSON.stringify(Array.from(updatedSet)));
      console.log('❌ Removed from pending (error):', Array.from(updatedSet));
      console.error('Error sending connection request:', error);
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    }
  };

  // Get the appropriate button text and action based on connection status
  const getConnectionButtonInfo = (userId: string) => {
    const status = connectionStatuses.get(userId);
    
    if (!status || status.status === 'none') {
      return {
        text: 'Connect',
        action: () => handleConnect(userId, users.find(u => u.id === userId)?.name || 'User'),
        disabled: false,
        style: 'connect'
      };
    }
    
    if (status.status === 'pending') {
      if (status.isRequester) {
        return {
          text: 'Request Sent',
          action: null,
          disabled: true,
          style: 'pending'
        };
      } else {
        return {
          text: 'Accept Request',
          action: () => handleAcceptRequest(userId),
          disabled: false,
          style: 'accept'
        };
      }
    }
    
    if (status.status === 'accepted') {
      return {
        text: 'Connected',
        action: null,
        disabled: true,
        style: 'connected'
      };
    }
    
    return {
      text: 'Connect',
      action: () => handleConnect(userId, users.find(u => u.id === userId)?.name || 'User'),
      disabled: false,
      style: 'connect'
    };
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/connections/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiService.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'accept' })
      });
      
      if (response.ok) {
        // Update connection status
        setConnectionStatuses(prev => new Map(prev).set(userId, { 
          status: 'accepted' 
        }));
        console.log('✅ Connection request accepted');
      } else {
        Alert.alert('Error', 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      Alert.alert('Error', 'Failed to accept connection request');
    }
  };

  const handleUserPress = (user: User) => {
    // Navigate to user profile (if we had one)
    Alert.alert('User Profile', `Viewing ${user.name}'s profile`);
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
          <Text style={styles.title}>Find People</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, bio, or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={searchUsers}
          />
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={searchUsers}
          disabled={isLoading}
        >
          <Text style={styles.searchButtonText}>
            {isLoading ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {users.length === 0 && searchQuery && !isLoading && (
          <View style={styles.emptyState}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No users found</Text>
            <Text style={styles.emptyStateText}>
              Try searching with different keywords
            </Text>
          </View>
        )}

        {users.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userCard}
            onPress={() => handleUserPress(user)}
          >
            <View style={styles.userCardHeader}>
              <Image
                source={{ 
                  uri: user.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2'
                }}
                style={styles.userAvatar}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userBio}>{user.bio}</Text>
                <View style={styles.userMeta}>
                  <MapPin size={12} color="#9CA3AF" />
                  <Text style={styles.userLocation}>{user.location}</Text>
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingText}>⭐ {user.rating}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.userCardActions}>
              {(() => {
                const buttonInfo = getConnectionButtonInfo(user.id);
                return (
                  <TouchableOpacity 
                    style={[
                      styles.connectButton,
                      buttonInfo.style === 'pending' && styles.pendingButton,
                      buttonInfo.style === 'connected' && styles.connectedButton,
                      buttonInfo.style === 'accept' && styles.acceptButton
                    ]}
                    onPress={buttonInfo.action || undefined}
                    disabled={buttonInfo.disabled}
                  >
                    <Text style={[
                      styles.connectButtonText,
                      buttonInfo.style === 'pending' && styles.pendingButtonText,
                      buttonInfo.style === 'connected' && styles.connectedButtonText,
                      buttonInfo.style === 'accept' && styles.acceptButtonText
                    ]}>
                      {buttonInfo.text}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
              
              <TouchableOpacity 
                style={styles.chatButton}
                onPress={async () => {
                  try {
                    const conversationId = await actions.startConversation(user.id);
                    if (conversationId) {
                      router.push({
                        pathname: '/chat',
                        params: { 
                          conversationId: conversationId,
                          otherUserName: user.name,
                          isGroup: 'false'
                        }
                      });
                    } else {
                      Alert.alert('Error', 'Failed to start conversation. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error starting conversation:', error);
                    Alert.alert('Error', 'Failed to start conversation. Please try again.');
                  }
                }}
              >
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  searchButton: {
    backgroundColor: '#B49AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  userBio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  connectButton: {
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  pendingButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  connectedButton: {
    backgroundColor: '#10B981',
  },
  acceptButton: {
    backgroundColor: '#3B82F6',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  pendingButtonText: {
    color: '#6B7280',
  },
  connectedButtonText: {
    color: '#FFFFFF',
  },
  acceptButtonText: {
    color: '#FFFFFF',
  },
  chatButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  chatButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  ratingContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
}); 