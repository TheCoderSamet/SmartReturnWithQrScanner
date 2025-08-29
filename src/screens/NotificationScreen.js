import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationScreen = ({ navigation }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh notifications automatically handled by context
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Notification type based navigation
    if (notification.data?.type === 'return_request') {
      try {
        navigation.navigate('Tabs', { screen: 'Returns' });
      } catch (error) {
        console.log('Navigation to Returns tab failed - route may not exist in current navigator');
      }
    } else if (notification.data?.type === 'return_decision') {
      try {
        navigation.navigate('Tabs', { screen: 'Returns' });
      } catch (error) {
        console.log('Navigation to Returns tab failed - route may not exist in current navigator');
      }
    }
  };

  const handleDeleteNotification = (notificationId) => {
    Alert.alert(
           'Delete Notification',
     'Are you sure you want to delete this notification?',
     [
       { text: 'Cancel', style: 'cancel' },
       { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(notificationId) }
     ]
    );
  };

  const renderNotification = ({ item }) => {
    const isUnread = !item.read;
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            {item.data?.type === 'return_request' && (
              <FontAwesome5 name="box" size={18} color="#3b82f6" />
            )}
            {item.data?.type === 'return_decision' && (
              <FontAwesome5 
                name={item.data.decision === 'approved' ? 'check-circle' : 'times-circle'} 
                size={18} 
                color={item.data.decision === 'approved' ? '#10b981' : '#ef4444'} 
              />
            )}
            {!item.data?.type && <FontAwesome5 name="bell" size={18} color="#6c757d" />}
          </View>
          
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={styles.notificationBody}>{item.body}</Text>
            <Text style={styles.notificationTime}>
              {formatDistanceToNow(item.createdAt.toDate(), { 
                addSuffix: true
              })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(item.id)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {isUnread && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIconContainer}>
        <FontAwesome5 name="bell-slash" size={48} color="#adb5bd" />
      </View>
      <Text style={styles.emptyStateTitle}>No Notifications Yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        New notifications will appear here when they arrive
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
             {/* Header */}
       <View style={styles.header}>
         <View style={styles.headerLeft}>
           <TouchableOpacity 
             style={styles.backButton} 
             onPress={() => navigation.goBack()}
           >
             <FontAwesome5 name="arrow-left" size={18} color="#6c757d" />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>Notifications</Text>
         </View>
         
         <View style={styles.headerRight}>
           {unreadCount > 0 && (
             <View style={styles.badge}>
               <Text style={styles.badgeText}>{unreadCount}</Text>
             </View>
           )}
           {notifications.length > 0 && (
             <TouchableOpacity style={styles.markAllReadButton} onPress={markAllAsRead}>
               <Text style={styles.markAllReadText}>Mark All as Read</Text>
             </TouchableOpacity>
           )}
         </View>
       </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  badge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllReadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6c757d',
    borderRadius: 16,
  },
  markAllReadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#212529',
  },
  notificationBody: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#adb5bd',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationScreen;
