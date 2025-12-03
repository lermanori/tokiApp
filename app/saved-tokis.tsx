import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Clock, Users, Heart, Search } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import TokiCard from '@/components/TokiCard';

interface SavedToki {
  id: string;
  title: string;
  description: string;
  location: string;
  timeSlot: string;
  scheduledTime: string;
  currentAttendees: number;
  maxAttendees: number;
  category: string;
  imageUrl: string;
  savedAt: string;
  host: {
    id: string;
    name: string;
    avatar: string;
  };
  distance?: {
    km: number;
    miles: number;
  };
  tags: string[];
  joinStatus?: string;
}

export default function SavedTokisScreen() {
  const { state, actions } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Refresh saved Tokis when screen comes into focus (e.g., after saving/unsaving a Toki)
  useFocusEffect(
    React.useCallback(() => {
      // Refresh from server to ensure we have latest data
      actions.getSavedTokis().catch(err => {
        console.error('Failed to refresh saved Tokis:', err);
      });
    }, [])
  );

  const filteredTokis = (state.savedTokis || []).filter(toki =>
    toki.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    toki.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTokiPress = (toki: SavedToki) => {
    router.push({
      pathname: '/toki-details',
      params: { 
        tokiId: toki.id
      }
    });
  };

  const handleUnsaveToki = async (tokiId: string) => {
    try {
      const success = await actions.unsaveToki(tokiId);
      if (success) {
        // State is automatically updated by the action
        Alert.alert('Success', 'Toki removed from saved list');
      } else {
        Alert.alert('Error', 'Failed to remove Toki from saved list');
      }
    } catch (error) {
      console.error('Error unsaving Toki:', error);
      Alert.alert('Error', 'Failed to remove Toki from saved list');
    }
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
          <Text style={styles.title}>Saved Tokis</Text>
          <TouchableOpacity onPress={() => actions.getSavedTokis()}>
            <Search size={24} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading saved Tokis...</Text>
          </View>
        ) : filteredTokis.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No saved Tokis</Text>
            <Text style={styles.emptyDescription}>
              {state.savedTokis.length === 0 
                ? 'Save interesting Tokis to find them easily later'
                : 'No Tokis match your search'
              }
            </Text>
            {state.savedTokis.length === 0 && (
              <TouchableOpacity 
                style={styles.exploreButton} 
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.exploreButtonText}>Explore Tokis</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.tokisContainer}>
            <Text style={styles.sectionTitle}>
              {filteredTokis.length} saved Toki{filteredTokis.length !== 1 ? 's' : ''}
            </Text>
            
            {filteredTokis.map((toki) => (
              <View key={toki.id} style={styles.tokiCardWrapper}>
                <TokiCard
                  toki={{
                    id: toki.id,
                    title: toki.title,
                    description: toki.description,
                    location: toki.location,
                    time: toki.timeSlot,
                    scheduledTime: toki.scheduledTime,
                    attendees: toki.currentAttendees,
                    maxAttendees: toki.maxAttendees,
                    category: toki.category,
                    image: toki.imageUrl,
                    host: {
                      name: toki.host.name,
                      avatar: toki.host.avatar
                    },
                    distance: toki.distance,
                    tags: toki.tags,
                    isHostedByUser: false,
                    joinStatus: toki.joinStatus as 'not_joined' | 'pending' | 'approved' | undefined
                  }}
                  onPress={() => handleTokiPress(toki)}
                  onHostPress={() => {
                    // Handle host press if needed
                  }}
                />
                <TouchableOpacity 
                  style={styles.unsaveButton}
                  onPress={() => handleUnsaveToki(toki.id)}
                >
                  <Heart size={16} color="#8B5CF6" fill="#8B5CF6" />
                  <Text style={styles.unsaveText}>Remove from Saved</Text>
                </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
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
  exploreButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  tokisContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 20,
  },
  tokiCardWrapper: {
    marginBottom: 16,
  },
  unsaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  unsaveText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    marginLeft: 8,
  },
});