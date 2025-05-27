import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Switch, RadioButton, List, Divider, Button, useTheme, Card } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeToggle } from '../context/ThemeToggleContext';
import { useTranslation } from 'react-i18next';
import i18n from '../locales/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const { isDark, toggleTheme } = useThemeToggle();
  const { t } = useTranslation();
  const { colors, roundness } = useTheme();
  const c = colors as any;
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

  // TODO: интеграция с глобальным состоянием темы и языка

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: c.text }]}>{t('settings')}</Text>
      <Card style={[styles.card, { backgroundColor: colors.surface, borderRadius: roundness }]}>
        <List.Section>
          <List.Subheader style={[styles.subheader, { color: c.text }]}>{t('theme')}</List.Subheader>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('dark')}</Text>
            <Switch value={isDark} onValueChange={toggleTheme} color={colors.primary} />
          </View>
        </List.Section>
        <Divider style={[styles.divider, { backgroundColor: c.divider }]} />
        <List.Section>
          <List.Subheader style={[styles.subheader, { color: c.text }]}>{t('language')}</List.Subheader>
          <RadioButton.Group onValueChange={v => {
            setLanguage(v as 'ru' | 'en');
            i18n.changeLanguage(v);
          }} value={language}>
            <View style={styles.row}>
              <RadioButton value="ru" color={colors.primary} />
              <Text style={[styles.label, { color: c.text }]}>Русский</Text>
            </View>
            <View style={styles.row}>
              <RadioButton value="en" color={colors.primary} />
              <Text style={[styles.label, { color: c.text }]}>English</Text>
            </View>
          </RadioButton.Group>
        </List.Section>
        <Divider style={[styles.divider, { backgroundColor: c.divider }]} />
        <List.Section>
          <List.Subheader style={[styles.subheader, { color: c.text }]}>{t('sort_order', 'Порядок задач')}</List.Subheader>
          <RadioButton.Group onValueChange={v => setSortOrder(v as 'date' | 'priority' | 'alpha')} value={sortOrder}>
            <View style={styles.row}>
              <RadioButton value="date" color={colors.primary} />
              <Text style={[styles.label, { color: c.text }]}>{t('sort_by_date', 'По дате')}</Text>
            </View>
            <View style={styles.row}>
              <RadioButton value="priority" color={colors.primary} />
              <Text style={[styles.label, { color: c.text }]}>{t('sort_by_priority', 'По приоритету')}</Text>
            </View>
            <View style={styles.row}>
              <RadioButton value="alpha" color={colors.primary} />
              <Text style={[styles.label, { color: c.text }]}>{t('sort_by_alpha', 'По алфавиту')}</Text>
            </View>
          </RadioButton.Group>
        </List.Section>
        <Divider style={[styles.divider, { backgroundColor: c.divider }]} />
        <List.Section>
          <List.Subheader style={[styles.subheader, { color: c.text }]}>{t('notifications', 'Уведомления')}</List.Subheader>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('sound', 'Звук')}</Text>
            <Switch value={notificationsSound} onValueChange={setNotificationsSound} color={colors.primary} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('important_only', 'Только важные')}</Text>
            <Switch value={notificationsImportantOnly} onValueChange={setNotificationsImportantOnly} color={colors.primary} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('dnd', 'Не беспокоить')}</Text>
            <Button mode="outlined" onPress={() => setShowDndStartPicker(true)} style={styles.timeButton} textColor={colors.primary}>{dndStart}</Button>
            <Text style={{ marginHorizontal: 4, color: c.text }}>–</Text>
            <Button mode="outlined" onPress={() => setShowDndEndPicker(true)} style={styles.timeButton} textColor={colors.primary}>{dndEnd}</Button>
          </View>
          {showDndStartPicker && (
            <DateTimePicker
              value={new Date(`1970-01-01T${dndStart}:00`)}
              mode="time"
              is24Hour
              display="default"
              onChange={(e, date) => {
                setShowDndStartPicker(false);
                if (date) {
                  const h = date.getHours().toString().padStart(2, '0');
                  const m = date.getMinutes().toString().padStart(2, '0');
                  setDndStart(`${h}:${m}`);
                }
              }}
            />
          )}
          {showDndEndPicker && (
            <DateTimePicker
              value={new Date(`1970-01-01T${dndEnd}:00`)}
              mode="time"
              is24Hour
              display="default"
              onChange={(e, date) => {
                setShowDndEndPicker(false);
                if (date) {
                  const h = date.getHours().toString().padStart(2, '0');
                  const m = date.getMinutes().toString().padStart(2, '0');
                  setDndEnd(`${h}:${m}`);
                }
              }}
            />
          )}
        </List.Section>
        <Divider style={[styles.divider, { backgroundColor: c.divider }]} />
        <List.Section>
          <List.Subheader style={[styles.subheader, { color: c.text }]}>{t('editor', 'Редактор')}</List.Subheader>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('autosave', 'Автосохранение')}</Text>
            <Switch value={autosave} onValueChange={setAutosave} color={colors.primary} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('font', 'Шрифт')}</Text>
            <RadioButton.Group onValueChange={v => setFont(v as any)} value={font}>
              <View style={styles.fontRow}>
                <RadioButton value="system" color={colors.primary} />
                <Text style={[styles.label, { color: c.text }]}>{t('font_system', 'Системный')}</Text>
                <RadioButton value="monospace" color={colors.primary} />
                <Text style={[styles.label, { color: c.text }]}>{t('font_monospace', 'Моноширинный')}</Text>
                <RadioButton value="serif" color={colors.primary} />
                <Text style={[styles.label, { color: c.text }]}>{t('font_serif', 'С засечками')}</Text>
              </View>
            </RadioButton.Group>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('font_size', 'Размер шрифта')}</Text>
            <Button mode="outlined" onPress={() => setFontSize(s => Math.max(10, s - 1))} style={styles.sizeBtn} textColor={colors.primary}>-</Button>
            <Text style={{ marginHorizontal: 8, color: c.text }}>{fontSize}</Text>
            <Button mode="outlined" onPress={() => setFontSize(s => Math.min(32, s + 1))} style={styles.sizeBtn} textColor={colors.primary}>+</Button>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.text }]}>{t('line_numbers', 'Номера строк')}</Text>
            <Switch value={showLineNumbers} onValueChange={setShowLineNumbers} color={colors.primary} />
          </View>
        </List.Section>
      </Card>
      <Button mode="contained" style={[styles.button, { backgroundColor: colors.primary, borderRadius: roundness }]} textColor={colors.onPrimary} onPress={() => {}} disabled>
        {t('logout', 'Выйти из аккаунта')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 18,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  card: {
    padding: 0,
    marginBottom: 24,
    elevation: 2,
  },
  subheader: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
    marginTop: 10,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 4,
    height: 1,
  },
  button: {
    marginTop: 8,
    alignSelf: 'center',
    minWidth: 180,
    paddingVertical: 8,
    elevation: 2,
  },
  timeButton: {
    minWidth: 60,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0000',
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  sizeBtn: {
    minWidth: 36,
    borderRadius: 8,
    marginHorizontal: 0,
  },
});

export default SettingsScreen; 