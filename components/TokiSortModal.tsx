import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

export type SortKey = 'relevance' | 'date' | 'distance' | 'popularity' | 'created' | 'title';

export interface SortState {
  sortBy: SortKey;
  sortOrder: 'asc' | 'desc';
}

interface TokiSortModalProps {
  visible: boolean;
  onClose: () => void;
  value: SortState;
  onChange: (next: SortState) => void;
  onApply: () => void;
}

const OPTIONS: Array<{ key: SortKey; label: string; order?: 'asc' | 'desc' }> = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'date', label: 'Date (soonest)', order: 'asc' },
  { key: 'distance', label: 'Distance (nearest)', order: 'asc' },
  { key: 'popularity', label: 'Popularity (most participants)', order: 'desc' },
  { key: 'created', label: 'Created (newest)', order: 'desc' },
  { key: 'title', label: 'Title (A–Z)', order: 'asc' },
];

export default function TokiSortModal({
  visible,
  onClose,
  value,
  onChange,
  onApply,
}: TokiSortModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Sort</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {OPTIONS.map((opt) => {
            const isSelected = value.sortBy === opt.key;
            const nextOrder = opt.order ?? (isSelected ? value.sortOrder : 'asc');
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => onChange({ sortBy: opt.key, sortOrder: nextOrder })}
              >
                <Text style={[styles.label, isSelected && styles.labelSelected]}>{opt.label}</Text>
                {isSelected ? (
                  <View style={styles.checkContainer}>
                    <Check size={20} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.apply} onPress={onApply}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: 'white', padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '600' },
  close: { fontSize: 18 },
  body: { gap: 8 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F6F7FB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: { 
    backgroundColor: '#EEE9FF',
    borderColor: '#5B40F3',
    borderWidth: 2,
    shadowColor: '#5B40F3',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 16, color: '#444' },
  labelSelected: { color: '#5B40F3', fontWeight: '600' },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5B40F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { marginTop: 'auto' },
  apply: {
    backgroundColor: 'black',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyText: { color: 'white', fontWeight: '600' },
});


