import React, { useState, useEffect } from 'react';
import { SafeAreaView, Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import TokiForm from '@/components/TokiForm';
import { apiService } from '@/services/api';
import { getBackendUrl } from '@/services/config';

export default function EditTokiScreen() {
  const { state, actions } = useApp();
  const { tokiId } = useLocalSearchParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const [initialData, setInitialData] = useState<any>({});

  // Load Toki data when component mounts
  useEffect(() => {
    if (tokiId) {
      loadTokiData();
    }
  }, [tokiId]);

  const loadTokiData = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/tokis/${tokiId}`, {
        headers: {
          'Authorization': `Bearer ${apiService.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const toki = data.data;
        
        console.log('Loaded Toki data:', toki);
        
        const initialDataObj = {
          title: toki.title || '',
          description: toki.description || '',
          location: toki.location || '',
          latitude: toki.latitude || null,
          longitude: toki.longitude || null,
          activity: toki.category || null,
          time: toki.timeSlot || null,
          maxAttendees: toki.maxAttendees || 10,
          visibility: toki.visibility || 'public',
          tags: toki.tags?.filter((tag: string) => tag !== toki.category) || [],
          // Convert scheduledTime to customDateTime format if available
          customDateTime: toki.scheduledTime ? 
            new Date(toki.scheduledTime).toISOString().split('T')[0] + ' ' + 
            new Date(toki.scheduledTime).toTimeString().slice(0, 5) : 
            undefined,
          // Add images data
          images: toki.image_urls?.map((url: string, index: number) => ({
            url,
            publicId: toki.image_public_ids?.[index] || `temp-${index}`,
          })) || [],
        };
        
        console.log('🖼️ [EDIT TOKI] Setting initial data:', initialDataObj);
        console.log('🖼️ [EDIT TOKI] Images data:', initialDataObj.images);
        setInitialData(initialDataObj);
      } else {
        Alert.alert('Error', 'Failed to load Toki data');
        router.back();
      }
    } catch (error) {
      console.error('Error loading Toki data:', error);
      Alert.alert('Error', 'Failed to load Toki data');
      router.back();
    }
  };

  const handleUpdateToki = async (tokiData: any): Promise<boolean> => {
    setIsUpdating(true);
    
    try {
      const updatedTokiData = {
        title: tokiData.title,
        description: tokiData.description,
        location: tokiData.location,
        latitude: tokiData.latitude,
        longitude: tokiData.longitude,
        timeSlot: tokiData.time,
        customDateTime: tokiData.customDateTime,
        category: tokiData.activity,
        maxAttendees: tokiData.maxAttendees,
        visibility: tokiData.visibility || 'public',
        tags: tokiData.tags,
      };

      const success = await actions.updateTokiBackend(tokiId as string, updatedTokiData);

      if (success) {
        router.push(`/toki-details?tokiId=${tokiId}`);
        return true;
      } else {
        Alert.alert('Error', 'Failed to update Toki. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error updating Toki:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <ArrowLeft size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Toki</Text>
          <View style={{ width: 24 }} />
        </View>
        {!state.isConnected && (
          <View style={styles.connectionWarning}>
            <Text style={styles.connectionWarningText}>⚠️ Not connected to server</Text>
          </View>
        )}
      </LinearGradient>

      <TokiForm
        mode="edit"
        tokiId={tokiId as string}
        initialData={initialData}
        onSubmit={handleUpdateToki}
        onCancel={handleCancel}
        isSubmitting={isUpdating}
      />
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
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  connectionWarning: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  connectionWarningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    textAlign: 'center',
  },
  backButton: {
    padding: 0,
    margin: 0,
  },
}); 