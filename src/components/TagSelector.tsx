import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, TextInput, IconButton, useTheme } from 'react-native-paper';
import { Tag } from '../hooks/useTags';
import { useTranslation } from 'react-i18next';

const COLORS = ['#F44336', '#FFC107', '#8BC34A', '#2196F3', '#9C27B0', '#FF9800', '#607D8B'];

interface TagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelect: (tagId: string) => void;
  onAdd: (name: string, color: string) => void;
  onRemove: (tagId: string) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ tags, selectedTagIds, onSelect, onAdd, onRemove }) => {
  const [input, setInput] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const theme = useTheme();
  const { colors, roundness } = theme;
  const c = colors as any;
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {tags.map(tag => (
          <Chip
            key={tag.id}
            selected={selectedTagIds.includes(tag.id)}
            style={{
              backgroundColor: selectedTagIds.includes(tag.id) ? c.primary : tag.color,
              marginRight: 4,
              marginBottom: 4,
              borderRadius: roundness,
            }}
            textStyle={{ color: selectedTagIds.includes(tag.id) ? c.onPrimary : c.chipText, fontWeight: 'bold' }}
            onPress={() => onSelect(tag.id)}
            onClose={() => onRemove(tag.id)}
          >
            {tag.name}
          </Chip>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('new_tag_placeholder', 'Новая метка')}
          style={[styles.input, { backgroundColor: c.surface, color: c.text, borderRadius: roundness }]}
          placeholderTextColor={c.placeholder}
          theme={{ colors: { text: c.text, placeholder: c.placeholder, primary: c.primary } }}
        />
        <View style={styles.colors}>
          {COLORS.map(cColor => (
            <IconButton
              key={cColor}
              icon="circle"
              iconColor={cColor}
              size={20}
              style={color === cColor ? [styles.selectedColor, { borderColor: c.primary, borderRadius: 20, borderWidth: 2 }] : undefined}
              onPress={() => setColor(cColor)}
            />
          ))}
        </View>
        <IconButton
          icon="plus"
          iconColor={c.primary}
          onPress={() => {
            if (input.trim()) {
              onAdd(input.trim(), color);
              setInput('');
            }
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: { flex: 1, marginRight: 8 },
  colors: { flexDirection: 'row', alignItems: 'center' },
  selectedColor: { borderWidth: 2 },
}); 