import React, { useMemo, useState } from 'react';
import { CATEGORIES } from '@/utils/categories';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import DateTimePicker from 'react-native-ui-datepicker';
import dayjs from 'dayjs';

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
  // Category chips single source of truth (optional; when provided, modal mirrors chips)
  selectedCategories?: string[];
  onCategoryToggle?: (next: string[]) => void;
}

const TokiFilters: React.FC<TokiFiltersProps> = ({
  visible,
  onClose,
  selectedFilters,
  onFilterChange,
  onClearAll,
  onApply,
  showAdvancedFilters = false,
  selectedCategories,
  onCategoryToggle,
}) => {
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const currentTimeOption = useMemo<'all' | 'today' | 'tomorrow' | 'custom'>(() => {
    const { dateFrom, dateTo } = selectedFilters || {};
    if (!dateFrom || !dateTo) return 'all';
    const start = dayjs(dateFrom).startOf('day');
    const end = dayjs(dateTo).endOf('day');
    const todayStart = dayjs().startOf('day');
    const todayEnd = dayjs().endOf('day');
    const tomorrowStart = dayjs().add(1, 'day').startOf('day');
    const tomorrowEnd = dayjs().add(1, 'day').endOf('day');
    if (start.isSame(todayStart) && end.isSame(todayEnd)) return 'today';
    if (start.isSame(tomorrowStart) && end.isSame(tomorrowEnd)) return 'tomorrow';
    return 'custom';
  }, [selectedFilters?.dateFrom, selectedFilters?.dateTo]);

  const setDayRange = (d: dayjs.Dayjs) => {
    onFilterChange('dateFrom', d.startOf('day').toISOString());
    onFilterChange('dateTo', d.endOf('day').toISOString());
  };

  const handleTimeSelect = (opt: 'all' | 'today' | 'tomorrow' | 'custom') => {
    if (opt === 'all') {
      onFilterChange('dateFrom', '');
      onFilterChange('dateTo', '');
      return;
    }
    if (opt === 'today') return setDayRange(dayjs());
    if (opt === 'tomorrow') return setDayRange(dayjs().add(1, 'day'));
    if (opt === 'custom') setIsDatePickerVisible(true);
  };

  const basicFilterSections = [
    {
      title: 'Visibility',
      key: 'visibility',
      options: ['all', 'public', 'connections', 'hosted_by_me'],
    },
    {
      title: 'Category',
      key: 'category',
      options: ['all', ...CATEGORIES],
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
    {
      title: 'Time',
      key: 'time',
      options: ['all', 'today', 'tomorrow', 'custom'],
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
    if (sectionKey === 'visibility' && option === 'hosted_by_me') {
      return 'Hosted by me';
    }
    return option.charAt(0).toUpperCase() + option.slice(1);
  };

  const renderFilterSection = (section: typeof filterSections[0]) => (
    <View key={section.key} style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{section.title}</Text>
      <View style={styles.filterOptions}>
        {section.key === 'category' && selectedCategories && onCategoryToggle
          ? section.options.map((option) => {
              const handlePress = (category: string) => {
                if (category === 'all') {
                  onCategoryToggle(['all']);
                  return;
                }
                const current = selectedCategories.includes('all') ? [] : selectedCategories;
                const next = current.includes(category)
                  ? current.filter((c) => c !== category)
                  : [...current, category];
                onCategoryToggle(next.length === 0 ? ['all'] : next);
              };
              const isActive =
                selectedCategories.includes(option) ||
                (option === 'all' && selectedCategories.includes('all'));
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    isActive && styles.filterOptionSelected
                  ]}
                  onPress={() => handlePress(option)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    isActive && styles.filterOptionTextSelected
                  ]}>
                    {getOptionLabel(option, section.key)}
                  </Text>
                </TouchableOpacity>
              );
            })
          : section.options.map((option) => {
              const isSelected =
                section.key === 'time'
                  ? currentTimeOption === (option as any)
                  : (selectedFilters as any)[section.key] === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    isSelected && styles.filterOptionSelected
                  ]}
                  onPress={() =>
                    section.key === 'time'
                      ? handleTimeSelect(option as any)
                      : onFilterChange(section.key, option)
                  }
                >
                  <Text style={[
                    styles.filterOptionText,
                    isSelected && styles.filterOptionTextSelected
                  ]}>
                    {getOptionLabel(option, section.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
      </View>
    </View>
  );

  // Slider/stepper handlers for radius (2–500 km)
  const radiusValue = Math.min(
    500,
    Math.max(2, parseInt(selectedFilters?.radius || '500', 10) || 500)
  );
  const setRadius = (next: number) => {
    const clamped = Math.min(500, Math.max(2, Math.round(next)));
    onFilterChange('radius', String(clamped));
  };

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

          {/* Max distance control */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Max distance</Text>
            <Text style={styles.radiusValueText}>{radiusValue} km</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.webSliderWrapper as any}>
                {/* @ts-ignore web-only */}
                <input
                  type="range"
                  min={2}
                  max={500}
                  step={1}
                  value={radiusValue}
                  onChange={(e: any) => setRadius(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#B49AFF' }}
                />
                <View style={styles.sliderScale}>
                  <Text style={styles.sliderScaleText}>2</Text>
                  <Text style={styles.sliderScaleText}>500</Text>
                </View>
              </View>
            ) : (
              <View style={styles.nativeStepperRow}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setRadius(radiusValue - 1)}
                >
                  <Text style={styles.stepperButtonText}>-</Text>
                </TouchableOpacity>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((radiusValue - 2) / (500 - 2)) * 100}%` }
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setRadius(radiusValue + 1)}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {isDatePickerVisible && (
          <Modal
            transparent
            visible={isDatePickerVisible}
            animationType="fade"
            onRequestClose={() => setIsDatePickerVisible(false)}
          >
            <View style={styles.pickerBackdrop}>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  mode="single"
                  date={
                    selectedFilters?.dateFrom
                      ? dayjs(selectedFilters.dateFrom).toDate()
                      : new Date()
                  }
                  styles={{
                    selected: { backgroundColor: '#B49AFF' },
                    selected_label: { color: '#FFFFFF' },
                  }}
                  onChange={(params: any) => {
                    try {
                      const picked: Date = params.date;
                      setDayRange(dayjs(picked));
                    } catch {}
                  }}
                />
                <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setIsDatePickerVisible(false)}>
                  <Text style={styles.pickerCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

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
  radiusValueText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    marginBottom: 8,
  },
  webSliderWrapper: {
    width: '100%',
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sliderScaleText: {
    fontSize: 12,
    color: '#8B8B8B',
    fontFamily: 'Inter-Regular',
  },
  nativeStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EEEEEE',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#B49AFF',
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
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    maxWidth: 420,
  },
  pickerCloseButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerCloseText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
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
