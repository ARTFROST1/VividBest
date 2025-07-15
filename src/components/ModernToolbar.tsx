import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { Surface, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EditorRef } from './AdvancedRichTextEditor';

interface ModernToolbarProps {
  editorRef: React.RefObject<EditorRef>;
  visible: boolean;
  selectedFormats: Set<string>;
  onAction?: (action: string) => void;
}

interface ToolbarSection {
  id: string;
  title: string;
  buttons: ToolbarButton[];
  expanded: boolean;
}

interface ToolbarButton {
  id: string;
  icon: string;
  action: string;
  title: string;
  value?: any;
  category: 'title' | 'format' | 'list' | 'insert' | 'media';
}

// Определение кнопок панели инструментов в стиле Apple Notes
const toolbarButtons: ToolbarButton[] = [
  // Стили текста
  { id: 'title', icon: 'format-title', action: 'heading1', title: 'Заголовок', category: 'title' },
  { id: 'heading', icon: 'format-header-2', action: 'heading2', title: 'Подзаголовок', category: 'title' },
  { id: 'subheading', icon: 'format-header-3', action: 'heading3', title: 'Подзаголовок 2', category: 'title' },
  
  // Форматирование
  { id: 'bold', icon: 'format-bold', action: 'bold', title: 'Жирный', category: 'format' },
  { id: 'italic', icon: 'format-italic', action: 'italic', title: 'Курсив', category: 'format' },
  { id: 'underline', icon: 'format-underline', action: 'underline', title: 'Подчеркнутый', category: 'format' },
  { id: 'strikethrough', icon: 'format-strikethrough', action: 'strikethrough', title: 'Зачеркнутый', category: 'format' },
  { id: 'code', icon: 'code-tags', action: 'code', title: 'Код', category: 'format' },
  
  // Списки
  { id: 'checklist', icon: 'checkbox-marked-outline', action: 'checklist', title: 'Список задач', category: 'list' },
  { id: 'bulletList', icon: 'format-list-bulleted', action: 'bulletList', title: 'Маркированный', category: 'list' },
  { id: 'numberList', icon: 'format-list-numbered', action: 'numberList', title: 'Нумерованный', category: 'list' },
  
  // Вставка
  { id: 'table', icon: 'table', action: 'table', title: 'Таблица', category: 'insert' },
  { id: 'link', icon: 'link', action: 'link', title: 'Ссылка', category: 'insert' },
  
  // Медиа
  { id: 'camera', icon: 'camera', action: 'camera', title: 'Камера', category: 'media' },
  { id: 'photo', icon: 'image', action: 'photo', title: 'Фото', category: 'media' },
  { id: 'audio', icon: 'microphone', action: 'audio', title: 'Аудио', category: 'media' },
];

// Группировка кнопок по категориям
const toolbarSections: ToolbarSection[] = [
  {
    id: 'styles',
    title: 'Стили',
    buttons: toolbarButtons.filter(b => b.category === 'title'),
    expanded: false,
  },
  {
    id: 'formatting',
    title: 'Форматирование',
    buttons: toolbarButtons.filter(b => b.category === 'format'),
    expanded: false,
  },
  {
    id: 'lists',
    title: 'Списки',
    buttons: toolbarButtons.filter(b => b.category === 'list'),
    expanded: false,
  },
  {
    id: 'insert',
    title: 'Вставка',
    buttons: toolbarButtons.filter(b => b.category === 'insert'),
    expanded: false,
  },
  {
    id: 'media',
    title: 'Медиа',
    buttons: toolbarButtons.filter(b => b.category === 'media'),
    expanded: false,
  },
];

const ModernToolbar: React.FC<ModernToolbarProps> = ({
  editorRef,
  visible,
  selectedFormats,
  onAction,
}) => {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('formatting');

  // Обработка нажатия на кнопку
  const handleButtonPress = React.useCallback((button: ToolbarButton) => {
    if (!editorRef.current) return;

    switch (button.action) {
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikethrough':
      case 'code':
      case 'heading1':
      case 'heading2':
      case 'heading3':
        editorRef.current.applyFormat(button.action as any);
        break;
      case 'checklist':
        editorRef.current.insertCheckbox();
        break;
      case 'photo':
        editorRef.current.insertImage();
        break;
      case 'audio':
        editorRef.current.insertAudio();
        break;
      case 'table':
        editorRef.current.insertTable();
        break;
      case 'link':
        editorRef.current.insertLink();
        break;
      default:
        onAction?.(button.action);
    }
  }, [editorRef, onAction]);

  // Переключение развернутости секции
  const toggleSection = React.useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Получение цвета кнопки
  const getButtonColor = (button: ToolbarButton) => {
    const isSelected = selectedFormats.has(button.id);
    return isSelected ? colors.primary : colors.onSurface;
  };

  // Получение фона кнопки
  const getButtonBackground = (button: ToolbarButton) => {
    const isSelected = selectedFormats.has(button.id);
    return isSelected ? `${colors.primary}15` : 'transparent';
  };

  // Рендер быстрых кнопок (всегда видимые)
  const renderQuickButtons = () => {
    const quickButtons = [
      toolbarButtons.find(b => b.id === 'bold'),
      toolbarButtons.find(b => b.id === 'italic'),
      toolbarButtons.find(b => b.id === 'underline'),
      toolbarButtons.find(b => b.id === 'checklist'),
      toolbarButtons.find(b => b.id === 'photo'),
    ].filter(Boolean);

    return (
      <View style={styles.quickButtonsContainer}>
        {quickButtons.map(button => button && (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.quickButton,
              { 
                backgroundColor: getButtonBackground(button),
                borderColor: colors.outline,
              }
            ]}
            onPress={() => handleButtonPress(button)}
          >
            <MaterialCommunityIcons
              name={button.icon as any}
              size={20}
              color={getButtonColor(button)}
            />
          </TouchableOpacity>
        ))}
        
        {/* Кнопка "Еще" */}
        <TouchableOpacity
          style={[styles.quickButton, { borderColor: colors.outline }]}
          onPress={() => toggleSection('all')}
        >
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={20}
            color={colors.onSurface}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Рендер категорий
  const renderCategories = () => {
    const categories = [
      { id: 'title', name: 'Стили', icon: 'format-title' },
      { id: 'format', name: 'Формат', icon: 'format-bold' },
      { id: 'list', name: 'Списки', icon: 'format-list-bulleted' },
      { id: 'insert', name: 'Вставка', icon: 'table' },
      { id: 'media', name: 'Медиа', icon: 'image' },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              {
                backgroundColor: selectedCategory === category.id 
                  ? colors.primaryContainer 
                  : colors.surfaceVariant,
                borderColor: colors.outline,
              }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <MaterialCommunityIcons
              name={category.icon as any}
              size={16}
              color={selectedCategory === category.id ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.categoryText,
                {
                  color: selectedCategory === category.id ? colors.primary : colors.onSurfaceVariant,
                }
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Рендер кнопок выбранной категории
  const renderCategoryButtons = () => {
    const categoryButtons = toolbarButtons.filter(b => b.category === selectedCategory);
    
    return (
      <View style={styles.categoryButtonsContainer}>
        {categoryButtons.map(button => (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.categoryButton,
              {
                backgroundColor: getButtonBackground(button),
                borderColor: colors.outline,
                minWidth: 80,
              }
            ]}
            onPress={() => handleButtonPress(button)}
          >
            <MaterialCommunityIcons
              name={button.icon as any}
              size={18}
              color={getButtonColor(button)}
            />
            <Text
              style={[
                styles.buttonText,
                { color: getButtonColor(button) }
              ]}
            >
              {button.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Surface style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Быстрые кнопки */}
      {renderQuickButtons()}
      
      {/* Развернутая панель */}
      {expandedSections.has('all') && (
        <View style={styles.expandedContainer}>
          {renderCategories()}
          {renderCategoryButtons()}
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quickButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  quickButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  expandedContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  categoryText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  categoryButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  buttonText: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export { ModernToolbar };
export default ModernToolbar;