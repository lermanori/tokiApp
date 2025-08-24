import React, { useState } from 'react';
import { SafeAreaView, Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import TokiForm from '@/components/TokiForm';

export default function CreateScreen() {
  const { actions, state } = useApp();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateToki = async (tokiData: any): Promise<string | null> => {
    setIsCreating(true);
    
    try {
      const tokiId = await actions.createToki(tokiData);
      
      if (tokiId) {
        // Check if there are temporary images that need to be uploaded
        const hasTemporaryImages = tokiData.images && tokiData.images.some((img: any) => 
          img.publicId && img.publicId.startsWith('temp_')
        );
        
        if (hasTemporaryImages) {
          console.log('📸 [CREATE SCREEN] Toki created with temporary images, waiting for API to update...');
          
          // Wait a bit for the API to have the updated data
          // This ensures the Toki details page gets the latest data with images
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('📸 [CREATE SCREEN] API update wait completed, navigating to details...');
        }
        
        // Navigate to the new Toki details
        router.push(`/toki-details?tokiId=${tokiId}`);
        return tokiId;
      } else {
        Alert.alert('Error', 'Failed to create Toki. Please try again.');
        return null;
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      return null;
    } finally {
      setIsCreating(false);
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
          <Text style={styles.headerTitle}>Create Toki</Text>
          <View style={{ width: 24 }} />
        </View>
        {!state.isConnected && (
          <View style={styles.connectionWarning}>
            <Text style={styles.connectionWarningText}>⚠️ Not connected to server</Text>
          </View>
        )}
      </LinearGradient>

      <TokiForm
        mode="create"
        onSubmit={handleCreateToki}
        onCancel={handleCancel}
        isSubmitting={isCreating}
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