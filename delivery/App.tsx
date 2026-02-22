import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/stores/authStore';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import AvailableOrdersScreen from './src/screens/AvailableOrdersScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CompanyDashboardScreen from './src/screens/CompanyDashboardScreen';
import CompanyDriversScreen from './src/screens/CompanyDriversScreen';
import CompanyOrdersScreen from './src/screens/CompanyOrdersScreen';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const CompanyTab = createBottomTabNavigator();
const OrdersStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();

const colors = {
  primary: '#4F46E5',
  surface: '#1E293B',
  border: '#334155',
  tabInactive: '#64748B',
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function OrdersStackScreen() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="AvailableOrders" component={AvailableOrdersScreen} />
      <OrdersStack.Screen name="MyOrders" component={MyOrdersScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrdersStack.Navigator>
  );
}

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.tabInactive,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
};

function DriverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabScreenOptions,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'OrdersTab') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'EarningsTab') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="OrdersTab" component={OrdersStackScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="EarningsTab" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function CompanyNavigator() {
  return (
    <CompanyTab.Navigator
      screenOptions={({ route }) => ({
        ...tabScreenOptions,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'DashboardTab') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'DriversTab') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'OrdersTab') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <CompanyTab.Screen name="DashboardTab" component={CompanyDashboardScreen} options={{ title: 'Dashboard' }} />
      <CompanyTab.Screen name="DriversTab" component={CompanyDriversScreen} options={{ title: 'Drivers' }} />
      <CompanyTab.Screen name="OrdersTab" component={CompanyOrdersScreen} options={{ title: 'Orders' }} />
      <CompanyTab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </CompanyTab.Navigator>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        {!token ? <AuthNavigator /> : role === 'company' ? <CompanyNavigator /> : <DriverNavigator />}
      </NavigationContainer>
    </>
  );
}
