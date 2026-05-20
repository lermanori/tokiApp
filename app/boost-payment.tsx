import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { apiService, type BoostPurchaseRequest } from '@/services/api';

const STATUS_COPY: Record<BoostPurchaseRequest['status'], { title: string; body: string }> = {
  pending_code: {
    title: 'Waiting for authorization code',
    body: 'Your purchase request has been created. An admin will generate a code and share it with you manually.',
  },
  code_issued: {
    title: 'Authorization code ready',
    body: 'Enter the admin-provided code below to authorize this boost purchase.',
  },
  approved: {
    title: 'Boost purchase approved',
    body: 'This request has been approved. Your boost is now available in Boost Center.',
  },
  expired: {
    title: 'Authorization code expired',
    body: 'The last code for this request has expired. Contact an admin to generate a new one.',
  },
  cancelled: {
    title: 'Purchase request cancelled',
    body: 'This request is no longer active. Start a new purchase request if you still want this boost.',
  },
};

export default function BoostPaymentScreen() {
  const params = useLocalSearchParams();
  const tokiId = typeof params.tokiId === 'string' ? params.tokiId : '';
  const requestIdParam = typeof params.requestId === 'string' ? params.requestId : '';
  const tierId = typeof params.tierId === 'string' ? params.tierId : '';
  const tokiTitleParam = typeof params.title === 'string' ? params.title : 'Your Toki';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [requestState, setRequestState] = useState<BoostPurchaseRequest | null>(null);
  const [code, setCode] = useState('');

  const loadRequest = useCallback(async () => {
    try {
      let nextRequest: BoostPurchaseRequest;

      if (requestIdParam) {
        nextRequest = await apiService.getBoostPurchaseRequest(requestIdParam);
      } else if (tierId) {
        nextRequest = await apiService.createBoostPurchaseRequest({
          tierId,
          tokiId: tokiId || undefined,
        });
      } else {
        throw new Error('Missing tierId or requestId');
      }

      setRequestState(nextRequest);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestIdParam, tierId, tokiId]);

  useEffect(() => {
    loadRequest().catch((error) => {
      console.error('Failed to load boost payment request:', error);
      Alert.alert('Error', 'Failed to load the payment request.');
      setLoading(false);
      setRefreshing(false);
    });
  }, [loadRequest]);

  const handleRedeem = async () => {
    if (!requestState) return;
    if (!code.trim()) {
      Alert.alert('Missing code', 'Enter the authorization code you received from the admin.');
      return;
    }

    try {
      setRedeeming(true);
      const result = await apiService.redeemBoostPurchaseRequest(requestState.id, code.trim().toUpperCase());
      setRequestState(result.request);
      Alert.alert('Boost approved', 'Your boost is now available in Boost Center.', [
        {
          text: 'Open Boost Center',
          onPress: () => {
            router.replace({
              pathname: '/boost-manage' as any,
              params: {
                tokiId,
                title: tokiTitleParam,
              },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('Failed to redeem boost request:', error);
      Alert.alert('Error', error?.message || 'Failed to redeem the authorization code.');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Preparing payment request...</Text>
      </SafeAreaView>
    );
  }

  if (!requestState) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingText}>Unable to load this payment request.</Text>
      </SafeAreaView>
    );
  }

  const copy = STATUS_COPY[requestState.status];
  const canRedeem = requestState.status === 'code_issued';

  return (
    <SafeAreaView style={styles.container} testID="boost-payment-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Boost Payment</Text>
          <Text style={styles.subtitle}>{requestState.tokiTitle || tokiTitleParam}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            loadRequest().catch(() => setRefreshing(false));
          }}
          style={styles.iconButton}
        >
          <RefreshCw size={20} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRequest().catch(() => setRefreshing(false));
            }}
          />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>Purchase request</Text>
          <Text style={styles.summaryTitle}>{requestState.tierName}</Text>
          <Text style={styles.summaryMeta}>{requestState.paymentCurrency} {requestState.paymentAmount}</Text>
          <Text style={styles.summaryMeta}>{requestState.totalHours}h boost package</Text>
          {requestState.codeExpiresAt ? (
            <Text style={styles.summaryMeta}>
              Code expires {new Date(requestState.codeExpiresAt).toLocaleString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{copy.title}</Text>
          <Text style={styles.statusBody}>{copy.body}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{requestState.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How this works</Text>
          <Text style={styles.instructionsLine}>1. This screen creates or resumes your manual payment request.</Text>
          <Text style={styles.instructionsLine}>2. An admin generates an authorization code for this exact request.</Text>
          <Text style={styles.instructionsLine}>3. You receive that code outside the app and enter it here.</Text>
          <Text style={styles.instructionsLine}>4. Once redeemed, the boost appears in Boost Center and can be activated.</Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Authorization code</Text>
          <TextInput
            style={[styles.codeInput, !canRedeem && styles.codeInputDisabled]}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            editable={canRedeem}
            placeholder={canRedeem ? 'Enter code' : 'Waiting for admin code'}
            placeholderTextColor="#9CA3AF"
            testID="boost-payment-code-input"
          />
          <TouchableOpacity
            style={[styles.submitButton, !canRedeem && styles.submitButtonDisabled]}
            onPress={handleRedeem}
            disabled={!canRedeem || redeeming}
            testID="boost-payment-submit-button"
          >
            <Text style={styles.submitButtonText}>
              {redeeming ? 'Authorizing...' : 'Authorize Purchase'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    margin: 20,
    marginBottom: 12,
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#111827',
  },
  summaryEyebrow: {
    fontSize: 12,
    color: '#F59E0B',
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  summaryMeta: {
    marginTop: 6,
    fontSize: 14,
    color: '#D1D5DB',
    fontFamily: 'Inter-Medium',
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    gap: 10,
  },
  statusTitle: {
    fontSize: 18,
    color: '#111827',
    fontFamily: 'Inter-Bold',
  },
  statusBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
    fontFamily: 'Inter-Regular',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    color: '#6D28D9',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  instructionsCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    gap: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  instructionsLine: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
    fontFamily: 'Inter-Regular',
  },
  codeCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
  },
  codeLabel: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 10,
  },
  codeInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  codeInputDisabled: {
    color: '#9CA3AF',
  },
  submitButton: {
    marginTop: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
});
