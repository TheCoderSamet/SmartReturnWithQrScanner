import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getExpoExtra() {
  const extraFromExpoConfig = Constants?.expoConfig?.extra;
  const extraFromManifest = Constants?.manifest?.extra;
  return extraFromExpoConfig ?? extraFromManifest ?? {};
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
  }

  // Get Expo Push Token
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permission denied!');
        return;
      }
      
      // Get Expo project ID from environment variables
      const expoProjectId = getExpoExtra().EXPO_PROJECT_ID || 'ed7a3840-d6ba-4597-9e73-1c9e5125e4cb';
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: expoProjectId,
      })).data;
    } else {
      console.log('Physical device required');
    }

    return token;
  }

  // Save user's push token to Firestore
  async savePushToken(userId, email, pushToken) {
    try {
      console.log('Saving push token...', { userId, email, pushToken: pushToken.substring(0, 20) + '...' });
      
      // Check existing token
      const tokenQuery = query(
        collection(db, 'pushTokens'),
        where('userId', '==', userId)
      );
      const tokenSnap = await getDocs(tokenQuery);

      if (!tokenSnap.empty) {
        // Update existing token
        const tokenDoc = tokenSnap.docs[0];
        await updateDoc(doc(db, 'pushTokens', tokenDoc.id), {
          pushToken,
          updatedAt: new Date()
        });
        console.log('Existing push token updated');
      } else {
        // Add new token
        await addDoc(collection(db, 'pushTokens'), {
          userId,
          email,
          pushToken,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('New push token added');
      }
      
      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Could not save push token:', error);
    }
  }

      // Send notification to user
  async sendNotification(userId, title, body, data = {}) {
    try {
      console.log('Sending notification...', { userId, title, body });
      
              // Find user's push token
      const tokenQuery = query(
        collection(db, 'pushTokens'),
        where('userId', '==', userId)
      );
      const tokenSnap = await getDocs(tokenQuery);

      console.log('Push token search result:', { 
        empty: tokenSnap.empty, 
        count: tokenSnap.docs.length,
        userId 
      });

      if (tokenSnap.empty) {
        console.log('User\'s push token not found');
        return;
      }

      const pushToken = tokenSnap.docs[0].data().pushToken;

      // Send Expo push notification
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

              // Save notification to Firestore
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        body,
        data,
        createdAt: new Date(),
        read: false
      });

    } catch (error) {
      console.error('Notification could not be sent:', error);
    }
  }

  // Send notification to user by email
  async sendNotificationByEmail(email, title, body, data = {}) {
    try {
      // Find user ID by email
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const userSnap = await getDocs(userQuery);

      if (userSnap.empty) {
        console.log('User not found');
        return;
      }

      const userId = userSnap.docs[0].id;
      await this.sendNotification(userId, title, body, data);
    } catch (error) {
      console.error('Notification could not be sent by email:', error);
    }
  }

  // Send return request notification (to Seller)
  async sendReturnRequestNotification(sellerEmail, buyerName, productName) {
    const title = 'New Return Request';
    const body = `Customer ${buyerName} has requested a return for ${productName} product.`;
    
    await this.sendNotificationByEmail(sellerEmail, title, body, {
      type: 'return_request',
      productName,
      buyerName
    });
  }

  // Send return decision notification (to Buyer)
  async sendReturnDecisionNotification(buyerEmail, productName, decision) {
    const title = decision === 'approved' ? 'Your Return Request Approved' : 'Your Return Request Rejected';
    const body = decision === 'approved' 
      ? `Your return request for ${productName} product has been approved.` 
      : `Your return request for ${productName} product has been rejected.`;
    
    await this.sendNotificationByEmail(buyerEmail, title, body, {
      type: 'return_decision',
      productName,
      decision
    });
  }

  // Show local notification
  async showLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Show immediately
    });
  }

  // Set up notification listeners
  setNotificationListeners(navigation) {
    // Listen for notifications when app is open
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification tap actions
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (data.type === 'return_request') {
        navigation.navigate('ReturnApproval');
      } else if (data.type === 'return_decision') {
        navigation.navigate('ReturnStatus');
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }
}

export default new NotificationService();
