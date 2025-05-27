import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Switch, RadioButton, List, Divider, Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeToggle } from '../context/ThemeToggleContext';

const SettingsScreen = () => {
  const { isDark, toggleTheme } = useThemeToggle();
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
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

  // TODO: интеграция с глобальным состоянием темы и языка

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.header}>Настройки</Text>
      <List.Section>
        <List.Subheader>Тема</List.Subheader>
        <View style={styles.row}>
          <Text>Тёмная тема</Text>
          <Switch value={isDark} onValueChange={toggleTheme} />
        </View>
      </List.Section>
      <Divider style={styles.divider} />
      <List.Section>
        <List.Subheader>Язык интерфейса</List.Subheader>
        <RadioButton.Group onValueChange={v => setLanguage(v as 'ru' | 'en')} value={language}>
          <View style={styles.row}>
            <RadioButton value="ru" />
            <Text>Русский</Text>
          </View>
          <View style={styles.row}>
            <RadioButton value="en" />
            <Text>English</Text>
          </View>
        </RadioButton.Group>
      </List.Section>
      <Divider style={styles.divider} />
      <List.Section>
        <List.Subheader>Порядок задач</List.Subheader>
        <RadioButton.Group onValueChange={v => setSortOrder(v as 'date' | 'priority' | 'alpha')} value={sortOrder}>
          <View style={styles.row}>
            <RadioButton value="date" />
            <Text>По дате</Text>
          </View>
          <View style={styles.row}>
            <RadioButton value="priority" />
            <Text>По приоритету</Text>
          </View>
          <View style={styles.row}>
            <RadioButton value="alpha" />
            <Text>По алфавиту</Text>
          </View>
        </RadioButton.Group>
      </List.Section>
      <Divider style={styles.divider} />
      <List.Section>
        <List.Subheader>Уведомления</List.Subheader>
        <View style={styles.row}>
          <Text>Звук</Text>
          <Switch value={notificationsSound} onValueChange={setNotificationsSound} />
        </View>
        <View style={styles.row}>
          <Text>Только важные</Text>
          <Switch value={notificationsImportantOnly} onValueChange={setNotificationsImportantOnly} />
        </View>
        <View style={styles.row}>
          <Text>Не беспокоить</Text>
          <Button mode="outlined" onPress={() => setShowDndStartPicker(true)} style={styles.timeButton}>{dndStart}</Button>
          <Text style={{ marginHorizontal: 4 }}>–</Text>
          <Button mode="outlined" onPress={() => setShowDndEndPicker(true)} style={styles.timeButton}>{dndEnd}</Button>
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
      <Divider style={styles.divider} />
      <List.Section>
        <List.Subheader>Редактор</List.Subheader>
        <View style={styles.row}>
          <Text>Автосохранение</Text>
          <Switch value={autosave} onValueChange={setAutosave} />
        </View>
        <View style={styles.row}>
          <Text>Шрифт</Text>
          <RadioButton.Group onValueChange={v => setFont(v as any)} value={font}>
            <View style={styles.fontRow}>
              <RadioButton value="system" />
              <Text>Системный</Text>
              <RadioButton value="monospace" />
              <Text>Моноширинный</Text>
              <RadioButton value="serif" />
              <Text>С засечками</Text>
            </View>
          </RadioButton.Group>
        </View>
        <View style={styles.row}>
          <Text>Размер шрифта</Text>
          <Button mode="outlined" onPress={() => setFontSize(s => Math.max(10, s - 1))}>-</Button>
          <Text style={{ marginHorizontal: 8 }}>{fontSize}</Text>
          <Button mode="outlined" onPress={() => setFontSize(s => Math.min(32, s + 1))}>+</Button>
        </View>
        <View style={styles.row}>
          <Text>Номера строк</Text>
          <Switch value={showLineNumbers} onValueChange={setShowLineNumbers} />
        </View>
      </List.Section>
      <Divider style={styles.divider} />
      <Button mode="outlined" style={styles.button} onPress={() => {}} disabled>
        Выйти из аккаунта
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  placeholder: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
  },
  button: {
    marginTop: 32,
    alignSelf: 'center',
  },
  timeButton: {
    minWidth: 60,
    marginHorizontal: 2,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

export default SettingsScreen; 