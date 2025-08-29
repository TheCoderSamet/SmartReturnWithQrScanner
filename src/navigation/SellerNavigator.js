import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';

// Seller Screens
import AddProductScreen from '../screens/Seller/AddProductScreen';
import ProductListScreen from '../screens/Seller/ProductListScreen';
import ReturnApprovalScreen from '../screens/Seller/ReturnApprovalScreen';
import ApprovedProductsScreen from '../screens/Seller/ApprovedProductsScreen';
import SettingsScreen from '../screens/Seller/SettingsScreen';
import NotificationScreen from '../screens/NotificationScreen';
import NotificationService from '../services/NotificationService';



const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabScreens = () => {
  const tabOffsetValue = useRef(new Animated.Value(0)).current; //Tab Translation Animations
  const [activeRoute, setActiveRoute] = useState('Products');
  const [pendingCount, setPendingCount] = useState(0);

  const getWidth = () => {
    let width = 375; // Fixed width instead of Dimensions.get('window').width
    width = width - 80;
    return width / 4;
  };

  const iconStyle = { top: 12, position: 'absolute' };

  // Fetch pending count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const email = auth.currentUser?.email;
        if (email) {
          const q = query(collection(db, 'returns'), where('sellerEmail', '==', email));
          const snap = await getDocs(q);
          const pending = snap.docs.filter(doc => doc.data().status === 'pending').length;
          setPendingCount(pending);
        }
      } catch (error) {
        console.log('Error fetching pending count:', error);
      }
    };

    fetchPendingCount();
    
    // Set up interval to refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 25,
            marginHorizontal: 20,
            height: 70,
            backgroundColor: '#ffffff',
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingBottom: 10,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            elevation: 12,
            borderWidth: 1,
            borderColor: '#f1f5f9',
          },
        }}
      >
        <Tab.Screen
          name="Products"
          component={ProductListScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <FontAwesome5
                  name="box"
                  size={20}
                  color={focused ? '#3b82f6' : '#94a3b8'}
                  style={iconStyle}
                />
                {focused && (
                  <Animated.View style={[styles.activeIndicator, { backgroundColor: '#3b82f6' }]} />
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveRoute('Products');
              Animated.spring(tabOffsetValue, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
              }).start();
            },
          }}
        />

        <Tab.Screen
          name="Returns"
          component={ReturnApprovalScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <FontAwesome5
                  name="exchange-alt"
                  size={20}
                  color={focused ? '#ed9d3b' : '#94a3b8'}
                  style={iconStyle}
                />
                {focused && (
                  <Animated.View style={[styles.activeIndicator, { backgroundColor: '#ed9d3b' }]} />
                )}
                {/* Pending Count Badge */}
                {pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveRoute('Returns');
              Animated.spring(tabOffsetValue, {
                toValue: getWidth(),
                useNativeDriver: true,
                tension: 50,
                friction: 7,
              }).start();
            },
          }}
        />

        <Tab.Screen
          name="Add"
          component={AddProductScreen}
          options={{
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => {
                  setActiveRoute('Add');
                  props.onPress();
                }}
                style={styles.centerButton}
              >
                <View
                  style={[
                    styles.centerButtonInner,
                    {
                      backgroundColor: activeRoute === 'Add' ? '#f0b237' : '#94a3b8',
                    }
                  ]}
                >
                  <FontAwesome5
                    name="pen"
                    size={20}
                    color="white"
                  />
                </View>
                <View style={styles.centerButtonShadow} />
              </TouchableOpacity>
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveRoute('Add');
            },
          }}
        />

        <Tab.Screen
          name="Approved"
          component={ApprovedProductsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <FontAwesome5
                  name="check"
                  size={20}
                  color={focused ? '#10b981' : '#94a3b8'}
                  style={iconStyle}
                />
                {focused && (
                  <Animated.View style={[styles.activeIndicator, { backgroundColor: '#10b981' }]} />
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveRoute('Approved');
              Animated.spring(tabOffsetValue, {
                toValue: getWidth() * 3,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
              }).start();
            },
          }}
        />



        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <FontAwesome5
                  name="user-cog"
                  size={20}
                  color={focused ? '#8b5fcf' : '#94a3b8'}
                  style={iconStyle}
                />
                {focused && (
                  <Animated.View style={[styles.activeIndicator, { backgroundColor: '#8b5fcf' }]} />
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveRoute('Settings');
              Animated.spring(tabOffsetValue, {
                toValue: getWidth() * 4,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
              }).start();
            },
          }}
        />
      </Tab.Navigator>


    </View>
  );
};

const SellerNavigator = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Set up notification listeners for seller-specific navigation
    const cleanup = NotificationService.setNotificationListeners(navigation);
    return cleanup;
  }, [navigation]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabScreens} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="ReturnApproval" component={ReturnApprovalScreen} />
      <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
    </Stack.Navigator>
  );
};

const styles = {
  centerButton: {
    top: -25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0dab6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#f0dab6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    zIndex: 2,
  },
  centerButtonShadow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    top: 4,
    zIndex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  badge: {
    position: 'absolute',
    top: -16,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    elevation: 4,
    
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
};

export default SellerNavigator;
