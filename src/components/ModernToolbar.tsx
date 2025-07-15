import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Surface, IconButton, useTheme, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

interface ModernToolbarProps {
  onFormat: (action: string, value?: any) => void;
  onImagePicker: () => void;
  visible: boolean;
  isDarkMode: boolean;
}

interface ToolbarAction {
  id: string;
  icon: string;
  label: string;
  category: 'formatting' | 'list' | 'insert' | 'media';
  action: string;
  value?: any;
}

const toolbarActions: ToolbarAction[] = [
  // Formatting
  { id: 'bold', icon: 'format-bold', label: 'Жирный', category: 'formatting', action: 'bold' },
  { id: 'italic', icon: 'format-italic', label: 'Курсив', category: 'formatting', action: 'italic' },
  { id: 'underline', icon: 'format-underline', label: 'Подчеркнутый', category: 'formatting', action: 'underline' },
  { id: 'strikethrough', icon: 'format-strikethrough', label: 'Зачеркнутый', category: 'formatting', action: 'strikethrough' },
  
  // Lists
  { id: 'bulletList', icon: 'format-list-bulleted', label: 'Маркированный список', category: 'list', action: 'bulletList' },
  { id: 'numberList', icon: 'format-list-numbered', label: 'Нумерованный список', category: 'list', action: 'numberList' },
  { id: 'checklist', icon: 'checkbox-marked-outline', label: 'Чеклист', category: 'list', action: 'checklist' },
  
  // Insert
  { id: 'blockquote', icon: 'format-quote-close', label: 'Цитата', category: 'insert', action: 'blockquote' },
  { id: 'code', icon: 'code-tags', label: 'Код', category: 'insert', action: 'code' },
  { id: 'link', icon: 'link', label: 'Ссылка', category: 'insert', action: 'link' },
  { id: 'table', icon: 'table', label: 'Таблица', category: 'insert', action: 'table' },
  
  // Heading levels
  { id: 'h1', icon: 'format-header-1', label: 'Заголовок 1', category: 'formatting', action: 'heading', value: 1 },
  { id: 'h2', icon: 'format-header-2', label: 'Заголовок 2', category: 'formatting', action: 'heading', value: 2 },
  { id: 'h3', icon: 'format-header-3', label: 'Заголовок 3', category: 'formatting', action: 'heading', value: 3 },
  
  // Media
  { id: 'image', icon: 'image', label: 'Изображение', category: 'media', action: 'image' },
];

const categories = [
  { id: 'formatting', label: 'A', icon: 'format-bold' },
  { id: 'list', label: '•', icon: 'format-list-bulleted' },
  { id: 'insert', label: '+', icon: 'plus' },
  { id: 'media', label: '📷', icon: 'image' },
];

export const ModernToolbar: React.FC<ModernToolbarProps> = ({
  onFormat,
  onImagePicker,
  visible,
  isDarkMode,
}) => {
  const { colors } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('formatting');
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());

  if (!visible) return null;

  const currentActions = toolbarActions.filter(action => action.category === activeCategory);

  const handleActionPress = (action: ToolbarAction) => {
    if (action.action === 'image') {
      onImagePicker();
      return;
    }

    // Toggle selection for formatting actions
    if (action.category === 'formatting') {
      const newSelected = new Set(selectedActions);
      if (newSelected.has(action.id)) {
        newSelected.delete(action.id);
      } else {
        newSelected.add(action.id);
      }
      setSelectedActions(newSelected);
    }

    onFormat(action.action, action.value);
  };

  const getButtonStyle = (action: ToolbarAction) => {
    const isSelected = selectedActions.has(action.id);
    return [
      styles.actionButton,
      {
        backgroundColor: isSelected 
          ? (isDarkMode ? '#3A3A3C' : '#E5E5EA')
          : 'transparent',
        borderColor: isSelected ? colors.primary : 'transparent',
        borderWidth: isSelected ? 1 : 0,
      }
    ];
  };

  return (
    <Surface style={[
      styles.container,
      {
        backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7',
        borderTopColor: isDarkMode ? '#38383A' : '#C6C6C8',
      }
    ]}>
      {/* Category Selector */}
      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: activeCategory === category.id
                    ? colors.primary
                    : 'transparent',
                }
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: activeCategory === category.id
                      ? '#FFFFFF'
                      : colors.onSurface,
                  }
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsContainer}
        >
          {currentActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={getButtonStyle(action)}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.7}
            >
              <IconButton
                icon={action.icon}
                size={22}
                iconColor={selectedActions.has(action.id) ? colors.primary : colors.onSurface}
                style={styles.iconButton}
              />
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color: selectedActions.has(action.id) ? colors.primary : colors.onSurface,
                  }
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Quick Access Row for most used actions */}
      <View style={styles.quickAccessRow}>
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
          onPress={() => onFormat('undo')}
        >
          <IconButton icon="undo" size={20} iconColor={colors.onSurface} style={styles.quickIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
          onPress={() => onFormat('redo')}
        >
          <IconButton icon="redo" size={20} iconColor={colors.onSurface} style={styles.quickIcon} />
        </TouchableOpacity>

        <View style={styles.quickSeparator} />
        
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
          onPress={() => onFormat('textColor')}
        >
          <IconButton icon="format-color-text" size={20} iconColor={colors.onSurface} style={styles.quickIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
          onPress={() => onFormat('highlight')}
        >
          <IconButton icon="marker" size={20} iconColor={colors.onSurface} style={styles.quickIcon} />
        </TouchableOpacity>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categoryRow: {
    marginBottom: 8,
  },
  categoryContainer: {
    paddingHorizontal: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsRow: {
    marginBottom: 8,
  },
  actionsContainer: {
    paddingHorizontal: 4,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  iconButton: {
    margin: 0,
    width: 24,
    height: 24,
  },
  actionLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  quickAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#38383A',
  },
  quickButton: {
    borderRadius: 8,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickIcon: {
    margin: 0,
    width: 32,
    height: 32,
  },
  quickSeparator: {
    width: 1,
    height: 24,
    backgroundColor: '#38383A',
    marginHorizontal: 8,
  },
});