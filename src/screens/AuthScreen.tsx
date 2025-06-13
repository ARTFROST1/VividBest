import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Alert, Modal, Pressable, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const { colors, roundness } = useTheme();
  const windowWidth = Dimensions.get('window').width;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Состояния для восстановления пароля
  const [showReset, setShowReset] = useState(false); // Модалка для запроса email
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Состояния для смены пароля после перехода по ссылке
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPass1, setNewPass1] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowChangePass(true);
      }
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      let result;
      if (isRegister) {
        result = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) {
        Alert.alert('Ошибка', result.error.message);
      } else {
        const session = result.data.session;
        if (session) {
          await AsyncStorage.setItem('supabaseSession', JSON.stringify(session));
          onAuthSuccess();
        } else {
          Alert.alert('Проверьте почту', 'Подтвердите email для завершения регистрации.');
        }
      }
    } catch (e) {
      Alert.alert('Ошибка', 'Что-то пошло не так.');
    } finally {
      setLoading(false);
    }
  };

  // --- Восстановление пароля ---
  const handleResetRequest = async () => {
    setResetLoading(true);
    try {
      // redirectTo: deep link на ваше приложение (например, myapp://reset-password)
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) {
        Alert.alert('Ошибка', error.message);
      } else {
        setShowReset(false);
        Alert.alert('Письмо отправлено', 'Проверьте почту и перейдите по ссылке для смены пароля.');
      }
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось отправить письмо.');
    } finally {
      setResetLoading(false);
    }
  };

  // --- Смена пароля после перехода по ссылке ---
  const handleChangePassword = async () => {
    if (!newPass1 || !newPass2) {
      Alert.alert('Ошибка', 'Заполните оба поля.');
      return;
    }
    if (newPass1 !== newPass2) {
      Alert.alert('Ошибка', 'Пароли не совпадают.');
      return;
    }
    setChangePassLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPass1 });
      if (error) {
        Alert.alert('Ошибка', error.message);
        return;
      }
      setShowChangePass(false);
      setNewPass1('');
      setNewPass2('');
      Alert.alert('Успех', 'Пароль успешно изменён!');
      onAuthSuccess();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось обновить пароль.');
    } finally {
      setChangePassLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) {
        Alert.alert('Ошибка', error.message);
      }
      // После успешного входа supabase сам обработает редирект, сессия обновится
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось войти через Google.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback для placeholder и border
  const placeholderColor = colors.onSurfaceVariant || colors.outlineVariant || colors.outline;
  const borderColor = colors.outline;
  const textColor = colors.onBackground;
  const buttonTextColor = '#fff';

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      padding: 24,
    },
    formContainer: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 20,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 20,
      width: '100%',
    },
    logo: {
      width: 170,
      height: 170,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      marginBottom: 28,
      textAlign: 'center',
    },
    input: {
      width: 320,
      height: 52,
      borderRadius: roundness,
      paddingHorizontal: 18,
      fontSize: 16,
      marginBottom: 16,
      borderWidth: 0,
    },
    button: {
      width: 320,
      borderRadius: roundness,
      marginTop: 8,
      marginBottom: 18,
      elevation: 0,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    bottomText: {
      fontSize: 15,
    },
    linkText: {
      fontWeight: 'bold',
      fontSize: 15,
      marginLeft: 2,
    },
    forgotText: {
      fontSize: 15,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      maxWidth: 400,
      padding: 20,
      elevation: 4,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={themedStyles.formContainer}>
        <View style={themedStyles.logoContainer}>
          {/* Logo Image */}
          <Image 
            source={require('../assets/images/mainlogo.png')}
            style={themedStyles.logo}
          />
        </View>
        
        <Text style={[themedStyles.title, { color: textColor }]}>
          {isRegister ? 'Создать аккаунт' : 'Вход'}
        </Text>
        {isRegister && (
          <TextInput
            style={[themedStyles.input, { borderColor, backgroundColor: colors.surface, color: textColor, borderRadius: roundness }]}
            placeholder="Имя"
            placeholderTextColor={placeholderColor}
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={[themedStyles.input, { borderColor, backgroundColor: colors.surface, color: textColor, borderRadius: roundness }]}
          placeholder="Email"
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[themedStyles.input, { borderColor, backgroundColor: colors.surface, color: textColor, borderRadius: roundness }]}
          placeholder="Пароль"
          placeholderTextColor={placeholderColor}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <LinearGradient
          colors={['#7745dc', '#f34f8c']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={[
            themedStyles.button,
            { borderRadius: roundness, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <Pressable
            onPress={handleAuth}
            disabled={loading}
            style={{ width: '100%', height: 54, justifyContent: 'center', alignItems: 'center' }}
          >
            {loading ? (
              <ActivityIndicator color={buttonTextColor} />
            ) : (
              <Text style={{ color: buttonTextColor, fontWeight: 'bold', fontSize: 17 }}>
                {isRegister ? 'Зарегистрироваться' : 'Войти'}
              </Text>
            )}
          </Pressable>
        </LinearGradient>
        <View style={themedStyles.bottomRow}>
          <Text style={[themedStyles.bottomText, { color: placeholderColor }]}>
            {isRegister ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
          </Text>
          <Pressable onPress={() => setIsRegister(v => !v)} disabled={loading}>
            <Text style={[themedStyles.linkText, { color: colors.primary }]}>
              {isRegister ? 'Войти' : 'Зарегистрироваться'}
            </Text>
          </Pressable>
        </View>
        {!isRegister && (
          <Pressable onPress={() => setShowReset(true)} style={{ marginTop: 12 }}>
            <Text style={[themedStyles.forgotText, { color: placeholderColor }]}>Забыли пароль?</Text>
          </Pressable>
        )}
        {/* Кнопка "Продолжить как гость" теперь всегда видна */}
        <Pressable
          onPress={onAuthSuccess}
          style={{
            marginTop: 18,
            marginBottom: 12,
            width: 320,
            alignSelf: 'center',
            borderRadius: roundness,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.background,
            paddingVertical: 14,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
            Продолжить как гость
          </Text>
        </Pressable>
      </View>
      {/* Модальные окна восстановления пароля и смены пароля */}
      <Modal visible={showReset} animationType="slide" transparent>
        <View style={themedStyles.modalOverlay}>
          <View style={[themedStyles.modalContent, { width: Math.min(windowWidth * 0.9, 400), borderRadius: typeof roundness === 'number' ? roundness + 6 : 18, backgroundColor: colors.surface }]}>
            <Text style={[themedStyles.modalTitle, { color: textColor }]}>Восстановление пароля</Text>
            <TextInput
              style={[themedStyles.input, { borderColor, backgroundColor: colors.surface, color: textColor, borderRadius: roundness }]}
              placeholder="Email"
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
              keyboardType="email-address"
              value={resetEmail}
              onChangeText={setResetEmail}
            />
            <Button mode="contained" style={[themedStyles.button, { backgroundColor: colors.primary, borderRadius: roundness }]} loading={resetLoading} onPress={handleResetRequest}>
              Отправить письмо
            </Button>
            <Button mode="text" onPress={() => setShowReset(false)} disabled={resetLoading} labelStyle={{ color: textColor }}>Отмена</Button>
          </View>
        </View>
      </Modal>
      <Modal visible={showChangePass} animationType="slide" transparent>
        <View style={themedStyles.modalOverlay}>
          <View style={[themedStyles.modalContent, { width: Math.min(windowWidth * 0.9, 400), borderRadius: typeof roundness === 'number' ? roundness + 6 : 18, backgroundColor: colors.surface }]}>
            <Text style={[themedStyles.modalTitle, { color: textColor }]}>Смена пароля</Text>
            <TextInput
              style={[themedStyles.input, { borderColor, backgroundColor: colors.surface, color: textColor, borderRadius: roundness }]}
              placeholder="Новый пароль"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              value={newPass1}
              onChangeText={setNewPass1}
            />
            <TextInput
              style={[themedStyles.input, { borderColor, backgroundColor: colors.surface, color: textColor, borderRadius: roundness }]}
              placeholder="Повторите новый пароль"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              value={newPass2}
              onChangeText={setNewPass2}
            />
            <Button mode="contained" style={[themedStyles.button, { backgroundColor: colors.primary, borderRadius: roundness }]} loading={changePassLoading} onPress={handleChangePassword}>
              Сменить пароль
            </Button>
            <Button mode="text" onPress={() => setShowChangePass(false)} disabled={changePassLoading} labelStyle={{ color: textColor }}>Отмена</Button>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;