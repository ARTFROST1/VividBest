import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { Text, TextInput, IconButton, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import notesEventBus from '../utils/notesEventBus';

// Note status type
type NoteStatus = 'todo' | 'inprogress' | 'done';

// Note item interface
interface NoteItem {
  id: string;
  title: string;
  isFolder: boolean;
  pinned: boolean;
  status?: NoteStatus;
  children?: NoteItem[];
  content?: string;
  createdAt: string;
  updatedAt: string;
}

// Storage key
const NOTES_STORAGE_KEY = 'NOTES_IOS_V1';

// Route params type
type NoteDetailParams = {
  noteId: string;
};

type NoteDetailRouteProp = RouteProp<{ NoteDetail: NoteDetailParams }, 'NoteDetail'>;

const NoteDetailScreenIOS: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<NoteDetailRouteProp>();
  const theme = useTheme();
  const { noteId } = route.params;
  
  // State
  const [note, setNote] = useState<NoteItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Load note from storage
  useEffect(() => {
    const loadNote = async () => {
      try {
        const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
        if (storedNotes) {
          const notes: NoteItem[] = JSON.parse(storedNotes);
          const foundNote = notes.find(n => n.id === noteId);
          
          if (foundNote) {
            setNote(foundNote);
            setTitle(foundNote.title);
            setContent(foundNote.content || '');
          } else {
            // Note not found, go back
            Alert.alert('Error', 'Note not found');
            navigation.goBack();
          }
        }
      } catch (error) {
        console.error('Error loading note:', error);
        Alert.alert('Error', 'Failed to load note');
      }
    };
    
    loadNote();
  }, [noteId, navigation]);
  
  // Save note changes
  const saveNote = useCallback(async () => {
    if (!note) return;
    
    try {
      const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes) {
        const notes: NoteItem[] = JSON.parse(storedNotes);
        const updatedNotes = notes.map(n => {
          if (n.id === noteId) {
            return {
              ...n,
              title,
              content,
              updatedAt: new Date().toISOString()
            };
          }
          return n;
        });
        
        await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
        notesEventBus.publish('notesChanged');
        
        // Update local state
        setNote({
          ...note,
          title,
          content,
          updatedAt: new Date().toISOString()
        });
        
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  }, [note, noteId, title, content]);
  
  // Toggle pin status
  const togglePin = useCallback(async () => {
    if (!note) return;
    
    try {
      const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes) {
        const notes: NoteItem[] = JSON.parse(storedNotes);
        const updatedNotes = notes.map(n => {
          if (n.id === noteId) {
            return {
              ...n,
              pinned: !n.pinned,
              updatedAt: new Date().toISOString()
            };
          }
          return n;
        });
        
        await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
        notesEventBus.publish('notesChanged');
        
        // Update local state
        setNote({
          ...note,
          pinned: !note.pinned,
          updatedAt: new Date().toISOString()
        });
        
        setShowOptions(false);
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      Alert.alert('Error', 'Failed to update note');
    }
  }, [note, noteId]);
  
  // Delete note
  const deleteNote = useCallback(async () => {
    try {
      const storedNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      if (storedNotes) {
        const notes: NoteItem[] = JSON.parse(storedNotes);
        const updatedNotes = notes.filter(n => n.id !== noteId);
        
        await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
        notesEventBus.publish('notesChanged');
        
        // Go back to notes list
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note');
    }
  }, [noteId, navigation]);
  
  // Confirm delete
  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: deleteNote,
          style: 'destructive'
        }
      ]
    );
    setShowOptions(false);
  }, [deleteNote]);
  
  // Format date for display
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  }, []);
  
  // Options menu
  const renderOptionsMenu = () => (
    <View style={styles.optionsOverlay}>
      <TouchableOpacity
        style={styles.optionsBackdrop}
        onPress={() => setShowOptions(false)}
      />
      <View style={styles.optionsMenu}>
        <TouchableOpacity
          style={styles.optionItem}
          onPress={togglePin}
        >
          <IconButton
            icon={note?.pinned ? 'pin-off' : 'pin'}
            size={24}
            iconColor="#007AFF"
          />
          <Text style={styles.optionText}>
            {note?.pinned ? t('Unpin') : t('Pin')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.optionItem}
          onPress={() => {
            setIsEditing(true);
            setShowOptions(false);
          }}
        >
          <IconButton
            icon="pencil"
            size={24}
            iconColor="#007AFF"
          />
          <Text style={styles.optionText}>{t('Edit')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.optionItem, styles.deleteOption]}
          onPress={confirmDelete}
        >
          <IconButton
            icon="delete"
            size={24}
            iconColor="#FF3B30"
          />
          <Text style={styles.deleteText}>{t('Delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Render edit mode
  const renderEditMode = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              if (title !== note?.title || content !== note?.content) {
                Alert.alert(
                  'Discard Changes',
                  'Are you sure you want to discard your changes?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    },
                    {
                      text: 'Discard',
                      onPress: () => {
                        setTitle(note?.title || '');
                        setContent(note?.content || '');
                        setIsEditing(false);
                      },
                      style: 'destructive'
                    }
                  ]
                );
              } else {
                setIsEditing(false);
              }
            }}
          >
            <Text style={styles.cancelText}>{t('Cancel')}</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{t('Edit Note')}</Text>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={saveNote}
          >
            <Text style={styles.doneText}>{t('Done')}</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={t('Title')}
            placeholderTextColor="#8E8E93"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            selectionColor="#007AFF"
          />
          
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder={t('Note')}
            placeholderTextColor="#8E8E93"
            multiline
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            selectionColor="#007AFF"
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
  
  // Render view mode
  const renderViewMode = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('Notes')}</Text>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editText}>{t('Edit')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowOptions(true)}
          >
            <IconButton
              icon="dots-horizontal"
              size={24}
              iconColor="#007AFF"
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle}>{note?.title}</Text>
          {note?.pinned && (
            <IconButton
              icon="pin"
              size={20}
              iconColor="#FF9500"
              style={styles.pinIcon}
            />
          )}
        </View>
        
        <Text style={styles.dateText}>
          {note ? formatDate(note.updatedAt) : ''}
        </Text>
        
        <Text style={styles.contentText}>
          {note?.content || ''}
        </Text>
      </ScrollView>
      
      {showOptions && renderOptionsMenu()}
    </SafeAreaView>
  );
  
  return isEditing ? renderEditMode() : renderViewMode();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  editText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
  },
  cancelText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '400',
  },
  doneText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  pinIcon: {
    margin: 0,
  },
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  contentText: {
    fontSize: 17,
    color: '#000000',
    lineHeight: 24,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  contentInput: {
    fontSize: 17,
    color: '#000000',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    lineHeight: 24,
    minHeight: 300,
  },
  optionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  optionsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  optionsMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '80%',
    maxWidth: 300,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 17,
    color: '#000000',
    marginLeft: 8,
  },
  deleteOption: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  deleteText: {
    fontSize: 17,
    color: '#FF3B30',
    marginLeft: 8,
  },
});

export default NoteDetailScreenIOS;