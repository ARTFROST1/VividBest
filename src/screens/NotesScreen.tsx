import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, List, IconButton, TextInput, Dialog, Portal, Searchbar, SegmentedButtons, Card, Appbar, useTheme } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Sidebar, { FolderNode } from '../components/Sidebar';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const NotesScreen = () => {
  const { t } = useTranslation();
  const { colors, roundness } = useTheme();
  const c = colors as any;
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
  const [renameDialog, setRenameDialog] = useState<{id: string, isFolder: boolean} | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [createMode, setCreateMode] = useState<'note' | 'folder' | 'both'>('both');

  useEffect(() => {
    (async () => {
      const savedNotes = await AsyncStorage.getItem('notes');
      const savedFolder = await AsyncStorage.getItem('lastFolder');
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedFolder) setActiveSidebarFilter(savedFolder);
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (activeSidebarFilter !== null) {
      AsyncStorage.setItem('lastFolder', activeSidebarFilter);
    }
  }, [activeSidebarFilter]);

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

  // handleAdd: запрещаем создание папки в папке второго уровня и глубже
  const handleAdd = () => {
    if (!newTitle.trim()) return;
    // Запрет на создание папки в папке второго уровня и глубже
    if (isFolder && activeFolderLevel >= 2) {
      alert('В этой папке нельзя создавать папки.');
      return;
    }
    const newItem: NoteItem = {
      id: Date.now().toString(),
      title: newTitle,
      isFolder,
      pinned: false,
      children: isFolder ? [] : undefined,
    };
    if (activeSidebarFilter) {
      function addToFolder(items: NoteItem[]): NoteItem[] {
        return items.map(item => {
          if (item.id === activeSidebarFilter && item.isFolder) {
            return {
              ...item,
              children: item.children ? [...item.children, newItem] : [newItem],
            };
          }
          if (item.children) {
            return { ...item, children: addToFolder(item.children) };
          }
          return item;
        });
      }
      setNotes(prev => addToFolder(prev));
      // Если это новая папка первого уровня — делаем её активной
      if (isFolder && activeFolderLevel === 1) setActiveSidebarFilter(newItem.id);
    } else {
      setNotes(prev => [...prev, newItem]);
      // Если это первая папка — делаем её активной
      if (isFolder) setActiveSidebarFilter(newItem.id);
    }
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

  // Рендер списка заметок (минималистичный, как в макете)
  function renderNotesList(items: NoteItem[]) {
    // Только заметки (не папки)
    const notes = items.filter(item => !item.isFolder);
    if (notes.length === 0) {
      return <Text style={[styles.emptyText, { color: c.placeholder }]}>{t('no_notes', 'Нет заметок')}</Text>;
    }
    return notes.map(note => (
      <TouchableOpacity
        key={note.id}
        style={[styles.noteCard, { backgroundColor: c.surface, borderRadius: roundness, borderColor: c.border }]}
        onPress={() => {
          // @ts-ignore
          navigation.navigate('NoteEditor', { id: note.id, title: note.title });
        }}
      >
        <Text style={[styles.noteTitle, { color: c.text }]} numberOfLines={1}>{note.title}</Text>
        <Text style={[styles.noteSubtitle, { color: c.placeholder }]} numberOfLines={1}>Краткое описание или начало заметки...</Text>
      </TouchableOpacity>
    ));
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
    if (!id) {
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

  const handleResetAll = async () => {
    await AsyncStorage.removeItem('notes');
    await AsyncStorage.removeItem('lastFolder');
    setNotes([]);
    setActiveSidebarFilter(null);
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

  const handleRenameApply = () => {
    if (!renameDialog) return;
    function rename(items: NoteItem[]): NoteItem[] {
      return items.map(item => {
        if (item.id === renameDialog.id) {
          return { ...item, title: renameValue };
        }
        if (item.children) {
          return { ...item, children: rename(item.children) };
        }
        return item;
      });
    }
    setNotes(prev => rename(prev));
    setRenameDialog(null);
    setRenameValue('');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* AppBar с кнопкой-гамбургером */}
      <Appbar.Header style={{ backgroundColor: c.background, elevation: 0 }}>
        <Appbar.Action icon="menu" color={c.primary} onPress={() => setSidebarVisible(true)} />
        <Appbar.Content title={<Text style={{ color: c.text, fontWeight: 'bold', fontSize: 28, letterSpacing: 0.5 }}>Notes</Text>} />
      </Appbar.Header>
      {/* Sidebar для web (открывается по кнопке) */}
      {isWeb && sidebarVisible && (
        <>
          <View style={styles.webSidebarWrap}>
            <Button onPress={handleResetAll} mode="text" style={{ marginBottom: 8 }}>
              Сбросить всё
            </Button>
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
            <Button onPress={handleResetAll} mode="text" style={{ marginBottom: 8 }}>
              Сбросить всё
            </Button>
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
      <View style={[styles.notesMain, { backgroundColor: c.background }]}>
        {/* Поиск */}
        <View style={styles.searchBlock}>
          <Searchbar
            placeholder={t('search_notes_placeholder', 'Поиск заметок...')}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { backgroundColor: c.surface, color: c.text, borderRadius: 100, borderColor: c.border }]}
            inputStyle={{ color: c.text }}
            iconColor={c.placeholder}
            placeholderTextColor={c.placeholder}
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
        {/* Обычный список заметок */}
        {(
          // Если выбрана папка и в ней есть заметки
          (activeSidebarFilter && activeFolderNotes.length > 0) ||
          // Или если нет выбранной папки, но есть заметки в корне
          (!activeSidebarFilter && notes.filter(n => !n.isFolder).length > 0)
        ) && (
          <ScrollView style={styles.notesListBlock}>
            {renderNotesList(filterNotes(filterBySidebar(notes), search))}
          </ScrollView>
        )}
        {/* Кнопка добавить */}
        <LinearGradient
          colors={['#7745dc', '#f34f8c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.addNoteBtn, { borderRadius: roundness }]}
        >
          <Button
            mode="contained"
            style={{ backgroundColor: 'transparent', elevation: 0 }}
            contentStyle={{ height: 48 }}
            labelStyle={{ fontWeight: 'bold', fontSize: 16, color: '#fff' }}
            onPress={() => openCreateDialog('main')}
          >
            + {t('new', 'добавить')}
          </Button>
        </LinearGradient>
        {/* Диалог создания заметки/папки */}
        <Portal>
          <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)} style={{ borderRadius: roundness, backgroundColor: c.surface }}>
            <Dialog.Title style={{ color: c.text }}>{t('create_new', 'Новая')} {isFolder ? t('folder', 'папка') : t('note', 'заметка')}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label={t('name', 'Название')}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                style={{ backgroundColor: c.background, color: c.text, borderRadius: roundness }}
                placeholderTextColor={c.placeholder}
              />
              {createMode === 'both' && (
                <Button onPress={() => setIsFolder(f => !f)} style={{ marginTop: 8 }} textColor={c.primary}>
                  {isFolder ? t('create_as_note', 'Создать как заметку') : t('create_as_folder', 'Создать как папку')}
                </Button>
              )}
              {createMode === 'folder' && (
                <Text style={{ marginTop: 8, color: c.placeholder }}>{t('only_folder_allowed', 'Создать папку в корне')}</Text>
              )}
              {createMode === 'note' && (
                <Text style={{ marginTop: 8, color: c.placeholder }}>{t('only_note_allowed', 'В этой папке можно создать только заметку')}</Text>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowDialog(false)} textColor={c.primary}>{t('cancel', 'Отмена')}</Button>
              <Button onPress={handleAdd} textColor={c.primary}>{t('create', 'Создать')}</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        {/* Диалог переименования */}
        <Portal>
          <Dialog visible={!!renameDialog} onDismiss={() => setRenameDialog(null)} style={{ borderRadius: roundness, backgroundColor: c.surface }}>
            <Dialog.Title style={{ color: c.text }}>{t('rename', 'Переименовать')}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label={t('name', 'Название')}
                value={renameValue}
                onChangeText={setRenameValue}
                autoFocus
                style={{ backgroundColor: c.background, color: c.text, borderRadius: roundness }}
                placeholderTextColor={c.placeholder}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setRenameDialog(null)} textColor={c.primary}>{t('cancel', 'Отмена')}</Button>
              <Button onPress={handleRenameApply} textColor={c.primary}>{t('save', 'Сохранить')}</Button>
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
  },
  notesMain: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  searchBlock: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    fontSize: 16,
    elevation: 40,
    width: '100%',
    height: 50,
    alignSelf: 'center',
    borderRadius: 100,
  },
  notesListBlock: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  noteCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  noteTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  noteSubtitle: {
    fontSize: 14,
  },
  addNoteBtn: {
    marginHorizontal: 24,
    marginVertical: 18,
    elevation: 2,
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
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default NotesScreen; 