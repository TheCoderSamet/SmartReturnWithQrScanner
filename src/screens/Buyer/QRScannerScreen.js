import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert, Animated } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';
import { FontAwesome5 } from '@expo/vector-icons';

const QRScannerScreen = () => {
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));
  const navigation = useNavigation();

  // Scanning line animation
  useEffect(() => {
    const animateScanLine = () => {
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000, // 2 second
          useNativeDriver: false,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000, // 2 second
          useNativeDriver: false,
        }),
      ]).start(() => animateScanLine()); //infinite animation
    };

    animateScanLine();
  }, [scanLineAnim]);

  const handleScan = ({ data }) => {
    if (!scanned && data) {
      setScanned(true);

      let productCode = null;

      try {
        let parsed = JSON.parse(data);
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed); 
        }

        if (parsed?.productCode) {
          productCode = parsed.productCode;
        } else if (parsed?.code) {
          productCode = parsed.code;
        }
      } catch (error) {
        productCode = data; 
      }

      if (productCode) {
        navigation.navigate('ReturnFormScreen', { code: productCode });
      } else {
        Alert.alert('Error', 'Invalid QR code data.');
      }

      setTimeout(() => setScanned(false), 3000);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(prev => (prev === "back" ? "front" : "back"));
  };

  // Permission checks
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <CommonHeader 
          title="QR Scanner" 
          subtitle="Camera Permission Required"
          backgroundColor="#1a1a1a"
          textColor="#ffffff"
          centerTitle={true}
        />
        <View style={styles.messageContainer}>
          <Text style={styles.message}>Checking camera permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <CommonHeader 
          title="QR Scanner" 
          subtitle="Camera Permission Required"
          backgroundColor="#1a1a1a"
          textColor="#ffffff"
          centerTitle={true}
        />
        <View style={styles.messageContainer}>
          <Text style={styles.message}>We need your permission to access the camera</Text>
          <Button title="Grant Permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader 
        title="QR Code Scanner" 
        subtitle="Position the QR code within the frame"
        backgroundColor="#1a1a1a"
        textColor="#ffffff"
        centerTitle={true}
      />
      
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code128"]
          }}
          onBarcodeScanned={handleScan}
        >
          <View style={styles.overlay}>
            {/* Main Scan Frame */}
            <View style={styles.scanFrame}>
              {/* Corner Decorations */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Scan Area */}
              <View style={styles.scanArea} />
              
              {/* Scanning Line Animation */}
              <Animated.View 
                style={[
                  styles.scanLine, 
                  {  //1. OPACITY ANIMATION
                    opacity: scanLineAnim.interpolate({ 
                      inputRange: [0, 5],
                      outputRange: [0.3, 1]
                    }),
                    transform: [{  // 2. SCALE ANIMATION
                      scale: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1.05]
                      })
                    }]
                  }] 
                } 
              />
            </View>
          </View>
        </CameraView>

        {/* Camera Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <FontAwesome5 name="sync" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  message: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 220,
    height: 220,
    backgroundColor: 'transparent',
  },
  scanFrame: {
    position: 'absolute',
    width: 280,
    height: 280,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#10b981',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: '#10b981',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  flipButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.8)',
    padding: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
});

export default QRScannerScreen;
