import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { X } from 'lucide-react-native';

export interface TokiFiltersProps {
  visible: boolean;
  onClose: () => void;
  selectedFilters: {
    visibility?: string;
    category: string;
    distance: string;
    availability: string;
    participants?: string;
    dateFrom?: string;
    dateTo?: string;
    radius?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearAll: () => void;
  onApply: () => void;
  showAdvancedFilters?: boolean;
}

const TokiFilters: React.FC<TokiFiltersProps> = ({
  visible,
  onClose,
  selectedFilters,
  onFilterChange,
  onClearAll,
  onApply,
  showAdvancedFilters = false,
}) => {
  const basicFilterSections = [
    {
      title: 'Visibility',
      key: 'visibility',
      options: ['all', 'public', 'connections', 'friends'],
    },
    {
      title: 'Category',
      key: 'category',
      options: ['all', 'sports', 'beach', 'sunset', 'coffee', 'work', 'music', 'jazz', 'drinks', 'networking', 'wellness', 'yoga', 'morning', 'art', 'walking', 'culture'],
    },
    {
      title: 'Distance',
      key: 'distance',
      options: ['all', 'Under 1km', '1-3km', '3-5km', '5km+'],
    },
    {
      title: 'Availability',
      key: 'availability',
      options: ['all', 'spots available', 'almost full', 'waitlist'],
    },
    {
      title: 'Participants',
      key: 'participants',
      options: ['all', '1-10', '10-50', '50-100', '100+'],
    },
  ];

  const advancedFilterSections = [
    ...basicFilterSections,
    {
      title: 'Sort By',
      key: 'sortBy',
      options: ['created_at', 'title', 'location', 'current_attendees', 'distance'],
    },
    {
      title: 'Sort Order',
      key: 'sortOrder',
      options: ['asc', 'desc'],
    },
  ];

  const filterSections = showAdvancedFilters ? advancedFilterSections : basicFilterSections;

  const getOptionLabel = (option: string, sectionKey: string) => {
    if (sectionKey === 'sortBy') {
      switch (option) {
        case 'created_at': return 'Date Created';
        case 'current_attendees': return 'Attendees';
        default: return option.charAt(0).toUpperCase() + option.slice(1);
      }
    }
    if (sectionKey === 'sortOrder') {
      return option === 'asc' ? 'Ascending' : 'Descending';
    }
    return option.charAt(0).toUpperCase() + option.slice(1);
  };

  const renderFilterSection = (section: typeof filterSections[0]) => (
    <View key={section.key} style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{section.title}</Text>
      <View style={styles.filterOptions}>
        {section.options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterOption,
              selectedFilters[section.key as keyof typeof selectedFilters] === option && styles.filterOptionSelected
            ]}
            onPress={() => onFilterChange(section.key, option)}
          >
            <Text style={[
              styles.filterOptionText,
              selectedFilters[section.key as keyof typeof selectedFilters] === option && styles.filterOptionTextSelected
            ]}>
              {getOptionLabel(option, section.key)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={onClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {filterSections.map(renderFilterSection)}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.applyButton} onPress={onApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  clearAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  filterOptionSelected: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  filterOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  applyButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

export default TokiFilters;
