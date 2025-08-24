import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MapPin, Navigation, Star } from 'lucide-react-native';
import { GeocodingResult } from '@/services/geocoding';
import { geocodingService } from '@/services/geocoding';

interface LocationAutocompleteProps {
  results: GeocodingResult[];
  visible: boolean;
  onSelect: (result: GeocodingResult) => void;
  onClose: () => void;
  location: string;
}

export default function LocationAutocomplete({ 
  results, 
  visible, 
  onSelect, 
  onClose, 
  location 
}: LocationAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (visible && results.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: selectedIndex * 80, // Approximate height per item
          animated: true
        });
      }, 100);
    }
  }, [visible, selectedIndex, results.length]);

  const handleSelect = (result: GeocodingResult) => {
    onSelect(result);
    onClose();
  };

  const formatAddress = (result: GeocodingResult): string => {
    const parts = [];
    
    if (result.address?.road) {
      parts.push(result.address.road);
    }
    if (result.address?.suburb) {
      parts.push(result.address.suburb);
    }
    if (result.address?.town) {
      parts.push(result.address.town);
    }
    if (result.address?.state_district) {
      parts.push(result.address.state_district);
    }
    if (result.address?.state) {
      parts.push(result.address.state);
    }
    if (result.address?.country) {
      parts.push(result.address.country);
    }
    
    return parts.length > 0 ? parts.join(', ') : result.displayName;
  };

  const getDetailedAddressInfo = (result: GeocodingResult): string[] => {
    const details = [];
    
    if (result.address?.road) {
      details.push(`Road: ${result.address.road}`);
    }
    if (result.address?.house_number) {
      details.push(`Number: ${result.address.house_number}`);
    }
    if (result.address?.suburb) {
      details.push(`Suburb: ${result.address.suburb}`);
    }
    if (result.address?.town) {
      details.push(`Town: ${result.address.town}`);
    }
    if (result.address?.municipality) {
      details.push(`Municipality: ${result.address.municipality}`);
    }
    if (result.address?.city) {
      details.push(`City: ${result.address.city}`);
    }
    if (result.address?.state_district) {
      details.push(`District: ${result.address.state_district}`);
    }
    if (result.address?.state) {
      details.push(`State: ${result.address.state}`);
    }
    if (result.address?.postcode) {
      details.push(`Postcode: ${result.address.postcode}`);
    }
    if (result.address?.country) {
      details.push(`Country: ${result.address.country}`);
    }
    if (result.address?.country_code) {
      details.push(`Country Code: ${result.address.country_code.toUpperCase()}`);
    }
    
    return details;
  };

  const getLocationSummary = (result: GeocodingResult): string => {
    const summary = [];
    
    if (result.address?.road) {
      summary.push(result.address.road);
    }
    if (result.address?.town || result.address?.city) {
      summary.push(result.address.town || result.address.city);
    }
    if (result.address?.state) {
      summary.push(result.address.state);
    }
    if (result.address?.country) {
      summary.push(result.address.country);
    }
    
    return summary.join(', ');
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#10B981'; // Green
    if (confidence >= 0.6) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!visible || results.length === 0) {
    return null;
  }

  return (
    <View style={styles.dropdownContainer}>
      <View style={styles.dropdownHeader}>
        <Text style={styles.dropdownTitle}>
          Found {results.length} result{results.length !== 1 ? 's' : ''} for "{location}"
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.resultsContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {results.map((result, index) => (
          <TouchableOpacity
            key={`${result.latitude}-${result.longitude}`}
            style={[
              styles.resultItem,
              index === selectedIndex && styles.resultItemSelected
            ]}
            onPress={() => handleSelect(result)}
            activeOpacity={0.7}
          >
            <View style={styles.resultIcon}>
              <Navigation size={18} color="#8B5CF6" />
            </View>
            
            <View style={styles.resultContent}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {geocodingService.formatConciseAddress(result)}
              </Text>
              
              {/* Detailed address information */}
              <View style={styles.detailedAddress}>
                {getDetailedAddressInfo(result).slice(0, 4).map((detail, index) => (
                  <Text key={index} style={styles.detailText} numberOfLines={1}>
                    {detail}
                  </Text>
                ))}
                {getDetailedAddressInfo(result).length > 4 && (
                  <Text style={styles.moreDetailsText}>
                    +{getDetailedAddressInfo(result).length - 4} more details
                  </Text>
                )}
              </View>
              
              <Text style={styles.resultCoordinates}>
                {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
              </Text>
              
              <View style={styles.resultMeta}>
                <View style={styles.confidenceBadge}>
                  <Star size={10} color={getConfidenceColor(result.confidence)} />
                  <Text style={[styles.confidenceText, { color: getConfidenceColor(result.confidence) }]}>
                    {getConfidenceText(result.confidence)}
                  </Text>
                </View>
                
                {result.placeType && (
                  <View style={styles.placeTypeBadge}>
                    <Text style={styles.placeTypeText}>
                      {result.placeType}
                    </Text>
                  </View>
                )}
                
                {result.importance && (
                  <View style={styles.importanceBadge}>
                    <Text style={styles.importanceText}>
                      {(result.importance * 100).toFixed(1)}%
                    </Text>
                  </View>
                )}
                
                {result.address?.postcode && (
                  <Text style={styles.postcode}>
                    {result.address.postcode}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.resultArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.dropdownFooter}>
        <Text style={styles.footerText}>
          Tap a location to select it
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    maxHeight: 300,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dropdownTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    flex: 1,
  },
  closeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#6B7280',
    lineHeight: 18,
  },
  resultsContainer: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  resultItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  resultContent: {
    flex: 1,
    marginRight: 10,
  },
  resultTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 3,
    lineHeight: 18,
  },
  resultCoordinates: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  postcode: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  resultArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  dropdownFooter: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  detailedAddress: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  moreDetailsText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
  placeTypeBadge: {
    backgroundColor: '#E0E7FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  placeTypeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#4F46E5',
  },
  importanceBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  importanceText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#991B1B',
  },
});

