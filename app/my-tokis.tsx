import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Clock, Users, Calendar, Plus, RefreshCw } from 'lucide-react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import TokiCard from '@/components/TokiCard';

interface Toki {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  attendees: number;
  maxAttendees: number;
  tags: string[];
  image: string;
  status?: 'created' | 'joined' | 'not_joined';
  date?: string;
  host: {
    id?: string;
    name: string;
    avatar: string;
  };
  joinStatus?: 'approved' | 'hosting' | 'not_joined' | 'pending';
  distance?: {
    km: number;
    miles: number;
  } | number;
  category: string;
  host_id?: string;
  scheduledTime?: string; // Add scheduledTime from API
  currentAttendees?: string | number; // Add currentAttendees from API
}

// Helper function to determine status for My Tokis filtering
const getMyTokisStatus = (toki: any, currentUserId: string): 'created' | 'joined' | 'not_joined' => {
  if (toki.joinStatus === 'hosting' || toki.host.id === currentUserId) {
    return 'created'; // You're hosting this Toki
  } else if (toki.joinStatus === 'approved') {
    return 'joined'; // You've joined this Toki
  } else {
    return 'not_joined'; // Available to join
  }
};

// Helper function to transform toki data to initialData format for recreate
const transformTokiToInitialData = (toki: any) => {
  return {
    title: toki.title || '',
    description: toki.description || '',
    location: toki.location || '',
    latitude: toki.latitude || null,
    longitude: toki.longitude || null,
    activity: toki.category || '',
    activities: toki.category ? [toki.category] : [],
    time: toki.time || null,
    maxAttendees: toki.maxAttendees || 10,
    tags: toki.tags || [],
    customDateTime: toki.scheduledTime || '',
    images: toki.images || (toki.image ? [{ url: toki.image, publicId: '' }] : []),
    visibility: toki.visibility || 'public',
  };
};



export default function MyTokisScreen() {
  const { state, actions } = useApp();
  const params = useLocalSearchParams();
  const initialTab = (params.tab as 'hosting' | 'joined' | 'pending') || 'hosting';
  const [selectedFilter, setSelectedFilter] = useState<'hosting' | 'joined' | 'pending'>(initialTab);
  const [tokis, setTokis] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load Tokis from backend - always sync from state
  useEffect(() => {
    setTokis(state.tokis);
  }, [state.tokis]);

  // Load My Tokis when component mounts
  useEffect(() => {
    if (state.isConnected) {
      actions.loadMyTokis();
    }
  }, [state.isConnected]);

  // Update selected filter when route params change
  useEffect(() => {
    if (params.tab) {
      const tab = params.tab as 'hosting' | 'joined' | 'pending';
      if (['hosting', 'joined', 'pending'].includes(tab)) {
        setSelectedFilter(tab);
      }
    }
  }, [params.tab]);

  // Reload when screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      if (state.isConnected) {
        actions.loadMyTokis();
      }
    }, [state.isConnected])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await actions.checkConnection();
    await actions.loadMyTokis();
    setRefreshing(false);
  };

  // Normalize statuses from joinStatus + host to align with app
  const tokisWithStatus = React.useMemo(() => {
    const uid = state.currentUser?.id || '';
    return tokis.map((t) => {
      const joinStatus = (t as any)?.joinStatus;
      const hostId = (t as any)?.host?.id;
      const isHostedByUser = hostId === uid || joinStatus === 'hosting';
      
      // Normalize status: check for 'approved' status
      const normalizedStatus: 'hosting' | 'joined' | 'pending' | 'other' = isHostedByUser
        ? 'hosting'
        : joinStatus === 'approved'
          ? 'joined'
          : joinStatus === 'pending'
            ? 'pending'
            : 'other';
      return { ...(t as any), isHostedByUser, normalizedStatus } as any;
    });
  }, [tokis, state.currentUser?.id]);

  const filters = [
    { key: 'hosting', label: 'Hosting', count: tokisWithStatus.filter(t => (t as any).normalizedStatus === 'hosting').length },
    { key: 'joined', label: 'Joined', count: tokisWithStatus.filter(t => (t as any).normalizedStatus === 'joined').length },
    { key: 'pending', label: 'Pending', count: tokisWithStatus.filter(t => (t as any).normalizedStatus === 'pending').length },
  ];

  const filteredTokis = tokisWithStatus.filter(t => (t as any).normalizedStatus === selectedFilter);

  const getStatusColor = (status: 'created' | 'joined' | 'not_joined') => {
    switch (status) {
      case 'created':
        return '#8B5CF6'; // Purple for hosting
      case 'joined':
        return '#10B981'; // Green for joined
      case 'not_joined':
        return '#F59E0B'; // Amber for available
      default:
        return '#6B7280'; // Gray fallback
    }
  };

  const getStatusText = (toki: Toki) => {
    if (toki.status === 'created') return 'Hosting';
    if (toki.status === 'joined') return 'Joined';
    return 'Available';
  };

  const handleTokiPress = (toki: any) => {
    router.push({
      pathname: '/toki-details',
      params: { 
        tokiId: toki.id,
        tokiData: JSON.stringify(toki)
      }
    });
  };

  const handleCreateToki = () => {
    router.push('/(tabs)/create');
  };

  const handleRecreateToki = (toki: any) => {
    const initialData = transformTokiToInitialData(toki);
    router.push({
      pathname: '/(tabs)/create',
      params: {
        initialData: JSON.stringify(initialData),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F3E8FF', '#E0E7FF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>My Tokis</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => actions.loadMyTokis()}
              disabled={state.loading}
            >
              <RefreshCw size={24} color={state.loading ? "#CCCCCC" : "#8B5CF6"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreateToki}>
              <Plus size={24} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredTokis.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Tokis found</Text>
            <Text style={styles.emptyDescription}>
              {selectedFilter === 'hosting' && "You haven't hosted any Tokis yet"}
              {selectedFilter === 'joined' && "You haven't joined any Tokis yet"}
              {selectedFilter === 'pending' && "You have no pending requests"}
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateToki}>
              <Text style={styles.createButtonText}>Create Your First Toki</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tokisContainer}>
            {filteredTokis.map((toki: any) => (
              <View key={toki.id} style={styles.cardWrapper}>
                <TokiCard
                  toki={{ ...toki, isHostedByUser: toki.isHostedByUser }}
                  onPress={() => handleTokiPress(toki)}
                  onRecreate={() => handleRecreateToki(toki)}
                  showRecreateButton={toki.isHostedByUser || toki.normalizedStatus === 'hosting'}
                />
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    color: '#1F2937',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
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
    color: '#6B7280',
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
  createButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  tokisContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  cardWrapper: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 360,
    maxWidth: 520,
    width: '100%',
  },
  tokiCardWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  tokiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  tokiImage: {
    width: '100%',
    height: 160,
  },
  tokiContent: {
    padding: 16,
  },
  tokiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tokiTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100, // Much higher zIndex to ensure it's above everything
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tokiDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  tokiInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  tokiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  hostName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tokiTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tokiTagText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  bottomSpacing: {
    height: 20,
  },
});