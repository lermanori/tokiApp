import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { apiService } from '@/services/api';

export default function BoostInsightsScreen() {
  const params = useLocalSearchParams();
  const tokiId = typeof params.tokiId === 'string' ? params.tokiId : '';
  const title = typeof params.title === 'string' ? params.title : 'Boost Insights';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtime, setRealtime] = useState<any | null>(null);
  const [conversion, setConversion] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    if (!tokiId) return;
    try {
      const [realtimeData, conversionData] = await Promise.all([
        apiService.getRealtimeInsights(tokiId),
        apiService.getConversionReport(tokiId),
      ]);
      setRealtime(realtimeData);
      setConversion(conversionData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokiId]);

  useEffect(() => {
    loadData().catch((error) => {
      console.error('Failed to load boost insights:', error);
      setLoading(false);
      setRefreshing(false);
    });
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </SafeAreaView>
    );
  }

  const visibility = realtime?.visibility || {};
  const conversionBlock = conversion?.conversion || null;
  const isPendingConversion = conversion?.status === 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Boost Insights</Text>
          <Text style={styles.subtitle}>{title}</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadData().catch(() => setRefreshing(false));
        }} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Real-Time Visibility</Text>
          <View style={styles.grid}>
            <MetricCard label="Views" value={visibility.views?.total} sublabel={`${visibility.views?.duringBoost || 0} during boost`} />
            <MetricCard label="Opens" value={visibility.opens?.total} sublabel={`${visibility.opens?.duringBoost || 0} during boost`} />
            <MetricCard label="Saves" value={visibility.saves?.total} sublabel={`${visibility.saves?.duringBoost || 0} during boost`} />
            <MetricCard label="Join requests" value={visibility.joinRequests?.total} sublabel={`${visibility.joinRequests?.duringBoost || 0} during boost`} />
            <MetricCard label="Chat joins" value={visibility.chatJoins?.total} sublabel={`${visibility.chatJoins?.duringBoost || 0} during boost`} />
            <MetricCard
              label="Boost timer"
              value={realtime?.boost?.endsAt ? formatCountdown(realtime.boost.endsAt) : 'Inactive'}
              sublabel={realtime?.boost?.tierName || 'No active boost'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before vs During</Text>
          <View style={styles.compareCard}>
            <View style={styles.compareRow}>
              <Text style={styles.compareLabel}>Before boost</Text>
              <Text style={styles.compareValue}>{realtime?.boostPerformance?.beforeBoost || 0}</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareLabel}>During boost</Text>
              <Text style={styles.compareValue}>{realtime?.boostPerformance?.duringBoost || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post-Event Conversion</Text>
          {isPendingConversion ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>Final conversion report is pending</Text>
              <Text style={styles.pendingText}>{conversion?.message}</Text>
              {conversion?.availableAt ? (
                <Text style={styles.pendingText}>
                  Available at {new Date(conversion.availableAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                <MetricCard label='“Yes, I went”' value={conversionBlock?.yesCount} />
                <MetricCard label="Total responses" value={conversionBlock?.totalResponses} />
                <MetricCard label="Conversion rate" value={`${conversionBlock?.conversionPercentage || 0}%`} />
                <MetricCard label="Engaged users" value={conversionBlock?.totalEngagedUsers} />
              </View>

              <View style={styles.compareCard}>
                <Text style={styles.compareTitle}>Comparison to previous events</Text>
                <View style={styles.compareRow}>
                  <Text style={styles.compareLabel}>Previous boosted events</Text>
                  <Text style={styles.compareValue}>{conversion?.comparison?.previousEventsCount || 0}</Text>
                </View>
                <View style={styles.compareRow}>
                  <Text style={styles.compareLabel}>Previous avg conversion</Text>
                  <Text style={styles.compareValue}>
                    {conversion?.comparison?.previousAvgConversion != null
                      ? `${conversion.comparison.previousAvgConversion}%`
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Peak hours</Text>
                {(conversion?.peakHours || []).length === 0 ? (
                  <Text style={styles.infoLine}>No peak-hour data yet.</Text>
                ) : (
                  (conversion?.peakHours || []).map((item: any) => (
                    <Text key={`${item.hour}`} style={styles.infoLine}>
                      {item.hour}:00 · {item.engagementCount} engagements
                    </Text>
                  ))
                )}
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Interest tags</Text>
                {(conversion?.interestTags || []).length === 0 ? (
                  <Text style={styles.infoLine}>No interest tags yet.</Text>
                ) : (
                  <View style={styles.tagWrap}>
                    {(conversion?.interestTags || []).map((item: any) => (
                      <View key={`${item.category}`} style={styles.tag}>
                        <Text style={styles.tagText}>{item.category} · {item.count}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, sublabel }: { label: string; value: string | number | undefined; sublabel?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value ?? 0}</Text>
      {sublabel ? <Text style={styles.metricSubLabel}>{sublabel}</Text> : null}
    </View>
  );
}

const formatCountdown = (endsAt: string) => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ending now';
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    color: '#111827',
    fontFamily: 'Inter-Bold',
  },
  metricSubLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#8B5CF6',
    fontFamily: 'Inter-Medium',
  },
  compareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  compareTitle: {
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  compareLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  compareValue: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Bold',
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  pendingTitle: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  infoLine: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
});
