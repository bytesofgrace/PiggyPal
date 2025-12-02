// src/navigation/AppNavigator.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

// Screens
import AchievementsScreen from '../screens/AchievementsScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import LoginScreen from '../screens/LoginScreen-simple';
import RegisterScreen from '../screens/RegisterScreen-simple';
import SettingsScreen from '../screens/SettingsScreen';
import VisualsScreen from '../screens/VisualsScreen';

// Icons (using emoji for simplicity)
import { Text } from 'react-native';

const TabIcon = ({ emoji, focused }) => (
  <Text style={{ fontSize: focused ? 32 : 28, opacity: focused ? 1 : 0.6 }}>
    {emoji}
  </Text>
);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF6B9D',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 2,
          borderTopColor: '#F3F4F6',
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
        headerStyle: {
          backgroundColor: '#FF6B9D',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
        },
      }}
    >
      <Tab.Screen
        name="Expenses"
        component={ExpenseScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐷" focused={focused} />,
          title: 'Piggy\'s Ledger',
        }}
      />
      <Tab.Screen
        name="Visuals"
        component={VisualsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
          title: 'My Progress',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for logged in user on app start
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem('currentUser');
      setUser(loggedInUser);
    } catch (error) {
      if (__DEV__) console.log('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={user ? "MainTabs" : "Login"}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}