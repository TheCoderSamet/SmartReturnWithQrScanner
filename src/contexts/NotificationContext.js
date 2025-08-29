import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../firebase/authContext';
import NotificationService from '../services/NotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Listen to user's notifications
  useEffect(() => {
    if (!user) return;

    let unsubscribe = null;

    const setupNotificationListener = async () => {
      try {
        // First try simple query doesn't require index
        const simpleQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid)
        );
        
        unsubscribe = onSnapshot(simpleQuery, (snapshot) => {
          const notifs = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .sort((a, b) => {
              if (a.createdAt && b.createdAt) {
                return b.createdAt.toDate() - a.createdAt.toDate();
              }
              return 0;
            });
          setNotifications(notifs);
          setUnreadCount(notifs.filter(n => !n.read).length);
        }, (error) => {
          console.error('Simple query error:', error);
        });

      } catch (error) {
        console.error('Notification listener could not be set up:', error);
      }
    };

    setupNotificationListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Request notification permissions and save token
  const requestNotificationPermissions = async () => {
    if (!user) return false;

    try {
      setLoading(true);
      const token = await NotificationService.registerForPushNotificationsAsync();
      
      if (token) {
        await NotificationService.savePushToken(user.uid, user.email, token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Could not get notification permissions:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      // Update notification in Firestore
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Notification could not be updated:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(notification => {
        if (!notification.read) {
          const notificationRef = doc(db, 'notifications', notification.id);
          batch.update(notificationRef, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error('Notifications could not be updated:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Notification could not be deleted:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    requestNotificationPermissions,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
