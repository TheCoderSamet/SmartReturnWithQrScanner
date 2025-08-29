import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Animated, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../firebase/authContext';
import { getReturnsByBuyer } from '../../firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../../contexts/NotificationContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';

const width = 375; 

const statusMap = {
  approved: { 
    text: 'APPROVED', 
    icon: 'check-circle',
    color: '#ffffff', 
    bg: '#22c55e',
    gradient: ['#22c55e', '#16a34a'],
    cardBg: '#f0fdf4'
  },
  rejected: { 
    text: 'REJECTED', 
    icon: 'times-circle',
    color: '#ffffff', 
    bg: '#ef4444',
    gradient: ['#ef4444', '#dc2626'],
    cardBg: '#fef2f2'
  },
  pending: { 
    text: 'PENDING', 
    icon: 'clock',
    color: '#ffffff', 
    bg: '#f59e0b',
    gradient: ['#f59e0b', '#d97706'],
    cardBg: '#fffbeb'
  }
};

const safe = (v, fallback = '') =>
  typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : fallback);

const ReturnStatusScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { unreadCount } = useNotifications();
  const [returns, setReturns] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const fetchReturns = useCallback(async () => {
    try {
      const result = await getReturnsByBuyer(user?.uid);
      setReturns(Array.isArray(result) ? result.filter(r => r && typeof r === 'object') : []);
    } catch (error) {
      // Error silently handled
    }
  }, [user?.uid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReturns();
    setRefreshing(false);
  }, [fetchReturns]);

  useEffect(() => {
    if (user?.uid) fetchReturns();
  }, [fetchReturns]);

  const renderItem = ({ item, index }) => {
    const status = statusMap[item?.status] || statusMap.pending;
    const delay = index * 150;
    
    const handleMapPress = () => {
      if (item?.returnAddressCoords) {
        // Map tab'ına geçiş yap
        navigation.navigate('Map');
      }
    };
    
    return (
      <Animated.View 
        style={[
          styles.card,
          { 
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0]
              })}
            ]
          }
        ]}
      >
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={styles.statusLeft}>
            <FontAwesome5 
              name={status.icon} 
              size={16} 
              color={
                item?.status === 'approved' ? '#10b981' : 
                item?.status === 'rejected' ? '#ef4444' : 
                '#f59e0b'
              } 
              style={styles.statusIcon} 
            />
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
          <View style={styles.statusRight}>
            <Text style={styles.statusNumber}>#{index + 1}</Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productSection}>
          <View style={styles.productIconContainer}>
            <FontAwesome5 name="shopping-bag" size={20} color="#1a1a1a" />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {safe(item?.productName, 'Unnamed Product')}
            </Text>
            <Text style={styles.productDate}>
              Requested: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Status Specific Content */}
        {item?.status === 'approved' && (
          <View style={[styles.contentBox, styles.approvedContent]}>
            <View style={styles.contentHeader}>
              <FontAwesome5 name="map-marker-alt" size={18} color="#10b981" />
              <Text style={styles.contentTitle}>Return Address</Text>
            </View>
            <View style={styles.addressContainer}>
              <Text style={styles.addressText}>
                {safe(item?.returnAddress, 'N/A')}
              </Text>
              {item?.returnAddressCoords && (
                <TouchableOpacity style={styles.mapBadge} onPress={handleMapPress}>
                  <Text style={styles.mapText}>◐ Map Available</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {item?.status === 'rejected' && (
          <View style={[styles.contentBox, styles.rejectedContent]}>
            <View style={styles.contentHeader}>
              <FontAwesome5 name="exclamation-triangle" size={18} color="#ef4444" />
              <Text style={styles.contentTitle}>Rejection Details</Text>
            </View>
            <Text style={styles.reasonText}>
              {safe(item?.reason, 'No reason provided')}
            </Text>
            <TouchableOpacity style={styles.contactButton} onPress={() => {
              const sellerPhone = item?.sellerBusinessPhone || 'Not provided';
              const sellerEmail = item?.sellerEmail || 'Not provided';
              
              Alert.alert(
                'Contact Seller', 
                `Seller Phone: ${sellerPhone}\n\nSeller Email: ${sellerEmail}`
              );
            }}>
              <Text style={styles.contactButtonText}>Contact Seller</Text>
            </TouchableOpacity>
          </View>
        )}

        {item?.status === 'pending' && (
          <View style={[styles.contentBox, styles.pendingContent]}>
            <View style={styles.contentHeader}>
              <FontAwesome5 name="hourglass-half" size={18} color="#f59e0b" />
              <Text style={styles.contentTitle}>Processing Status</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '60%' }]} />
              </View>
              <Text style={styles.progressText}>60% Complete</Text>
              <Text style={styles.pendingMessage}>
                Your request is being reviewed by our team
              </Text>
            </View>
          </View>
        )}


      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <CommonHeader 
        title="Return Status" 
        onNotificationPress={() => navigation.navigate('NotificationScreen')}
        unreadCount={unreadCount}
        centerTitle={true}
        leftIcon="smartreturn"
        onLeftPress={() => {}}
      />
      <FlatList
        data={returns}
        keyExtractor={(item, idx) => safe(item?.id, idx)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.headerSubtitle}>Track your requests</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{returns.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {returns.filter(r => r?.status === 'approved').length}
                </Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {returns.filter(r => r?.status === 'pending').length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>▢</Text>
            </View>
            <Text style={styles.emptyTitle}>No Returns Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your returns will appear here once submitted
            </Text>
          </View>
        }
        contentContainerStyle={returns.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: 100 }}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  headerSection: {
    backgroundColor: '#f8f9fa',
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 18,
    marginBottom: 8,
    borderRadius: 0,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  headerLeft: {
    flex: 1,
  },
  notificationButton: {
    position: 'relative',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e9ecef',
    marginHorizontal: 6,
  },
  card: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#1a1a1a',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusRight: {
    backgroundColor: 'rgba(233, 236, 239, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  productSection: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productIcon: {
    fontSize: 20,
    color: '#1a1a1a',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 3,
    lineHeight: 20,
  },
  productDate: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  contentBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  approvedContent: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  rejectedContent: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  pendingContent: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  addressContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addressText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
    marginBottom: 8,
  },
  mapBadge: {
    backgroundColor: '#10b981',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  mapText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 14,
    color: '#dc2626',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  contactButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f1f3f4',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#d97706',
    fontWeight: '500',
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 36,
    opacity: 0.6,
    color: '#cccccc',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReturnStatusScreen;
