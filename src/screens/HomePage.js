import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import MainPage from './MainPage';
import SettingsPage from './SettingsPage';
import ProfilePage from './ProfilePage';
import ChatLobby from './ChatLobby';

const Tab = createBottomTabNavigator();

const ICONS = {
  Main: { active: 'home', inactive: 'home-outline', label: 'Ana Sayfa' },
  Settings: { active: 'settings', inactive: 'settings-outline', label: 'Ayarlar' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline', label: 'Sohbet' },
  Profile: { active: 'person', inactive: 'person-outline', label: 'Profil' },
};

const HEADER_STYLE = {
  backgroundColor: '#f6f9fc',
  borderBottomWidth: 0,
  elevation: 0,
  shadowOpacity: 0,
};

const HEADER_TITLE_STYLE = {
  fontWeight: '700',
  color: '#041523',
  fontSize: 18,
};

export default function HomePage() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const iconConfig = ICONS[route.name];
        return {
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name={focused ? iconConfig.active : iconConfig.inactive} size={size} color={color} />
          ),
          tabBarLabel: iconConfig.label,
          tabBarActiveTintColor: '#0eb37d',
          tabBarInactiveTintColor: 'rgba(6, 24, 40, 0.45)',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            height: 70,
            paddingBottom: 12,
            paddingTop: 8,
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#041523',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: HEADER_STYLE,
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerShadowVisible: false,
          tabBarHideOnKeyboard: true,
        };
      }}
    >
      <Tab.Screen
        name="Main"
        component={MainPage}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsPage}
        options={{
          headerTitle: 'Ayarlar',
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatLobby}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePage}
        options={{
          headerTitle: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}





