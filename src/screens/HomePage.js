import * as React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons'; // İkon paketi

// Home Screen
import MainPage from './MainPage';

// Settings Screen
import SettingsPage from './SettingsPage';

// Profile Screen
import ProfilePage from './ProfilePage';

// Discover Screen
import ChatPage from './ChatPage';

// Bottom Tab Navigator
const Tab = createBottomTabNavigator();

export default function HomePage() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          // İkonları route.name'e göre atama
          if (route.name === 'Main') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline'; 
          
          }

          // İkonu geri döndürme
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#f8f8f8', paddingBottom: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 12 },
      })}
    >
      <Tab.Screen name="Main" component={MainPage}
      options={{
        headerShown: false, // Header'ı tamamen kaldırır
      }} />
      <Tab.Screen name="Settings" component={SettingsPage}
      options={{
        headerShown: false, // Header'ı tamamen kaldırır
      }} />
      <Tab.Screen 
        name="Chat" 
        component={ChatPage} 
        initialParams={{ chatId: 'someChatId', userId: 'someUserId' }} 
      />
      <Tab.Screen name="Profile" component={ProfilePage} />
    </Tab.Navigator>
  );
}
