import React, { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Surface, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RichTextEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  listId: string;
}

interface TextFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChangeText,
  placeholder,
  style,
  onFocus,
  onBlur,
}) => {
  const { colors } = useTheme();
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [currentFormats, setCurrentFormats] = useState<TextFormat>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  });
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const textInputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  // Парсинг чеклистов из текста
  const parseChecklists = useCallback((text: string): ChecklistItem[] => {
    const lines = text.split('\n');
    const items: ChecklistItem[] = [];
    let currentListId = '';

    lines.forEach((line, index) => {
      const checkboxMatch = line.match(/^(\s*)- \[([ x])\] (.+)$/);
      if (checkboxMatch) {
        const [, indent, checked, text] = checkboxMatch;
        const listId = currentListId || `list_${Date.now()}_${index}`;
        if (!currentListId) currentListId = listId;

        items.push({
          id: `item_${Date.now()}_${index}`,
          text: text.trim(),
          completed: checked === 'x',
          listId,
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
    }

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

    // Обновляем состояние форматирования
    setCurrentFormats(prev => ({
      ...prev,
      [format]: !isFormatted,
    }));
  }, [value, selection, onChangeText]);

  // Экспортируем функцию для внешнего использования
  React.useImperativeHandle(
    React.forwardRef(() => ({ applyFormat, createChecklist })),
    () => ({ applyFormat, createChecklist }),
    [applyFormat, createChecklist]
  );

  // Создание чеклиста
  const createChecklist = useCallback(() => {
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
    }
  }, [value, selection, onChangeText]);

  // Обработка изменения статуса чекбокса
  const toggleCheckbox = useCallback((itemId: string) => {
    const lines = value.split('\n');
    const newLines = lines.map(line => {
      const checkboxMatch = line.match(/^(\s*)- \[([ x])\] (.+)$/);
      if (checkboxMatch) {
        const [, indent, checked, text] = checkboxMatch;
        const currentChecked = checked === 'x';
        const item = checklists.find(item => 
          item.text === text.trim() && item.completed === currentChecked
        );
        
        if (item?.id === itemId) {
          return `${indent}- [${currentChecked ? ' ' : 'x'}] ${text}`;
        }
      }
      return line;
    });
    
    onChangeText(newLines.join('\n'));
    
    // Сортируем чеклисты - завершенные вниз
    setTimeout(() => {
      sortChecklistItems();
    }, 100);
  }, [value, checklists, onChangeText]);

  // Сортировка элементов чеклиста
  const sortChecklistItems = useCallback(() => {
    const lines = value.split('\n');
    const processedLines: string[] = [];
    let currentChecklistItems: { line: string; completed: boolean }[] = [];
    let inChecklist = false;

    lines.forEach((line, index) => {
      const checkboxMatch = line.match(/^(\s*)- \[([ x])\] (.+)$/);
      
      if (checkboxMatch) {
        const [, indent, checked] = checkboxMatch;
        currentChecklistItems.push({
          line,
          completed: checked === 'x'
        });
        inChecklist = true;
      } else {
        // Если встретили не-чекбокс и у нас есть накопленные элементы
        if (inChecklist && currentChecklistItems.length > 0) {
          // Сортируем: незавершенные сверху, завершенные снизу
          const sorted = currentChecklistItems.sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
          });
          
          processedLines.push(...sorted.map(item => item.line));
          currentChecklistItems = [];
          inChecklist = false;
        }
        processedLines.push(line);
      }
    });
    
    // Обрабатываем оставшиеся элементы чеклиста
    if (currentChecklistItems.length > 0) {
      const sorted = currentChecklistItems.sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
      });
      processedLines.push(...sorted.map(item => item.line));
    }
    
    const newText = processedLines.join('\n');
    if (newText !== value) {
      onChangeText(newText);
    }
  }, [value, onChangeText]);

  // Обработка нажатия Enter для чеклистов
  const handleTextChange = useCallback((text: string) => {
    // Проверяем, добавили ли новую строку после чекбокса
    const lines = text.split('\n');
    const prevLines = value.split('\n');
    
    if (lines.length > prevLines.length) {
      const newLineIndex = lines.length - 2; // Предыдущая строка
      const prevLine = lines[newLineIndex];
      const checkboxMatch = prevLine?.match(/^(\s*)- \[([ x])\] (.*)$/);
      
      if (checkboxMatch) {
        const [, indent, checked, content] = checkboxMatch;
        const newLine = lines[newLineIndex + 1];
        
        // Если новая строка пустая, добавляем новый чекбокс
        if (newLine === '') {
          const newText = lines.slice(0, newLineIndex + 1).join('\n') + 
                         '\n' + `${indent}- [ ] ` + 
                         lines.slice(newLineIndex + 2).join('\n');
          onChangeText(newText);
          return;
        }
      }
    }
    
    onChangeText(text);
  }, [value, onChangeText]);

  const renderChecklistItem = (item: ChecklistItem, index: number) => (
    <View key={item.id} style={styles.checklistItem}>
      <TouchableOpacity
        onPress={() => toggleCheckbox(item.id)}
        style={styles.checkbox}
      >
        <MaterialCommunityIcons
          name={item.completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={20}
          color={item.completed ? colors.primary : colors.outline}
        />
      </TouchableOpacity>
      <Text
        style={[
          styles.checklistText,
          { color: colors.onSurface },
          item.completed && styles.completedText
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <TextInput
          ref={textInputRef}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          multiline
          style={[
            styles.textInput,
            { color: colors.onSurface }
          ]}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onSelectionChange={({ nativeEvent: { selection } }) => {
            setSelection(selection);
          }}
          textAlignVertical="top"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    textAlignVertical: 'top',
    minHeight: 400,
    fontFamily: Platform.OS === 'ios' ? 'San Francisco' : 'Roboto',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});

export default RichTextEditor;