import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Text,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Surface, useTheme, IconButton, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ResizableImage } from './ResizableImage';
import { AudioPlayer } from './AudioPlayer';

interface AdvancedRichTextEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  onFocus?: () => void;
  onBlur?: () => void;
  showToolbar?: boolean;
  onToolbarVisibilityChange?: (visible: boolean) => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  listId: string;
  lineIndex: number;
}

interface MediaAttachment {
  id: string;
  uri: string;
  type: 'image' | 'audio';
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  name?: string;
  duration?: number;
}

interface TextFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
}

export interface EditorRef {
  applyFormat: (format: keyof TextFormat) => void;
  insertCheckbox: () => void;
  insertImage: () => void;
  insertAudio: () => void;
  insertTable: () => void;
  insertLink: () => void;
}

const AdvancedRichTextEditor = forwardRef<EditorRef, AdvancedRichTextEditorProps>(({
  value,
  onChangeText,
  placeholder,
  style,
  onFocus,
  onBlur,
  showToolbar = false,
  onToolbarVisibilityChange,
}, ref) => {
  const { colors } = useTheme();
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [currentFormats, setCurrentFormats] = useState<TextFormat>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    heading1: false,
    heading2: false,
    heading3: false,
  });
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const textInputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Парсинг чеклистов из текста
  const parseChecklists = useCallback((text: string): ChecklistItem[] => {
    const lines = text.split('\n');
    const items: ChecklistItem[] = [];
    let currentListId = '';

    lines.forEach((line, index) => {
      const checkboxMatch = line.match(/^(\s*)- \[([ xX])\] (.+)$/);
      if (checkboxMatch) {
        const [, indent, checked, text] = checkboxMatch;
        const listId = currentListId || `list_${Date.now()}_${index}`;
        if (!currentListId) currentListId = listId;

        items.push({
          id: `item_${Date.now()}_${index}`,
          text: text.trim(),
          completed: checked.toLowerCase() === 'x',
          listId,
          lineIndex: index,
        });
      } else if (line.trim() === '') {
        currentListId = '';
      }
    });

    return items;
  }, []);

  // Обновление чеклистов при изменении текста
  useEffect(() => {
    const items = parseChecklists(value);
    setChecklists(items);
  }, [value, parseChecklists]);

  // Применение форматирования к выделенному тексту
  const applyFormat = useCallback((format: keyof TextFormat) => {
    if (!textInputRef.current) return;

    const { start, end } = selection;
    const selectedText = value.substring(start, end);
    
    if (selectedText.length === 0) return;

    let formattedText = selectedText;
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
        if (selectedText.includes('\n')) {
          formatSymbols = '```';
          formattedText = `\`\`\`\n${selectedText}\n\`\`\``;
        } else {
          formatSymbols = '`';
        }
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
      // Для заголовков применяем к началу строки
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);
      const lastNewline = beforeCursor.lastIndexOf('\n');
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = value.substring(lineStart, end);
      
      // Проверяем, уже ли есть заголовок
      const hasHeading = currentLine.match(/^#{1,3} /);
      
      if (hasHeading) {
        // Убираем заголовок
        const newLine = currentLine.replace(/^#{1,3} /, '');
        const newText = value.substring(0, lineStart) + newLine + afterCursor;
        onChangeText(newText);
      } else {
        // Добавляем заголовок
        const newLine = formatSymbols + currentLine;
        const newText = value.substring(0, lineStart) + newLine + afterCursor;
        onChangeText(newText);
      }
    } else {
      // Для остального форматирования
      if (format === 'code' && selectedText.includes('\n')) {
        const newText = value.substring(0, start) + formattedText + value.substring(end);
        onChangeText(newText);
      } else {
        // Проверяем, уже ли применено форматирование
        const isFormatted = selectedText.startsWith(formatSymbols) && selectedText.endsWith(formatSymbols);
        
        if (isFormatted) {
          // Убираем форматирование
          formattedText = selectedText.slice(formatSymbols.length, -formatSymbols.length);
        } else {
          // Добавляем форматирование
          formattedText = `${formatSymbols}${selectedText}${formatSymbols}`;
        }

        const newText = value.substring(0, start) + formattedText + value.substring(end);
        onChangeText(newText);
      }
    }

    // Обновляем состояние форматирования
    setCurrentFormats(prev => ({
      ...prev,
      [format]: !prev[format],
    }));
  }, [value, selection, onChangeText]);

  // Вставка чекбокса
  const insertCheckbox = useCallback(() => {
    const { start } = selection;
    const beforeCursor = value.substring(0, start);
    const afterCursor = value.substring(start);
    
    // Находим начало текущей строки
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const currentLine = beforeCursor.substring(lineStart);
    
    // Если строка пустая, добавляем чекбокс
    if (currentLine.trim() === '') {
      const newText = beforeCursor + '- [ ] ' + afterCursor;
      onChangeText(newText);
      
      // Устанавливаем курсор после чекбокса
      setTimeout(() => {
        textInputRef.current?.setNativeProps({
          selection: { start: start + 6, end: start + 6 }
        });
      }, 10);
    } else {
      // Если в строке есть текст, создаем новую строку с чекбоксом
      const newText = beforeCursor + '\n- [ ] ' + afterCursor;
      onChangeText(newText);
      
      setTimeout(() => {
        textInputRef.current?.setNativeProps({
          selection: { start: start + 7, end: start + 7 }
        });
      }, 10);
    }
  }, [value, selection, onChangeText]);

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
        const newAttachment: MediaAttachment = {
          id: `img_${Date.now()}`,
          uri: asset.uri,
          type: 'image',
          width: asset.width || 300,
          height: asset.height || 200,
          x: 0,
          y: 0,
        };

        setMediaAttachments(prev => [...prev, newAttachment]);
        
        // Вставляем маркер изображения в текст
        const { start } = selection;
        const beforeCursor = value.substring(0, start);
        const afterCursor = value.substring(start);
        const imageMarker = `\n![Изображение](${newAttachment.id})\n`;
        const newText = beforeCursor + imageMarker + afterCursor;
        onChangeText(newText);
      }
    } catch (error) {
      console.error('Ошибка при выборе изображения:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  }, [selection, value, onChangeText]);

  // Вставка аудио
  const insertAudio = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newAttachment: MediaAttachment = {
          id: `audio_${Date.now()}`,
          uri: asset.uri,
          type: 'audio',
          name: asset.name,
        };

        setMediaAttachments(prev => [...prev, newAttachment]);
        
        // Вставляем маркер аудио в текст
        const { start } = selection;
        const beforeCursor = value.substring(0, start);
        const afterCursor = value.substring(start);
        const audioMarker = `\n[Аудио: ${asset.name}](${newAttachment.id})\n`;
        const newText = beforeCursor + audioMarker + afterCursor;
        onChangeText(newText);
      }
    } catch (error) {
      console.error('Ошибка при выборе аудио:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать аудиофайл');
    }
  }, [selection, value, onChangeText]);

  // Вставка таблицы
  const insertTable = useCallback(() => {
    const { start } = selection;
    const beforeCursor = value.substring(0, start);
    const afterCursor = value.substring(start);
    
    const tableTemplate = `
| Заголовок 1 | Заголовок 2 | Заголовок 3 |
|-------------|-------------|-------------|
| Ячейка 1    | Ячейка 2    | Ячейка 3    |
| Ячейка 4    | Ячейка 5    | Ячейка 6    |

`;
    
    const newText = beforeCursor + tableTemplate + afterCursor;
    onChangeText(newText);
  }, [selection, value, onChangeText]);

  // Вставка ссылки
  const insertLink = useCallback(() => {
    const { start, end } = selection;
    const selectedText = value.substring(start, end);
    const beforeCursor = value.substring(0, start);
    const afterCursor = value.substring(end);
    
    const linkText = selectedText || 'текст ссылки';
    const linkTemplate = `[${linkText}](https://example.com)`;
    
    const newText = beforeCursor + linkTemplate + afterCursor;
    onChangeText(newText);
  }, [selection, value, onChangeText]);

  // Обработка изменения состояния чекбокса
  const toggleCheckbox = useCallback((itemId: string) => {
    const item = checklists.find(c => c.id === itemId);
    if (!item) return;

    const lines = value.split('\n');
    const targetLine = lines[item.lineIndex];
    
    if (targetLine) {
      const newChecked = item.completed ? ' ' : 'x';
      const newLine = targetLine.replace(/\[([ xX])\]/, `[${newChecked}]`);
      lines[item.lineIndex] = newLine;
      
      // Сортировка: выполненные задачи в конец списка
      if (!item.completed) {
        // Перемещаем выполненную задачу в конец текущего списка
        const listItems = checklists.filter(c => c.listId === item.listId);
        const listStart = Math.min(...listItems.map(i => i.lineIndex));
        const listEnd = Math.max(...listItems.map(i => i.lineIndex));
        
        // Удаляем текущую строку
        const removedLine = lines.splice(item.lineIndex, 1)[0];
        
        // Находим место для вставки (после всех незавершенных задач этого списка)
        let insertIndex = listEnd;
        for (let i = listStart; i <= listEnd; i++) {
          if (i < lines.length) {
            const line = lines[i];
            const match = line.match(/- \[([ xX])\]/);
            if (match && match[1].toLowerCase() === 'x') {
              insertIndex = i;
              break;
            }
          }
        }
        
        // Вставляем обновленную строку
        lines.splice(insertIndex, 0, newLine);
      }
      
      const newText = lines.join('\n');
      onChangeText(newText);
    }
  }, [checklists, value, onChangeText]);

  // Рендер чекбокса
  const renderChecklistItem = (item: ChecklistItem, index: number) => (
    <View key={item.id} style={[styles.checklistItem, { borderColor: colors.outline }]}>
      <TouchableOpacity
        onPress={() => toggleCheckbox(item.id)}
        style={styles.checkboxContainer}
      >
        <MaterialCommunityIcons
          name={item.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={item.completed ? colors.primary : colors.onSurface}
        />
      </TouchableOpacity>
      <Text
        style={[
          styles.checklistText,
          { color: colors.onSurface },
          item.completed && { textDecorationLine: 'line-through', opacity: 0.6 }
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  // Рендер медиа-вложений
  const renderMediaAttachments = () => {
    return mediaAttachments.map(attachment => {
      if (attachment.type === 'image') {
        return (
          <ResizableImage
            key={attachment.id}
            uri={attachment.uri}
            initialWidth={attachment.width}
            initialHeight={attachment.height}
            x={attachment.x}
            y={attachment.y}
            onDelete={() => {
              setMediaAttachments(prev => prev.filter(a => a.id !== attachment.id));
              // Удаляем маркер из текста
              const newText = value.replace(new RegExp(`!\\[.*?\\]\\(${attachment.id}\\)`, 'g'), '');
              onChangeText(newText);
            }}
            onResize={(width, height) => {
              setMediaAttachments(prev => 
                prev.map(a => a.id === attachment.id ? { ...a, width, height } : a)
              );
            }}
            onMove={(x, y) => {
              setMediaAttachments(prev => 
                prev.map(a => a.id === attachment.id ? { ...a, x, y } : a)
              );
            }}
          />
        );
      } else if (attachment.type === 'audio') {
        return (
          <AudioPlayer
            key={attachment.id}
            uri={attachment.uri}
            name={attachment.name || 'Аудио'}
            duration={attachment.duration}
            onDelete={() => {
              setMediaAttachments(prev => prev.filter(a => a.id !== attachment.id));
              // Удаляем маркер из текста
              const newText = value.replace(new RegExp(`\\[Аудио:.*?\\]\\(${attachment.id}\\)`, 'g'), '');
              onChangeText(newText);
            }}
          />
        );
      }
    });
  };

  // Обработка фокуса
  const handleFocus = useCallback(() => {
    setFocused(true);
    onFocus?.();
    onToolbarVisibilityChange?.(true);
  }, [onFocus, onToolbarVisibilityChange]);

  // Обработка снятия фокуса
  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();
    onToolbarVisibilityChange?.(false);
  }, [onBlur, onToolbarVisibilityChange]);

  // Экспортируем функции через ref
  useImperativeHandle(ref, () => ({
    applyFormat,
    insertCheckbox,
    insertImage,
    insertAudio,
    insertTable,
    insertLink,
  }), [applyFormat, insertCheckbox, insertImage, insertAudio, insertTable, insertLink]);

  // Обработка изменения выделения
  const handleSelectionChange = useCallback((event: any) => {
    const { selection } = event.nativeEvent;
    setSelection(selection);
    
    // Определяем текущее форматирование по курсору
    const selectedText = value.substring(selection.start, selection.end);
    setCurrentFormats({
      bold: selectedText.includes('**'),
      italic: selectedText.includes('*') && !selectedText.includes('**'),
      underline: selectedText.includes('__'),
      strikethrough: selectedText.includes('~~'),
      code: selectedText.includes('`'),
      heading1: selectedText.includes('# '),
      heading2: selectedText.includes('## '),
      heading3: selectedText.includes('### '),
    });
  }, [value]);

  return (
    <KeyboardAvoidingView 
      style={[styles.container, style]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
            onSelectionChange={handleSelectionChange}
            selection={selection}
            scrollEnabled={false}
          />
          
          {/* Рендер медиа-вложений */}
          <View style={styles.mediaContainer}>
            {renderMediaAttachments()}
          </View>
          
          {/* Рендер чеклистов */}
          {checklists.length > 0 && (
            <View style={styles.checklistContainer}>
              {checklists.map(renderChecklistItem)}
            </View>
          )}
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  checklistContainer: {
    marginTop: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  mediaContainer: {
    marginTop: 16,
  },
});

export default AdvancedRichTextEditor;