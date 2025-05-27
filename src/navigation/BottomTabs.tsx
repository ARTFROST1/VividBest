import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NotesScreen from '../screens/NotesScreen';
import TasksScreen from '../screens/TasksScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const BottomTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="Notes"
      component={NotesScreen}
      options={{
        title: 'Все заметки',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="notebook-outline" color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen
      name="Tasks"
      component={TasksScreen}
      options={{
        title: 'Ежедневные задачи',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="check-circle-outline" color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        title: 'Настройки',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
        ),
      }}
    />
  </Tab.Navigator>
);

export default BottomTabs; 