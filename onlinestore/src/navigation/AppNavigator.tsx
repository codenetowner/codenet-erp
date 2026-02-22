import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { useCartStore } from '../stores/cartStore';
import { useMemo } from 'react';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import StoreListScreen from '../screens/StoreListScreen';
import StoreScreen from '../screens/StoreScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import SavedAddressesScreen from '../screens/SavedAddressesScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SearchScreen from '../screens/SearchScreen';
import ReviewsScreen from '../screens/ReviewsScreen';

import type {
  RootTabParamList,
  HomeStackParamList,
  CategoriesStackParamList,
  CartStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CatStack = createNativeStackNavigator<CategoriesStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="StoreList" component={StoreListScreen} />
      <HomeStack.Screen name="Store" component={StoreScreen} />
      <HomeStack.Screen name="Search" component={SearchScreen} />
      <HomeStack.Screen name="Reviews" component={ReviewsScreen} />
    </HomeStack.Navigator>
  );
}

function CategoriesStackScreen() {
  return (
    <CatStack.Navigator screenOptions={{ headerShown: false }}>
      <CatStack.Screen name="Categories" component={CategoriesScreen} />
      <CatStack.Screen name="CategoryStores" component={StoreListScreen} />
      <CatStack.Screen name="Store" component={StoreScreen} />
      <CatStack.Screen name="Reviews" component={ReviewsScreen} />
    </CatStack.Navigator>
  );
}

function CartStackScreen() {
  return (
    <CartStack.Navigator screenOptions={{ headerShown: false }}>
      <CartStack.Screen name="Cart" component={CartScreen} />
      <CartStack.Screen name="Checkout" component={CheckoutScreen} />
      <CartStack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
    </CartStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Login" component={LoginScreen} />
      <ProfileStack.Screen name="Register" component={RegisterScreen} />
      <ProfileStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <ProfileStack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <ProfileStack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      <ProfileStack.Screen name="Favorites" component={FavoritesScreen} />
    </ProfileStack.Navigator>
  );
}

const prefix = 'Catalyst-store://';

const linking: LinkingOptions<RootTabParamList> = {
  prefixes: [prefix, 'https://Catalyst.store'],
  config: {
    screens: {
      HomeTab: {
        screens: {
          Home: '',
          Store: 'store/:companyId',
          StoreList: 'category/:categoryId',
          Search: 'search',
        },
      },
      CategoriesTab: 'categories',
      CartTab: 'cart',
      ProfileTab: {
        screens: {
          Profile: 'profile',
          OrderHistory: 'orders',
          OrderDetail: 'orders/:orderId',
        },
      },
    },
  },
};

export default function AppNavigator() {
  const totalItems = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home';
            if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'CategoriesTab') iconName = focused ? 'grid' : 'grid-outline';
            else if (route.name === 'CartTab') iconName = focused ? 'cart' : 'cart-outline';
            else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeStackScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="CategoriesTab" component={CategoriesStackScreen} options={{ title: 'Categories' }} />
        <Tab.Screen
          name="CartTab"
          component={CartStackScreen}
          options={{
            title: 'Cart',
            tabBarBadge: totalItems > 0 ? totalItems : undefined,
          }}
        />
        <Tab.Screen name="ProfileTab" component={ProfileStackScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
