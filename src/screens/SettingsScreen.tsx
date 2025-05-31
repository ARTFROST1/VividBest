import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  MainTabs: undefined;
  NoteEditor: undefined;
  NotificationsSettings: undefined;
  EditorSettings: undefined;
};
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, Switch, RadioButton, List, Divider, Button, useTheme, Card, Dialog, Portal } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeToggle } from '../context/ThemeToggleContext';
import { useTranslation } from 'react-i18next';
import i18n from '../locales/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import notesEventBus from '../utils/notesEventBus';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark, toggleTheme } = useThemeToggle();
  const { t } = useTranslation();
  const { colors, roundness } = useTheme();
  const c = colors as any;
  
  // Define styles inside the component to access the theme colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingBottom: 32,
    },
    header: {
      marginTop: 16,
      marginBottom: 20,
      textAlign: 'center',
      fontSize: 30,
      fontWeight: 'bold',
    },
    section: {
      marginBottom: 20,
      borderRadius: 12,
      backgroundColor: c.surface,
      overflow: 'hidden',
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.placeholder,
      marginLeft: 20,
      marginBottom: 8,
      marginTop: 16,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: c.divider,
    },
    sectionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemText: {
      fontSize: 16,
      fontWeight: '400',
    },
    valueText: {
      fontSize: 16,
      color: c.placeholder,
      marginRight: 8,
    },
    subtitleText: {
      fontSize: 12,
      color: c.placeholder,
      marginTop: 2,
    },
    divider: {
      height: 0.5,
      backgroundColor: c.divider,
      marginLeft: 16,
    },
    iosSwitch: {
      transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    timePickerButton: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: c.background,
    },
    timeText: {
      fontSize: 16,
      color: c.primary,
      fontWeight: '500',
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
    userInfo: {
      padding: 16,
      alignItems: 'center',
    },
    userEmail: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    userName: {
      fontSize: 14,
      opacity: 0.7,
    },
    logoutButton: {
      marginHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    logoutButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '500',
    },
    loginButton: {
      marginHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 8,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '500',
    },
    resetButton: {
      marginHorizontal: 16,
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    dialogButton: {
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    premiumRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    premiumText: {
      fontSize: 16,
      fontWeight: '600',
    },
    unlockText: {
      fontSize: 14,
      color: c.placeholder,
      marginRight: 8,
    },
    chevronContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    languageSelector: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    languageButton: {
      padding: 6,
      borderRadius: 8,
      marginRight: 8,
      backgroundColor: c.background,
    },
    languageButtonActive: {
      backgroundColor: c.primary,
    },
    languageText: {
      fontSize: 14,
      color: c.placeholder,
    },
    languageTextActive: {
      fontWeight: 'bold',
      color: "#FFF",
    },
  });
  const [language, setLanguage] = useState<'ru' | 'en'>(
    (i18n.language === 'ru' || i18n.language === 'en') ? i18n.language : 'en'
  );
  const [sortOrder, setSortOrder] = useState<'date' | 'priority' | 'alpha'>('date');
  // Уведомления
  const [notificationsSound, setNotificationsSound] = useState(true);
  const [notificationsImportantOnly, setNotificationsImportantOnly] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  const [showDndStartPicker, setShowDndStartPicker] = useState(false);
  const [showDndEndPicker, setShowDndEndPicker] = useState(false);
  // Редактор
  const [autosave, setAutosave] = useState(true);
  const [font, setFont] = useState<'system' | 'monospace' | 'serif'>('system');
  const [fontSize, setFontSize] = useState(16);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const { logout, setIsAuth } = useAuth();
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);

  useEffect(() => {
    // Загрузка настроек при запуске
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('userSettings');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.language) {
            setLanguage(s.language);
            i18n.changeLanguage(s.language);
          }
          if (s.sortOrder) setSortOrder(s.sortOrder);
          if (s.notificationsSound !== undefined) setNotificationsSound(s.notificationsSound);
          if (s.notificationsImportantOnly !== undefined) setNotificationsImportantOnly(s.notificationsImportantOnly);
          if (s.dndStart) setDndStart(s.dndStart);
          if (s.dndEnd) setDndEnd(s.dndEnd);
          if (s.autosave !== undefined) setAutosave(s.autosave);
          if (s.font) setFont(s.font);
          if (s.fontSize) setFontSize(s.fontSize);
          if (s.showLineNumbers !== undefined) setShowLineNumbers(s.showLineNumbers);
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    // Сохраняем настройки при изменении
    const settings = {
      language,
      sortOrder,
      notificationsSound,
      notificationsImportantOnly,
      dndStart,
      dndEnd,
      autosave,
      font,
      fontSize,
      showLineNumbers,
    };
    AsyncStorage.setItem('userSettings', JSON.stringify(settings));
  }, [language, sortOrder, notificationsSound, notificationsImportantOnly, dndStart, dndEnd, autosave, font, fontSize, showLineNumbers]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // First try to get the current session
        const { data: sessionData } = await supabase.auth.getSession();
        
        // If we have a session, use it to get the user
        if (sessionData?.session) {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            console.log('User found:', data.user.email);
            setUser({
              email: data.user.email || '',
              name: data.user.user_metadata?.name || '',
            });
          }
        } else {
          console.log('No active session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      }
    };

    fetchUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        console.log('Auth state changed, user:', session.user.email);
        setUser({
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
        });
      } else {
        console.log('Auth state changed, no user');
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleResetAll = async () => {
    await AsyncStorage.removeItem('notes');
    await AsyncStorage.removeItem('lastFolder');
    notesEventBus.emit('reset');
    setResetDialogVisible(false);
  };

  const handleDndStartChange = (event: any, selectedTime?: Date) => {
    setShowDndStartPicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setDndStart(`${hours}:${minutes}`);
    }
  };

  const handleDndEndChange = (event: any, selectedTime?: Date) => {
    setShowDndEndPicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setDndEnd(`${hours}:${minutes}`);
    }
  };

  // Helper function to convert time string to Date object
  const timeStringToDate = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? c.background : c.background }]}>
      <Text style={[styles.header, { color: c.text }]}>{t('settings', 'Настройки')}</Text>
      
      {/* General Section */}
      <Text style={styles.sectionTitle}>{t('general', 'Общий')}</Text>
      <View style={styles.section}>
        <View style={styles.sectionItem}>
          <View style={styles.rowLeft}>
            <Ionicons name="notifications" size={22} color="#8a44da" style={{ marginRight: 12 }} />
            <Text style={[styles.itemText, { color: c.text }]}>
              {t('notifications', 'Уведомления')}
            </Text>
          </View>
          <Switch
            value={notificationsSound}
            onValueChange={setNotificationsSound}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor={'#ffffff'}
            ios_backgroundColor={c.border}
            style={styles.iosSwitch}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.sectionItem}>
          <View style={styles.rowLeft}>
            <Ionicons name="globe" size={22} color={c.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.itemText, { color: c.text }]}>
              {t('language', 'Язык')}
            </Text>
          </View>
          <View style={styles.languageSelector}>
            <TouchableOpacity 
              style={[styles.languageButton, language === 'ru' ? styles.languageButtonActive : null]}
              onPress={() => {
                setLanguage('ru');
                i18n.changeLanguage('ru');
              }}
            >
              <Text style={[styles.languageText, language === 'ru' ? styles.languageTextActive : null]}>Русский</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.languageButton, language === 'en' ? styles.languageButtonActive : null]}
              onPress={() => {
                setLanguage('en');
                i18n.changeLanguage('en');
              }}
            >
              <Text style={[styles.languageText, language === 'en' ? styles.languageTextActive : null]}>English</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.sectionItem}
          onPress={() => navigation.navigate('EditorSettings')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="create" size={22} color={c.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.itemText, { color: c.text }]}>
              {t('editor_settings', 'Настройки редактора')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
        </TouchableOpacity>
        
      </View>
      
      {/* App Section */}
      <Text style={styles.sectionTitle}>{t('application', 'Приложение')}</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionItem}>
          <View style={styles.rowLeft}>
            <Ionicons name="heart" size={22} color={c.error} style={{ marginRight: 12 }} />
            <View>
              <Text style={[styles.itemText, { color: c.text }]}>
                {t('rate_vivid', 'Оценить Vivid')}
              </Text>
              <Text style={styles.subtitleText}>
                {t('thanks_for_support', 'Спасибо вам за поддержку!')}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.placeholder} />
        </TouchableOpacity>
      </View>
      
      {/* Theme Toggle Section */}
      <View style={styles.section}>
        <View style={styles.sectionItem}>
          <Text style={[styles.itemText, { color: c.text }]}>
            {t('dark_theme', 'Темная тема')}
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor={'#ffffff'}
            ios_backgroundColor={c.border}
            style={styles.iosSwitch}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('application', 'Аккаунт')}</Text>
      {/* Account Section */}
      <View style={[styles.section, Platform.select({
        web: { marginBottom: 40 },
        ios: { marginBottom: 24 },
        android: { marginBottom: 20 }
      })]}>
        {user?.email ? (
          // User is logged in - show account info
          <>
            <View style={[styles.userInfo, Platform.select({
              web: { paddingVertical: 20 },
              ios: { paddingVertical: 16 },
              android: { paddingVertical: 12 }
            })]}>
              <Text style={[styles.userEmail, { color: c.text }]}>{user.email}</Text>
              {user.name && <Text style={[styles.userName, { color: c.text }]}>{user.name}</Text>}
            </View>
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: c.error }]}
              onPress={logout}
            >
              <Text style={[styles.logoutButtonText, Platform.select({
                web: { fontSize: 16 },
                ios: { fontSize: 15 },
                android: { fontSize: 14 }
              })]}>
                {t('logout', 'Выйти из аккаунта')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.resetButton, 
                { borderColor: c.error },
                Platform.select({
                  web: { marginTop: 12, marginBottom: 16 },
                  ios: { marginTop: 8, marginBottom: 12 },
                  android: { marginTop: 6, marginBottom: 10 }
                })
              ]}
              onPress={() => setResetDialogVisible(true)}
            >
              <Text style={[{ color: c.error }, Platform.select({
                web: { fontSize: 15 },
                ios: { fontSize: 14 },
                android: { fontSize: 13 }
              })]}>
                {t('reset_all', 'Сбросить всё')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // User is not logged in - show login button
          <>
            <View style={[styles.userInfo, Platform.select({
              web: { paddingVertical: 16 },
              ios: { paddingVertical: 12 },
              android: { paddingVertical: 10 }
            })]}>
              <Text style={[{ color: c.placeholder, textAlign: 'center', marginBottom: 16 }]}>
                {t('login_required', 'Необходимо войти в аккаунт')}
              </Text>
              
              <TouchableOpacity 
                style={[styles.loginButton, { backgroundColor: c.primary }]}
                onPress={async () => {
                  try {
                    // Sign out current session (if any) and force auth screen to show
                    await supabase.auth.signOut();
                    await AsyncStorage.removeItem('supabaseSession');
                    // Update auth context to trigger the auth screen
                    setIsAuth(false);
                  } catch (error) {
                    console.error('Error during logout:', error);
                  }
                }}
              >
                <Text style={[styles.loginButtonText, Platform.select({
                  web: { fontSize: 16 },
                  ios: { fontSize: 15 },
                  android: { fontSize: 14 }
                })]}>
                  {t('login', 'Войти в аккаунт')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      
      <Portal>
        <Dialog 
          visible={resetDialogVisible} 
          onDismiss={() => setResetDialogVisible(false)} 
          style={{ borderRadius: 14, backgroundColor: c.surface }}
        >
          <Dialog.Title style={{ color: c.text, textAlign: 'center' }}>
            {t('confirm_reset', 'Подтвердите сброс')}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: c.text, textAlign: 'center' }}>
              {t('reset_all_confirm', 'Вы уверены, что хотите удалить все заметки и папки? Это действие необратимо.')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-around' }}>
            <Button 
              onPress={() => setResetDialogVisible(false)} 
              textColor={c.primary}
              style={styles.dialogButton}
            >
              {t('cancel', 'Отмена')}
            </Button>
            <Button 
              onPress={handleResetAll} 
              textColor="#FF3B30"
              style={styles.dialogButton}
            >
              {t('reset', 'Сбросить')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};



export default SettingsScreen;