import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Appbar, IconButton, useTheme, Text, Surface } from 'react-native-paper';
import { saveNoteLocal, loadNoteLocal, NoteData } from '../services/notesService';
import notesEventBus from '../utils/notesEventBus';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadNoteImage } from '../services/notesService';
import { fetchLinkPreview } from '../utils/linkPreview';
import { debounce } from '../utils/debounce';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SimpleAdvancedEditor, { SimpleEditorRef } from '../components/SimpleAdvancedEditor';
import AndroidRichTextEditor, { AndroidEditorRef } from '../components/AndroidRichTextEditor';
import { AppleNotesToolbar } from '../components/AppleNotesToolbar';
import { RichEditor } from 'react-native-pell-rich-editor';
import MediaAttachment from '../components/MediaAttachment';
import { ResizableImage } from '../components/ResizableImage';
import { AudioPlayer } from '../components/AudioPlayer';

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
  const [selection, setSelection] = useState<{start:number; end:number}>({start:0,end:0});
  const isFirstLoad = useRef(true);
  const editorRef = useRef<SimpleEditorRef | AndroidEditorRef>(null);
  const [loadingLinks, setLoadingLinks] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showToolbar, setShowToolbar] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set());
  const [mediaAttachments, setMediaAttachments] = useState<Array<{
    id: string;
    uri: string;
    width: number;
    height: number;
    x: number;
    y: number;
    type: 'image' | 'audio';
    name?: string;
    duration?: number;
  }>>([]);
  const [audioFiles, setAudioFiles] = useState<Array<{
    id: string;
    uri: string;
    name: string;
    duration?: number;
  }>>([]);
  const [currentStyle, setCurrentStyle] = useState<'body' | 'title' | 'heading' | 'subheading'>('body');
  const [showMediaOptions, setShowMediaOptions] = useState(false);



  // Обработка медиа
  const handleImagePicker = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Разрешение', 'Нужно разрешение для доступа к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newAttachment = {
          id: `img_${Date.now()}`,
          uri: asset.uri,
          width: asset.width || 300,
          height: asset.height || 200,
          x: 0,
          y: 0,
          type: 'image' as const,
        };
        
        setMediaAttachments(prev => [...prev, newAttachment]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  }, []);

  const handleAudioPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newAudio = {
          id: `audio_${Date.now()}`,
          uri: asset.uri,
          name: asset.name,
          duration: 0, // Получим позже из метаданных
        };
        
        setAudioFiles(prev => [...prev, newAudio]);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать аудиофайл');
    }
  }, []);

  const handleAudioDeleted = useCallback((audioId: string) => {
    setAudioFiles(prev => prev.filter(audio => audio.id !== audioId));
  }, []);

  console.log('NoteEditorScreen route.params', route?.params);

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
          // Гарантируем валидность полей
          setTitle(typeof note.title === 'string' ? note.title : '');
          setContent(typeof note.content === 'string' ? note.content : '');
          if (note.mediaAttachments && Array.isArray(note.mediaAttachments)) {
            setMediaAttachments(note.mediaAttachments);
          } else {
            setMediaAttachments([]);
          }
          // Устанавливаем начальные значения для отслеживания изменений
          isFirstLoad.current = true;
        } else {
          // Если заметка не найдена или невалидна
          setTitle('');
          setContent('');
          setMediaAttachments([]);
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
    debouncedSave({ 
      id, 
      title, 
      content,
      mediaAttachments: mediaAttachments.map(attachment => ({
        id: attachment.id,
        uri: attachment.uri,
        width: attachment.width,
        height: attachment.height,
        x: attachment.x,
        y: attachment.y
      }))
    });
    
    // eslint-disable-next-line
  }, [title, content, id, mediaAttachments]);

  // Обработка форматирования для Apple Notes панели инструментов
  const handleAppleNotesFormat = (action: string, value?: any) => {
    // Update selected formats state
    const newFormats = new Set(selectedFormats);
    
    // Handle style changes (exclusive)
    if (['title', 'heading', 'subheading', 'body'].includes(action)) {
      // Clear other style formats
      ['title', 'heading', 'subheading', 'body'].forEach(style => newFormats.delete(style));
      if (action !== 'body') {
        newFormats.add(action);
        setCurrentStyle(action as 'body' | 'title' | 'heading' | 'subheading');
      } else {
        setCurrentStyle('body');
      }
    } else {
      // Handle toggle formats (can be combined)
      if (newFormats.has(action)) {
        newFormats.delete(action);
      } else {
        newFormats.add(action);
      }
    }
    
    setSelectedFormats(newFormats);

    if (Platform.OS === 'ios' && richText.current) {
      // iOS с RichEditor
      switch (action) {
        case 'title':
          richText.current.setHeading(1);
          richText.current.setBold();
          break;
        case 'heading':
          richText.current.setHeading(2);
          richText.current.setBold();
          break;
        case 'subheading':
          richText.current.setHeading(3);
          break;
        case 'body':
          // Remove heading formatting
          richText.current.setHeading(0);
          break;
        case 'bold':
          richText.current.setBold();
          break;
        case 'italic':
          richText.current.setItalic();
          break;
        case 'underline':
          richText.current.setUnderline();
          break;
        case 'strikethrough':
          richText.current.setStrikethrough();
          break;
        case 'bulletList':
          richText.current.insertBulletsList();
          break;
        case 'numberList':
          richText.current.insertOrderedList();
          break;
        case 'checklist':
          richText.current.insertHTML('<ul><li><input type="checkbox"> </li></ul>');
          break;
        case 'dashedList':
          richText.current.insertHTML('<ul style="list-style-type: none;"><li>— </li></ul>');
          break;
        case 'indent':
          richText.current.setIndent();
          break;
        case 'table':
          richText.current.insertHTML(`
            <table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
              <tr><td style="padding: 8px; border: 1px solid #ccc;">Ячейка 1</td><td style="padding: 8px; border: 1px solid #ccc;">Ячейка 2</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ccc;">Ячейка 3</td><td style="padding: 8px; border: 1px solid #ccc;">Ячейка 4</td></tr>
            </table>
          `);
          break;
        case 'draw':
          // Placeholder for drawing functionality
          richText.current.insertHTML('<div style="border: 2px dashed #ccc; padding: 20px; text-align: center; margin: 10px 0;">Область для рисования</div>');
          break;
      }
    } else {
      // Android с TextInput - используем Markdown
      handleMarkdownFormat(getMarkdownForAction(action, value));
    }
  };

  // Получение Markdown для Android
  const getMarkdownForAction = (action: string, value?: any): string => {
    switch (action) {
      case 'bold': return '**';
      case 'italic': return '*';
      case 'underline': return '<u>';
      case 'strikethrough': return '~~';
      case 'bulletList': return '- ';
      case 'numberList': return '1. ';
      case 'checklist': return '- [ ] ';
      case 'blockquote': return '> ';
      case 'code': return '`';
      case 'title': return '# ';
      case 'heading': return '## ';
      case 'subheading': return '### ';
      case 'dashedList': return '— ';
      case 'indent': return '  ';
      case 'link': return '[ссылка](url)';
      case 'table': return '\n| Заголовок 1 | Заголовок 2 |\n|-------------|-------------|\n| Ячейка 1    | Ячейка 2    |\n';
      case 'draw': return '\n[Область для рисования]\n';
      default: return '';
    }
  };

  // Вставка Markdown-разметки (для совместимости с Android)
  const handleMarkdownFormat = (markdown: string) => {
    // Для Android вставляем/оборачиваем выбранный текст маркдаун-токеном
    if (Platform.OS === 'android') {
      setContent(prev => {
        const { start, end } = selection;
        if (start === undefined || end === undefined) return prev + markdown;
        // paired tokens
        if (markdown.trim() === '-' || markdown.trim() === '>' ) {
          // list / quote prefix at cursor line
          const before = prev.slice(0, start);
          const after = prev.slice(start);
          return before + markdown + ' ' + after;
        }
        const beforeSel = prev.slice(0, start);
        const selText = prev.slice(start, end);
        const afterSel = prev.slice(end);
        return beforeSel + markdown + selText + markdown + afterSel;
      });
      return;
    }
    // iOS fallback
    setContent((prev) => prev + markdown);
  };

  // Генерация простого уникального ID
  const generateId = () => {
    return Date.now().toString() + Math.floor(Math.random() * 10000).toString();
  };

  // Обработка добавления изображения
  const handleImageAdded = (uri: string, width: number, height: number, x: number, y: number) => {
    const newAttachment = {
      id: generateId(),
      uri,
      width,
      height,
      x,
      y
    };
    setMediaAttachments(prev => [...prev, newAttachment]);
    setShowMediaOptions(false);
  };

  // Обработка удаления изображения
  const handleImageDeleted = (id: string) => {
    setMediaAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };

  // Handle image resize
  const handleImageResized = (id: string, width: number, height: number) => {
    setMediaAttachments(prev => prev.map(attachment => 
      attachment.id === id ? { ...attachment, width, height } : attachment
    ));
  };

  // Handle image movement
  const handleImageMoved = (id: string, dx: number, dy: number) => {
    setMediaAttachments(prev => prev.map(attachment => {
      if (attachment.id === id) {
        // Calculate new position by adding the delta to the current position
        const newX = Number(attachment.x || 0) + dx;
        const newY = Number(attachment.y || 0) + dy;
        return { ...attachment, x: newX, y: newY };
      }
      return attachment;
    }));
  };

  useEffect(() => {
    // Ищем все уникальные URL в тексте
    if (Platform.OS === 'android') return;
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
            <IconButton 
              icon={showToolbar ? 'keyboard-close' : 'format-text'} 
              size={20} 
              iconColor={c.primary}
              style={[styles.toolbarToggle, showToolbar && { backgroundColor: c.primary + '20' }]}
            />
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
          style={[
            styles.titleInput, 
            { 
              backgroundColor: 'transparent', 
              color: c.text,
              fontSize: currentStyle === 'title' ? 32 : currentStyle === 'heading' ? 28 : 24,
              fontWeight: currentStyle === 'title' || currentStyle === 'heading' ? 'bold' : '600'
            }
          ]}
          underlineColor="transparent"
          placeholderTextColor={c.placeholder}
          theme={{ colors: { text: c.text, placeholder: c.placeholder, primary: c.primary } }}
        />
        
        {/* Small date indicator - iOS style */}
        <Text style={[styles.dateText, { color: c.placeholder }]}>
          {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
        
        {/* Platform-Specific Rich Text Editor */}
        {Platform.OS === 'android' ? (
          <AndroidRichTextEditor
            ref={editorRef as React.RefObject<AndroidEditorRef>}
            value={content}
            onChangeText={setContent}
            placeholder={t('note_text_placeholder', 'Текст заметки...')}
            onFocus={() => setShowToolbar(false)} // Android has built-in toolbar
            onBlur={() => setShowToolbar(false)}
            style={styles.editorContainer}
          />
        ) : Platform.OS === 'web' ? (
          <SimpleAdvancedEditor
            ref={editorRef as React.RefObject<SimpleEditorRef>}
            value={content}
            onChangeText={setContent}
            placeholder={t('note_text_placeholder', 'Текст заметки...')}
            onFocus={() => setShowToolbar(true)}
            onBlur={() => setShowToolbar(false)}
            showToolbar={false} // Hide built-in toolbar for web, use external
            style={styles.editorContainer}
          />
        ) : (
          <SimpleAdvancedEditor
            ref={editorRef as React.RefObject<SimpleEditorRef>}
            value={content}
            onChangeText={setContent}
            placeholder={t('note_text_placeholder', 'Текст заметки...')}
            onFocus={() => setShowToolbar(true)}
            onBlur={() => setShowToolbar(false)}
            showToolbar={false} // Hide built-in toolbar for iOS, use external
            style={styles.editorContainer}
          />
        )}
        
        {/* Audio Files */}
        {audioFiles.length > 0 && (
          <View style={styles.audioSection}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Аудиофайлы
            </Text>
            {audioFiles.map((audio) => (
              <AudioPlayer
                key={audio.id}
                uri={audio.uri}
                name={audio.name}
                duration={audio.duration}
                onDelete={() => handleAudioDeleted(audio.id)}
              />
            ))}
          </View>
        )}

        {/* Media Attachments for Android */}
        {Platform.OS === 'android' && mediaAttachments.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Изображения
            </Text>
            {mediaAttachments.map((attachment) => (
              <ResizableImage
                key={attachment.id}
                uri={attachment.uri}
                initialWidth={attachment.width}
                initialHeight={attachment.height}
                onDelete={() => handleImageDeleted(attachment.id)}
                onResize={(w, h) => handleImageResized(attachment.id, w, h)}
                onMove={(x, y) => handleImageMoved(attachment.id, x, y)}
              />
            ))}
          </View>
        )}

        {/* Media Options */}
        {showMediaOptions && (
          <MediaAttachment
            attachments={mediaAttachments}
            onImageAdded={handleImageAdded}
            onImageDeleted={handleImageDeleted}
            onImageResized={handleImageResized}
            onImageMoved={handleImageMoved}
          />
        )}
      </ScrollView>
      
      {/* Toolbar - Only for iOS/Web (Android has built-in toolbar) */}
      {Platform.OS !== 'android' && showToolbar && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <AppleNotesToolbar
            onFormat={handleAppleNotesFormat}
            onImagePicker={handleImagePicker}
            onAudioPicker={handleAudioPicker}
            visible={showToolbar}
            selectedFormats={selectedFormats}
          />
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
  toolbarToggle: {
    borderRadius: 8,
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
  editorContainer: {
    position: 'relative',
    minHeight: 300,
    width: '100%',
  },
  mediaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  audioSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  imageSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  editor: {
    minHeight: 300,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    zIndex: 1,
  },
  androidEditor: {
    minHeight: 300,
    backgroundColor: 'transparent',
    fontSize: 16,
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
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolbar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingVertical: 8,
    flex: 1,
  },
  mediaButton: {
    marginRight: 8,
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