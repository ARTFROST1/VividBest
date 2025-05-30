import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Switch, Divider, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const NotificationsSettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = colors as any;
  const isDark = c.surface === '#121212'; // Simple check for dark theme
  
  // Notifications settings
  const [notificationsSound, setNotificationsSound] = useState(true);
  const [notificationsImportantOnly, setNotificationsImportantOnly] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  const [showDndStartPicker, setShowDndStartPicker] = useState(false);
  const [showDndEndPicker, setShowDndEndPicker] = useState(false);

  useEffect(() => {
    // Load settings from AsyncStorage
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('userSettings');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.notificationsSound !== undefined) setNotificationsSound(s.notificationsSound);
          if (s.notificationsImportantOnly !== undefined) setNotificationsImportantOnly(s.notificationsImportantOnly);
          if (s.dndStart) setDndStart(s.dndStart);
          if (s.dndEnd) setDndEnd(s.dndEnd);
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
          notificationsSound,
          notificationsImportantOnly,
          dndStart,
          dndEnd,
        };
        
        await AsyncStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      } catch (e) { /* ignore */ }
    };
    
    saveSettings();
  }, [notificationsSound, notificationsImportantOnly, dndStart, dndEnd]);

  // Helper function to convert time string to Date object
  const timeStringToDate = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleDndStartChange = (event, selectedTime) => {
    setShowDndStartPicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setDndStart(`${hours}:${minutes}`);
    }
  };

  const handleDndEndChange = (event, selectedTime) => {
    setShowDndEndPicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setDndEnd(`${hours}:${minutes}`);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>{t('settings', 'Настройки')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>
          {t('notifications_settings', 'Настройки уведомлений')}
        </Text>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('sound', 'Звук')}
          </Text>
          <Switch
            value={notificationsSound}
            onValueChange={setNotificationsSound}
            trackColor={{ false: '#e9e9ea', true: '#8a44da' }}
            thumbColor={'#ffffff'}
            ios_backgroundColor="#e9e9ea"
            style={styles.iosSwitch}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('important_only', 'Только важные')}
          </Text>
          <Switch
            value={notificationsImportantOnly}
            onValueChange={setNotificationsImportantOnly}
            trackColor={{ false: '#e9e9ea', true: '#8a44da' }}
            thumbColor={'#ffffff'}
            ios_backgroundColor="#e9e9ea"
            style={styles.iosSwitch}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('dnd_start', 'Не беспокоить с')}
          </Text>
          <TouchableOpacity onPress={() => setShowDndStartPicker(true)} style={styles.timePickerButton}>
            <Text style={styles.timeText}>{dndStart}</Text>
            {showDndStartPicker && (
              <DateTimePicker
                value={timeStringToDate(dndStart)}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={handleDndStartChange}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            )}
          </TouchableOpacity>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('dnd_end', 'Не беспокоить до')}
          </Text>
          <TouchableOpacity onPress={() => setShowDndEndPicker(true)} style={styles.timePickerButton}>
            <Text style={styles.timeText}>{dndEnd}</Text>
            {showDndEndPicker && (
              <DateTimePicker
                value={timeStringToDate(dndEnd)}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={handleDndEndChange}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

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
    color: '#007AFF',
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
    backgroundColor: '#FFF',
    overflow: 'hidden',
    marginHorizontal: 16,
    shadowColor: '#000',
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
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  iosSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  timePickerButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
  },
  timeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default NotificationsSettingsScreen;