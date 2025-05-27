import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';

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
}

const Sidebar: React.FC<SidebarProps> = ({ folders, activeId, onSelect, onAddFolder }) => {
  const { t } = useTranslation();
  const { colors, roundness } = useTheme();
  // Рекурсивный рендер папок и заметок
  const renderFolders = (items: FolderNode[], level = 0) =>
    items.map(item => (
      <View key={item.id} style={{ marginLeft: level * 16 }}>
        <TouchableOpacity
          style={[
            styles.folderBtn,
            { borderRadius: roundness, backgroundColor: activeId === item.id ? colors.primary + '22' : 'transparent' },
          ]}
          onPress={() => onSelect(item.id)}
        >
          <MaterialCommunityIcons name="folder" size={22} color={colors.secondary} style={{ marginRight: 10 }} />
          <Text style={[styles.folderText, { color: colors.text }]}>{item.title}</Text>
        </TouchableOpacity>
        {/* Заметки внутри папки */}
        {item.notes && item.notes.map(note => (
          <TouchableOpacity
            key={note.id}
            style={[
              styles.noteBtn,
              { borderRadius: roundness, backgroundColor: activeId === note.id ? colors.primary + '22' : 'transparent' },
            ]}
            onPress={() => onSelect(note.id)}
          >
            <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.placeholder} style={{ marginRight: 8 }} />
            <Text style={[styles.noteText, { color: colors.text }]}>{note.title}</Text>
          </TouchableOpacity>
        ))}
        {/* Вложенные папки */}
        {item.children && renderFolders(item.children, level + 1)}
      </View>
    ));

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.background, borderRightColor: colors.border }]}> 
      <Text style={[styles.title, { color: colors.text }]}>{t('folders_and_notes', 'Папки и заметки')}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderFolders(folders)}
        <TouchableOpacity style={[styles.addFolderBtn, { borderRadius: roundness }]} onPress={onAddFolder}>
          <Text style={[styles.addFolderText, { color: colors.primary }]}>+ {t('new_folder', 'Новая папка')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
});

export default Sidebar; 