import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Switch, Divider, useTheme, RadioButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const EditorSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = colors as any;
  const isDark = c.surface === '#23232A'; // Check for dark theme based on your theme
  
  // Define styles inside the component to access the theme colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backText: {
      fontSize: 16,
      color: c.primary,
      marginLeft: 4,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    section: {
      marginBottom: 20,
      borderRadius: 12,
      backgroundColor: c.surface,
      overflow: 'hidden',
      marginHorizontal: 16,
      shadowColor: isDark ? '#000' : '#333',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    sectionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
    },
    itemText: {
      fontSize: 16,
      fontWeight: '400',
    },
    divider: {
      height: 0.5,
      backgroundColor: c.divider,
      marginLeft: 16,
    },
    iosSwitch: {
      transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    pickerContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
    radioRow: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    radioItem: {
      paddingVertical: 2,
      paddingHorizontal: 0,
    },
    fontSizeControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    fontSizeButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    fontSizeButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: c.primary,
    },
    fontSizeText: {
      marginHorizontal: 10,
      fontSize: 16,
    },
  });
  
  // Editor settings
  const [autosave, setAutosave] = useState(true);
  const [font, setFont] = useState<'system' | 'monospace' | 'serif'>('system');
  const [fontSize, setFontSize] = useState(16);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  useEffect(() => {
    // Load settings from AsyncStorage
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('userSettings');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.autosave !== undefined) setAutosave(s.autosave);
          if (s.font) setFont(s.font);
          if (s.fontSize) setFontSize(s.fontSize);
          if (s.showLineNumbers !== undefined) setShowLineNumbers(s.showLineNumbers);
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    // Save settings when changed
    const saveSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('userSettings');
        const settings = saved ? JSON.parse(saved) : {};
        
        const updatedSettings = {
          ...settings,
          autosave,
          font,
          fontSize,
          showLineNumbers,
        };
        
        await AsyncStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      } catch (e) { /* ignore */ }
    };
    
    saveSettings();
  }, [autosave, font, fontSize, showLineNumbers]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={c.primary} />
          <Text style={styles.backText}>{t('settings', 'Настройки')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>
          {t('editor_settings', 'Настройки редактора')}
        </Text>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('autosave', 'Автосохранение')}
          </Text>
          <Switch
            value={autosave}
            onValueChange={setAutosave}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor={'#ffffff'}
            ios_backgroundColor={c.border}
            style={styles.iosSwitch}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('font', 'Шрифт')}
          </Text>
          <View style={styles.pickerContainer}>
            <RadioButton.Group onValueChange={value => setFont(value as any)} value={font}>
              <View style={styles.radioRow}>
                <RadioButton.Item
                  label={t('font_system', 'Системный')}
                  value="system"
                  color={c.primary}
                  labelStyle={{ color: c.text }}
                  style={styles.radioItem}
                />
                <RadioButton.Item
                  label={t('font_monospace', 'Моноширинный')}
                  value="monospace"
                  color={c.primary}
                  labelStyle={{ color: c.text }}
                  style={styles.radioItem}
                />
                <RadioButton.Item
                  label={t('font_serif', 'С засечками')}
                  value="serif"
                  color={c.primary}
                  labelStyle={{ color: c.text }}
                  style={styles.radioItem}
                />
              </View>
            </RadioButton.Group>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('font_size', 'Размер шрифта')}
          </Text>
          <View style={styles.fontSizeControls}>
            <TouchableOpacity
              style={styles.fontSizeButton}
              onPress={() => setFontSize(s => Math.max(10, s - 1))}
            >
              <Text style={styles.fontSizeButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.fontSizeText, { color: c.text }]}>{fontSize}</Text>
            <TouchableOpacity
              style={styles.fontSizeButton}
              onPress={() => setFontSize(s => Math.min(32, s + 1))}
            >
              <Text style={styles.fontSizeButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('line_numbers', 'Номера строк')}
          </Text>
          <Switch
            value={showLineNumbers}
            onValueChange={setShowLineNumbers}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor={'#ffffff'}
            ios_backgroundColor={c.border}
            style={styles.iosSwitch}
          />
        </View>
      </View>
    </ScrollView>
  );
};



export default EditorSettingsScreen;