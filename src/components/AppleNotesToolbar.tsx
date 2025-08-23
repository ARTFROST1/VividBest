import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  Animated,
} from 'react-native';
import { Surface, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AppleNotesToolbarProps {
  onFormat: (action: string, value?: any) => void;
  onImagePicker: () => void;
  onAudioPicker: () => void;
  visible: boolean;
  selectedFormats: Set<string>;
}

interface ToolbarSection {
  id: string;
  title: string;
  buttons: ToolbarButton[];
}

interface ToolbarButton {
  id: string;
  icon: string;
  action: string;
  title: string;
  value?: any;
}

// Секции панели инструментов в стиле Apple Notes
const toolbarSections: ToolbarSection[] = [
  {
    id: 'styles',
    title: 'Стили',
    buttons: [
      { id: 'title', icon: 'format-size', action: 'title', title: 'Заголовок' },
      { id: 'heading', icon: 'format-header-1', action: 'heading', title: 'Подзаголовок' },
      { id: 'body', icon: 'format-text', action: 'body', title: 'Основной текст' },
      { id: 'monospace', icon: 'code-tags', action: 'monospace', title: 'Моноширинный' },
    ],
  },
  {
    id: 'formatting',
    title: 'Форматирование',
    buttons: [
      { id: 'bold', icon: 'format-bold', action: 'bold', title: 'Жирный' },
      { id: 'italic', icon: 'format-italic', action: 'italic', title: 'Курсив' },
      { id: 'underline', icon: 'format-underline', action: 'underline', title: 'Подчеркнутый' },
      { id: 'strikethrough', icon: 'format-strikethrough', action: 'strikethrough', title: 'Зачеркнутый' },
    ],
  },
  {
    id: 'lists',
    title: 'Списки',
    buttons: [
      { id: 'bulletList', icon: 'format-list-bulleted', action: 'bulletList', title: 'Маркированный список' },
      { id: 'numberList', icon: 'format-list-numbered', action: 'numberList', title: 'Нумерованный список' },
      { id: 'checklist', icon: 'checkbox-marked-outline', action: 'checklist', title: 'Список задач' },
      { id: 'dashed', icon: 'minus', action: 'dashedList', title: 'Список с тире' },
    ],
  },
  {
    id: 'insert',
    title: 'Вставка',
    buttons: [
      { id: 'table', icon: 'table', action: 'table', title: 'Таблица' },
      { id: 'camera', icon: 'camera', action: 'camera', title: 'Камера' },
      { id: 'photo', icon: 'image', action: 'photo', title: 'Фото' },
      { id: 'audio', icon: 'microphone', action: 'audio', title: 'Аудио' },
      { id: 'link', icon: 'link', action: 'link', title: 'Ссылка' },
      { id: 'location', icon: 'map-marker', action: 'location', title: 'Местоположение' },
    ],
  },
];

// Быстрые кнопки форматирования (всегда видимые)
const quickButtons: ToolbarButton[] = [
  { id: 'undo', icon: 'undo', action: 'undo', title: 'Отменить' },
  { id: 'redo', icon: 'redo', action: 'redo', title: 'Повторить' },
  { id: 'bulletedList', icon: 'format-list-bulleted-type', action: 'bulletedList', title: 'Список' },
  { id: 'bold', icon: 'format-bold', action: 'bold', title: 'Жирный' },
  { id: 'italic', icon: 'format-italic', action: 'italic', title: 'Курсив' },
  { id: 'underline', icon: 'format-underline', action: 'underline', title: 'Подчеркнутый' },
  { id: 'strikethrough', icon: 'format-strikethrough', action: 'strikethrough', title: 'Зачеркнутый' },
  { id: 'align', icon: 'format-align-left', action: 'align', title: 'Выравнивание' },
  { id: 'quote', icon: 'format-quote-close', action: 'blockquote', title: 'Цитата' },
];

export const AppleNotesToolbar: React.FC<AppleNotesToolbarProps> = ({
  onFormat,
  onImagePicker,
  onAudioPicker,
  visible,
  selectedFormats,
}) => {
  const { colors } = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showQuickBar, setShowQuickBar] = useState(true);

  if (!visible) return null;

  const handleButtonPress = (button: ToolbarButton) => {
    switch (button.action) {
      case 'photo':
      case 'camera':
        onImagePicker();
        break;
      case 'audio':
        onAudioPicker();
        break;
      case 'align':
        // Cycle through alignment options
        const alignments = ['left', 'center', 'right', 'justify'];
        const currentAlign = button.value || 'left';
        const nextAlign = alignments[(alignments.indexOf(currentAlign) + 1) % alignments.length];
        onFormat('align', nextAlign);
        break;
      case 'location':
        // Insert location placeholder
        onFormat('insertText', '[📍 Местоположение]');
        break;
      default:
        onFormat(button.action, button.value);
        break;
    }
  };

  const isButtonSelected = (buttonId: string) => {
    return selectedFormats.has(buttonId);
  };

  const renderQuickButton = (button: ToolbarButton) => (
    <TouchableOpacity
      key={button.id}
      style={[
        styles.quickButton,
        {
          backgroundColor: isButtonSelected(button.id)
            ? colors.primary + '20'
            : 'transparent',
        },
      ]}
      onPress={() => handleButtonPress(button)}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={button.icon as any}
        size={18}
        color={isButtonSelected(button.id) ? colors.primary : colors.onSurface}
      />
    </TouchableOpacity>
  );

  const renderSectionButton = (button: ToolbarButton) => (
    <TouchableOpacity
      key={button.id}
      style={[
        styles.sectionButton,
        {
          backgroundColor: isButtonSelected(button.id)
            ? colors.primary + '15'
            : colors.surface,
          borderColor: colors.outline + '30',
        },
      ]}
      onPress={() => handleButtonPress(button)}
      activeOpacity={0.8}
    >
      <View style={styles.sectionButtonContent}>
        <MaterialCommunityIcons
          name={button.icon as any}
          size={22}
          color={isButtonSelected(button.id) ? colors.primary : colors.onSurface}
        />
        <Text
          style={[
            styles.sectionButtonText,
            {
              color: isButtonSelected(button.id) ? colors.primary : colors.onSurface,
            },
          ]}
        >
          {button.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section: ToolbarSection) => (
    <View key={section.id} style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() =>
          setExpandedSection(expandedSection === section.id ? null : section.id)
        }
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          {section.title}
        </Text>
        <MaterialCommunityIcons
          name={
            expandedSection === section.id
              ? 'chevron-down'
              : 'chevron-right'
          }
          size={20}
          color={colors.onSurface}
        />
      </TouchableOpacity>

      {expandedSection === section.id && (
        <View style={styles.sectionContent}>
          {section.buttons.map(renderSectionButton)}
        </View>
      )}
    </View>
  );

  return (
    <Surface style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Быстрая панель */}
      {showQuickBar && (
        <View style={styles.quickBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickBarContent}
          >
            {quickButtons.map(renderQuickButton)}
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.expandButton, { backgroundColor: colors.primary + '15' }]}
            onPress={() => setShowQuickBar(false)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Расширенная панель */}
      {!showQuickBar && (
        <View style={styles.expandedBar}>
          <View style={styles.expandedHeader}>
            <TouchableOpacity
              style={[styles.collapseButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => setShowQuickBar(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.expandedTitle, { color: colors.onSurface }]}>
              Форматирование
            </Text>
          </View>

          <ScrollView style={styles.sectionsContainer}>
            {toolbarSections.map(renderSection)}
          </ScrollView>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  quickBarContent: {
    alignItems: 'center',
    paddingRight: 8,
  },
  quickButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  expandedBar: {
    maxHeight: 300,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionsContainer: {
    maxHeight: 250,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#00000005',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  sectionButtonContent: {
    alignItems: 'center',
  },
  sectionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AppleNotesToolbar;