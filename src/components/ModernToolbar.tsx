import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { Surface, IconButton, useTheme, Text } from 'react-native-paper';

interface AppleNotesToolbarProps {
  onFormat: (action: string, value?: any) => void;
  onImagePicker: () => void;
  visible: boolean;
  isDarkMode: boolean;
  selectedFormats: Set<string>;
}

interface ToolbarButton {
  id: string;
  icon: string;
  action: string;
  value?: any;
  category: 'title' | 'format' | 'list' | 'insert';
}

// Минималистичные кнопки в стиле Apple Notes
const toolbarButtons: ToolbarButton[] = [
  // Title styles - первая секция
  { id: 'title', icon: 'format-header-1', action: 'title', category: 'title' },
  { id: 'heading', icon: 'format-header-2', action: 'heading', category: 'title' },
  { id: 'subheading', icon: 'format-header-3', action: 'subheading', category: 'title' },
  
  // Text formatting - вторая секция
  { id: 'bold', icon: 'format-bold', action: 'bold', category: 'format' },
  { id: 'italic', icon: 'format-italic', action: 'italic', category: 'format' },
  { id: 'underline', icon: 'format-underline', action: 'underline', category: 'format' },
  { id: 'strikethrough', icon: 'format-strikethrough', action: 'strikethrough', category: 'format' },
  
  // Lists - третья секция
  { id: 'bulletList', icon: 'format-list-bulleted', action: 'bulletList', category: 'list' },
  { id: 'numberList', icon: 'format-list-numbered', action: 'numberList', category: 'list' },
  { id: 'checklist', icon: 'checkbox-marked-outline', action: 'checklist', category: 'list' },
  { id: 'dashed', icon: 'minus', action: 'dashedList', category: 'list' },
  { id: 'indent', icon: 'format-indent-increase', action: 'indent', category: 'list' },
  
  // Insert - четвертая секция  
  { id: 'table', icon: 'table', action: 'table', category: 'insert' },
  { id: 'camera', icon: 'camera', action: 'camera', category: 'insert' },
  { id: 'image', icon: 'image', action: 'image', category: 'insert' },
  { id: 'scan', icon: 'qrcode-scan', action: 'scan', category: 'insert' },
  { id: 'draw', icon: 'draw', action: 'draw', category: 'insert' },
];

export const AppleNotesToolbar: React.FC<AppleNotesToolbarProps> = ({
  onFormat,
  onImagePicker,
  visible,
  isDarkMode,
  selectedFormats,
}) => {
  const { colors } = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!visible) return null;

  const handleButtonPress = (button: ToolbarButton) => {
    if (button.action === 'image' || button.action === 'camera') {
      onImagePicker();
      return;
    }

    // Expand section if needed
    if (button.category !== 'format' && expandedSection !== button.category) {
      setExpandedSection(button.category);
      return;
    }

    onFormat(button.action, button.value);
  };

  const getButtonColor = (button: ToolbarButton) => {
    if (selectedFormats.has(button.id)) {
      return '#F7B801'; // Apple orange/yellow accent
    }
    return isDarkMode ? '#FFFFFF' : '#000000';
  };

  const getButtonBackground = (button: ToolbarButton) => {
    if (selectedFormats.has(button.id)) {
      return '#F7B801' + '20'; // Semi-transparent background
    }
    return 'transparent';
  };

  const renderSection = (category: string, buttons: ToolbarButton[], showAll: boolean = false) => {
    const sectionButtons = showAll ? buttons : buttons.slice(0, 4);
    
    return (
      <View style={styles.section}>
        {sectionButtons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.toolButton,
              {
                backgroundColor: getButtonBackground(button),
              }
            ]}
            onPress={() => handleButtonPress(button)}
            activeOpacity={0.6}
          >
            <IconButton
              icon={button.icon}
              size={24}
              iconColor={getButtonColor(button)}
              style={styles.iconButton}
            />
          </TouchableOpacity>
        ))}
        
        {!showAll && buttons.length > 4 && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setExpandedSection(category)}
            activeOpacity={0.6}
          >
            <IconButton
              icon="chevron-right"
              size={20}
              iconColor={isDarkMode ? '#8E8E93' : '#8E8E93'}
              style={styles.iconButton}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const titleButtons = toolbarButtons.filter(b => b.category === 'title');
  const formatButtons = toolbarButtons.filter(b => b.category === 'format');
  const listButtons = toolbarButtons.filter(b => b.category === 'list');
  const insertButtons = toolbarButtons.filter(b => b.category === 'insert');

  return (
    <Surface style={[
      styles.container,
      {
        backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7',
        borderTopColor: isDarkMode ? '#38383A' : '#C6C6C8',
      }
    ]}>
      {expandedSection ? (
        // Expanded view для конкретной секции
        <View style={styles.expandedContainer}>
          <View style={styles.expandedHeader}>
            <TouchableOpacity
              onPress={() => setExpandedSection(null)}
              style={styles.backButton}
            >
              <IconButton
                icon="chevron-left"
                size={24}
                iconColor={isDarkMode ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              {expandedSection === 'title' && 'Стили текста'}
              {expandedSection === 'list' && 'Списки'}
              {expandedSection === 'insert' && 'Вставка'}
            </Text>
            <TouchableOpacity
              onPress={() => setExpandedSection(null)}
              style={styles.doneButton}
            >
              <Text style={[styles.doneText, { color: '#F7B801' }]}>Готово</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.expandedContent}
          >
            {expandedSection === 'title' && renderSection('title', titleButtons, true)}
            {expandedSection === 'list' && renderSection('list', listButtons, true)}
            {expandedSection === 'insert' && renderSection('insert', insertButtons, true)}
          </ScrollView>
        </View>
      ) : (
        // Compact view - основная панель как в Apple Notes
        <View style={styles.compactContainer}>
          {/* Title section - желтая кнопка Title */}
          <TouchableOpacity
            style={[
              styles.titlePill,
              {
                backgroundColor: selectedFormats.has('title') ? '#F7B801' : (isDarkMode ? '#2C2C2E' : '#E5E5EA'),
              }
            ]}
            onPress={() => onFormat('title')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.titlePillText,
              {
                color: selectedFormats.has('title') ? '#FFFFFF' : (isDarkMode ? '#FFFFFF' : '#000000'),
                fontWeight: selectedFormats.has('title') ? '700' : '600',
              }
            ]}>
              Title
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.headingButton,
              {
                backgroundColor: selectedFormats.has('heading') ? '#F7B801' + '20' : 'transparent',
              }
            ]}
            onPress={() => onFormat('heading')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.headingText,
              {
                color: selectedFormats.has('heading') ? '#F7B801' : (isDarkMode ? '#FFFFFF' : '#000000'),
                fontWeight: selectedFormats.has('heading') ? '600' : '400',
              }
            ]}>
              Heading
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.headingButton,
              {
                backgroundColor: selectedFormats.has('subheading') ? '#F7B801' + '20' : 'transparent',
              }
            ]}
            onPress={() => onFormat('subheading')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.subheadingText,
              {
                color: selectedFormats.has('subheading') ? '#F7B801' : (isDarkMode ? '#FFFFFF' : '#000000'),
                fontWeight: selectedFormats.has('subheading') ? '600' : '400',
              }
            ]}>
              Subheading
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: isDarkMode ? '#38383A' : '#C6C6C8' }]} />

          {/* Format buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.buttonsScroll}
          >
            {renderSection('format', formatButtons)}
            {renderSection('list', listButtons)}
            {renderSection('insert', insertButtons)}
          </ScrollView>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titlePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 12,
  },
  titlePillText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headingButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  headingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  subheadingText: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    width: 1,
    height: 32,
    marginHorizontal: 12,
  },
  buttonsScroll: {
    flex: 1,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  iconButton: {
    margin: 0,
    width: 24,
    height: 24,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  expandedContainer: {
    minHeight: 120,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#38383A',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandedContent: {
    paddingHorizontal: 8,
  },
});

// Export the old ModernToolbar for backward compatibility
export const ModernToolbar = AppleNotesToolbar;