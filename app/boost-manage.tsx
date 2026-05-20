import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type BoostTier = {
  id: string;
  name: string;
  displayName: string;
  priceILS: number;
  totalHours: number;
  description: string;
  isSplittable: boolean;
  validityDays?: number | null;
};

type BoostSummary = {
  id: string;
  tierName: string;
  tierSlug: string;
  tokiId?: string | null;
  tokiTitle?: string | null;
  totalHours: number;
  hoursUsed: number;
  hoursRemaining: number;
  status: string;
  isSplittable: boolean;
  paymentAmount: number;
  paymentCurrency: string;
  activatedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

type BoostStatus = {
  id: string;
  activeActivation?: {
    id: string;
    hoursAllocated: number;
    startedAt: string;
    endsAt: string;
  } | null;
  recentActivations?: Array<{
    id: string;
    hoursAllocated: number;
    startedAt: string;
    endsAt: string;
    actualEndAt?: string | null;
    status: string;
  }>;
};

const formatCountdown = (endsAt?: string | null) => {
  if (!endsAt) return 'Inactive';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ending now';
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m left`;
};

export default function BoostManageScreen() {
  const params = useLocalSearchParams();
  const tokiId = typeof params.tokiId === 'string' ? params.tokiId : '';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchaseLoadingTier, setPurchaseLoadingTier] = useState<string | null>(null);
  const [actionLoadingBoost, setActionLoadingBoost] = useState<string | null>(null);
  const [toki, setToki] = useState<any | null>(null);
  const [tiers, setTiers] = useState<BoostTier[]>([]);
  const [boosts, setBoosts] = useState<BoostSummary[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<BoostPurchaseRequest[]>([]);
  const [statusByBoostId, setStatusByBoostId] = useState<Record<string, BoostStatus>>({});
  const [activationHours, setActivationHours] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!tokiId) return;

    try {
      const [nextToki, nextTiers, nextBoosts, nextRequests] = await Promise.all([
        apiService.getToki(tokiId),
        apiService.getBoostTiers(),
        apiService.getMyBoosts(),
        apiService.getMyBoostPurchaseRequests({ tokiId }),
      ]);

      setToki(nextToki);
      setTiers(nextTiers as BoostTier[]);
      setBoosts(nextBoosts as BoostSummary[]);
      setPurchaseRequests(nextRequests);

      const relevantBoosts = (nextBoosts as BoostSummary[]).filter((boost) =>
        boost.tokiId === tokiId || boost.tierSlug === 'pro_pack'
      );

      const statuses = await Promise.all(
        relevantBoosts.map(async (boost) => {
          try {
            const status = await apiService.getBoostStatus(boost.id);
            return [boost.id, status] as const;
          } catch {
            return [boost.id, null] as const;
          }
        })
      );

      setStatusByBoostId(
        Object.fromEntries(statuses.filter((entry) => entry[1]).map(([id, status]) => [id, status]))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokiId]);

  useEffect(() => {
    loadData().catch((error) => {
      console.error('Failed to load boost management data:', error);
      Alert.alert('Error', 'Failed to load boost data.');
      setLoading(false);
      setRefreshing(false);
    });
  }, [loadData]);

  const relevantBoosts = useMemo(() => {
    return boosts.filter((boost) => boost.tokiId === tokiId || boost.tierSlug === 'pro_pack');
  }, [boosts, tokiId]);

  const activeBoost = useMemo(() => {
    return relevantBoosts.find((boost) => boost.status === 'active' && boost.tokiId === tokiId) || null;
  }, [relevantBoosts, tokiId]);

  const relevantRequests = useMemo(() => {
    return purchaseRequests.filter(
      (request) =>
        request.status !== 'approved' &&
        (request.tokiId === tokiId || request.tierSlug === 'pro_pack')
    );
  }, [purchaseRequests, tokiId]);

  const openPaymentScreen = (params: { tierId?: string; requestId?: string }) => {
    router.push({
      pathname: '/boost-payment' as any,
      params: {
        tokiId,
        title: typeof toki?.title === 'string' ? toki.title : '',
        ...params,
      },
    });
  };

  const handlePurchase = async (tier: BoostTier) => {
    setPurchaseLoadingTier(tier.id);
    try {
      openPaymentScreen({ tierId: tier.id });
    } finally {
      setPurchaseLoadingTier(null);
    }
  };

  const handleActivate = async (boost: BoostSummary) => {
    try {
      setActionLoadingBoost(boost.id);
      const hoursValue = activationHours[boost.id];
      const hours = boost.isSplittable && hoursValue ? Number(hoursValue) : undefined;
      await apiService.activateBoost(boost.id, {
        tokiId,
        hours,
      });
      await loadData();
      Alert.alert('Boost active', 'Your Toki is now featured.');
    } catch (error: any) {
      console.error('Failed to activate boost:', error);
      Alert.alert('Error', error?.message || 'Failed to activate boost.');
    } finally {
      setActionLoadingBoost(null);
    }
  };

  const handlePause = async (boost: BoostSummary) => {
    try {
      setActionLoadingBoost(boost.id);
      await apiService.deactivateBoost(boost.id);
      await loadData();
      Alert.alert('Boost paused', 'Your remaining Pro Pack hours were saved.');
    } catch (error: any) {
      console.error('Failed to deactivate boost:', error);
      Alert.alert('Error', error?.message || 'Failed to pause boost.');
    } finally {
      setActionLoadingBoost(null);
    }
  };

  const openInsights = () => {
    router.push({
      pathname: '/boost-insights' as any,
      params: {
        tokiId,
        title: typeof toki?.title === 'string' ? toki.title : '',
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading boost center...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="boost-center-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Boost Center</Text>
          <Text style={styles.subtitle}>{toki?.title || 'Your Toki'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            loadData().catch(() => setRefreshing(false));
          }}
          style={styles.iconButton}
        >
          <RefreshCw size={20} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadData().catch(() => setRefreshing(false));
        }} />}
      >
        {activeBoost ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Active Boost</Text>
            <Text style={styles.heroTitle}>{activeBoost.tierName}</Text>
            <Text style={styles.heroMeta}>
              {formatCountdown(statusByBoostId[activeBoost.id]?.activeActivation?.endsAt)}
            </Text>
            <Text style={styles.heroMeta}>
              {Math.round(activeBoost.hoursRemaining * 100) / 100}h remaining
            </Text>
            <View style={styles.heroButtons}>
              <TouchableOpacity style={styles.heroPrimaryButton} onPress={openInsights}>
                <Text style={styles.heroPrimaryButtonText}>View Insights</Text>
              </TouchableOpacity>
              {activeBoost.isSplittable && (
                <TouchableOpacity
                  style={styles.heroSecondaryButton}
                  onPress={() => handlePause(activeBoost)}
                  disabled={actionLoadingBoost === activeBoost.id}
                >
                  <Text style={styles.heroSecondaryButtonText}>
                    {actionLoadingBoost === activeBoost.id ? 'Pausing...' : 'Pause'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.heroCardMuted}>
            <Text style={styles.heroEyebrow}>Boost Status</Text>
            <Text style={styles.heroTitleMuted}>No active boost</Text>
            <Text style={styles.heroMetaMuted}>
              Buy a tier or activate a saved Pro Pack to push this Toki to the top.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy a Boost</Text>
          {tiers.length === 0 ? (
            <View style={styles.infoCardMuted} testID="boost-tier-empty-state">
              <Text style={styles.infoCardMutedTitle}>No boost tiers available</Text>
              <Text style={styles.infoCardMutedText}>
                Boost tiers are not configured in this environment yet. Run the boost migration seed to load them.
              </Text>
            </View>
          ) : (
            tiers.map((tier) => (
              <View key={tier.id} style={styles.tierCard} testID={`boost-tier-card-${tier.name}`}>
                <View style={styles.tierHeader}>
                  <View>
                    <Text style={styles.tierName}>{tier.displayName}</Text>
                    <Text style={styles.tierDescription}>{tier.description}</Text>
                  </View>
                  <View style={styles.tierPriceBlock}>
                    <Text style={styles.tierPrice}>₪{tier.priceILS}</Text>
                    <Text style={styles.tierHours}>{tier.totalHours}h</Text>
                  </View>
                </View>
                {tier.isSplittable && tier.validityDays ? (
                  <Text style={styles.tierHint}>Use these hours in chunks within {tier.validityDays} days.</Text>
                ) : null}
                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => handlePurchase(tier)}
                  disabled={purchaseLoadingTier === tier.id}
                  testID={`boost-buy-button-${tier.name}`}
                >
                  <Text style={styles.buyButtonText}>
                    {purchaseLoadingTier === tier.id ? 'Purchasing...' : 'Buy Boost'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Payment Requests</Text>
          {relevantRequests.length === 0 ? (
            <Text style={styles.emptyText}>No open payment requests for this Toki.</Text>
          ) : (
            relevantRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View>
                    <Text style={styles.requestName}>{request.tierName}</Text>
                    <Text style={styles.requestStatus}>{request.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                  <View style={styles.requestPriceBlock}>
                    <Text style={styles.requestPrice}>{request.paymentCurrency} {request.paymentAmount}</Text>
                    <Text style={styles.requestMeta}>{request.totalHours}h package</Text>
                  </View>
                </View>

                <Text style={styles.requestDescription}>
                  {request.status === 'code_issued'
                    ? 'A code has been generated for this request. Enter it to unlock the boost.'
                    : request.status === 'expired'
                      ? 'The last code expired. Open the payment screen to wait for a replacement.'
                      : 'Waiting for an admin-generated authorization code.'}
                </Text>

                {request.codeExpiresAt ? (
                  <Text style={styles.requestMeta}>
                    Code expires {new Date(request.codeExpiresAt).toLocaleString()}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  onPress={() => openPaymentScreen({ requestId: request.id })}
                >
                  <Text style={styles.secondaryActionButtonText}>
                    {request.status === 'code_issued' ? 'Enter Code' : 'Open Payment Screen'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Boosts for This Toki</Text>
          {relevantBoosts.length === 0 ? (
            <Text style={styles.emptyText}>No boosts purchased for this Toki yet.</Text>
          ) : (
            relevantBoosts.map((boost) => {
              const status = statusByBoostId[boost.id];
              const canActivate = boost.status === 'purchased' || boost.status === 'paused';
              const canPause = boost.status === 'active' && boost.isSplittable;
              const recentActivations = status?.recentActivations || [];

              return (
                <View key={boost.id} style={styles.boostCard}>
                  <View style={styles.boostCardHeader}>
                    <View>
                      <Text style={styles.boostName}>{boost.tierName}</Text>
                      <Text style={styles.boostStatus}>{boost.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.boostHours}>{Math.round(boost.hoursRemaining * 100) / 100}h left</Text>
                  </View>

                  {boost.isSplittable && canActivate ? (
                    <View style={styles.activationRow}>
                      <TextInput
                        style={styles.hoursInput}
                        keyboardType="decimal-pad"
                        value={activationHours[boost.id] ?? ''}
                        onChangeText={(value) => {
                          setActivationHours((prev) => ({ ...prev, [boost.id]: value }));
                        }}
                        placeholder="Hours"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Text style={styles.activationHint}>Leave blank to use all remaining hours.</Text>
                    </View>
                  ) : null}

                  {status?.activeActivation?.endsAt ? (
                    <Text style={styles.activationMeta}>
                      {formatCountdown(status.activeActivation.endsAt)}
                    </Text>
                  ) : null}

                  <View style={styles.boostButtonRow}>
                    {canActivate ? (
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        onPress={() => handleActivate(boost)}
                        disabled={actionLoadingBoost === boost.id}
                      >
                        <Text style={styles.primaryActionButtonText}>
                          {actionLoadingBoost === boost.id ? 'Activating...' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {canPause ? (
                      <TouchableOpacity
                        style={styles.secondaryActionButton}
                        onPress={() => handlePause(boost)}
                        disabled={actionLoadingBoost === boost.id}
                      >
                        <Text style={styles.secondaryActionButtonText}>
                          {actionLoadingBoost === boost.id ? 'Pausing...' : 'Pause'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {(boost.status === 'active' || boost.status === 'completed' || boost.status === 'paused') ? (
                      <TouchableOpacity style={styles.secondaryActionButton} onPress={openInsights}>
                        <Text style={styles.secondaryActionButtonText}>Insights</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {recentActivations.length > 0 ? (
                    <View style={styles.historyBlock}>
                      <Text style={styles.historyTitle}>Recent activations</Text>
                      {recentActivations.map((activation) => (
                        <Text key={activation.id} style={styles.historyLine}>
                          {Math.round(activation.hoursAllocated * 100) / 100}h · {new Date(activation.startedAt).toLocaleString()}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
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
  heroCard: {
    margin: 20,
    marginBottom: 12,
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#111827',
  },
  heroCardMuted: {
    margin: 20,
    marginBottom: 12,
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroEyebrow: {
    fontSize: 12,
    color: '#F59E0B',
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  heroTitleMuted: {
    fontSize: 24,
    color: '#111827',
    fontFamily: 'Inter-Bold',
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 14,
    color: '#D1D5DB',
    fontFamily: 'Inter-Medium',
  },
  heroMetaMuted: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  infoCardMuted: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
  },
  infoCardMutedTitle: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 6,
  },
  infoCardMutedText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroPrimaryButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroPrimaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  heroSecondaryButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroSecondaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  tierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  tierName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  tierDescription: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    maxWidth: '85%',
  },
  tierPriceBlock: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
  },
  tierHours: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  tierHint: {
    fontSize: 12,
    color: '#8B5CF6',
    fontFamily: 'Inter-Medium',
    marginTop: 10,
  },
  buyButton: {
    marginTop: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  emptyText: {
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestName: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  requestStatus: {
    marginTop: 4,
    fontSize: 12,
    color: '#8B5CF6',
    fontFamily: 'Inter-Bold',
  },
  requestPriceBlock: {
    alignItems: 'flex-end',
  },
  requestPrice: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  requestDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
    fontFamily: 'Inter-Regular',
  },
  requestMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  boostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  boostCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boostName: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  boostStatus: {
    marginTop: 4,
    fontSize: 12,
    color: '#8B5CF6',
    fontFamily: 'Inter-Bold',
  },
  boostHours: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  activationRow: {
    marginTop: 14,
  },
  hoursInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  activationHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  activationMeta: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  boostButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  primaryActionButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  secondaryActionButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionButtonText: {
    color: '#374151',
    fontFamily: 'Inter-Bold',
  },
  historyBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  historyTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  historyLine: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
});
