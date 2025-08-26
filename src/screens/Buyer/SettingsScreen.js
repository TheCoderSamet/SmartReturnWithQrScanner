import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Modal, Image, RefreshControl
} from 'react-native';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { logoutUser } from '../../firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword, deleteUser } from 'firebase/auth';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    avatarUrl: ''
  });

  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const uid = auth.currentUser.uid;
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          name: data.name || '',
          email: data.email || auth.currentUser.email,
          phone: data.phone || '',
          address: data.address || '',
          avatarUrl: data.avatarUrl || ''
        });
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Profil fotoğrafı seç ve yükle
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Please grant camera roll permissions.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setLoading(true);
      try {
        const uploadedUrl = await uploadToCloudinary(result.assets[0].uri);
        setProfile((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
        const uid = auth.currentUser.uid;
        await updateDoc(doc(db, 'users', uid), { avatarUrl: uploadedUrl });
        setLoading(false);
      } catch (err) {
        setLoading(false);
        Alert.alert('Error', 'Image upload failed.');
      }
    }
  };

  const handleUpdate = async () => {
    try {
      const uid = auth.currentUser.uid;
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        avatarUrl: profile.avatarUrl
      });
      Alert.alert('Success', 'Profile updated and saved.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert('Success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordModal(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Hesap silme işlemi
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password to confirm');
      return;
    }
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, deletePassword);
    try {
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      setShowDeleteModal(false);
      Alert.alert('Account Deleted', 'Your account has been permanently deleted');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <CommonHeader 
        title="Account Settings" 
        subtitle="Manage your profile and preferences"
        backgroundColor="#f8f9fa"
        textColor="#1a1a1a"
        centerTitle={true}
      />
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
          {/* Profile Photo Section */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>◉</Text>
              </View>
              <Text style={styles.sectionTitle}>Profile Photo</Text>
            </View>
            
            <View style={styles.avatarContainer}>
              <Image
                source={profile.avatarUrl ? { uri: profile.avatarUrl } : require('../../../assets/default-avatar.png')}
                style={styles.avatar}
              />
              <TouchableOpacity 
                style={styles.changePhotoButton} 
                onPress={handlePickImage} 
                disabled={loading}
              >
                <Text style={styles.changePhotoText}>
                  {loading ? 'Uploading...' : 'Change Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Personal Information Section */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>✎</Text>
              </View>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                placeholder="Enter your full name"
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={profile.phone}
                onChangeText={(text) => setProfile({ ...profile, phone: text })}
                placeholder="e.g. +61 4XX XXX XXX"
                placeholderTextColor="#6b7280"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabled]}
                value={profile.email}
                editable={false}
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={profile.address}
                onChangeText={(text) => setProfile({ ...profile, address: text })}
                placeholder="Enter your address"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>

          {/* Security Section */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>⚿</Text>
              </View>
              <Text style={styles.sectionTitle}>Security</Text>
            </View>
            
            <View style={styles.cardContent}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowPasswordModal(true)}>
                <Text style={styles.primaryButtonText}> Change Password</Text>
              </TouchableOpacity>
              

              
              <TouchableOpacity style={styles.logoutButton} onPress={logoutUser}>
                <Text style={styles.logoutButtonText}> Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Danger Zone Section */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>△</Text>
              </View>
              <Text style={styles.sectionTitle}>Danger Zone</Text>
            </View>
            
            <View style={styles.dangerZoneContent}>
              <Text style={styles.dangerZoneDescription}>
                Once you delete your account, there is no going back. Please be certain.
              </Text>
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => setShowDeleteModal(true)}
              >
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>◯</Text>
              </View>
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            
            <View style={styles.aboutContent}>
              <Text style={styles.aboutText}>App Version: 1.0.0</Text>
              <Text style={styles.aboutSubtext}>Return Management System with QR Scanner</Text>
            </View>
          </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Text style={styles.modalSubtitle}>Update your account password</Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.modalLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.modalLabel}>Confirm Password</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                placeholder="Re-enter new password"
                placeholderTextColor="#6b7280"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton} 
                onPress={handlePasswordChange}
              >
                <Text style={styles.modalConfirmText}>Confirm Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <Text style={styles.modalSubtitle}>This action cannot be undone</Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Enter Password to Confirm</Text>
              <TextInput
                style={styles.modalInput}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#6b7280"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalDeleteButton} 
                onPress={handleDeleteAccount}
              >
                <Text style={styles.modalDeleteText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
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
    textAlign: 'center',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
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
  cardContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
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
  avatarContainer: {
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f3f4',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#e9ecef',
  },
  changePhotoButton: {
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  changePhotoText: {
    color: '#1a1a1a',
    fontWeight: '600',
    fontSize: 14,
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
    fontWeight: '500',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  disabled: {
    backgroundColor: '#f8f9fa',
    color: '#666666',
    borderColor: '#e9ecef',
  },
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
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
  },
  testButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dangerZoneContent: {
    padding: 16,
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  aboutContent: {
    padding: 16,
  },
  aboutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  aboutSubtext: {
    fontSize: 14,
    color: '#666666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#fef2f2',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#1a1a1a',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalCancelText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  modalDeleteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SettingsScreen;
