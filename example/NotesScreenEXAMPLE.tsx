import React from 'react';
import { View, StyleSheet } from 'react-native';
import Sidebar from '../../modules/notes/Sidebar';
import NotesList from '../../modules/notes/NotesList';
import { NotesProvider } from '../../modules/notes/NotesContext';

const NotesScreen = () => {
  return (
    <NotesProvider>
      <View style={styles.container}>
        <View style={styles.sidebar}>
          <Sidebar />
        </View>
        <View style={styles.notesList}>
          <NotesList />
        </View>
      </View>
    </NotesProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#f4f4f4',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  notesList: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default NotesScreen; 