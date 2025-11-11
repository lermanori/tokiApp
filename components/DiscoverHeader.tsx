import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Filter, RefreshCw, ArrowUpDown } from 'lucide-react-native';

interface DiscoverHeaderProps {
  onRefresh: () => void;
  onToggleMap: () => void;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  showMap: boolean;
  isLoading: boolean;
}

export const DiscoverHeader: React.FC<DiscoverHeaderProps> = ({
  onRefresh,
  onToggleMap,
  onOpenFilters,
  onOpenSort,
  showMap,
  isLoading,
}) => {
  return (
    <LinearGradient
      colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={20} color={isLoading ? "#CCCCCC" : "#666666"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onToggleMap}>
            {showMap ? <MapPin size={20} color="#666666" /> : <View style={styles.listIcon} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onOpenSort}>
            <ArrowUpDown size={20} color="#666666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onOpenFilters}>
            <Filter size={20} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  listIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#666666',
    borderRadius: 2,
  },
});

