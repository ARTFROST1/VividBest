import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Text,
  Alert,
} from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface SimpleAdvancedEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  onFocus?: () => void;
  onBlur?: () => void;
  showToolbar?: boolean;
}

export interface SimpleEditorRef {
  applyFormat: (format: string) => void;
  insertCheckbox: () => void;
  insertImage: () => void;
  insertAudio: () => void;
  insertTable: () => void;
  insertLink: () => void;
}

const SimpleAdvancedEditor = forwardRef<SimpleEditorRef, SimpleAdvancedEditorProps>(({
  value,
  onChangeText,
  placeholder,
  style,
  onFocus,
  onBlur,
  showToolbar = false,
}, ref) => {
  const { colors } = useTheme();
  const textInputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

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
  }), [applyFormat, insertCheckbox, insertImage, insertAudio, insertTable, insertLink]);

  return (
    <View style={[styles.container, style]}>
      <Surface style={[styles.editorSurface, { backgroundColor: colors.surface }]}>
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            { 
              color: colors.onSurface,
              minHeight: 300,
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
        />
      </Surface>
      
      {/* Простая панель инструментов */}
      {showToolbar && (
        <Surface style={[styles.toolbar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.toolButton, { borderColor: colors.outline }]}
            onPress={() => applyFormat('bold')}
          >
            <MaterialCommunityIcons name="format-bold" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, { borderColor: colors.outline }]}
            onPress={() => applyFormat('italic')}
          >
            <MaterialCommunityIcons name="format-italic" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, { borderColor: colors.outline }]}
            onPress={() => applyFormat('underline')}
          >
            <MaterialCommunityIcons name="format-underline" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, { borderColor: colors.outline }]}
            onPress={insertCheckbox}
          >
            <MaterialCommunityIcons name="checkbox-marked-outline" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, { borderColor: colors.outline }]}
            onPress={insertImage}
          >
            <MaterialCommunityIcons name="image" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, { borderColor: colors.outline }]}
            onPress={insertTable}
          >
            <MaterialCommunityIcons name="table" size={20} color={colors.onSurface} />
          </TouchableOpacity>
        </Surface>
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
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 8,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
});

export default SimpleAdvancedEditor;