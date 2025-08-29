import {  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, GoogleAuthProvider, signInWithCredential} from 'firebase/auth';
import { auth } from './config';
import { createUserProfile } from './firestore';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

function getExpoExtra() {
  const extraFromExpoConfig = Constants?.expoConfig?.extra;
  const extraFromManifest = Constants?.manifest?.extra;
  return extraFromExpoConfig ?? extraFromManifest ?? {};
}

// Email & şifre ile kullanıcı kaydı
export const registerUser = async (email, password, role, extraInfo = {}) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await createUserProfile(user.uid, { email, role, ...extraInfo });
  return user;
};

// Giriş yap
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Çıkış yap
export const logoutUser = async () => {
  await signOut(auth);
};

// Google ile giriş
export const loginWithGoogle = async () => {
  const clientId = getExpoExtra().GOOGLE_EXPO_CLIENT_ID;
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?response_type=token` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=profile%20email`;

  const result = await AuthSession.startAsync({ authUrl });

  if (result.type === 'success') {
    const credential = GoogleAuthProvider.credential(null, result.params.access_token);
    await signInWithCredential(auth, credential);
  } else {
    throw new Error('Google login cancelled');
  }
};

// Şifre sıfırlama fonksiyonu
export const resetPassword = async (email) => {
  return await sendPasswordResetEmail(auth, email);
};
