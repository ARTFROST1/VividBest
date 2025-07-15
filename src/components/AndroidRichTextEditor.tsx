import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Text,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface AndroidRichTextEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface AndroidEditorRef {
  applyFormat: (format: string) => void;
  insertCheckbox: () => void;
  insertImage: () => void;
  insertAudio: () => void;
  insertTable: () => void;
  insertLink: () => void;
  insertBulletList: () => void;
  insertNumberedList: () => void;
}

const AndroidRichTextEditor = forwardRef<AndroidEditorRef, AndroidRichTextEditorProps>(({
  value,
  onChangeText,
  placeholder,
  style,
  onFocus,
  onBlur,
}, ref) => {
  const { colors } = useTheme();
  const textInputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set());

  // Применение форматирования к тексту
  const applyFormat = useCallback((format: string) => {
    let formatSymbols = '';
    let isLineFormat = false;

    switch (format) {
      case 'bold':
        formatSymbols = '**';
        break;
      case 'italic':
        formatSymbols = '*';
        break;
      case 'underline':
        formatSymbols = '__';
        break;
      case 'strikethrough':
        formatSymbols = '~~';
        break;
      case 'code':
        formatSymbols = '`';
        break;
      case 'heading1':
        formatSymbols = '# ';
        isLineFormat = true;
        break;
      case 'heading2':
        formatSymbols = '## ';
        isLineFormat = true;
        break;
      case 'heading3':
        formatSymbols = '### ';
        isLineFormat = true;
        break;
    }

    if (isLineFormat) {
      // Для заголовков добавляем в начало строки
      const lines = value.split('\n');
      const lastLineIndex = lines.length - 1;
      const lastLine = lines[lastLineIndex];
      
      // Проверяем, уже ли есть заголовок
      const hasHeading = lastLine.match(/^#{1,3} /);
      
      if (hasHeading) {
        // Убираем заголовок
        lines[lastLineIndex] = lastLine.replace(/^#{1,3} /, '');
      } else {
        // Добавляем заголовок
        lines[lastLineIndex] = formatSymbols + lastLine;
      }
      
      onChangeText(lines.join('\n'));
    } else {
      // Для остального форматирования добавляем в конец
      onChangeText(value + formatSymbols);
    }
  }, [value, onChangeText]);

  // Вставка чекбокса
  const insertCheckbox = useCallback(() => {
    const newText = value + '\n- [ ] ';
    onChangeText(newText);
  }, [value, onChangeText]);

  // Вставка маркированного списка
  const insertBulletList = useCallback(() => {
    const newText = value + '\n• ';
    onChangeText(newText);
  }, [value, onChangeText]);

  // Вставка нумерованного списка
  const insertNumberedList = useCallback(() => {
    const newText = value + '\n1. ';
    onChangeText(newText);
  }, [value, onChangeText]);

  // Вставка изображения
  const insertImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Разрешение', 'Нужно разрешение для доступа к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageMarker = `\n![Изображение](${asset.uri})\n`;
        onChangeText(value + imageMarker);
      }
    } catch (error) {
      console.error('Ошибка при выборе изображения:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  }, [value, onChangeText]);

  // Вставка аудио
  const insertAudio = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const audioMarker = `\n[Аудио: ${asset.name}](${asset.uri})\n`;
        onChangeText(value + audioMarker);
      }
    } catch (error) {
      console.error('Ошибка при выборе аудио:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать аудиофайл');
    }
  }, [value, onChangeText]);

  // Вставка таблицы
  const insertTable = useCallback(() => {
    const tableTemplate = `
| Заголовок 1 | Заголовок 2 | Заголовок 3 |
|-------------|-------------|-------------|
| Ячейка 1    | Ячейка 2    | Ячейка 3    |
| Ячейка 4    | Ячейка 5    | Ячейка 6    |

`;
    onChangeText(value + tableTemplate);
  }, [value, onChangeText]);

  // Вставка ссылки
  const insertLink = useCallback(() => {
    const linkTemplate = '[текст ссылки](https://example.com)';
    onChangeText(value + linkTemplate);
  }, [value, onChangeText]);

  // Обработка фокуса
  const handleFocus = useCallback(() => {
    setFocused(true);
    onFocus?.();
  }, [onFocus]);

  // Обработка снятия фокуса
  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Экспортируем функции через ref
  useImperativeHandle(ref, () => ({
    applyFormat,
    insertCheckbox,
    insertImage,
    insertAudio,
    insertTable,
    insertLink,
    insertBulletList,
    insertNumberedList,
  }), [applyFormat, insertCheckbox, insertImage, insertAudio, insertTable, insertLink, insertBulletList, insertNumberedList]);

  // Проверка активности формата
  const isFormatActive = (format: string) => {
    return selectedFormats.has(format);
  };

  return (
    <View style={[styles.container, style]}>
      <Surface style={[styles.editorSurface, { backgroundColor: colors.surface }]}>
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            { 
              color: colors.onSurface,
              minHeight: Platform.OS === 'android' ? 400 : 300,
            }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
          textAlignVertical="top"
          onFocus={handleFocus}
          onBlur={handleBlur}
          scrollEnabled={true}
          autoFocus={false}
        />
      </Surface>
      
      {/* Android Keyboard-Aware Toolbar */}
      {Platform.OS === 'android' && focused && (
        <View style={styles.keyboardAvoidingView}>
          <Surface style={[styles.androidToolbar, { backgroundColor: colors.surfaceVariant }]}>
            {/* Первая строка - основное форматирование */}
            <View style={styles.toolbarRow}>
              <TouchableOpacity
                style={[
                  styles.androidToolButton,
                  { borderColor: colors.outline },
                  isFormatActive('bold') && { backgroundColor: colors.primaryContainer }
                ]}
                onPress={() => applyFormat('bold')}
              >
                <MaterialCommunityIcons 
                  name="format-bold" 
                  size={18} 
                  color={isFormatActive('bold') ? colors.primary : colors.onSurface} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.androidToolButton,
                  { borderColor: colors.outline },
                  isFormatActive('italic') && { backgroundColor: colors.primaryContainer }
                ]}
                onPress={() => applyFormat('italic')}
              >
                <MaterialCommunityIcons 
                  name="format-italic" 
                  size={18} 
                  color={isFormatActive('italic') ? colors.primary : colors.onSurface} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.androidToolButton,
                  { borderColor: colors.outline },
                  isFormatActive('underline') && { backgroundColor: colors.primaryContainer }
                ]}
                onPress={() => applyFormat('underline')}
              >
                <MaterialCommunityIcons 
                  name="format-underline" 
                  size={18} 
                  color={isFormatActive('underline') ? colors.primary : colors.onSurface} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={() => applyFormat('strikethrough')}
              >
                <MaterialCommunityIcons name="format-strikethrough" size={18} color={colors.onSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={insertBulletList}
              >
                <MaterialCommunityIcons name="format-list-bulleted" size={18} color={colors.onSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={insertNumberedList}
              >
                <MaterialCommunityIcons name="format-list-numbered" size={18} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Вторая строка - чекбоксы и медиа */}
            <View style={styles.toolbarRow}>
              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={insertCheckbox}
              >
                <MaterialCommunityIcons name="checkbox-marked-outline" size={18} color={colors.onSurface} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={insertImage}
              >
                <MaterialCommunityIcons name="image" size={18} color={colors.onSurface} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={insertTable}
              >
                <MaterialCommunityIcons name="table" size={18} color={colors.onSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={insertLink}
              >
                <MaterialCommunityIcons name="link" size={18} color={colors.onSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={() => applyFormat('heading1')}
              >
                <Text style={[styles.headingButtonText, { color: colors.onSurface }]}>H1</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.androidToolButton, { borderColor: colors.outline }]}
                onPress={() => applyFormat('heading2')}
              >
                <Text style={[styles.headingButtonText, { color: colors.onSurface }]}>H2</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorSurface: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    flex: 1,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    flex: 1,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  androidToolbar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  androidToolButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  headingButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default AndroidRichTextEditor;