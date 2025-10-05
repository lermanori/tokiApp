import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCw, Server, Smartphone, Cpu, HardDrive } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getBackendUrl } from '@/services/config';
import packageJson from '../package.json';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  versions: {
    backend: string;
    node: string;
  };
  environment: {
    nodeEnv: string;
    platform: string;
    arch: string;
  };
  memory: {
    used: string;
    total: string;
    rss: string;
  };
}

// Frontend version from local package.json
const FRONTEND_VERSION = packageJson.version;

export default function HealthScreen() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchHealthData = async () => {
    try {
      setError(null);
      const response = await fetch(`${getBackendUrl()}/api/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setHealthData(data);
    } catch (err: any) {
      console.error('Health check failed:', err);
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHealthData();
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10B981';
      case 'unhealthy': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Health</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Health</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
          <RefreshCw size={20} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchHealthData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : healthData ? (
          <>
            {/* Status Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(healthData.status) }]} />
                <Text style={styles.cardTitle}>System Status</Text>
              </View>
              <Text style={[styles.statusText, { color: getStatusColor(healthData.status) }]}>
                {healthData.status.toUpperCase()}
              </Text>
              <Text style={styles.timestamp}>
                Last updated: {new Date(healthData.timestamp).toLocaleString()}
              </Text>
            </View>

            {/* Versions Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Server size={20} color="#8B5CF6" />
                <Text style={styles.cardTitle}>Versions</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Backend</Text>
                <Text style={styles.infoValue}>{healthData.versions.backend}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Frontend</Text>
                <Text style={styles.infoValue}>{FRONTEND_VERSION}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Node.js</Text>
                <Text style={styles.infoValue}>{healthData.versions.node}</Text>
              </View>
            </View>

            {/* Environment Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Smartphone size={20} color="#8B5CF6" />
                <Text style={styles.cardTitle}>Environment</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Environment</Text>
                <Text style={styles.infoValue}>{healthData.environment.nodeEnv}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platform</Text>
                <Text style={styles.infoValue}>{healthData.environment.platform}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Architecture</Text>
                <Text style={styles.infoValue}>{healthData.environment.arch}</Text>
              </View>
            </View>

            {/* Performance Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Cpu size={20} color="#8B5CF6" />
                <Text style={styles.cardTitle}>Performance</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Uptime</Text>
                <Text style={styles.infoValue}>{formatUptime(healthData.uptime)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Memory Used</Text>
                <Text style={styles.infoValue}>{healthData.memory.used}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Memory Total</Text>
                <Text style={styles.infoValue}>{healthData.memory.total}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>RSS Memory</Text>
                <Text style={styles.infoValue}>{healthData.memory.rss}</Text>
              </View>
            </View>
          </>
        ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#7F1D1D',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  statusText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
});
