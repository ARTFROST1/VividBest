import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotesScreen from './NotesScreen';
import NoteEditorScreen from './NoteEditorScreen';

export type NotesStackParamList = {
  NotesList: undefined;
  NoteEditor: undefined;
};

const Stack = createNativeStackNavigator<NotesStackParamList>();

const NotesStack: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NotesList"
        component={NotesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NoteEditor"
        component={NoteEditorScreen}
        options={{ title: 'Редактирование заметки', headerBackTitle: 'Назад' }}
      />
    </Stack.Navigator>
  );
};

export default NotesStack; 