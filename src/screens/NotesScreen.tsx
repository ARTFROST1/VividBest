import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, List, IconButton, TextInput, Dialog, Portal, Searchbar, SegmentedButtons, Card, Appbar } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Sidebar, { FolderNode } from '../components/Sidebar';
import { useTranslation } from 'react-i18next';

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
}

const initialNotes: NoteItem[] = [
  {
    id: '1',
    title: 'Личное',
    isFolder: true,
    pinned: false,
    children: [
      {
        id: '2',
        title: 'Идеи',
        isFolder: true,
        pinned: false,
        children: [
          { id: '3', title: 'План на лето', isFolder: false, pinned: false },
        ],
      },
      { id: '4', title: 'Покупки', isFolder: false, pinned: false },
    ],
  },
  {
    id: '5',
    title: 'Работа',
    isFolder: true,
    pinned: false,
    children: [
      {
        id: '6',
        title: 'Проект X',
        isFolder: false,
        pinned: false,
      },
    ],
  },
  { id: '7', title: 'Идеи для стартапа', isFolder: false, pinned: false },
  { id: '8', title: 'Заметка вне папки', isFolder: false, pinned: false },
];

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

const NotesScreen = () => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [showDialog, setShowDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isFolder, setIsFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moveSource, setMoveSource] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'kanban'>('tree');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSidebarFilter, setActiveSidebarFilter] = useState<string | null>(null);
  const navigation = useNavigation();
  const isWeb = Platform.OS === 'web';

  // Добавление новой заметки/папки на верхний уровень
  const handleAdd = () => {
    if (!newTitle.trim()) return;
    setNotes([
      ...notes,
      { id: Date.now().toString(), title: newTitle, isFolder, pinned: false, children: isFolder ? [] : undefined },
    ]);
    setShowDialog(false);
    setNewTitle('');
    setIsFolder(false);
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

  // Рендер списка заметок (минималистичный, как в макете)
  function renderNotesList(items: NoteItem[]) {
    // Только заметки (не папки)
    const notes = items.filter(item => !item.isFolder);
    if (notes.length === 0) {
      return <Text style={styles.emptyText}>{t('no_notes', 'Нет заметок')}</Text>;
    }
    return notes.map(note => (
      <TouchableOpacity
        key={note.id}
        style={styles.noteCard}
        onPress={() => navigation.navigate('NoteEditor', { id: note.id, title: note.title })}
      >
        <Text style={styles.noteTitle}>{note.title}</Text>
        <Text style={styles.noteSubtitle} numberOfLines={1}>Краткое описание или начало заметки...</Text>
      </TouchableOpacity>
    ));
  }

  return (
    <View style={styles.container}>
      {/* AppBar с кнопкой-гамбургером */}
      <Appbar.Header style={{ backgroundColor: '#fff', elevation: 0 }}>
        <Appbar.Action icon="menu" onPress={() => setSidebarVisible(true)} />
        <Appbar.Content title={t('all_notes')} />
      </Appbar.Header>
      {/* Sidebar для web (открывается по кнопке) */}
      {isWeb && sidebarVisible && (
        <>
          <View style={styles.webSidebarWrap}>
            <Sidebar
              folders={folders}
              activeId={activeSidebarFilter}
              onSelect={id => {
                setActiveSidebarFilter(id);
                setSidebarVisible(false);
              }}
              onAddFolder={() => alert(t('add_folder', 'Добавить папку (реализовать)'))}
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
              onSelect={id => {
                setActiveSidebarFilter(id);
                setSidebarVisible(false);
              }}
              onAddFolder={() => alert(t('add_folder', 'Добавить папку (реализовать)'))}
            />
          </View>
        </View>
      )}
      {/* Основной контент */}
      <View style={styles.notesMain}>
        {/* Поиск */}
        <View style={styles.searchBlock}>
          <Searchbar
            placeholder={t('search_notes_placeholder', 'Поиск заметок...')}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
        {/* Список заметок */}
        <ScrollView style={styles.notesListBlock}>
          {renderNotesList(filterNotes(filterBySidebar(notes), search))}
        </ScrollView>
        {/* Кнопка добавить */}
        <Button
          mode="contained"
          style={styles.addNoteBtn}
          contentStyle={{ height: 48 }}
          labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
          onPress={() => setShowDialog(true)}
        >
          + {t('new_note', 'Новая заметка')}
        </Button>
        {/* Диалог создания заметки/папки */}
        <Portal>
          <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
            <Dialog.Title>{t('create_new', 'Новая')} {isFolder ? t('folder', 'папка') : t('note', 'заметка')}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label={t('name', 'Название')}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />
              <Button onPress={() => setIsFolder(f => !f)} style={{ marginTop: 8 }}>
                {isFolder ? t('create_as_note', 'Создать как заметку') : t('create_as_folder', 'Создать как папку')}
              </Button>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowDialog(false)}>{t('cancel', 'Отмена')}</Button>
              <Button onPress={handleAdd}>{t('create', 'Создать')}</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  notesMain: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  searchBlock: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#fafbfc',
    borderRadius: 8,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  notesListBlock: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    backgroundColor: '#fff',
  },
  noteCard: {
    backgroundColor: '#fafbfc',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noteTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    marginBottom: 2,
  },
  noteSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  addNoteBtn: {
    marginHorizontal: 24,
    marginVertical: 18,
    borderRadius: 8,
    backgroundColor: '#1976d2',
    elevation: 0,
  },
  emptyText: {
    color: '#aaa',
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
    backgroundColor: '#fafbfc',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
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
    backgroundColor: '#fafbfc',
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default NotesScreen; 