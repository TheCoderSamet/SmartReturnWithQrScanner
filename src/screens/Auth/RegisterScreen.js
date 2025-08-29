import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { createUserProfile } from '../../firebase/firestore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [userType, setUserType] = useState('buyer'); // 'buyer' or 'seller'
  const [sellerFields, setSellerFields] = useState({
    storeName: '',
    businessPhone: '',
    businessAddress: '',
    company: ''
  });

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Email validation
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // phone validation
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      isValid = false;
    } else if (phone.length < 8) {
      setPhoneError('Phone number too short');
      isValid = false;
    }

    // password validation
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    // confirm password validation
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    // Seller için ek validasyon
    if (userType === 'seller') {
      if (!sellerFields.storeName || !sellerFields.businessPhone || !sellerFields.businessAddress) {
        Alert.alert('Error', 'Please fill in all required seller fields');
        return;
      }
    }

    setLoading(true);
    try {
      if (userType === 'seller') {
        // Seller registration
        await registerSeller(
          email.trim(), 
          password, 
          phone.trim(),
          sellerFields.storeName,
          sellerFields.businessPhone,
          sellerFields.businessAddress,
          sellerFields.company
        );
      } else {
        // Buyer registration
        await registerUser(email.trim(), password, 'buyer', phone.trim());
      }
      
      Alert.alert('Success', `Registration complete! Welcome to our platform as a ${userType}.`);
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const registerSeller = async (email, password, phone, storeName, businessPhone, businessAddress, company) => {
    try {
      // 1. Firebase Authentication'da kullanıcıyı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // 2. Firestore'da kullanıcı bilgilerini kaydet
      await setDoc(doc(db, 'users', userId), {
        name: email.split('@')[0], // Geçici isim
        email,
        phone,
        storeName,
        businessPhone,
        businessAddress,
        company: company || '',
        role: 'seller',
        createdAt: serverTimestamp(),
        isActive: true
      });

      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <FontAwesome5 name="qrcode" size={48} color="#1a1a1a" />
            </View>
            <Text style={styles.appTitle}>QR Scanner</Text>
            
            {/* User Type Selection */}
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[styles.userTypeButton, userType === 'buyer' && styles.userTypeButtonActive]}
                onPress={() => setUserType('buyer')}
              >
                <FontAwesome5 name="user" size={16} color={userType === 'buyer' ? '#ffffff' : '#1a1a1a'} />
                <Text style={[styles.userTypeText, userType === 'buyer' && styles.userTypeTextActive]}>
                  Buyer
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.userTypeButton, userType === 'seller' && styles.userTypeButtonActive]}
                onPress={() => setUserType('seller')}
              >
                <FontAwesome5 name="store" size={16} color={userType === 'seller' ? '#ffffff' : '#1a1a1a'} />
                <Text style={[styles.userTypeText, userType === 'seller' && styles.userTypeTextActive]}>
                  Seller
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.appSubtitle}>Return Management System</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>Join our return management platform</Text>
              
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                  <FontAwesome5 name="envelope" size={16} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[styles.inputContainer, phoneError ? styles.inputError : null]}>
                  <FontAwesome5 name="phone" size={16} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (phoneError) setPhoneError('');
                    }}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                </View>
                {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
              </View>

              {/* Seller Business Information */}
              {userType === 'seller' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Store Name *</Text>
                    <View style={styles.inputContainer}>
                      <FontAwesome5 name="store" size={16} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your store name"
                        placeholderTextColor="#999"
                        value={sellerFields.storeName}
                        onChangeText={(text) => setSellerFields(prev => ({ ...prev, storeName: text }))}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Business Phone *</Text>
                    <View style={styles.inputContainer}>
                      <FontAwesome5 name="phone" size={16} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your business phone"
                        placeholderTextColor="#999"
                        value={sellerFields.businessPhone}
                        onChangeText={(text) => setSellerFields(prev => ({ ...prev, businessPhone: text }))}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Business Address *</Text>
                    <View style={styles.inputContainer}>
                      <FontAwesome5 name="map-marker-alt" size={16} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your business address"
                        placeholderTextColor="#999"
                        value={sellerFields.businessAddress}
                        onChangeText={(text) => setSellerFields(prev => ({ ...prev, businessAddress: text }))}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Company (Optional)</Text>
                    <View style={styles.inputContainer}>
                      <FontAwesome5 name="building" size={16} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your company name"
                        placeholderTextColor="#999"
                        value={sellerFields.company}
                        onChangeText={(text) => setSellerFields(prev => ({ ...prev, company: text }))}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                  <FontAwesome5 name="lock" size={16} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError('');
                    }}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <FontAwesome5 
                      name={showPassword ? "eye-slash" : "eye"} 
                      size={16} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[styles.inputContainer, confirmPasswordError ? styles.inputError : null]}>
                  <FontAwesome5 name="lock" size={16} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="password-new"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <FontAwesome5 
                      name={showConfirmPassword ? "eye-slash" : "eye"} 
                      size={16} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
              </View>

              {/* Register Button */}
              <TouchableOpacity 
                style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.loginSection}>
              <Text style={styles.loginText}>
                Already have an account?{' '}
                <Text style={styles.loginLink} onPress={navigateToLogin}>
                  Sign in
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1, // Allow ScrollView to grow and take available space
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  userTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    marginBottom: 10,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  userTypeButtonActive: {
    backgroundColor: '#1a1a1a',
  },
  userTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  userTypeTextActive: {
    color: '#ffffff',
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  loginSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    color: '#007bff',
    fontWeight: '600',
  },
});

export default RegisterScreen;
