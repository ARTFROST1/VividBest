import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Animated } from 'react-native';
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

  // Современный рендер папок и заметок
  const renderFolders = (items: FolderNode[], level = 0) =>
    items.map(item => {
      const isActive = activeId === item.id;
      const folderBtnProps: any = {
        style: [
          styles.modernFolderBtn,
          { 
            backgroundColor: isActive ? '#F7B801' + '20' : 'transparent',
            borderRadius: 12,
            marginLeft: level * 16,
            borderLeftWidth: isActive ? 3 : 0,
            borderLeftColor: isActive ? '#F7B801' : 'transparent',
          },
        ],
        onPress: () => onSelect(item.id),
        onLongPress: () => openMenu(item.id, true),
      };
      if (Platform.OS === 'web') folderBtnProps.onContextMenu = (e: any) => openMenu(item.id, true, e);
      
      const folderBtn = (
        <TouchableOpacity key={item.id} {...folderBtnProps}>
          <View style={styles.modernItemContent}>
            <MaterialCommunityIcons 
              name={isActive ? "folder" : "folder-outline"} 
              size={20} 
              color={isActive ? '#F7B801' : (dark ? '#8E8E93' : '#6D6D70')} 
              style={{ marginRight: 12 }} 
            />
            <Text style={[
              styles.modernFolderText, 
              { 
                color: isActive ? '#F7B801' : (dark ? '#FFFFFF' : '#000000'),
                fontWeight: isActive ? '600' : '500'
              }
            ]}>
              {item.title}
            </Text>
            {item.notes && item.notes.length > 0 && (
              <View style={[styles.notesCount, { backgroundColor: dark ? '#3A3A3C' : '#E5E5EA' }]}>
                <Text style={[styles.notesCountText, { color: dark ? '#FFFFFF' : '#000000' }]}>
                  {item.notes.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
      
      const noteBtns = item.notes && item.notes.map(note => {
        const isNoteActive = activeId === note.id;
        const noteBtnProps: any = {
          style: [
            styles.modernNoteBtn,
            { 
              backgroundColor: isNoteActive ? '#F7B801' + '15' : 'transparent',
              borderRadius: 8,
              marginLeft: (level + 1) * 16,
              borderLeftWidth: isNoteActive ? 2 : 0,
              borderLeftColor: isNoteActive ? '#F7B801' : 'transparent',
            },
          ],
          onPress: () => onSelect(note.id),
          onLongPress: () => openMenu(note.id, false),
        };
        if (Platform.OS === 'web') noteBtnProps.onContextMenu = (e: any) => openMenu(note.id, false, e);
        return (
          <TouchableOpacity key={note.id} {...noteBtnProps}>
            <View style={styles.modernItemContent}>
              <MaterialCommunityIcons 
                name="note-text-outline" 
                size={16} 
                color={isNoteActive ? '#F7B801' : (dark ? '#8E8E93' : '#6D6D70')} 
                style={{ marginRight: 10 }} 
              />
              <Text style={[
                styles.modernNoteText, 
                { 
                  color: isNoteActive ? '#F7B801' : (dark ? '#FFFFFF' : '#000000'),
                  fontWeight: isNoteActive ? '500' : '400'
                }
              ]}>
                {note.title}
              </Text>
            </View>
          </TouchableOpacity>
        );
      });
      
      return (
        <View key={item.id}>
          {folderBtn}
          {noteBtns}
          {/* Вложенные папки */}
          {item.children && renderFolders(item.children, level + 1)}
        </View>
      );
    });

  // Контекстное меню через Dialog/Portal
  return (
    <View style={[styles.sidebar, { backgroundColor: dark ? '#1C1C1E' : '#F8F9FA', borderRightColor: dark ? '#38383A' : '#E5E5EA' }]}> 
      {/* Современный заголовок */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.allNotesButton,
            { 
              backgroundColor: activeId === null ? '#F7B801' : 'transparent',
              borderRadius: 12,
            },
          ]}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="note-multiple" 
            size={20} 
            color={activeId === null ? '#FFFFFF' : (dark ? '#FFFFFF' : '#000000')} 
            style={{ marginRight: 8 }}
          />
          <Text style={[
            styles.allNotesText, 
            { 
              color: activeId === null ? '#FFFFFF' : (dark ? '#FFFFFF' : '#000000'),
              fontWeight: activeId === null ? '600' : '500'
            }
          ]}>
            {t('all_notes', 'Все заметки')}
          </Text>
        </TouchableOpacity>
        
        {/* Добавить новый элемент */}
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: dark ? '#2C2C2E' : '#FFFFFF' }]} 
          onPress={onAddFolder}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="plus" 
            size={20} 
            color={dark ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer}>
        {folders.length > 0 && (
          <View style={styles.foldersSection}>
            <Text style={[styles.sectionTitle, { color: dark ? '#8E8E93' : '#6D6D70' }]}>
              {t('folders', 'Папки')}
            </Text>
            {renderFolders(folders)}
          </View>
        )}
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
    flex: 1,
    borderRightWidth: 0.5,
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 8,
  },
  allNotesText: {
    fontSize: 16,
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  foldersSection: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  modernFolderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  modernNoteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 1,
  },
  modernItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernFolderText: {
    fontSize: 15,
    flex: 1,
  },
  modernNoteText: {
    fontSize: 14,
    flex: 1,
  },
  notesCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notesCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Sidebar;