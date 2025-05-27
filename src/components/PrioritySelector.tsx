import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

const PRIORITIES = [
  { value: 'low', label: 'Низкий', color: '#8BC34A' },
  { value: 'medium', label: 'Средний', color: '#FFC107' },
  { value: 'high', label: 'Высокий', color: '#F44336' },
];

type Priority = 'low' | 'medium' | 'high';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({ value, onChange }) => (
  <View style={styles.row}>
    {PRIORITIES.map(p => (
      <Chip
        key={p.value}
        selected={value === p.value}
        style={{ backgroundColor: p.color, marginRight: 8 }}
        onPress={() => onChange(p.value as Priority)}
      >
        {p.label}
      </Chip>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 8 },
}); 