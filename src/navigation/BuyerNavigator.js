import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';

import HomeScreen from '../screens/Buyer/ReturnStatusScreen';
import QRScannerScreen from '../screens/Buyer/QRScannerScreen';
import ReturnFormScreen from '../screens/Buyer/ReturnFormScreen';
import BuyerMapScreen from '../screens/Buyer/BuyerMapScreen';
import SettingsScreen from '../screens/Buyer/SettingsScreen';
import NotificationScreen from '../screens/NotificationScreen';



const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabScreens = () => {
  const tabOffsetValue = useRef(new Animated.Value(0)).current;
  const [activeRoute, setActiveRoute] = useState('Returns');

  const getWidth = () => {
    let width = Dimensions.get('window').width;
    width = width - 80;
    return width / 4;
  };

  const iconStyle = { top: 15, position: 'absolute' };

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
          name="Returns"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <FontAwesome5
                  name="history"
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
              setActiveRoute('Returns');
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
          name="Scan"
          component={QRScannerScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <FontAwesome5
                  name="qrcode"
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
              setActiveRoute('Scan');
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
          name="Form"
          component={ReturnFormScreen}
          options={{
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => {
                  setActiveRoute('Form');
                  props.onPress();
                }}
                style={styles.centerButton}
              >
                <View
                  style={[
                    styles.centerButtonInner,
                    {
                      backgroundColor: activeRoute === 'Form' ? '#667eea' : '#94a3b8',
                    }
                  ]}
                >
                  <FontAwesome5 name="edit" size={20} color="white" />
                </View>
                <View style={styles.centerButtonShadow} />
              </TouchableOpacity>
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveRoute('Form');
            },
          }}
        />

        <Tab.Screen
          name="Map"
          component={BuyerMapScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: 'center' }}>
                <FontAwesome5
                  name="map-marked-alt"
                  size={20}
                  color={focused ? '#f59e0b' : '#94a3b8'}
                  style={iconStyle}
                />
                {focused && (
                  <Animated.View style={[styles.activeIndicator, { backgroundColor: '#f59e0b' }]} />
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveRoute('Map');
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

const BuyerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabScreens} />
      <Stack.Screen name="ReturnFormScreen" component={ReturnFormScreen} />
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    zIndex: 2,
  },
  centerButtonShadow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    top: 3,
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

};

export default BuyerNavigator;
