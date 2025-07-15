import React, { useEffect, useState } from 'react';
import BottomTabs from './BottomTabs';
import WelcomeScreen from '../screens/WelcomeScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';
import NotificationsSettingsScreen from '../screens/NotificationsSettingsScreen';
import EditorSettingsScreen from '../screens/EditorSettingsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from '../screens/AuthScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemedStatusBar } from '../components/ThemedStatusBar';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const [isAuth, setIsAuth] = useState<null | boolean>(null);

  useEffect(() => {
    const checkSession = async () => {
      // Проверяем наличие сессии в AsyncStorage
      const sessionStr = await AsyncStorage.getItem('supabaseSession');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          // Проверяем валидность токена (можно добавить проверку срока действия)
          supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          setIsAuth(true);
        } catch {
          setIsAuth(false);
        }
      } else {
        setIsAuth(false);
      }
    };
    checkSession();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('supabaseSession');
    setIsAuth(false);
  };

  if (isAuth === null) {
    // Лоадер на время проверки
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuth) {
    return <AuthScreen onAuthSuccess={() => setIsAuth(true)} />;
  }

  // Можно добавить WelcomeScreen, если нужно
  // return <WelcomeScreen onStart={() => setShowWelcome(false)} />;

  return (
    <>
      <ThemedStatusBar />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={BottomTabs} />
        <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
        <Stack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
        <Stack.Screen name="EditorSettings" component={EditorSettingsScreen} />
      </Stack.Navigator>
    </>
  );
};

export default RootNavigator; 