import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ScrollView, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getProductByCode, submitReturnForm } from '../../firebase/firestore';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { useAuth } from '../../firebase/authContext';
import { useNavigation } from '@react-navigation/native';
import { Timestamp, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import NotificationService from '../../services/NotificationService';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';

const width = 375; 

const ReturnFormScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const [manualProduct, setManualProduct] = useState({
    productName: '',
    productCode: '',
    productPrice: '',
    buyerName: '',
    buyerPhone: '',
    buyerAddress: '',
    sellerEmail: ''
  });

  // Seller businessPhone
  const getSellerBusinessPhone = async (sellerEmail) => {
    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', sellerEmail));
      const usersSnap = await getDocs(usersQuery);
      if (!usersSnap.empty) {
        const sellerData = usersSnap.docs[0].data();
        return sellerData.businessPhone || '';
      }
      return '';
    } catch (error) {
      console.error('Error fetching seller business phone:', error);
      return '';
    }
  };

  let code = route?.params?.code;
  try {
    const parsed = JSON.parse(code);
    if (parsed.productCode) code = parsed.productCode;
  } catch {}

  useEffect(() => {
    const fetchProduct = async () => {
      if (!code) {
        setManualMode(true);
        return;
      }
      const result = await getProductByCode(code);
      if (result) {
        setProduct(result);
        setManualMode(false);
      } else {
        Alert.alert('Error', 'Product not found');
        setManualMode(true);
      }
    };
    fetchProduct();
  }, [code]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && photos.length < 4) {
      setPhotos([...photos, result.assets[0].uri]);
    } else if (photos.length >= 4) {
      Alert.alert('Limit Reached', 'You can upload up to 4 photos only');
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    if (photos.length < 2) {
      Alert.alert('Validation Error', 'Please upload at least 2 photos');
      setLoading(false);
      return;
    }

    if (reason.length > 500) {
      Alert.alert('Validation Error', 'Reason cannot exceed 500 characters');
      setLoading(false);
      return;
    }

    const formProduct = manualMode ? manualProduct : product;

    if (
      !formProduct.productName ||
      !formProduct.productCode ||
      !formProduct.productPrice ||
      !formProduct.buyerName ||
      !formProduct.buyerPhone ||
      !formProduct.buyerAddress ||
      !formProduct.sellerEmail
    ) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      setLoading(false);
      return;
    }

    // same user cannot return the same product again
    try {
      const returnsQuery = query(
        collection(db, 'returns'),
        where('buyerEmail', '==', user.email),
        where('productCode', '==', formProduct.productCode)
      );
      const returnsSnap = await getDocs(returnsQuery);
      if (!returnsSnap.empty) {
        Alert.alert(
        'Duplicate Request',
        'You have already submitted a return request for this product code. Please contact the seller for further assistance.'
      );
        setLoading(false);
     return;
     }

      // block the product code entered in manual mode if it exists in the system
      if (manualMode && formProduct.productCode) {
        const checkQuery = query(
          collection(db, 'products'),
          where('productCode', '==', formProduct.productCode)
        );
        const checkSnap = await getDocs(checkQuery);
        if (!checkSnap.empty) {
          Alert.alert('Duplicate', 'This product code is already registered in the system.');
          setLoading(false);
          return;
        }
      }

      // Photo Cloudinary
      const photoUrls = [];
      for (const uri of photos) {
        const url = await uploadToCloudinary(uri);
        photoUrls.push(url);
      }

      // Seller 
      const sellerBusinessPhone = await getSellerBusinessPhone(formProduct.sellerEmail);

      const data = {
        ...formProduct,
        productPrice: parseFloat(formProduct.productPrice),
        buyerEmail: user.email,
        buyerId: user.uid,
        reason,
        photos: photoUrls,
        status: 'pending',
        submittedAt: Timestamp.now(),
        productId: product?.id || '',
        sellerBusinessPhone: sellerBusinessPhone // Seller'ın business phone'ı
      };

      await submitReturnForm(data);
      
      // Seller'a notification
      try {
        await NotificationService.sendReturnRequestNotification(
          formProduct.sellerEmail,
          formProduct.buyerName,
          formProduct.productName
        );
      } catch (error) {
        console.error('Bildirim gönderilemedi:', error);
      }
      
      Alert.alert('Success', 'Return request submitted.');
      setPhotos([]);
      setReason('');
      if (manualMode) {
        setManualProduct({
          productName: '',
          productCode: '',
          productPrice: '',
          buyerName: '',
          buyerPhone: '',
          buyerAddress: '',
          sellerEmail: formProduct.sellerEmail
        });
      }
    } catch (error) {
      Alert.alert('Submission Error', error.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <CommonHeader 
        title="Return Request Form" 
        subtitle="Submit your return request"
        showBack={true}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Product Information Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>□</Text>
            </View>
            <Text style={styles.sectionTitle}>Product Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={manualMode ? manualProduct.productName : product?.productName || ''}
              editable={manualMode}
              onChangeText={(text) => setManualProduct({ ...manualProduct, productName: text })}
              placeholder="Enter product name"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.label}>Product Code</Text>
            <TextInput
              style={styles.input}
              value={manualMode ? manualProduct.productCode : product?.productCode || ''}
              editable={manualMode}
              onChangeText={(text) => setManualProduct({ ...manualProduct, productCode: text })}
              placeholder="Enter product code"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={manualMode ? manualProduct.productPrice : String(product?.productPrice || '')}
              editable={manualMode}
              onChangeText={(text) => setManualProduct({ ...manualProduct, productPrice: text })}
              placeholder="Enter product price"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.label}>Seller Email</Text>
            <TextInput
              style={styles.input}
              value={manualMode ? manualProduct.sellerEmail : product?.sellerEmail || ''}
              onChangeText={(text) => setManualProduct({ ...manualProduct, sellerEmail: text })}
              placeholder="Enter seller email"
              placeholderTextColor="#6b7280"
            />
          </View>
        </View>

        {/* Buyer Information Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>◉</Text>
            </View>
            <Text style={styles.sectionTitle}>Buyer Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Buyer Name</Text>
            <TextInput
              style={styles.input}
              value={manualProduct.buyerName}
              onChangeText={(text) => setManualProduct({ ...manualProduct, buyerName: text })}
              placeholder="Enter your full name"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={manualProduct.buyerPhone}
              onChangeText={(text) => setManualProduct({ ...manualProduct, buyerPhone: text })}
              placeholder="Enter your phone number"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={manualProduct.buyerAddress}
              onChangeText={(text) => setManualProduct({ ...manualProduct, buyerAddress: text })}
              placeholder="Enter your address"
              placeholderTextColor="#6b7280"
            />
          </View>
        </View>

        {/* Reason Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>✎</Text>
            </View>
            <Text style={styles.sectionTitle}>Return Reason</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason for Return (max 500 characters)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              maxLength={500}
              value={reason}
              onChangeText={setReason}
              placeholder="Please describe the reason for your return request..."
              placeholderTextColor="#6b7280"
            />
            <Text style={styles.characterCount}>{reason.length}/500</Text>
          </View>
        </View>

        {/* Photo Upload Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>⬜</Text>
            </View>
            <Text style={styles.sectionTitle}>Photo Evidence</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Upload Photos ({photos.length}/5)</Text>
            <Text style={styles.photoSubtext}>Please upload at least min 2 photos showing the product condition</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => setPhotos(photos.filter((_, i) => i !== idx))}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
              <Text style={styles.pickButtonIcon}>+</Text>
              <Text style={styles.pickButtonText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={loading ? styles.loadingText : styles.submitButtonText}>
            {loading ? "Submitting..." : "Submit Return Request"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  container: {
    paddingBottom: 200,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'left',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'left',
    fontWeight: '500',
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
  inputGroup: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 8,
  },
  photoSubtext: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    marginBottom: 8,
  },
  photoScroll: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  pickButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pickButtonIcon: {
    fontSize: 20,
    color: '#64748b',
    marginRight: 8,
    fontWeight: 'bold',
  },
  pickButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#999999',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReturnFormScreen;
