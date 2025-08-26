import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, Image, Alert, ScrollView, TouchableOpacity, RefreshControl
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { updateReturnStatus } from '../../firebase/firestore';
import { auth, db } from '../../firebase/config';
import NotificationService from '../../services/NotificationService';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';

const ReturnApprovalScreen = () => {
  const [requests, setRequests] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    const email = auth.currentUser?.email;

    try {
      const q = query(collection(db, 'returns'), where('sellerEmail', '==', email));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setRequests(data.filter(item => item.status === 'pending'));
    } catch (err) {
      Alert.alert('Error', 'Return requests could not be fetched');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDecision = async (id, decision) => {
    const address = addresses[id];

    if (decision === 'approved' && !address) {
      Alert.alert('Error', 'Please enter return address');
      return;
    }

    try {
      await updateReturnStatus(id, decision, address);
      
      // Buyer'a bildirim gönder
      try {
        const request = requests.find(req => req.id === id);
        if (request) {
          await NotificationService.sendReturnDecisionNotification(
            request.buyerEmail,
            request.productName,
            decision
          );
        }
      } catch (error) {
        console.error('Bildirim gönderilemedi:', error);
      }
      
      Alert.alert('Updated', `Request ${decision}`);
      
      // Clear the address for this item
      setAddresses(prev => {
        const newAddresses = { ...prev };
        delete newAddresses[id];
        return newAddresses;
      });
      
      // Refresh the requests list
      await fetchRequests();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.productIconContainer}>
                      <Text style={styles.productIcon}>□</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.title}>{item.productName}</Text>
                      <Text style={styles.statusBadge}>⧖ PENDING</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Return Reason</Text>
        <Text style={styles.reason}>{item.reason}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buyer Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{item.buyerName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{item.buyerEmail}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{item.buyerPhone}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{item.buyerAddress}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {Array.isArray(item.photos) && item.photos.map((uri) => (
            <TouchableOpacity key={uri} onPress={() => {
              setSelectedImage(uri);
              setModalVisible(true);
            }}>
              <Image source={{ uri }} style={styles.image} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Return Address</Text>
        <Text style={styles.addressSubtext}>Enter the address where buyers should return the product</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter return address..."
          placeholderTextColor="#6b7280"
          value={addresses[item.id] || ''}
          onChangeText={(text) => setAddresses(prev => ({ ...prev, [item.id]: text }))}
        />
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.approve]}
          onPress={() => handleDecision(item.id, 'approved')}
        >
          <Text style={styles.approveText}>✓ Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.reject]}
          onPress={() => handleDecision(item.id, 'rejected')}
        >
          <Text style={styles.rejectText}>✕ Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <CommonHeader 
        title="Return Approval" 
        centerTitle={true}
      />
      <FlatList
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.container}
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.headerSubtitle}>Review and manage return requests</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{requests.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
            </View>
            <Text style={styles.emptyTitle}>No Pending Return Requests</Text>
            <Text style={styles.emptySubtitle}>
              All return requests have been processed or there are no new requests at the moment.
            </Text>
            <View style={styles.emptyInfo}>
              <Text style={styles.emptyInfoText}>
                • Return requests will appear here when buyers submit them
              </Text>
              <Text style={styles.emptyInfoText}>
                • You can approve or reject each request
              </Text>
              <Text style={styles.emptyInfoText}>
                • Pull down to refresh and check for new requests
              </Text>
            </View>
          </View>
        }
      />

      {modalVisible && selectedImage && (
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  container: {
    paddingBottom: 100,
  },
  headerSection: {
    backgroundColor: '#f8f9fa',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 18,
    fontWeight: '500',
  },
  statsContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 0,
    width: '100%',
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
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#f1f3f4',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  productIcon: {
    fontSize: 20,
    color: '#1a1a1a',
  },
  productInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  section: {
    padding: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reason: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    width: 60,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 13,
    color: '#1a1a1a',
    flex: 1,
  },
  imageRow: {
    marginBottom: 8,
  },
  image: {
    width: 80,
    height: 80,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  addressSubtext: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  btnRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  approve: {
    backgroundColor: '#10b981',
  },
  reject: {
    backgroundColor: '#ef4444',
  },
  approveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rejectText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 10,
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
  emptyInfo: {
    marginTop: 20,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  emptyInfoText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
    textAlign: 'left',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '90%',
    height: '70%',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
  }
});

export default ReturnApprovalScreen;
