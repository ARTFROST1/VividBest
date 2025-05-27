import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  // Рекурсивный рендер папок и заметок
  const renderFolders = (items: FolderNode[], level = 0) =>
    items.map(item => (
      <View key={item.id} style={{ marginLeft: level * 16 }}>
        <TouchableOpacity
          style={[styles.folderBtn, activeId === item.id && styles.activeFolder]}
          onPress={() => onSelect(item.id)}
        >
          <MaterialCommunityIcons name="folder" size={18} color="#F7B801" style={{ marginRight: 6 }} />
          <Text style={styles.folderText}>{item.title}</Text>
        </TouchableOpacity>
        {/* Заметки внутри папки */}
        {item.notes && item.notes.map(note => (
          <TouchableOpacity
            key={note.id}
            style={[styles.noteBtn, activeId === note.id && styles.activeNote]}
            onPress={() => onSelect(note.id)}
          >
            <MaterialCommunityIcons name="file-document-outline" size={16} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.noteText}>{note.title}</Text>
          </TouchableOpacity>
        ))}
        {/* Вложенные папки */}
        {item.children && renderFolders(item.children, level + 1)}
      </View>
    ));

  return (
    <View style={styles.sidebar}>
      <Text style={styles.title}>Папки и заметки</Text>
      <ScrollView>
        {renderFolders(folders)}
        <TouchableOpacity style={styles.addFolderBtn} onPress={onAddFolder}>
          <Text style={styles.addFolderText}>+ Новая папка</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: '#fafbfc',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 18,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 18,
    color: '#222',
  },
  folderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  folderText: {
    fontSize: 15,
    color: '#222',
  },
  activeFolder: {
    backgroundColor: '#e6f0ff',
  },
  noteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginBottom: 2,
    marginLeft: 18,
  },
  noteText: {
    fontSize: 14,
    color: '#555',
  },
  activeNote: {
    backgroundColor: '#e6f0ff',
  },
  addFolderBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  addFolderText: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default Sidebar; 