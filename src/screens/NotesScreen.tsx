import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, SafeAreaView, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button, List, IconButton, TextInput, Dialog, Portal, Searchbar, SegmentedButtons, Card, Appbar, useTheme } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Sidebar, { FolderNode } from '../components/Sidebar';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notesEventBus from '../utils/notesEventBus';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import IOSContextMenu from '../components/IOSContextMenu';
import HTML from 'react-native-render-html';
import { WebView } from 'react-native-webview';
import { saveNoteLocal } from '../services/notesService';

// Для MVP: добавим статус заметки (только для Канбан-доски)
type NoteStatus = 'todo' | 'inprogress' | 'done';

// Универсальный тип заметки/папки
interface NoteItem {
  id: string;
  title: string;
  isFolder: boolean;
  pinned: boolean;
  status?: NoteStatus; // только для заметок
  children?: NoteItem[];
  content?: string; // добавлено для хранения содержимого заметки
  timestamp?: number; // время создания/изменения заметки в миллисекундах
}

const initialNotes: NoteItem[] = [];

// Рекурсивное удаление по id
function removeById(items: NoteItem[], id: string): NoteItem[] {
  return items
    .filter(item => item.id !== id)
    .map(item =>
      item.children ? { ...item, children: removeById(item.children, id) } : item
    );
}

// Рекурсивное закрепление по id
function togglePinById(items: NoteItem[], id: string): NoteItem[] {
  return items.map(item => {
    if (item.id === id) {
      return { ...item, pinned: !item.pinned };
    }
    if (item.children) {
      return { ...item, children: togglePinById(item.children, id) };
    }
    return item;
  });
}

// Рекурсивный поиск и перемещение элемента
function moveItem(items: NoteItem[], itemId: string, targetFolderId: string | null): NoteItem[] {
  let movedItem: NoteItem | null = null;
  // 1. Удаляем элемент из текущего места
  function remove(items: NoteItem[]): NoteItem[] {
    return items
      .filter(item => {
        if (item.id === itemId) {
          movedItem = item;
          return false;
        }
        return true;
      })
      .map(item =>
        item.children ? { ...item, children: remove(item.children) } : item
      );
  }
  let newItems = remove(items);
  // 2. Вставляем в целевую папку
  if (movedItem) {
    if (targetFolderId) {
      function insert(items: NoteItem[]): NoteItem[] {
        return items.map(item => {
          if (item.id === targetFolderId && item.isFolder) {
            return {
              ...item,
              children: item.children ? [...item.children, movedItem!] : [movedItem!],
            };
          }
          if (item.children) {
            return { ...item, children: insert(item.children) };
          }
          return item;
        });
      }
      newItems = insert(newItems);
    } else {
      newItems.push(movedItem);
    }
  }
  return newItems;
}

// Helper function to determine if content has complex formatting
const hasComplexContent = (content?: string): boolean => {
  if (!content) return false;
  
  // Check for various formatting elements
  const hasChecklist = /- \[(x| )\] (.+?)(?=\n|$)/g.test(content);
  const hasBulletList = /^- (.+?)(?=\n|$)/gm.test(content);
  const hasNumberedList = /^\d+\. (.+?)(?=\n|$)/gm.test(content);
  const hasImage = /!\[(.*)\]\((.+?)\)/g.test(content);
  const hasHeadings = /^#+\s.+$/gm.test(content);
  const hasCodeBlock = /```[\s\S]*?```/g.test(content);
  
  return hasChecklist || hasBulletList || hasNumberedList || hasImage || hasHeadings || hasCodeBlock;
};

// Helper function to convert markdown to HTML with enhanced styling
const convertMarkdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  // Convert headings with proper styling
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #FFFFFF;">$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #FFFFFF;">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #FFFFFF;">$1</h3>');
  
  // Convert bold and italic with proper styling
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold; color: #FFFFFF;">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em style="font-style: italic; color: #FFFFFF;">$1</em>');
  
  // Convert checkboxes with custom rendering
  html = html.replace(/- \[(x)\] (.+?)(?=\n|$)/g, 
    '<div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 8px;">' +
    '<div style="width: 18px; height: 18px; border-radius: 4px; background-color: #4CAF50; margin-right: 10px; display: flex; justify-content: center; align-items: center;">' +
    '<span style="color: white; font-size: 12px;">✓</span>' +
    '</div>' +
    '<span style="color: #999999; text-decoration: line-through;">$2</span>' +
    '</div>');
    
  html = html.replace(/- \[ \] (.+?)(?=\n|$)/g, 
    '<div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 8px;">' +
    '<div style="width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid #999999; margin-right: 10px;"></div>' +
    '<span style="color: #FFFFFF;">$1</span>' +
    '</div>');
  
  // Convert bullet lists with proper styling
  html = html.replace(/^- (.+?)(?=\n|$)/gm, (match, p1) => {
    // Skip if this is a checkbox item
    if (match.includes('- [') && (match.includes('- [x]') || match.includes('- [ ]'))) {
      return match;
    }
    return '<div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 8px;">' +
           '<div style="width: 6px; height: 6px; border-radius: 3px; background-color: #FFFFFF; margin-right: 10px; margin-left: 5px;"></div>' +
           '<span style="color: #FFFFFF;">'+p1+'</span>' +
           '</div>';
  });
  
  // Convert numbered lists with proper styling
  html = html.replace(/^(\d+)\. (.+?)(?=\n|$)/gm, 
    '<div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 8px;">' +
    '<span style="color: #FFFFFF; margin-right: 8px; width: 16px; text-align: right;">$1.</span>' +
    '<span style="color: #FFFFFF;">$2</span>' +
    '</div>');
  
  // Convert images with placeholder styling
  html = html.replace(/!\[(.*)\]\((.+?)\)/g, 
    '<div style="display: flex; flex-direction: column; align-items: center; margin: 10px 0;">' +
    '<div style="width: 100px; height: 80px; background-color: #333333; border-radius: 8px; display: flex; justify-content: center; align-items: center;">' +
    '<span style="color: #999999; font-size: 24px;">🖼️</span>' +
    '</div>' +
    '<span style="color: #CCCCCC; font-size: 12px; margin-top: 5px;">$1</span>' +
    '</div>');
  
  // Convert links with proper styling
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #4CAF50; text-decoration: underline;">$1</a>');
  
  // Convert code blocks with proper styling
  html = html.replace(/```([\s\S]*?)```/g, 
    '<div style="background-color: #333333; border-radius: 8px; padding: 10px; margin: 10px 0; overflow-x: auto;">' +
    '<pre style="color: #CCCCCC; font-family: monospace; margin: 0;"><code>$1</code></pre>' +
    '</div>');
  
  // Convert inline code with proper styling
  html = html.replace(/`(.+?)`/g, '<code style="background-color: #333333; border-radius: 4px; padding: 2px 4px; color: #CCCCCC; font-family: monospace;">$1</code>');
  
  // Convert blockquotes with proper styling
  html = html.replace(/^> (.+?)(?=\n|$)/gm, 
    '<div style="border-left: 3px solid #4CAF50; padding-left: 10px; margin: 10px 0;">' +
    '<span style="color: #CCCCCC; font-style: italic;">$1</span>' +
    '</div>');
  
  // Convert paragraphs with proper styling
  const paragraphs = html.split('\n\n');
  html = paragraphs.map(p => {
    // Skip if paragraph already has HTML tags
    if (p.trim() === '' || /<[a-z][\s\S]*>/i.test(p)) {
      return p;
    }
    return '<p style="color: #FFFFFF; margin-bottom: 10px;">' + p.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');
  
  return html;
};

// Helper function to extract emoji from text
const extractEmoji = (text: string): { emoji: string | null, remainingText: string } => {
  // Common emoji patterns
  const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Emoji_Modifier_Base}|\p{Emoji_Component})+/u;
  const match = text.match(emojiRegex);
  
  if (match && match[0]) {
    return {
      emoji: match[0],
      remainingText: text.slice(match[0].length).trim()
    };
  }
  
  // Check for food emoji patterns in text
  const foodEmojiMap = {
    // Grocery items
    'eggs': '🥚',
    'egg': '🥚',
    'milk': '🥛',
    'sugar': '🧂',
    'flour': '🌾',
    'bread': '🍞',
    'rice': '🍚',
    'onions': '🧅',
    'onion': '🧅',
    'beef': '🥩',
    'chicken': '🍗',
    'lettuce': '🥬',
    'tomato': '🍅',
    'tomatoes': '🍅',
    'potato': '🥔',
    'potatoes': '🥔',
    'carrot': '🥕',
    'carrots': '🥕',
    'corn': '🌽',
    'cheese': '🧀',
    'butter': '🧈',
    'apple': '🍎',
    'apples': '🍎',
    'banana': '🍌',
    'bananas': '🍌',
    'orange': '🍊',
    'oranges': '🍊',
    'lemon': '🍋',
    'lemons': '🍋',
    'strawberry': '🍓',
    'strawberries': '🍓',
    'blueberry': '🫐',
    'blueberries': '🫐',
    'fish': '🐟',
    'shrimp': '🦐',
    'pasta': '🍝',
    'noodles': '🍜',
    'pizza': '🍕',
    'hamburger': '🍔',
    'sushi': '🍣',
    'cake': '🍰',
    'cookie': '🍪',
    'cookies': '🍪',
    'chocolate': '🍫',
    'candy': '🍬',
    'wine': '🍷',
    'beer': '🍺',
    'coffee': '☕',
    'tea': '🍵',
    'water': '💧',
    'salt': '🧂',
    'pepper': '🌶️',
    
    // Travel items
    'tent': '⛺',
    'backpack': '🎒',
    'camera': '📷',
    'map': '🗺️',
    'compass': '🧭',
    'flashlight': '🔦',
    'sunscreen': '🧴',
    'sunglasses': '🕶️',
    'hat': '🧢',
    'boots': '👢',
    'ticket': '🎫',
    'passport': '📔',
    'hotel': '🏨',
    'beach': '🏖️',
    'mountain': '⛰️',
    'forest': '🌲',
    'lake': '🏞️',
    'camp': '🏕️',
    'hiking': '🥾',
    'swimming': '🏊'
  };
  
  // Check if the text contains any of the food keywords
  for (const [keyword, emoji] of Object.entries(foodEmojiMap)) {
    // Check for whole word match with word boundaries
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text.toLowerCase())) {
      return {
        emoji: emoji,
        remainingText: text
      };
    }
  }
  
  return {
    emoji: null,
    remainingText: text
  };
};

const NotesScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors, roundness } = theme;
  // Create a properly typed colors object that includes our custom theme colors
  const c = colors as typeof theme.colors & {
    noteItem: string;
    noteItemSelected: string;
    noteItemBorder: string;
    folderItem: string;
    folderItemText: string;
    swipeDelete: string;
    swipePin: string;
    modalBackground: string;
    modalBorder: string;
    toolbarBackground: string;
    editorBackground: string;
    statusBarContent: 'dark-content' | 'light-content';
    placeholder: string;
    border: string;
    chipBg: string;
    chipText: string;
    text: string;
    onSurface: string;
    background: string;
  };
  
  // Define styles inside the component to access theme colors
  const styles = StyleSheet.create({
  viewSwitcherButton: {
    margin: 0,
    padding: 0,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  gridItem: {
    width: '50%',
    padding: 8,
  },
  gridItemContent: {
    borderRadius: 16,
    padding: 16,
    minHeight: 150,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    backgroundColor: '#1E1E1E', // Dark background to match screenshot
  },
  gridItemContentLarge: {
    minHeight: 220,
  },
  gridPinIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    backgroundColor: '#FFD700',
    borderBottomLeftRadius: 12,
  },
  gridItemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF', // White text for dark background
  },
  gridItemPreview: {
    fontSize: 14,
    marginBottom: 8,
    flex: 1,
    color: '#FFFFFF', // White text for dark background
  },
  gridItemDate: {
    fontSize: 12,
    color: '#999999', // Light gray for date text
    marginTop: 'auto',
  },
  previewContent: {
    flex: 1,
    marginBottom: 4,
    maxHeight: 200, // Allow more space for content
    overflow: 'hidden',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#999999', // Light gray border
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50', // Green for checked items
    borderColor: '#4CAF50',
  },
  checklistText: {
    fontSize: 15,
    color: '#FFFFFF', // White text for dark background
    flex: 1,
    fontWeight: '400',
  },
  checklistTextChecked: {
    textDecorationLine: 'line-through',
    color: '#999999', // Light gray for checked items
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF', // White bullet points for dark background
    marginRight: 10,
    marginLeft: 5,
  },
  numberPoint: {
    fontSize: 14,
    color: '#FFFFFF', // White text for dark background
    marginRight: 8,
    width: 16,
    textAlign: 'right',
  },
  listText: {
    fontSize: 14,
    color: '#FFFFFF', // White text for dark background
    flex: 1,
  },
  imagePreviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
  },
  imagePreviewPlaceholder: {
    width: 100,
    height: 80,
    backgroundColor: '#333333',
    borderRadius: 8,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCaption: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 5,
  },
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  timeGroupHeader: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
    color: c.text,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: c.text,
    letterSpacing: -0.5,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: '500',
  },
  headerButtonPlaceholder: {
    width: 40,
  },
  notesMain: {
    flex: 1,
    paddingHorizontal: 1,
    paddingTop: 12, // корректировка отступов
    paddingBottom: 0,
  },
  searchBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  iosSearchField: {
    height: 36,
    backgroundColor: c.chipBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 17,
    color: c.text,
    width: '100%',
  },
  notesListBlock: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  noteCardContainer: {
    backgroundColor: c.noteItem,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginHorizontal: 2,
  },
  noteCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteContentWrapper: {
    flex: 1,
    marginRight: 8,
  },
  noteTitle: {
    fontWeight: '600',
    fontSize: 17,
    color: c.text,
    marginBottom: 4,
  },
  pinnedIndicator: {
    opacity: 0.8,
  },
  notePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteTime: {
    fontSize: 15,
    color: c.placeholder,
    marginRight: 6,
    fontWeight: '400',
  },
  noteSubtitle: {
    fontSize: 15,
    color: c.placeholder,
    flex: 1,
    fontWeight: '400',
  },
  noteAccessoryContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  noteAccessoryIcon: {
    margin: 0,
    padding: 0,
  },
  addButtonContainer: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    elevation: 2,
    zIndex: 100,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '400',
    marginTop: -4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  webSidebarWrap: {
    position: 'absolute',
    left: 0,
    top: 56, // высота AppBar
    bottom: 0,
    width: 280,
    zIndex: 10,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)',
  },
  mobileSidebarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    flexDirection: 'row',
  },
  mobileSidebar: {
    width: 280,
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlayCustom: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCustom: {
    minWidth: 320,
    maxWidth: 400,
    width: '90%',
    padding: 24,
    borderRadius: 18,
    backgroundColor: c.modalBackground,
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  modalTitleCustom: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: c.text,
  },
  modalInputCustom: {
    marginBottom: 12,
    fontSize: 16,
    borderRadius: 12,
  },
  modalButtonRowCustom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  modalCancelBtnCustom: {
    flex: 1,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1.5,
  },
  modalAddBtnCustom: {
    flex: 1,
    borderRadius: 12,
    marginLeft: 8,
  },
  swipeActionContainer: {
    flexDirection: 'row',
    width: 90,
    height: '80%',
    marginTop: 2,
  },
  swipeDeleteButton: {
    backgroundColor: c.swipeDelete,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  swipeActionIcon: {
    margin: 0,
    padding: 0,
    marginBottom: -2,
  },
  swipeActionText: {
    color: c.onSurface,
    fontSize: 13,
    fontWeight: '600',
  },
  iosModalContent: {
    backgroundColor: c.modalBackground,
    borderRadius: 14,
    padding: 20,
    width: '90%',
    maxWidth: 340,
  },
  iosModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  iosModalInput: {
    height: 44,
    backgroundColor: c.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 17,
    marginBottom: 16,
    color: c.text,
  },
  iosTypeToggle: {
    padding: 8,
    marginBottom: 16,
  },
  iosTypeToggleText: {
    fontSize: 15,
    color: c.primary,
    textAlign: 'center',
  },
  iosModalHint: {
    fontSize: 13,
    color: c.placeholder,
    marginBottom: 16,
  },
  iosModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: c.border,
    marginHorizontal: -20,
    marginBottom: -20,
  },
  iosModalCancelButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: c.border,
  },
  iosModalCancelText: {
    color: c.primary,
    fontSize: 17,
    fontWeight: '400',
  },
  iosModalActionButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosModalActionText: {
    color: c.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  });
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [showDialog, setShowDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isFolder, setIsFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moveSource, setMoveSource] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'kanban'>('tree');
  const [viewType, setViewType] = useState<'list' | 'grid'>('list');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSidebarFilter, setActiveSidebarFilter] = useState<string | null>(null);
  const navigation = useNavigation();
  const isWeb = Platform.OS === 'web';
  const [renameDialog, setRenameDialog] = useState<{id: string, isFolder: boolean} | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [createMode, setCreateMode] = useState<'note' | 'folder' | 'both'>('both');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTarget, setMenuTarget] = useState<{ id: string; isFolder: boolean } | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingNewNoteId, setPendingNewNoteId] = useState<string | null>(null);
  const [pendingNewNoteTitle, setPendingNewNoteTitle] = useState<string>('');

  // Функция для загрузки всех заметок и папок из AsyncStorage
  const loadAllNotes = async () => {
    const savedNotesRaw = await AsyncStorage.getItem('notes');
    const savedFolder = await AsyncStorage.getItem('lastFolder');
    if (savedNotesRaw) {
      const savedNotes: NoteItem[] = JSON.parse(savedNotesRaw);

      // Также загрузим содержимое для каждой заметки, которое хранится отдельно
      async function loadContentRecursively(items: NoteItem[]): Promise<NoteItem[]> {
        return Promise.all(items.map(async item => {
          if (item.isFolder && item.children) {
            return { ...item, children: await loadContentRecursively(item.children) };
          }
          if (!item.isFolder) {
            try {
              const noteRaw = await AsyncStorage.getItem(`note_${item.id}`);
              if (noteRaw) {
                let note;
                try {
                  note = JSON.parse(noteRaw);
                } catch {
                  note = null;
                }
                // Если заметка повреждена или невалидна, создаём дефолтную
                if (!note || typeof note !== 'object') {
                  note = { id: item.id, title: item.title, content: '', mediaAttachments: [], timestamp: item.timestamp };
                } else {
                  // Гарантируем наличие обязательных полей
                  if (typeof note.content !== 'string') note.content = '';
                  if (!Array.isArray(note.mediaAttachments)) note.mediaAttachments = [];
                  if (typeof note.title !== 'string') note.title = item.title;
                  if (!note.id) note.id = item.id;
                  if (!note.timestamp) note.timestamp = item.timestamp;
                }
                return { ...item, content: note.content, title: note.title };
              } else {
                // Если заметка не найдена в хранилище, создаём дефолтную
                return { ...item, content: '', title: item.title };
              }
            } catch {
              // Если ошибка при чтении — создаём дефолтную
              return { ...item, content: '', title: item.title };
            }
          }
          return item;
        }));
      }

      const notesWithContent = await loadContentRecursively(savedNotes);
      setNotes(notesWithContent);
    } else {
      setNotes(initialNotes);
    }
    if (savedFolder) setActiveSidebarFilter(savedFolder);
  };

  useEffect(() => {
    loadAllNotes();

    // Подписка на события
    const handlers = {
      reset: () => {
        loadAllNotes();
      },
      noteUpdated: ({ id, timestamp }: { id: string; timestamp: number }) => {
        setNotes(prev => {
          // Рекурсивно обновляем таймстемп заметки
          function updateNoteTimestamp(items: NoteItem[]): NoteItem[] {
            return items.map(item => {
              if (item.id === id) {
                return { ...item, timestamp };
              }
              if (item.children) {
                return { ...item, children: updateNoteTimestamp(item.children) };
              }
              return item;
            });
          }
          return updateNoteTimestamp(prev);
        });
      }
    };

    notesEventBus.on('reset', handlers.reset);
    notesEventBus.on('noteUpdated', handlers.noteUpdated);

    return () => {
      notesEventBus.off('reset', handlers.reset);
      notesEventBus.off('noteUpdated', handlers.noteUpdated);
    };
  }, []);

  useEffect(() => {
    // Подписка на фокус (возврат с экрана NoteEditor)
    const focusUnsubscribe = navigation.addListener('focus', () => {
      loadAllNotes(); // Перезагружаем все данные при фокусе
    });

    return () => {
      focusUnsubscribe();
    };
  }, [navigation]); // Зависимость только от navigation

  useEffect(() => {
    AsyncStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (activeSidebarFilter !== null) {
      AsyncStorage.setItem('lastFolder', activeSidebarFilter);
    }
  }, [activeSidebarFilter]);

  useEffect(() => {
    if (pendingNewNoteId) {
      // Проверяем, появилась ли заметка в notes
      const noteExists = (function find(items: NoteItem[]): boolean {
        for (const item of items) {
          if (item.id === pendingNewNoteId) return true;
          if (item.children) {
            if (find(item.children)) return true;
          }
        }
        return false;
      })(notes);

      if (noteExists) {
        // Гарантируем, что id и title — строки
        const id = String(pendingNewNoteId);
        const title = String(pendingNewNoteTitle);
        console.log('Navigate to NoteEditor', { id, title, typeofId: typeof id, typeofTitle: typeof title });
        // Передаём параметры как объект, не массив
        navigation.navigate('NoteEditor', { id, title });
        setPendingNewNoteId(null);
        setPendingNewNoteTitle('');
      }
    }
  }, [notes, pendingNewNoteId, pendingNewNoteTitle]);

  // Функция для определения уровня вложенности папки по id
  function getFolderLevel(items: NoteItem[], folderId: string | null, level = 0): number | null {
    if (!folderId) return 0;
    for (const item of items) {
      if (item.id === folderId && item.isFolder) return level + 1;
      if (item.children) {
        const found = getFolderLevel(item.children, folderId, level + 1);
        if (found) return found;
      }
    }
    return null;
  }
  const activeFolderLevel = getFolderLevel(notes, activeSidebarFilter) ?? 0;

  // Функция для открытия диалога создания с учетом ограничений
  const openCreateDialog = (context: 'sidebar' | 'main' = 'main') => {
    // В корне: только папка
    if (activeSidebarFilter == null) {
      setIsFolder(true);
      setCreateMode('folder');
      setShowDialog(true);
      return;
    }
    // В папке 1-го уровня: можно и папку, и заметку
    if (activeFolderLevel === 1) {
      setIsFolder(context === 'sidebar'); // если из Sidebar — по умолчанию папка, иначе заметка
      setCreateMode('both');
      setShowDialog(true);
      return;
    }
    // В папке 2-го уровня: только заметка
    if (activeFolderLevel >= 2) {
      setIsFolder(false);
      setCreateMode('note');
      setShowDialog(true);
      return;
    }
  };

  // handleAdd: разрешаем создавать папки в корне, если выбран 'Корень'
  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    
    const currentTimestamp = Date.now();
    const newId = Math.random().toString(36).substring(2, 11);
    const newItem: NoteItem = {
      id: newId,
      title: newTitle.trim(),
      isFolder: isFolder,
      pinned: false,
      status: isFolder ? undefined : 'todo',
      children: isFolder ? [] : undefined,
      timestamp: isFolder ? undefined : currentTimestamp, // Добавляем таймстемп только для заметок, не для папок
    };
    
    setNotes(prev => {
      // Если выбрана папка в сайдбаре, добавляем в неё
      if (activeSidebarFilter && activeSidebarFilter !== 'fav') {
        function addToFolder(items: NoteItem[]): NoteItem[] {
          return items.map(item => {
            if (item.id === activeSidebarFilter && item.isFolder) {
              return {
                ...item,
                children: [...(item.children || []), newItem],
              };
            }
            if (item.children) {
              return { ...item, children: addToFolder(item.children) };
            }
            return item;
          });
        }
        return addToFolder(prev);
      }
      // Иначе добавляем в корень
      return [...prev, newItem];
    });
    
    // Если создаём заметку (не папку), сразу сохраняем её в AsyncStorage
    if (!isFolder) {
      await saveNoteLocal({
        id: newId,
        title: newTitle.trim(),
        content: '',
        timestamp: currentTimestamp,
        mediaAttachments: [],
      });
    }
    
    setShowDialog(false);
    setNewTitle('');
    // Сбрасываем выбор источника перемещения
    setMoveSource(null);
    
    // Если создали заметку, сохраняем id и title для перехода позже
    if (!isFolder) {
      setPendingNewNoteId(newId);
      setPendingNewNoteTitle(newTitle.trim());
    }
  };

  // Удаление (рекурсивно)
  const handleDelete = (id: string) => {
    setNotes(prev => removeById(prev, id));
  };

  // Закрепление (рекурсивно)
  const handlePin = (id: string) => {
    setNotes(prev => togglePinById(prev, id));
  };

  // Перемещение (drag-and-drop между папками)
  const handleMove = (itemId: string, targetFolderId: string | null) => {
    setNotes(prev => moveItem(prev, itemId, targetFolderId));
    setMoveSource(null);
    setMoveTarget(null);
  };

  // Свайп-действия
  const renderRightActions = (id: string, pinned: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton icon={pinned ? 'pin-off' : 'pin'} onPress={() => handlePin(id)} />
      <IconButton icon="delete" onPress={() => handleDelete(id)} />
      <IconButton icon="arrow-right-bold" onPress={() => setMoveSource(id)} />
    </View>
  );

  // Рекурсивный рендеринг дерева с drag-and-drop и свайпами
  function renderTree(items: NoteItem[], level = 0) {
    return items.map(item => (
      <View key={item.id} style={{ marginLeft: level * 20 }}>
        <Swipeable renderRightActions={() => renderRightActions(item.id, item.pinned)}>
          <List.Item
            title={item.title + (item.pinned ? ' 📌' : '')}
            left={props => (
              item.isFolder ? <List.Icon {...props} icon="folder" /> : <List.Icon {...props} icon="note-outline" />
            )}
            right={props => (
              moveSource && item.isFolder && moveSource !== item.id ? (
                <IconButton icon="arrow-down-bold" onPress={() => handleMove(moveSource, item.id)} />
              ) : null
            )}
            style={{
              backgroundColor: moveSource === item.id ? '#e0e0e0' : '#fff',
              borderRadius: 8,
              marginVertical: 2,
              opacity: item.pinned ? 1 : 0.8,
            }}
            onLongPress={() => setMoveSource(item.id)}
            onPress={() => {
              if (!item.isFolder) {
                // @ts-ignore
                navigation.navigate('NoteEditor', { id: item.id, title: item.title });
              }
            }}
          />
        </Swipeable>
        {item.isFolder && item.children && renderTree(item.children, level + 1)}
      </View>
    ));
  }

  // Рекурсивный фильтр по заголовку и (будущему) содержимому
  function filterNotes(items: NoteItem[], query: string): NoteItem[] {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items
      .map(item => {
        const children = item.children ? filterNotes(item.children, query) : undefined;
        const matchTitle = item.title.toLowerCase().includes(q);
        // Для расширения: добавить matchContent, если появится поле content
        if (matchTitle || (children && children.length > 0)) {
          return { ...item, children };
        }
        return null;
      })
      .filter(Boolean) as NoteItem[];
  }

  // Для Канбан-доски: собираем все заметки (не папки) в плоский массив
  function flattenNotes(items: NoteItem[]): NoteItem[] {
    let result: NoteItem[] = [];
    for (const item of items) {
      if (item.isFolder && item.children) {
        result = result.concat(flattenNotes(item.children));
      } else if (!item.isFolder) {
        result.push(item);
      }
    }
    return result;
  }

  // Обновление статуса заметки
  const updateNoteStatus = (id: string, status: NoteStatus) => {
    function update(items: NoteItem[]): NoteItem[] {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, status };
        }
        if (item.children) {
          return { ...item, children: update(item.children) };
        }
        return item;
      });
    }
    setNotes(prev => update(prev));
  };

  // Канбан-доска
  function renderKanban(notes: NoteItem[]) {
    const allNotes = flattenNotes(notes);
    const columns: { key: NoteStatus; title: string }[] = [
      { key: 'todo', title: t('kanban_todo', 'To Do') },
      { key: 'inprogress', title: t('kanban_inprogress', 'In Progress') },
      { key: 'done', title: t('kanban_done', 'Done') },
    ];
    return (
      <ScrollView horizontal style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', minHeight: 300 }}>
          {columns.map(col => (
            <View key={col.key} style={{ width: 260, marginRight: 16 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>{col.title}</Text>
              {allNotes.filter(n => (n.status || 'todo') === col.key).map(n => (
                <Card key={n.id} style={{ marginBottom: 8 }}>
                  <Card.Title
                    title={n.title + (n.pinned ? ' 📌' : '')}
                    right={props => (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="arrow-left" onPress={() => updateNoteStatus(n.id, col.key === 'todo' ? 'done' : col.key === 'inprogress' ? 'todo' : 'inprogress')} />
                        <IconButton icon="arrow-right" onPress={() => updateNoteStatus(n.id, col.key === 'todo' ? 'inprogress' : col.key === 'inprogress' ? 'done' : 'todo')} />
                      </View>
                    )}
                  />
                </Card>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Формируем структуру папок и заметок для Sidebar
  function extractFolders(items: NoteItem[]): FolderNode[] {
    return items
      .filter(item => item.isFolder)
      .map(item => ({
        id: item.id,
        title: item.title,
        children: item.children ? extractFolders(item.children) : undefined,
        notes: item.children
          ? item.children.filter(n => !n.isFolder).map(n => ({ id: n.id, title: n.title }))
          : [],
      }));
  }
  const folders = extractFolders(notes);

  // Фильтрация заметок по выбранной папке/фильтру
  function filterBySidebar(items: NoteItem[]): NoteItem[] {
    if (activeSidebarFilter === 'fav') {
      // Только закреплённые (рекурсивно)
      function filterPinned(items: NoteItem[]): NoteItem[] {
        return items
          .map(item => {
            const children = item.children ? filterPinned(item.children) : undefined;
            if (item.pinned || (children && children.length > 0)) {
              return { ...item, children };
            }
            return null;
          })
          .filter(Boolean) as NoteItem[];
      }
      return filterPinned(items);
    }
    if (activeSidebarFilter && activeSidebarFilter !== 'fav') {
      // Только из выбранной папки (и вложенных)
      function findFolder(items: NoteItem[]): NoteItem | null {
        for (const item of items) {
          if (item.id === activeSidebarFilter && item.isFolder) return item;
          if (item.children) {
            const found = findFolder(item.children);
            if (found) return found;
          }
        }
        return null;
      }
      const folder = findFolder(items);
      return folder && folder.children ? folder.children : [];
    }
    // Все заметки
    return items;
  }

  // Функция для группировки заметок по времени
  function groupNotesByTime(notes: NoteItem[]) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const todayTimestamp = today.getTime();
    const yesterdayTimestamp = yesterday.getTime();
    const thirtyDaysAgoTimestamp = thirtyDaysAgo.getTime();
    
    // Группируем заметки по времени на основе реальных таймстемпов
    return {
      today: notes.filter(note => {
        // Если у заметки нет таймстемпа, добавляем её в сегодняшние
        if (!note.timestamp) return true;
        return note.timestamp >= todayTimestamp;
      }),
      yesterday: notes.filter(note => {
        if (!note.timestamp) return false;
        return note.timestamp >= yesterdayTimestamp && note.timestamp < todayTimestamp;
      }),
      previous30Days: notes.filter(note => {
        if (!note.timestamp) return false;
        return note.timestamp >= thirtyDaysAgoTimestamp && note.timestamp < yesterdayTimestamp;
      })
    };
  }

  // Форматирование времени для заметки (например, "13:21")
  function formatNoteTime(note: NoteItem) {
    // Если у заметки нет таймстемпа, используем текущее время
    const timestamp = note.timestamp || Date.now();
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Функция сортировки заметок по времени (новые сверху)
  function sortNotesByTimestamp(notes: NoteItem[]): NoteItem[] {
    return [...notes].sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampB - timestampA; // Сортировка по убыванию (новые сверху)
    });
  }

  // Рендер сетки заметок (плитками)
  function renderNotesGrid(items: NoteItem[]) {
    // Только заметки (не папки)
    const notes = items.filter(item => !item.isFolder);
    if (notes.length === 0) {
      return <Text style={[styles.emptyText, { color: c.placeholder }]}>{t('no_notes', 'Нет заметок')}</Text>;
    }
    
    // Группируем заметки по времени (так же как в списке)
    const groupedNotes = groupNotesByTime(notes);
    
    // Сортируем заметки по времени (сначала новые)
    const sortedToday = groupedNotes.today.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const sortedYesterday = groupedNotes.yesterday.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const sortedPrevious30Days = groupedNotes.previous30Days.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Функция для рендеринга заметки в виде плитки
    const renderGridItem = (note: NoteItem) => {
      // Render note preview content to match the editor view
      const renderNotePreview = () => {
        if (!note.content) {
          return <Text style={styles.gridItemPreview}>{t('note_preview_placeholder', 'No text')}</Text>;
        }

        // Process content for preview
        let content = note.content;
        
        // Check for different content types
        const hasChecklist = /- \[(x| )\] (.+?)(?=\n|$)/g.test(content);
        const hasBulletList = /^- (.+?)(?=\n|$)/gm.test(content) && !hasChecklist;
        const hasImage = /!\[(.*)\]\((.+?)\)/g.test(content);
        
        // For checklist items (most common in the screenshot)
        if (hasChecklist) {
          const checklistRegex = /- \[(x| )\] (.+?)(?=\n|$)/g;
          const checklistItems = [];
          let match;
          let count = 0;
          const maxItems = 8; // Show more items to fill the tile
          
          // Reset regex lastIndex
          checklistRegex.lastIndex = 0;
          
          // First, extract a section heading if present
          const headingRegex = /^#+\s(.+?)\n/;
          const headingMatch = headingRegex.exec(content);
          let heading = null;
          
          if (headingMatch) {
            const { emoji, remainingText } = extractEmoji(headingMatch[1]);
            
            heading = (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {emoji && (
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{emoji}</Text>
                )}
                <Text style={{
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#FFFFFF',
                }}>
                  {remainingText || headingMatch[1]}
                </Text>
              </View>
            );
          }
          
          while ((match = checklistRegex.exec(content)) !== null && count < maxItems) {
            const isChecked = match[1] === 'x';
            const itemText = match[2];
            
            // Check for emoji in the checklist item
            const { emoji, remainingText } = extractEmoji(itemText);
            
            checklistItems.push(
              <View key={count} style={styles.checklistItem}>
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && (
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                  )}
                </View>
                {emoji ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 18, marginRight: 10 }}>{emoji}</Text>
                    <Text 
                      style={[styles.checklistText, isChecked && styles.checklistTextChecked]} 
                      numberOfLines={1}
                    >
                      {remainingText}
                    </Text>
                  </View>
                ) : (
                  <Text 
                    style={[styles.checklistText, isChecked && styles.checklistTextChecked]} 
                    numberOfLines={1}
                  >
                    {itemText}
                  </Text>
                )}
              </View>
            );
            count++;
          }
          
          return (
            <View style={styles.previewContent}>
              {heading}
              {checklistItems}
            </View>
          );
        }
        
        // For bullet lists
        if (hasBulletList) {
          const bulletListRegex = /^- (.+?)(?=\n|$)/gm;
          const listItems = [];
          let match;
          let count = 0;
          const maxItems = 6; // Show more items to fill the tile
          
          // Reset regex lastIndex
          bulletListRegex.lastIndex = 0;
          
          while ((match = bulletListRegex.exec(content)) !== null && count < maxItems) {
            const itemText = match[1];
            
            listItems.push(
              <View key={count} style={styles.listItem}>
                <View style={styles.bulletPoint} />
                <Text style={[styles.listText, { color: '#FFFFFF' }]} numberOfLines={1}>{itemText}</Text>
              </View>
            );
            count++;
          }
          
          return (
            <View style={styles.previewContent}>
              {listItems}
            </View>
          );
        }
        
        // For images
        if (hasImage) {
          const imageRegex = /!\[(.*)\]\((.+?)\)/g;
          let match = imageRegex.exec(content);
          
          if (match) {
            const altText = match[1];
            return (
              <View style={styles.previewContent}>
                <View style={styles.imagePreviewContainer}>
                  <View style={styles.imagePreviewPlaceholder}>
                    <MaterialCommunityIcons name="image-outline" size={24} color="#999999" />
                  </View>
                  <Text style={[styles.imageCaption, { color: '#FFFFFF' }]} numberOfLines={1}>{altText || t('image', 'Image')}</Text>
                </View>
                <Text style={styles.gridItemPreview} numberOfLines={3}>
                  {content.replace(/!\[(.*)\]\((.+?)\)/g, '').replace(/<[^>]+>/g, '').replace(/\n/g, ' ').slice(0, 100) + 
                    (content.length > 100 ? '…' : '')}
                </Text>
              </View>
            );
          }
        }
        
        // For regular text content
        return (
          <Text style={styles.gridItemPreview} numberOfLines={6}>
            {content.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').slice(0, 200) + 
              (content.replace(/<[^>]+>/g, '').length > 200 ? '…' : '')}
          </Text>
        );
      };
      
      return (
        <TouchableOpacity
          key={note.id}
          style={styles.gridItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('NoteEditor', { id: note.id, title: note.title });
          }}
          onLongPress={() => openNoteMenu(note.id, note.isFolder)}
        >
          <View 
            style={[
              styles.gridItemContent, 
              { backgroundColor: c.noteItem },
              // Make height responsive to content
              note.content && note.content.length > 300 ? styles.gridItemContentLarge : null,
              // Make height responsive to content type
              hasComplexContent(note.content) ? styles.gridItemContentLarge : null
            ]}
          >
            {note.pinned && <View style={styles.gridPinIndicator} />}
            <Text style={styles.gridItemTitle} numberOfLines={1}>
              {note.title}
            </Text>
            {renderNotePreview()}
            <Text style={styles.gridItemDate}>
              {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : ''}
            </Text>
          </View>
        </TouchableOpacity>
      );
    };  
    
    return (
      <>
        {/* Сегодня */}
        {sortedToday.length > 0 && (
          <>
            <Text style={styles.timeGroupHeader}>{t('today', 'Today')}</Text>
            <View style={styles.gridContainer}>
              {sortedToday.map(renderGridItem)}
            </View>
          </>
        )}
        
        {/* Вчера */}
        {sortedYesterday.length > 0 && (
          <>
            <Text style={styles.timeGroupHeader}>{t('yesterday', 'Yesterday')}</Text>
            <View style={styles.gridContainer}>
              {sortedYesterday.map(renderGridItem)}
            </View>
          </>
        )}
        
        {/* Предыдущие 30 дней */}
        {sortedPrevious30Days.length > 0 && (
          <>
            <Text style={styles.timeGroupHeader}>{t('previous_30_days', 'Previous 30 Days')}</Text>
            <View style={styles.gridContainer}>
              {sortedPrevious30Days.map(renderGridItem)}
            </View>
          </>
        )}
      </>
    );
  }

  // Рендер списка заметок (минималистичный, как в макете)
  function renderNotesList(items: NoteItem[]) {
    // Только заметки (не папки)
    const notes = items.filter(item => !item.isFolder);
    if (notes.length === 0) {
      return <Text style={[styles.emptyText, { color: c.placeholder }]}>{t('no_notes', 'Нет заметок')}</Text>;
    }
    
    // Группируем заметки по времени
    const groupedNotes = groupNotesByTime(notes);
    
    // Сортируем заметки в каждой группе по времени (новые сверху)
    const sortedToday = sortNotesByTimestamp(groupedNotes.today);
    const sortedYesterday = sortNotesByTimestamp(groupedNotes.yesterday);
    const sortedPrevious30Days = sortNotesByTimestamp(groupedNotes.previous30Days);
    
    return (
      <>
        {/* Сегодня */}
        {sortedToday.length > 0 && (
          <>
            <Text style={styles.timeGroupHeader}>{t('today', 'Today')}</Text>
            {sortedToday.map(note => renderNoteItem(note))}
          </>
        )}
        
        {/* Вчера */}
        {sortedYesterday.length > 0 && (
          <>
            <Text style={styles.timeGroupHeader}>{t('yesterday', 'Yesterday')}</Text>
            {sortedYesterday.map(note => renderNoteItem(note))}
          </>
        )}
        
        {/* Предыдущие 30 дней */}
        {sortedPrevious30Days.length > 0 && (
          <>
            <Text style={styles.timeGroupHeader}>{t('previous_30_days', 'Previous 30 Days')}</Text>
            {sortedPrevious30Days.map(note => renderNoteItem(note))}
          </>
        )}
      </>
    );
  }
  
  // Рендер отдельной заметки
  function renderNoteItem(note: NoteItem) {
    return (
      <Swipeable
        key={note.id}
        renderRightActions={() => (
          <View style={styles.swipeActionContainer}>
            <TouchableOpacity
              style={styles.swipeDeleteButton}
              onPress={() => handleSidebarDelete(note.id, false)}
              activeOpacity={0.7}
            >
              <IconButton icon="trash-can-outline" size={25} iconColor="#FFFFFF" style={styles.swipeActionIcon} />
            </TouchableOpacity>
          </View>
        )}
        overshootRight={false}
        friction={2}
      >
        <View style={styles.noteCardContainer}>
          <TouchableOpacity
            style={styles.noteCardContent}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('NoteEditor', { id: note.id, title: note.title });
            }}
            onLongPress={(e) => openNoteMenu(note.id, false, e)}
            activeOpacity={0.7}
          >
            <View style={styles.noteContentWrapper}>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {note.title}{note.pinned && <Text style={styles.pinnedIndicator}> 📌</Text>}
              </Text>
              <View style={styles.notePreviewContainer}>
                <Text style={styles.noteTime}>{formatNoteTime(note)}</Text>
                <Text style={styles.noteSubtitle} numberOfLines={1}>
                  {note.content
                    ? note.content.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').slice(0, 80) + (note.content.replace(/<[^>]+>/g, '').length > 80 ? '…' : '')
                    : t('note_preview_placeholder', 'No text')}
                </Text>
              </View>
            </View>
            <View style={styles.noteAccessoryContainer}>
              <IconButton 
                icon="chevron-right" 
                iconColor="#C7C7CC" 
                size={20} 
                style={styles.noteAccessoryIcon} 
              />
            </View>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  }

  // Проверка: есть ли хотя бы одна папка в корне
  const hasRootFolders = notes.some(item => item.isFolder);
  // Проверка: есть ли заметки в выбранной папке
  function getActiveFolderNotes(items: NoteItem[], folderId: string | null): NoteItem[] {
    if (!folderId) return [];
    for (const item of items) {
      if (item.id === folderId && item.isFolder) {
        return item.children ? item.children.filter(n => !n.isFolder) : [];
      }
      if (item.children) {
        const found = getActiveFolderNotes(item.children, folderId);
        if (found.length > 0) return found;
      }
    }
    return [];
  }
  const activeFolderNotes = getActiveFolderNotes(notes, activeSidebarFilter);

  // onSelect: если id папки — выделяем, если id заметки — открываем редактор
  const handleSidebarSelect = (id: string | null) => {
    // Если выбран заголовок (корень)
    if (id === null) {
      setActiveSidebarFilter(null);
      return;
    }
    // Проверяем, папка это или заметка
    function findNote(items: NoteItem[]): NoteItem | null {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findNote(item.children);
          if (found) return found;
        }
      }
      return null;
    }
    const found = findNote(notes);
    if (found) {
      if (found.isFolder) {
        setActiveSidebarFilter(id);
      } else {
        // @ts-ignore
        navigation.navigate('NoteEditor', { id: found.id, title: found.title });
      }
    }
  };

  const handleSidebarOpen = (id: string, isFolder: boolean) => {
    if (isFolder) {
      setActiveSidebarFilter(id);
    } else {
      // @ts-ignore
      navigation.navigate('NoteEditor', { id });
    }
  };

  const handleSidebarRename = (id: string, isFolder: boolean) => {
    setRenameDialog({id, isFolder});
    // Найти текущее имя
    function findItem(items: NoteItem[]): NoteItem | null {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    }
    const found = findItem(notes);
    setRenameValue(found?.title || '');
  };

  const handleSidebarDelete = (id: string, isFolder: boolean) => {
    setNotes(prev => removeById(prev, id));
    // Если удалили активную папку — сбросить фильтр
    if (isFolder && activeSidebarFilter === id) setActiveSidebarFilter(null);
  };
  
  const handleRenameApply = async () => {
    if (!renameDialog) return;
    
    const timestamp = Date.now();
    let updatedItem: NoteItem | null = null;
    
    function rename(items: NoteItem[]): NoteItem[] {
      return items.map(item => {
        if (item.id === renameDialog.id) {
          // Если это заметка (не папка), обновляем таймстемп
          if (!renameDialog.isFolder) {
            updatedItem = { ...item, title: renameValue, timestamp };
            return updatedItem;
          } else {
            updatedItem = { ...item, title: renameValue };
            return updatedItem;
          }
        }
        if (item.children) {
          return { ...item, children: rename(item.children) };
        }
        return item;
      });
    }
    
    // Обновляем заметки в state
    const updated = rename(notes);
    setNotes(updated);
    // Сохраняем обновленные заметки в AsyncStorage
    await AsyncStorage.setItem('notes', JSON.stringify(updated));
    
    // Если это заметка (не папка), обновляем её в AsyncStorage
    if (!renameDialog.isFolder) {
      try {
        // Загружаем текущую заметку из AsyncStorage
        const noteKey = `note_${renameDialog.id}`;
        const noteRaw = await AsyncStorage.getItem(noteKey);
        
        if (noteRaw) {
          const note = JSON.parse(noteRaw);
          // Обновляем заголовок и таймстемп, сохраняя остальное содержимое
          await AsyncStorage.setItem(noteKey, JSON.stringify({
            ...note,
            title: renameValue,
            timestamp
          }));
          
          // Уведомляем через eventBus об обновлении заметки
          notesEventBus.emit('noteUpdated', { id: renameDialog.id, timestamp });
        }
      } catch (error) {
        console.error('Error saving renamed note:', error);
      }
    }
  };
  
  // Open context menu
  const openNoteMenu = (id: string, isFolder: boolean, e?: any) => {
    setMenuTarget({ id, isFolder });
    setMenuVisible(true);
    
    if (Platform.OS === 'web' && e) {
      e.preventDefault();
      setMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      setMenuPos(null);
    }
  };

  // Close context menu
  const closeMenu = () => {
    setMenuVisible(false);
    setMenuTarget(null);
    setMenuPos(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* AppBar с iOS-стилем */}
      <SafeAreaView style={{ backgroundColor: c.background }}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.headerButton}>
            <Image 
              source={require('../assets/icons/SidebarIcon.png')} 
              style={{ width: 24, height: 24, tintColor: c.primary }} 
              accessibilityLabel={t('sidebar_menu', 'Open sidebar menu')}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notes</Text>
          {(activeSidebarFilter && activeFolderNotes.length > 0) || 
           (!activeSidebarFilter && notes.filter(n => !n.isFolder).length > 0) ? (
            <TouchableOpacity 
              onPress={() => setViewType(viewType === 'list' ? 'grid' : 'list')} 
              style={styles.headerButton}
            >
              <IconButton 
                icon={viewType === 'list' ? 'grid' : 'format-list-bulleted'} 
                size={22} 
                iconColor={c.primary}
                style={styles.viewSwitcherButton}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButtonPlaceholder} />
          )}
        </View>
      </SafeAreaView>
      {/* Sidebar для web (открывается по кнопке) */}
      {isWeb && sidebarVisible && (
        <>
          <View style={styles.webSidebarWrap}>
            <Sidebar
              folders={folders}
              activeId={activeSidebarFilter}
              onSelect={handleSidebarSelect}
              onAddFolder={() => openCreateDialog('sidebar')}
              onOpenItem={handleSidebarOpen}
              onRenameItem={handleSidebarRename}
              onDeleteItem={handleSidebarDelete}
              activeFolderLevel={activeFolderLevel}
            />
          </View>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setSidebarVisible(false)} />
        </>
      )}
      {/* Sidebar для мобильных (overlay) */}
      {!isWeb && sidebarVisible && (
        <View style={styles.mobileSidebarOverlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setSidebarVisible(false)} />
          <View style={styles.mobileSidebar}>
            <Sidebar
              folders={folders}
              activeId={activeSidebarFilter}
              onSelect={handleSidebarSelect}
              onAddFolder={() => openCreateDialog('sidebar')}
              onOpenItem={handleSidebarOpen}
              onRenameItem={handleSidebarRename}
              onDeleteItem={handleSidebarDelete}
              activeFolderLevel={activeFolderLevel}
            />
          </View>
        </View>
      )}
      {/* Основной контент */}
      <View style={[styles.notesMain, { backgroundColor: c.background, flex: 1 }]}>
        {/* Поиск в стиле iOS */}
        <View style={styles.searchBlock}>
          <TextInput
            placeholder={t('search_notes_placeholder', 'Поиск')}
            value={search}
            onChangeText={setSearch}
            style={[styles.iosSearchField, { borderWidth: 0, borderBottomWidth: 0 }]}
            placeholderTextColor="#8E8E93"
            clearButtonMode="while-editing"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
        </View>
        

        {/* Пустой экран, если нет папок */}
        {activeSidebarFilter == null && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: c.placeholder, fontSize: 18, marginBottom: 16 }}>{t('no_folders', 'Нет папок')}</Text>
          </View>
        )}
        {activeSidebarFilter && activeFolderLevel === 1 && activeFolderNotes.length === 0 && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: c.placeholder, fontSize: 18, marginBottom: 16 }}>{t('no_notes', 'Нет заметок')}</Text>
          </View>
        )}
        {activeSidebarFilter && activeFolderLevel === 2 && activeFolderNotes.length === 0 && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: c.placeholder, fontSize: 18, marginBottom: 16 }}>{t('no_notes', 'Нет заметок')}</Text>
          </View>
        )}
        {/* Список или сетка заметок */}
        {(
          // Если выбрана папка и в ней есть заметки
          (activeSidebarFilter && activeFolderNotes.length > 0) ||
          // Или если нет выбранной папки, но есть заметки в корне
          (!activeSidebarFilter && notes.filter(n => !n.isFolder).length > 0)
        ) && (
          <ScrollView style={styles.notesListBlock}>
            {viewType === 'list' 
              ? renderNotesList(filterNotes(filterBySidebar(notes), search))
              : renderNotesGrid(filterNotes(filterBySidebar(notes), search))
            }
          </ScrollView>
        )}
        {/* Диалог создания заметки/папки */}
        <Portal>
          {showDialog && (
            <View style={styles.modalOverlayCustom}>
              <View style={styles.iosModalContent}> 
                <Text style={styles.iosModalTitle}>{t('create_new', 'Создать')} {isFolder ? t('folder', 'папка') : t('note', 'заметка')}</Text>
                <TextInput
                  placeholder={t('name', 'Название')}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                  style={styles.iosModalInput}
                  placeholderTextColor="#8E8E93"
                />
                {createMode === 'both' && (
                  <TouchableOpacity 
                    onPress={() => setIsFolder(f => !f)} 
                    style={styles.iosTypeToggle}
                  >
                    <Text style={styles.iosTypeToggleText}>
                      {isFolder ? t('create_as_note', 'Создать как заметку') : t('create_as_folder', 'Создать как папку')}
                    </Text>
                  </TouchableOpacity>
                )}
                {createMode === 'folder' && (
                  <Text style={styles.iosModalHint}>{t('only_folder_allowed', 'Создать папку в корне')}</Text>
                )}
                {createMode === 'note' && (
                  <Text style={styles.iosModalHint}>{t('only_note_allowed', 'В этой папке можно создать только заметку')}</Text>
                )}
                <View style={styles.iosModalButtons}>
                  <TouchableOpacity
                    onPress={() => setShowDialog(false)}
                    style={styles.iosModalCancelButton}
                  >
                    <Text style={styles.iosModalCancelText}>{t('cancel', 'Отмена')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAdd}
                    style={styles.iosModalActionButton}
                  >
                    <Text style={styles.iosModalActionText}>{t('create', 'Создать')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Portal>
        
        {/* iOS-style Context Menu */}
        <IOSContextMenu
          visible={menuVisible}
          onDismiss={closeMenu}
          position={menuPos}
          actions={[
            {
              title: t('open', 'Открыть'),
              onPress: () => {
                closeMenu();
                menuTarget && handleSidebarOpen(menuTarget.id, menuTarget.isFolder);
              },
              icon: <MaterialCommunityIcons name="note-outline" size={22} color={colors.primary} />
            },
            {
              title: t('rename', 'Переименовать'),
              onPress: () => {
                closeMenu();
                if (menuTarget) {
                  setRenameDialog({ id: menuTarget.id, isFolder: menuTarget.isFolder });
                  // Find current name
                  function findItem(items: NoteItem[]): NoteItem | null {
                    for (const item of items) {
                      if (item.id === menuTarget.id) return item;
                      if (item.children) {
                        const found = findItem(item.children);
                        if (found) return found;
                      }
                    }
                    return null;
                  }
                  const found = findItem(notes);
                  setRenameValue(found?.title || '');
                }
              },
              icon: <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
            },
            {
              title: t('delete', 'Удалить'),
              onPress: () => {
                closeMenu();
                menuTarget && handleSidebarDelete(menuTarget.id, menuTarget.isFolder);
              },
              icon: <MaterialCommunityIcons name="delete-outline" size={22} color="#FF3B30" />,
              destructive: true
            }
          ]}
        />
        {/* Кнопка добавить в стиле iOS */}
        <TouchableOpacity 
          style={styles.addButtonContainer}
          onPress={() => openCreateDialog('main')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7745dc', '#f34f8c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* iOS-style Rename Dialog */}
      <Portal>
        {renameDialog && (
          <View style={styles.modalOverlayCustom}>
            <View style={styles.iosModalContent}> 
              <Text style={styles.iosModalTitle}>
                {t('rename', 'Переименовать')} {renameDialog.isFolder ? t('folder', 'папку') : t('note', 'заметку')}
              </Text>
              <TextInput
                placeholder={renameDialog.isFolder ? t('folder_name', 'Имя папки') : t('note_name', 'Имя заметки')}
                value={renameValue}
                onChangeText={setRenameValue}
                autoFocus
                style={styles.iosModalInput}
                placeholderTextColor="#8E8E93"
              />
              <View style={styles.iosModalButtons}>
                <TouchableOpacity
                  onPress={() => setRenameDialog(null)}
                  style={styles.iosModalCancelButton}
                >
                  <Text style={styles.iosModalCancelText}>{t('cancel', 'Отмена')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (renameDialog) {
                      handleRenameApply();
                      setRenameDialog(null);
                    }
                  }}
                  style={styles.iosModalActionButton}
                >
                  <Text style={styles.iosModalActionText}>{t('rename', 'Переименовать')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Portal>
    </View>
  );
};

export default NotesScreen;