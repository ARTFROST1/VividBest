// src/types/navigation.d.ts

// This is a declaration file, it doesn't contain executable code.
// It provides type definitions for JavaScript/TypeScript modules.

import { ParamListBase, NavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack'; // Assuming you are using a Stack Navigator

// Define the parameter list for your root stack navigator.
// The keys are the screen names, and the values are the types of their parameters.
// `undefined` means no parameters are expected for that screen.
export type RootStackParamList = {
  NotesScreen: undefined; // Assuming NotesScreen takes no required parameters when navigating to it directly
  NoteEditor: { id: string; title: string }; // NoteEditor expects 'id' and 'title' as strings
  // Add other screens in your main navigator here with their expected parameters.
  // Example: 'Profile': { userId: string };
  // Example: 'Settings': undefined;
};

// Extend the global ReactNavigation namespace.
// This allows `useNavigation` to be automatically typed across your application
// without needing to pass generics every time you call `useNavigation()`.
declare global {
  namespace ReactNavigation {
    // This interface is picked up by TypeScript and automatically applied
    // to the `useNavigation` hook and other navigation props.
    interface RootParamList extends RootStackParamList {}
  }
}

// You can also export specific navigation prop types if needed for individual components,
// although the global declaration often makes this unnecessary for `useNavigation`.
// export type NotesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NotesScreen'>;
// export type NoteEditorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NoteEditor'>; 