import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Appbar, IconButton, useTheme, Text } from 'react-native-paper';
import { saveNoteLocal, loadNoteLocal, NoteData } from '../services/notesService';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import { uploadNoteImage } from '../services/notesService';
import { fetchLinkPreview } from '../utils/linkPreview';
import { debounce } from '../utils/debounce';
import { useTranslation } from 'react-i18next';

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
  const { colors, roundness } = useTheme();
  const c = colors as any;
  const { t } = useTranslation();
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
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Appbar.Header style={{ backgroundColor: c.background, elevation: 0 }}>
        <Appbar.BackAction color={c.primary} onPress={() => navigation.goBack()} />
        <Appbar.Content title={<Text style={{ color: c.text, fontWeight: 'bold', fontSize: 22 }}>{title || t('edit_note', 'Редактирование заметки')}</Text>} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: c.background }]} keyboardShouldPersistTaps="handled">
        <TextInput
          label={t('note_title', 'Заголовок')}
          value={title}
          onChangeText={setTitle}
          mode="flat"
          style={[styles.titleInput, { backgroundColor: c.background, color: c.text, borderRadius: roundness, fontWeight: 'bold', fontSize: 28 }]}
          underlineColor={c.primary}
          placeholderTextColor={c.placeholder}
          theme={{ colors: { text: c.text, placeholder: c.placeholder, primary: c.primary } }}
        />
        <RichEditor
          ref={richText}
          initialContentHTML={content}
          onChange={setContent}
          style={{ minHeight: 200, borderWidth: 1, borderColor: c.border, borderRadius: roundness, marginBottom: 16, backgroundColor: c.surface }}
          placeholder={t('note_text_placeholder', 'Текст заметки...')}
          editorStyle={{ color: c.text, backgroundColor: c.surface }}
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
          style={{ backgroundColor: c.background, borderTopWidth: 1, borderColor: c.border, paddingBottom: 4, paddingTop: 4 }}
          iconTint={c.primary}
          selectedIconTint={c.primary}
        />
      </KeyboardAvoidingView>
      <View style={{ alignItems: 'center', padding: 4 }}>
        <Text style={{ color: saveStatus === 'saving' ? c.placeholder : '#4caf50', fontSize: 12 }}>
          {saveStatus === 'saving' ? t('saving', 'Сохраняется...') : t('saved', 'Сохранено')}
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