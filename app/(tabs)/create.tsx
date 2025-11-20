import React, { useState, useMemo } from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import TokiForm from '@/components/TokiForm';
import ErrorModal from '@/components/ErrorModal';
import { parseApiError } from '@/utils/parseApiError';

export default function CreateScreen() {
  const { actions, state } = useApp();
  const params = useLocalSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [errorState, setErrorState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    details?: string[];
    statusCode?: number;
  } | null>(null);

  const handleCreateToki = async (tokiData: any): Promise<string | null> => {
    setIsCreating(true);
    
    try {
      const tokiId = await actions.createToki(tokiData);
      
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
      
      // Wait a moment for the toki to be fully persisted in the database
      // This ensures distance calculation works correctly
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to the new Toki details
      router.push(`/toki-details?tokiId=${tokiId}&fromCreate=true`);
      return tokiId;
    } catch (error) {
      console.error('Create Toki error:', error);
      const parsed = parseApiError(error, 'create');
      setErrorState({
        visible: true,
        title: parsed.title,
        message: parsed.message,
        details: parsed.details,
        statusCode: parsed.statusCode,
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Parse initial data from route params if provided (for recreate feature)
  const initialData = useMemo(() => {
    if (params.initialData) {
      try {
        return JSON.parse(params.initialData as string);
      } catch (error) {
        console.error('Failed to parse initialData:', error);
        return {};
      }
    }
    return {};
  }, [params.initialData]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        initialData={initialData}
        onSubmit={handleCreateToki}
        onCancel={handleCancel}
        isSubmitting={isCreating}
        onValidationError={(details) => {
          setErrorState({
            visible: true,
            title: "Can't create Toki",
            message: 'Please fix the following issues:',
            details,
          });
        }}
      />

      {/* Error Modal */}
      {errorState && (
        <ErrorModal
          visible={errorState.visible}
          title={errorState.title}
          message={errorState.message}
          details={errorState.details}
          statusCode={errorState.statusCode}
          onClose={() => setErrorState(null)}
        />
      )}
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