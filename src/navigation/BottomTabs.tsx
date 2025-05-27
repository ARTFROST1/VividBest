import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NotesScreen from '../screens/NotesScreen';
import TasksScreen from '../screens/TasksScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  const { t } = useTranslation();
  const { colors, roundness } = useTheme();
  const c = colors as any;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopWidth: 1,
          borderTopColor: c.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.placeholder,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: 'bold',
          marginBottom: 2,
        },
        tabBarItemStyle: {
          borderRadius: roundness,
          marginHorizontal: 8,
        },
      }}
    >
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          title: t('all_notes'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name="notebook-outline" color={color} size={focused ? size + 4 : size} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: t('daily_tasks'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name="check-circle-outline" color={color} size={focused ? size + 4 : size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={focused ? size + 4 : size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabs; 