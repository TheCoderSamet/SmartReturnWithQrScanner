import React, { useEffect, useState } from 'react';
import {  SafeAreaView,  StyleSheet,  StatusBar,  Platform, View, Text} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/firebase/config';
import { getUserRole } from './src/firebase/firestore';
import * as Notifications from 'expo-notifications';
import NotificationService from './src/services/NotificationService';

import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';

import { AuthProvider } from './src/firebase/authContext';
import { NotificationProvider } from './src/contexts/NotificationContext';

import BuyerNavigator from './src/navigation/BuyerNavigator';
import SellerNavigator from './src/navigation/SellerNavigator';


const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bildirim davranışını yapılandır
  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (error) {
      console.error('Notification handler setup failed:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRole = await getUserRole(firebaseUser.uid);
          setUser(firebaseUser);
          setRole(userRole);
          
          // Kullanıcı giriş yaptıktan sonra bildirim izinlerini iste
          try {
            const token = await NotificationService.registerForPushNotificationsAsync();
            if (token) {
              await NotificationService.savePushToken(firebaseUser.uid, firebaseUser.email, token);
              console.log('Push token kaydedildi:', token);
            }
          } catch (error) {
            console.log('Bildirim izinleri alınamadı:', error);
          }
        } else {
          setUser(null);
          setRole(null);
        }
        setError(null);
      } catch (error) {
        console.error('Auth state change error:', error);
        setError('Authentication error occurred');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Uygulama açıkken gelen bildirimleri dinle
  useEffect(() => {
    if (user) {
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Bildirim alındı:', notification);
      });

      return () => subscription.remove();
    }
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <Text style={styles.errorSubtext}>Please check your configuration and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" />
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {user ? (
                role === 'buyer' ? (
                  <Stack.Screen name="Buyer" component={BuyerNavigator} />
                ) : (
                  <Stack.Screen name="Seller" component={SellerNavigator} />
                )
              ) : (
                <>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />

                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </NotificationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff0000',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
});
