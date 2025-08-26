import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { addProduct } from '../../firebase/firestore';
import { useAuth } from '../../firebase/authContext';
import { uploadToCloudinary } from '../../utils/cloudinary';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const fieldDescriptions = {
  productCode: 'Enter a unique code for the product.',
  productName: 'Enter the product\'s name.',
  productSize: 'Specify the size (e.g., M, L, 42).',
  productQuantity: 'Enter the available quantity.',
  productPrice: 'Enter the price (AUD).',
  buyerName: 'Enter the buyer\'s full name.',
  buyerAddress: 'Enter the buyer\'s address.',
  buyerEmail: 'Enter the buyer\'s email address.',
  buyerPhone: 'Enter the buyer\'s phone number.'
};

const AddProductScreen = () => {
  const [product, setProduct] = useState({
    productCode: '',
    productName: '',
    productSize: '',
    productQuantity: '',
    productPrice: '',
    buyerName: '',
    buyerAddress: '',
    buyerEmail: '',
    buyerPhone: ''
  });

  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleChange = (key, value) => {
    setProduct({ ...product, [key]: value });
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    const isEmpty = Object.values(product).some((val) => val.trim() === '');
    if (isEmpty) {
      Alert.alert('Validation Error', 'All fields are required');
      setLoading(false);
      return;
    }

    // --- Unique productCode ve productName kontrolü ---
    const codeQuery = query(
      collection(db, "products"),
      where("productCode", "==", product.productCode)
    );
    const nameQuery = query(
      collection(db, "products"),
      where("productName", "==", product.productName)
    );
    const [codeSnap, nameSnap] = await Promise.all([
      getDocs(codeQuery),
      getDocs(nameQuery)
    ]);
    if (!codeSnap.empty) {
      Alert.alert('Duplicate', 'This product code already exists.');
      setLoading(false);
      return;
    }
    if (!nameSnap.empty) {
      Alert.alert('Duplicate', 'This product name already exists.');
      setLoading(false);
      return;
    }

    const sellerEmail = auth.currentUser.email;
    try {
      await addProduct({ ...product, sellerEmail });
      Alert.alert('Success', 'Product added', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to Products tab after successful addition
            navigation.navigate('Products');
          }
        }
      ]);
      setProduct({
        productCode: '',
        productName: '',
        productSize: '',
        productQuantity: '',
        productPrice: '',
        buyerName: '',
        buyerAddress: '',
        buyerEmail: '',
        buyerPhone: ''
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <CommonHeader 
        title="Add Product" 
        subtitle="Create a new product entry"
        showBack={true}
        onBack={() => navigation.goBack()}
        backgroundColor="#f8f9fa"
        textColor="#1a1a1a"
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Product Information Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>□</Text>
            </View>
            <Text style={styles.sectionTitle}>Product Information</Text>
          </View>
          
          <View style={styles.cardContent}>
            {Object.entries(product).slice(0, 5).map(([key, value]) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {fieldDescriptions[key] || formatLabel(key)}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={formatLabel(key)}
                  placeholderTextColor="#6b7280"
                  value={value}
                  onChangeText={(text) => handleChange(key, text)}
                  keyboardType={
                    key === 'productPrice' || key === 'productQuantity'
                      ? 'numeric'
                      : key === 'buyerPhone'
                      ? 'phone-pad'
                      : 'default'
                  }
                  autoCapitalize={key.toLowerCase().includes('email') ? 'none' : 'sentences'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Buyer Information Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>◉</Text>
            </View>
            <Text style={styles.sectionTitle}>Buyer Information</Text>
          </View>
          
          <View style={styles.cardContent}>
            {Object.entries(product).slice(5).map(([key, value]) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {fieldDescriptions[key] || formatLabel(key)}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={formatLabel(key)}
                  placeholderTextColor="#6b7280"
                  value={value}
                  onChangeText={(text) => handleChange(key, text)}
                  keyboardType={
                    key === 'productPrice' || key === 'productQuantity'
                      ? 'numeric'
                      : key === 'buyerPhone'
                      ? 'phone-pad'
                      : 'default'
                  }
                  autoCapitalize={key.toLowerCase().includes('email') ? 'none' : 'sentences'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Please wait..." : "Save Product"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// optional: format label from key
const formatLabel = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());

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
  cardContent: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    marginTop: 4,
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
  submitButton: {
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#999999',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default AddProductScreen;
