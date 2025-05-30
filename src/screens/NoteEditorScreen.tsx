import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView, TouchableOpacity } from 'react-native';
import { TextInput, Appbar, IconButton, useTheme, Text, Surface } from 'react-native-paper';
import { saveNoteLocal, loadNoteLocal, NoteData } from '../services/notesService';
import notesEventBus from '../utils/notesEventBus';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import { uploadNoteImage } from '../services/notesService';
import { fetchLinkPreview } from '../utils/linkPreview';
import { debounce } from '../utils/debounce';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formattingButtons = [
  { icon: 'format-bold', markdown: '**', tooltip: 'Жирный' },
  { icon: 'format-italic', markdown: '*', tooltip: 'Курсив' },
  { icon: 'format-list-bulleted', markdown: '- ', tooltip: 'Список' },
  { icon: 'format-quote-close', markdown: '> ', tooltip: 'Цитата' },
  { icon: 'code-tags', markdown: '`', tooltip: 'Код' },
];

const customActions = {
  checkboxList: 'checkboxList',
};

export default function NoteEditorScreen({ route, navigation }) {
  const { colors, roundness, dark } = useTheme();
  const c = colors as any;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = route?.params || {};
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const isFirstLoad = useRef(true);
  const richText = useRef<any>(null);
  const [loadingLinks, setLoadingLinks] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showToolbar, setShowToolbar] = useState(false);

  // Сохраняем заметку с задержкой
  const debouncedSave = useCallback(
    debounce(async (note: NoteData) => {
      setIsSaving(true);
      setSaveStatus('saving');
      
      // Загружаем текущую версию заметки для сравнения
      const currentNote = await loadNoteLocal(note.id);
      
      // Проверяем, изменилась ли заметка фактически
      const hasChanged = 
        !currentNote || 
        currentNote.title !== note.title || 
        currentNote.content !== note.content;
      
      // Если заметка изменилась, обновляем таймстемп
      let noteToSave;
      if (hasChanged) {
        const timestamp = Date.now();
        noteToSave = {
          ...note,
          timestamp
        };
        // Отправляем событие обновления заметки
        notesEventBus.emit('noteUpdated', { id: note.id, timestamp });
      } else {
        // Если нет изменений, сохраняем с тем же таймстемпом
        noteToSave = {
          ...note,
          timestamp: currentNote?.timestamp || Date.now()
        };
      }
      
      await saveNoteLocal(noteToSave);
      setIsSaving(false);
      setSaveStatus('saved');
    }, 500),
    []
  );

  // Загрузка заметки при открытии
  useEffect(() => {
    if (id) {
      loadNoteLocal(id).then(note => {
        if (note) {
          setTitle(note.title);
          setContent(note.content);
          // Устанавливаем начальные значения для отслеживания изменений
          isFirstLoad.current = true;
        }
      });
    }
    // eslint-disable-next-line
  }, [id]);

  // Обновляем заметку только при фактическом изменении
  useEffect(() => {
    if (!id) return;
    
    // Если это первая загрузка, просто сохраняем без обновления таймстемпа
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    
    // Сохраняем заметку с новым таймстемпом
    debouncedSave({ id, title, content });
    
    // eslint-disable-next-line
  }, [title, content, id]);

  // Вставка Markdown-разметки
  const handleFormat = (markdown) => {
    setContent((prev) => prev + markdown);
  };

  useEffect(() => {
    // Ищем все уникальные URL в тексте
    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    const urls = Array.from(new Set((content.match(urlRegex) || [])));
    if (urls.length === 0) return;
    urls.forEach((url) => {
      // Если ссылка уже заменена на превью — пропускаем
      if (content.includes(`data-link-preview=\"${url}\"`)) return;
      // Если уже грузится — пропускаем
      if (loadingLinks.includes(url)) return;
      // Вставляем индикатор загрузки
      setLoadingLinks((prev) => [...prev, url]);
      const loadingHtml = `<span data-link-loading=\"${url}\" style=\"display:inline-block;vertical-align:middle;\">⏳ Загрузка превью...</span>`;
      setContent((prev) => prev.replace(url, loadingHtml));
      if (richText.current) richText.current.setContentHTML(content.replace(url, loadingHtml));
      // Получаем превью
      fetchLinkPreview(url).then(preview => {
        setLoadingLinks((prev) => prev.filter(u => u !== url));
        if (preview && richText.current) {
          const html = `<div data-link-preview=\"${url}\" style=\"border:1px solid #333;border-radius:8px;padding:8px;margin:8px 0;display:flex;align-items:center;gap:8px;width:100%;max-width:100%;box-sizing:border-box;background:#23232A;\">
            ${preview.image ? `<img src='${preview.image}' style='width:48px;height:48px;object-fit:cover;border-radius:6px;margin-right:8px;flex-shrink:0;' />` : ''}
            <div style='flex:1;min-width:0;'>
              <div style='font-weight:bold;font-size:15px;line-height:1.2;word-break:break-word;color:#fff;'>${preview.title || url}</div>
              <div style='font-size:13px;color:#aaa;line-height:1.2;word-break:break-word;'>${preview.description || ''}</div>
              <a href='${url}' style='font-size:12px;color:#F7B801;text-decoration:underline;word-break:break-all;'>${url}</a>
            </div>
          </div>`;
          // Заменяем индикатор на превью
          setContent((prev) => {
            const newContent = prev.replace(new RegExp(`<span data-link-loading=\"${url}\"[^>]*>[^<]*<\/span>`), html);
            if (richText.current) {
              richText.current.setContentHTML(newContent);
            }
            return newContent;
          });
        } else {
          // Если не удалось получить превью — убираем индикатор
          setContent((prev) => {
            const newContent = prev.replace(new RegExp(`<span data-link-loading=\"${url}\"[^>]*>[^<]*<\/span>`), url);
            if (richText.current) {
              richText.current.setContentHTML(newContent);
            }
            return newContent;
          });
        }
      });
    });
  }, [content]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconButton icon="chevron-left" size={24} iconColor={c.primary} />
          <Text style={[styles.backText, { color: c.primary }]}>{t('notes', 'Заметки')}</Text>
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowToolbar(!showToolbar)}>
            <IconButton icon={showToolbar ? "format-text" : "format-color-text"} size={20} iconColor={c.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.saveStatus, { color: saveStatus === 'saving' ? c.placeholder : '#4caf50' }]}>
            {saveStatus === 'saving' ? t('saving', 'Сохраняется...') : t('saved', 'Сохранено')}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        contentContainerStyle={styles.contentContainer} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input - iOS style with no visible label */}
        <TextInput
          placeholder={t('note_title', 'Заголовок')}
          value={title}
          onChangeText={setTitle}
          mode="flat"
          style={[styles.titleInput, { backgroundColor: 'transparent', color: c.text }]}
          underlineColor="transparent"
          placeholderTextColor={c.placeholder}
          theme={{ colors: { text: c.text, placeholder: c.placeholder, primary: c.primary } }}
        />
        
        {/* Small date indicator - iOS style */}
        <Text style={[styles.dateText, { color: c.placeholder }]}>
          {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
        
        {/* Editor */}
        <RichEditor
          ref={richText}
          initialContentHTML={content}
          onChange={setContent}
          style={styles.editor}
          placeholder={t('note_text_placeholder', 'Текст заметки...')}
          editorStyle={{
            color: c.text,
            backgroundColor: 'transparent',
            cssText: `body { 
              padding: 0; 
              line-height: 1.5; 
              font-family: ${Platform.OS === 'ios' ? 'System' : 'sans-serif'};
              font-size: 16px;
            }`
          }}
          onTouchStart={() => setShowToolbar(true)}
        />
      </ScrollView>
      
      {/* Toolbar */}
      {showToolbar && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <Surface style={[styles.toolbarContainer, { backgroundColor: dark ? '#1C1C1E' : '#F2F2F7', borderTopColor: c.border }]}>
            <RichToolbar
              editor={richText}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.insertBulletsList,
                actions.insertOrderedList,
                actions.checkboxList,
                actions.blockquote,
                actions.code,
                actions.undo,
                actions.redo
              ]}
              style={styles.toolbar}
              iconTint={c.primary}
              selectedIconTint={c.accent}
              disabledIconTint={c.disabled}
              iconSize={20}
            />
          </Surface>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 0
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    marginLeft: -8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveStatus: {
    fontSize: 12,
    marginRight: 8,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    height: 50,
  },
  dateText: {
    fontSize: 12,
    marginBottom: 16,
  },
  editor: {
    minHeight: 200,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  toolbarContainer: {
    borderTopWidth: 0.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  toolbar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingVertical: 8,
  },
  formatBar: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  contentInput: {
    minHeight: 120,
    marginBottom: 16,
  },
  previewLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  preview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 8,
    minHeight: 60,
  },
});