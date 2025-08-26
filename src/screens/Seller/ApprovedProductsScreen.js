import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, Image, Alert, ScrollView, TouchableOpacity, RefreshControl, Modal
} from 'react-native';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { deleteProduct } from '../../firebase/firestore';
import { auth, db } from '../../firebase/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';


const ApprovedProductsScreen = () => {
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApprovedProducts = useCallback(async () => {
    const email = auth.currentUser?.email;

    try {
      const q = query(
        collection(db, 'returns'), 
        where('sellerEmail', '==', email),
        where('status', '==', 'approved')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      
      // Sort by approvedAt if it exists, otherwise by document creation time
      const sortedData = data.sort((a, b) => {
        const aTime = a.approvedAt ? a.approvedAt.toDate ? a.approvedAt.toDate() : new Date(a.approvedAt) : new Date(0);
        const bTime = b.approvedAt ? b.approvedAt.toDate ? b.approvedAt.toDate() : new Date(b.approvedAt) : new Date(0);
        return bTime - aTime;
      });
      
      setApprovedProducts(sortedData);
      setFilteredProducts(sortedData);
    } catch (err) {
      Alert.alert('Error', 'Approved products could not be fetched');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchApprovedProducts();
    setRefreshing(false);
  }, [fetchApprovedProducts]);

  useEffect(() => {
    fetchApprovedProducts();
  }, [fetchApprovedProducts]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(approvedProducts);
      return;
    }

    const filtered = approvedProducts.filter(item => {
      const query = searchQuery.toLowerCase();
      return (
        item.buyerName?.toLowerCase().includes(query) ||
        item.productName?.toLowerCase().includes(query) ||
        item.productCode?.toLowerCase().includes(query)
      );
    });

    setFilteredProducts(filtered);
  }, [searchQuery, approvedProducts]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not available';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => {
        setSelectedProduct(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.productIconContainer}>
          <Text style={styles.productIcon}>□</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.title}>{item.productName}</Text>
          <Text style={styles.statusBadge}>✓ APPROVED</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Buyer:</Text>
          <Text style={styles.infoValue}>{item.buyerName}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Approved:</Text>
          <Text style={styles.infoValue}>{formatDate(item.approvedAt)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Return Address:</Text>
          <Text style={styles.infoValue}>{item.returnAddress || 'Not specified'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <CommonHeader 
        title="Approved Products" 
        centerTitle={true}
      />
      <FlatList
        contentContainerStyle={filteredProducts.length === 0 ? styles.emptyContainer : styles.container}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            
            
            {/* Search Section */}
            <View style={styles.searchCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Text style={styles.sectionIcon}>🔍</Text>
                </View>
                <Text style={styles.sectionTitle}>Search Products</Text>
              </View>
              
              <View style={styles.searchContent}>
                <TextInput
                  style={styles.input}
                  placeholder="Search by buyer name, product name, or code..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{filteredProducts.length}</Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Products Found' : 'No Approved Products'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'No products match your search criteria'
                : 'No products have been approved for return yet'
              }
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Product Details Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalIcon}>□</Text>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>{selectedProduct?.productName}</Text>
                  <Text style={styles.modalSubtitle}>Product Details</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedProduct && (
                <>
                  {/* Product Information */}
                  <View style={styles.detailCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Text style={styles.sectionIcon}>□</Text>
                      </View>
                      <Text style={styles.sectionTitle}>Product Information</Text>
                    </View>
                    
                    <View style={styles.detailContent}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Product Name:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.productName}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Product Code:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.productCode || 'N/A'}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Size:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.productSize || 'N/A'}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Quantity:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.productQuantity || 'N/A'}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Price:</Text>
                        <Text style={styles.infoValue}>${selectedProduct.productPrice || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Buyer Information */}
                  <View style={styles.detailCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Text style={styles.sectionIcon}>◉</Text>
                      </View>
                      <Text style={styles.sectionTitle}>Buyer Information</Text>
                    </View>
                    
                    <View style={styles.detailContent}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.buyerName}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.buyerEmail}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.buyerPhone}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Address:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.buyerAddress}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Return Information */}
                  <View style={styles.detailCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Text style={styles.sectionIcon}>◐</Text>
                      </View>
                      <Text style={styles.sectionTitle}>Return Information</Text>
                    </View>
                    
                    <View style={styles.detailContent}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Return Reason:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.reason}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Return Address:</Text>
                        <Text style={styles.infoValue}>{selectedProduct.returnAddress || 'Not specified'}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Approved Date:</Text>
                        <Text style={styles.infoValue}>{formatDate(selectedProduct.approvedAt)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Product Photos */}
                  {selectedProduct.photos && selectedProduct.photos.length > 0 ? (
                    <View style={styles.detailCard}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                          <Text style={styles.sectionIcon}>📷</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Product Photos</Text>
                      </View>
                      
                      <View style={styles.detailContent}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                          {Array.isArray(selectedProduct.photos) && selectedProduct.photos.map((uri, index) => (
                            <Image
                              key={index}
                              source={{ uri }}
                              style={styles.imageContainer}
                              resizeMode="cover"
                            />
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.detailCard}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                          <Text style={styles.sectionIcon}>📷</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Product Photos</Text>
                      </View>
                      
                      <View style={styles.detailContent}>
                        <Text style={styles.noPhotosText}>No photos available for this product</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#ffffff',
    paddingTop: 15,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    marginHorizontal: -50,
    marginTop: -10,
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
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
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
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
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  cardContent: {
    padding: 16,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    width: 100,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
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
  modalIcon: {
    fontSize: 20,
    color: '#1a1a1a',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
  },
  modalScroll: {
    // padding: 20, // This is now handled by contentContainerStyle
  },
  modalScrollContent: {
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#ffffff',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#f1f3f4',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  sectionIcon: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  detailContent: {
    padding: 16,
  },
  imageRow: {
    marginBottom: 8,
  },
  imageContainer: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  imageText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  searchCard: {
    backgroundColor: '#ffffff',
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
  searchContent: {
    padding: 16,
  },
  input: {
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noPhotosText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 10,
  },
});

export default ApprovedProductsScreen;
