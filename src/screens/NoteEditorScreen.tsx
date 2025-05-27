import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Appbar, IconButton, useTheme, Text } from 'react-native-paper';
import { saveNoteLocal, loadNoteLocal, NoteData } from '../services/notesService';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import { uploadNoteImage } from '../services/notesService';
import { fetchLinkPreview } from '../utils/linkPreview';
import { debounce } from '../utils/debounce';

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
  const { colors } = useTheme();
  const { id, title: initialTitle } = route?.params || {};
  const [title, setTitle] = useState(initialTitle || '');
  const [content, setContent] = useState('');
  const isFirstLoad = useRef(true);
  const richText = useRef<any>(null);
  const [loadingLinks, setLoadingLinks] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Автосохранение с debounce
  const debouncedSave = useRef(
    debounce((note: NoteData) => {
      setIsSaving(true);
      setSaveStatus('saving');
      saveNoteLocal(note).then(() => {
        setIsSaving(false);
        setSaveStatus('saved');
      });
    }, 800)
  ).current;

  // Загрузка заметки при открытии
  useEffect(() => {
    if (id) {
      loadNoteLocal(id).then(note => {
        if (note) {
          setTitle(note.title);
          setContent(note.content);
        }
      });
    }
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (!id) return;
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
          const html = `<div data-link-preview=\"${url}\" style=\"border:1px solid #ccc;border-radius:8px;padding:8px;margin:8px 0;display:flex;align-items:center;gap:8px;width:100%;max-width:100%;box-sizing:border-box;\">
            ${preview.image ? `<img src='${preview.image}' style='width:48px;height:48px;object-fit:cover;border-radius:6px;margin-right:8px;flex-shrink:0;' />` : ''}
            <div style='flex:1;min-width:0;'>
              <div style='font-weight:bold;font-size:15px;line-height:1.2;word-break:break-word;'>${preview.title || url}</div>
              <div style='font-size:13px;color:#666;line-height:1.2;word-break:break-word;'>${preview.description || ''}</div>
              <a href='${url}' style='font-size:12px;color:#1976d2;text-decoration:underline;word-break:break-all;'>${url}</a>
            </div>
          </div>`;
          // Заменяем индикатор на превью
          setContent((prev) => prev.replace(new RegExp(`<span data-link-loading=\?"${url}\?"[^>]*>[^<]*<\/span>`), html));
          richText.current.setContentHTML(content.replace(new RegExp(`<span data-link-loading=\?"${url}\?"[^>]*>[^<]*<\/span>`), html));
        } else {
          // Если не удалось получить превью — убираем индикатор
          setContent((prev) => prev.replace(new RegExp(`<span data-link-loading=\?"${url}\?"[^>]*>[^<]*<\/span>`), url));
          if (richText.current) richText.current.setContentHTML(content.replace(new RegExp(`<span data-link-loading=\?"${url}\?"[^>]*>[^<]*<\/span>`), url));
        }
      });
    });
  }, [content]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Редактирование заметки" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TextInput
          label="Заголовок"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.titleInput}
        />
        <RichEditor
          ref={richText}
          initialContentHTML={content}
          onChange={setContent}
          style={{ minHeight: 200, borderWidth: 1, borderColor: colors.outline, borderRadius: 8, marginBottom: 16 }}
          placeholder="Текст заметки..."
          editorStyle={{ color: colors.onBackground }}
        />
      </ScrollView>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <RichToolbar
          editor={richText}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.setStrikethrough,
            actions.insertBulletsList,
            actions.blockquote,
            actions.checkboxList,
            actions.code,
          ]}
          style={{ backgroundColor: '#181818', borderTopWidth: 1, borderColor: '#333' }}
        />
      </KeyboardAvoidingView>
      <View style={{ alignItems: 'center', padding: 4 }}>
        <Text style={{ color: saveStatus === 'saving' ? '#888' : '#4caf50', fontSize: 12 }}>
          {saveStatus === 'saving' ? 'Сохраняется...' : 'Сохранено'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  titleInput: {
    marginBottom: 12,
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
  customToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});