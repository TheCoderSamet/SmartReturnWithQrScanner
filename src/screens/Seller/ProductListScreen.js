import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, TouchableOpacity, ScrollView, Alert, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getProductsBySeller } from '../../firebase/firestore';
import { auth } from '../../firebase/config';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNotifications } from '../../contexts/NotificationContext';


const ProductListScreen = () => {
  const navigation = useNavigation();
  const { unreadCount } = useNotifications();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const qrRefs = useRef({});

  const fetchProducts = useCallback(async () => {
    const result = await getProductsBySeller(auth.currentUser.email);
    setProducts(result);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  // Unique buyers search applied
  const uniqueBuyers = Array.from(
    new Set(products.map(p => p.buyerName))
  )
    .filter(name => name.toLowerCase().includes(buyerSearch.toLowerCase()))
    .map(name => ({ buyerName: name }));

  // Seçilen alıcının ürünleri 
  const buyerProducts = selected
    ? products
        .filter(p => p.buyerName === selected.buyerName)
        .filter(p => p.productName.toLowerCase().includes(productSearch.toLowerCase()))
    : [];

  const generatePDF = async (product) => {
    try {
      // Get QR code reference and convert to base64
      const qrRef = qrRefs.current[product.productCode];
      if (!qrRef) {
        Alert.alert('Error', 'QR code not found');
        return;
      }

      // Convert QR code to base64 data URL
      const qrDataUrl = await new Promise((resolve, reject) => {
        qrRef.toDataURL((data) => {
          resolve(`data:image/png;base64,${data}`);
        });
      });

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .product-info { margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; }
              .qr-section { text-align: center; margin: 30px 0; background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #ddd; }
              .qr-image { max-width: 200px; height: auto; }
              .info-row { margin-bottom: 10px; display: flex; }
              .label { font-weight: bold; color: #333; width: 120px; }
              .value { color: #666; flex: 1; }
              .system-explanation { background: #e3f2fd; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2196f3; }
              .workflow-section { background: #f3e5f5; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #9c27b0; }
              .features-section { background: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4caf50; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
              .feature-list { margin-left: 20px; }
              .feature-item { margin-bottom: 8px; }
              .workflow-step { margin-bottom: 10px; padding: 8px; background: #fff; border-radius: 4px; }
              .step-number { font-weight: bold; color: #9c27b0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SmartReturn - Product Details & System Overview</h1>
              <h2>${product.productName}</h2>
              <p><em>QR-Based Return Management System</em></p>
            </div>
            
            <div class="system-explanation">
              <div class="section-title">📱 How to Use This QR Code</div>
              <p><strong>For the person who received this product:</strong></p>
              
              <div class="workflow-step">
                <span class="step-number">1.</span> <strong>Download the SmartReturn App:</strong> Go to your device's app store (Google Play Store for Android or App Store for iOS) and search for "SmartReturn" to download the free mobile application.
              </div>
              
              <div class="workflow-step">
                <span class="step-number">2.</span> <strong>Create an Account:</strong> Open the app and tap "Sign Up" to create a new account. You'll need to provide your name, email, and create a password.
              </div>
              
              <div class="workflow-step">
                <span class="step-number">3.</span> <strong>Log In:</strong> After creating your account, log in with your email and password.
              </div>
              
              <div class="workflow-step">
                <span class="step-number">4.</span> <strong>Scan the QR Code:</strong> On the main screen, tap the "Scan QR Code" button and point your camera at this QR code to scan it.
              </div>
              
              <div class="workflow-step">
                <span class="step-number">5.</span> <strong>View Product Details:</strong> The app will show you all the product information and allow you to initiate a return if needed.
              </div>
              
              <div class="workflow-step">
                <span class="step-number">6.</span> <strong>Return Process:</strong> If you want to return the product, follow the in-app instructions to complete your return request.
              </div>
            </div>
            
            <div class="product-info">
              <div class="section-title">📦 Product Information</div>
              <div class="info-row">
                <span class="label">Product Code:</span>
                <span class="value">${product.productCode}</span>
              </div>
              <div class="info-row">
                <span class="label">Size:</span>
                <span class="value">${product.productSize}</span>
              </div>
              <div class="info-row">
                <span class="label">Quantity:</span>
                <span class="value">${product.productQuantity}</span>
              </div>
              <div class="info-row">
                <span class="label">Price:</span>
                <span class="value">$${product.productPrice}</span>
              </div>
            </div>
            
            <div class="product-info">
              <div class="section-title">👤 Buyer Information</div>
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${product.buyerName}</span>
              </div>
              <div class="info-row">
                <span class="label">Address:</span>
                <span class="value">${product.buyerAddress}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${product.buyerEmail}</span>
              </div>
              <div class="info-row">
                <span class="label">Phone:</span>
                <span class="value">${product.buyerPhone}</span>
              </div>
            </div>
            
            <div class="qr-section">
              <h3>🔍 QR Code</h3>
              <p><strong>QR Code Value:</strong> ${product.productCode}</p>
              <p><em>Scan this QR code with the SmartReturn mobile app to access product details and initiate return processes.</em></p>
              <img src="${qrDataUrl}" alt="QR Code" class="qr-image" />
            </div>

            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
              <p><strong>Generated by SmartReturn System</strong></p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              <p>Time: ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };



  const renderBuyer = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => { setSelected(item); setProductSearch(''); }}>
      <View style={styles.cardContent}>
        <View style={styles.buyerIconContainer}>
                      <Text style={styles.buyerIcon}>◉</Text>
        </View>
        <Text style={styles.buyerName}>{item.buyerName}</Text>
        <Text style={styles.buyerArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const buyerDetails = buyerProducts.length > 0 ? {
    name: buyerProducts[0].buyerName,
    email: buyerProducts[0].buyerEmail,
    phone: buyerProducts[0].buyerPhone,
    address: buyerProducts[0].buyerAddress
  } : {};

  return (
    <View style={styles.screen}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Product Management</Text>
            <Text style={styles.headerSubtitle}>Manage your products and buyers</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={() => navigation.navigate('NotificationScreen')}
          >
            <FontAwesome5 name="bell" size={20} color="#ef4444" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{uniqueBuyers.length}</Text>
            <Text style={styles.statLabel}>Buyers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{products.length}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Text style={styles.sectionIcon}>○</Text>
          </View>
          <Text style={styles.sectionTitle}>Search Buyers</Text>
        </View>
        
        <View style={styles.searchContent}>
          <TextInput
            style={styles.input}
            placeholder="Search buyer by name..."
            placeholderTextColor="#6b7280"
            value={buyerSearch}
            onChangeText={setBuyerSearch}
          />
        </View>
      </View>

      {/* Buyers List */}
      <FlatList
        data={uniqueBuyers}
        keyExtractor={(item, idx) => item.buyerName + idx}
        renderItem={renderBuyer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
            </View>
            <Text style={styles.emptyTitle}>No Buyers Found</Text>
            <Text style={styles.emptySubtitle}>
              Start adding products to see buyers here
            </Text>
          </View>
        }
        contentContainerStyle={uniqueBuyers.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
      />

      {/* Buyer Details Modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalIcon}>◉</Text>
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>{selected?.buyerName}</Text>
                  <Text style={styles.modalSubtitle}>Buyer Details</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Buyer Information */}
              {buyerProducts.length > 0 && (
                <View style={styles.buyerDetailsCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconContainer}>
                      <Text style={styles.sectionIcon}>✎</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                  </View>
                  
                  <View style={styles.buyerDetailsContent}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Name:</Text>
                      <Text style={styles.infoValue}>{buyerDetails.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Email:</Text>
                      <Text style={styles.infoValue}>{buyerDetails.email}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone:</Text>
                      <Text style={styles.infoValue}>{buyerDetails.phone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Address:</Text>
                      <Text style={styles.infoValue}>{buyerDetails.address}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Product Search */}
              <View style={styles.searchCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Text style={styles.sectionIcon}>○</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Search Products</Text>
                </View>
                
                <View style={styles.searchContent}>
                  <TextInput
                    style={styles.input}
                    placeholder="Search product by name..."
                    placeholderTextColor="#6b7280"
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                </View>
              </View>

              {/* Products List */}
              {buyerProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Text style={styles.emptyIcon}>□</Text>
                  </View>
                  <Text style={styles.emptyTitle}>No Products Found</Text>
                  <Text style={styles.emptySubtitle}>
                    No products match your search criteria
                  </Text>
                </View>
              ) : (
                buyerProducts.map((product, idx) => (
                  <View key={product.productCode + idx} style={styles.productCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Text style={styles.sectionIcon}>□</Text>
                      </View>
                      <Text style={styles.sectionTitle}>{product.productName}</Text>
                    </View>
                    
                    <View style={styles.productContent}>
                      <View style={styles.productInfo}>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Code:</Text>
                          <Text style={styles.infoValue}>{product.productCode}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Size:</Text>
                          <Text style={styles.infoValue}>{product.productSize}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Quantity:</Text>
                          <Text style={styles.infoValue}>{product.productQuantity}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Price:</Text>
                          <Text style={styles.infoValue}>${product.productPrice}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.qrSection}>
                        <Text style={styles.qrTitle}>QR Code</Text>
                        <View style={styles.qrContainer}>
                          <QRCode
                            value={JSON.stringify({ code: product.productCode })}
                            size={120}
                            getRef={ref => { qrRefs.current[product.productCode] = ref; }}
                          />
                        </View>
                      </View>
                      
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.primaryButton} onPress={() => generatePDF(product)}>
                          <Text style={styles.primaryButtonText}>📄 Download PDF</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  headerSection: {
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'center',
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
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 0,
    fontWeight: '500',
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
  searchCard: {
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
  searchContent: {
    padding: 16,
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
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  buyerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buyerIcon: {
    fontSize: 20,
    color: '#1a1a1a',
  },
  buyerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  buyerArrow: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '600',
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
  buyerDetailsCard: {
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
  buyerDetailsContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    width: 60,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  productCard: {
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
  productContent: {
    padding: 16,
  },
  productInfo: {
    marginBottom: 16,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ProductListScreen;

