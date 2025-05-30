import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';
import IOSContextMenu from './IOSContextMenu';

// Тип папки
export interface FolderNode {
  id: string;
  title: string;
  children?: FolderNode[];
  notes?: { id: string; title: string }[];
}

interface SidebarProps {
  folders: FolderNode[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onAddFolder?: () => void;
  activeFolderLevel?: number;
}

const Sidebar: React.FC<SidebarProps & {
  onOpenItem?: (id: string, isFolder: boolean) => void;
  onRenameItem?: (id: string, isFolder: boolean) => void;
  onDeleteItem?: (id: string, isFolder: boolean) => void;
}> = ({ folders, activeId, onSelect, onAddFolder, onOpenItem, onRenameItem, onDeleteItem, activeFolderLevel }) => {
  const { t } = useTranslation();
  const { colors, roundness, dark } = useTheme();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuTarget, setMenuTarget] = React.useState<{ id: string; isFolder: boolean } | null>(null);
  // Для web: координаты меню
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number } | null>(null);

  const noteColor = dark ? '#fff' : '#000'; 

  // Открыть меню (универсально)
  const openMenu = (id: string, isFolder: boolean, e?: any) => {
    setMenuTarget({ id, isFolder });
    setMenuVisible(true);
    if (Platform.OS === 'web' && e) {
      e.preventDefault();
      setMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      setMenuPos(null);
    }
  };
  const closeMenu = () => {
    setMenuVisible(false);
    setMenuTarget(null);
    setMenuPos(null);
  };

  // Рекурсивный рендер папок и заметок
  const renderFolders = (items: FolderNode[], level = 0) =>
    items.map(item => {
      const folderBtnProps: any = {
        style: [
          styles.folderBtn,
          { borderRadius: roundness, backgroundColor: activeId === item.id ? colors.primary + '22' : 'transparent' },
        ],
        onPress: () => onSelect(item.id),
        onLongPress: () => openMenu(item.id, true),
      };
      if (Platform.OS === 'web') folderBtnProps.onContextMenu = (e: any) => openMenu(item.id, true, e);
      const folderBtn = (
        <TouchableOpacity key={item.id} {...folderBtnProps}>
          <MaterialCommunityIcons name="folder-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={[styles.folderText, { color: colors.onSurface }]}>{item.title}</Text>
        </TouchableOpacity>
      );
      const noteBtns = item.notes && item.notes.map(note => {
        const noteBtnProps: any = {
          style: [
            styles.noteBtn,
            { borderRadius: roundness, backgroundColor: activeId === note.id ? colors.primary + '22' : 'transparent' },
          ],
          onPress: () => onSelect(note.id),
          onLongPress: () => openMenu(note.id, false),
        };
        if (Platform.OS === 'web') noteBtnProps.onContextMenu = (e: any) => openMenu(note.id, false, e);
        return (
          <TouchableOpacity key={note.id} {...noteBtnProps}>
            <MaterialCommunityIcons name="note-outline" size={18} color={noteColor} style={{ marginRight: 8 }} />
            <Text style={[styles.noteText, { color: colors.onSurface }]}>{note.title}</Text>
          </TouchableOpacity>
        );
      });
      return (
        <View key={item.id} style={{ marginLeft: level * 16 }}>
          {folderBtn}
          {noteBtns}
          {/* Вложенные папки */}
          {item.children && renderFolders(item.children, level + 1)}
        </View>
      );
    });

  // Контекстное меню через Dialog/Portal
  return (
    <View style={[styles.sidebar, { backgroundColor: colors.background, borderRightColor: colors.outline }]}> 
      {/* Заголовок как выделяемый и кликабельный элемент */}
      <TouchableOpacity
        style={[
          styles.titleBtn,
          { backgroundColor: activeId === null ? colors.primary + '22' : 'transparent', borderRadius: roundness },
        ]}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: colors.onSurface, fontWeight: 'bold' }]}>{t('folders_and_notes', 'Папки и заметки')}</Text>
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderFolders(folders)}
        <TouchableOpacity style={[styles.addFolderBtn, { borderRadius: roundness }]} onPress={onAddFolder}>
          <Text style={[styles.addFolderText, { color: colors.primary }]}>+
            {activeFolderLevel === 0 && t('new_folder', 'Новая_папку')}
            {activeFolderLevel === 1 && t('new', 'Создать')}
            {activeFolderLevel >= 2 && t('new_note', 'Новая_заметку')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <IOSContextMenu
        visible={menuVisible}
        onDismiss={closeMenu}
        position={menuPos}
        actions={[
          {
            title: t('open', 'Открыть'),
            onPress: () => menuTarget && onOpenItem && onOpenItem(menuTarget.id, menuTarget.isFolder),
            icon: <MaterialCommunityIcons name="folder-open-outline" size={22} color={colors.primary} />
          },
          {
            title: t('rename', 'Переименовать'),
            onPress: () => menuTarget && onRenameItem && onRenameItem(menuTarget.id, menuTarget.isFolder),
            icon: <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
          },
          {
            title: t('delete', 'Удалить'),
            onPress: () => menuTarget && onDeleteItem && onDeleteItem(menuTarget.id, menuTarget.isFolder),
            icon: <MaterialCommunityIcons name="delete-outline" size={22} color="#FF3B30" />,
            destructive: true
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    flex: 1,
    paddingTop: 28,
    paddingHorizontal: 18,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 22,
    letterSpacing: 0.5,
  },
  folderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 2,
    marginTop: 2,
  },
  folderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  noteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 2,
    marginLeft: 22,
  },
  noteText: {
    fontSize: 15,
    fontWeight: '400',
  },
  addFolderBtn: {
    marginTop: 22,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  addFolderText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  titleBtn: {
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
});

export default Sidebar; 