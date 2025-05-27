import React, { useState } from 'react';
import BottomTabs from './BottomTabs';
import WelcomeScreen from '../screens/WelcomeScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  // TODO: заменить на AsyncStorage для реального онбординга
  const [showWelcome, setShowWelcome] = useState(true);

  if (showWelcome) {
    return <WelcomeScreen onStart={() => setShowWelcome(false)} />;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator; 