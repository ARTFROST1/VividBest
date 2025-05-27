import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput as RNTextInput, Platform } from 'react-native';
import { Text, Button, useTheme, TextInput, HelperText } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [notifGranted, setNotifGranted] = useState(false);
  const [fsGranted, setFsGranted] = useState(Platform.OS === 'web');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const notifStatus = await Notifications.requestPermissionsAsync();
        setNotifGranted(notifStatus.status === 'granted');
        if (Platform.OS !== 'web') {
          setFsGranted(true);
        }
      } catch (e) {
        setNotifGranted(false);
        setFsGranted(false);
      }
      setLoading(false);
    };
    requestPermissions();
  }, []);

  const canStart = notifGranted && fsGranted;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Text variant="headlineLarge" style={styles.title}>{t('welcome')}</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        {t('welcome_subtitle', 'Ваше пространство для заметок, задач и напоминаний с поддержкой ИИ и Markdown.')}
      </Text>
      <Button mode="contained" onPress={onStart} disabled={loading} style={styles.button} loading={loading}>
        {t('start', 'Начать')}
      </Button>
      {!canStart && !loading && (
        <Text style={{ marginTop: 16, color: theme.colors.error }}>
          {t('permissions_required', 'Необходимо разрешить доступ к уведомлениям и хранилищу для продолжения.')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
    color: '#888',
  },
  button: {
    minWidth: 180,
    marginTop: 16,
  },
  buttonSmall: {
    minWidth: 140,
    marginTop: 8,
  },
});

export default WelcomeScreen; 