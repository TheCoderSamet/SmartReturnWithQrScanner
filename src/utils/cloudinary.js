import axios from 'axios';
import Constants from 'expo-constants';

function getExpoExtra() {
  const extraFromExpoConfig = Constants?.expoConfig?.extra;
  const extraFromManifest = Constants?.manifest?.extra;
  const extra = extraFromExpoConfig ?? extraFromManifest;
  if (!extra) {
    console.warn('[Expo] extra config not found. Make sure app.config.js defines extra and you are running in Expo Go/dev build.');
  }
  return extra ?? {};
}

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} = getExpoExtra();

// Cloudinary configurations
const CLOUD_NAME = CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = CLOUDINARY_UPLOAD_PRESET;

export const uploadToCloudinary = async (imageUri) => {
  const data = new FormData();
  data.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  });
  data.append('upload_preset', UPLOAD_PRESET);
  data.append('cloud_name', CLOUD_NAME);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    data,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.secure_url;
};