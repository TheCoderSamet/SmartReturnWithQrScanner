import { db } from './config';
import {doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, Timestamp} from 'firebase/firestore';
import * as Location from 'expo-location';

// Bring User Role
export const getUserRole = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists ? docSnap.data().role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Yeni kullanıcı oluştur (register sırasında)
export const createUserProfile = async (uid, data) => {
  try {
    await setDoc(doc(db, 'users', uid), data);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Ürün ekle (seller)
export const addProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), productData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

//  Seller'ın ürünlerini getir
export const getProductsBySeller = async (email) => {
  try {
    const q = query(collection(db, 'products'), where('sellerEmail', '==', email));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting products by seller:', error);
    return [];
  }
};

//  QR kod ile ürün detayını getir
export const getProductByCode = async (code) => {
  try {
    const q = query(collection(db, 'products'), where('productCode', '==', code));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting product by code:', error);
    return null;
  }
};

//  İade formu gönder (buyer)
export const submitReturnForm = async (formData) => {
  try {
    const docRef = await addDoc(collection(db, 'returns'), {
      ...formData,
      buyerPhone: formData.buyerPhone || '',
      buyerAddress: formData.buyerAddress || '',
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error submitting return form:', error);
    throw error;
  }
};

//  Seller onay / red işlemi
export const updateReturnStatus = async (id, status, address = '') => {
  try {
    const docRef = doc(db, 'returns', id);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists) {
      throw new Error(`Return request not found: ${id}`);
    }

    const updateData = { status }; 
    if (status === 'approved' && address) {
      updateData.returnAddress = address;
      updateData.approvedAt = Timestamp.now(); // Add approval timestamp

      try {
        // Check location permission first
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          const geo = await Location.geocodeAsync(address);
          if (geo.length > 0) {
            updateData.returnAddressCoords = {
              latitude: geo[0].latitude,
              longitude: geo[0].longitude
            };
          }
        } else {
          console.log('Location permission denied, skipping geocoding');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        // Geocoding error silently handled
      }
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating return status:', error);
    throw error;
  }
};


//  Buyer: kendi iade kayıtlarını getir
export const getReturnsByBuyer = async (uid) => {
  try {
    const q = query(collection(db, 'returns'), where('buyerId', '==', uid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting returns by buyer:', error);
    return [];
  }
};



