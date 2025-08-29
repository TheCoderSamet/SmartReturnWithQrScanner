import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../firebase/authContext';
import { getReturnsByBuyer } from '../../firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommonHeader from '../../components/CommonHeader';

// Platform-specific map imports
let MapView, Marker, PROVIDER_GOOGLE;
if (Platform.OS === 'web') {
  // Web-specific map components
  MapView = () => <View style={styles.webMapPlaceholder}><Text style={styles.webMapText}>Map View (Web)</Text></View>;
  Marker = () => null;
  PROVIDER_GOOGLE = 'google';
} else {
  // Native map components
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    // Use Apple Maps for iOS, Google Maps for Android
    PROVIDER_GOOGLE = Platform.OS === 'ios' ? undefined : Maps.PROVIDER_GOOGLE;
    console.log(`✅ React Native Maps loaded successfully - Using ${Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps'}`);
  } catch (error) {
    console.error('❌ Error loading react-native-maps:', error);
    // Fallback components
    MapView = () => <View style={styles.webMapPlaceholder}><Text style={styles.webMapText}>Map Error: {error.message}</Text></View>;
    Marker = () => null;
    PROVIDER_GOOGLE = 'google';
  }
}

const { height, width } = Dimensions.get('window');

const BuyerMapScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const mapRef = useRef(null);
  
  const [userLocation, setUserLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCoords, setSearchCoords] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    fetchUserReturns();
  }, []);

  // Watch for userLocation changes and center map
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });
    }
  }, [userLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Show loading state
        console.log('Getting current location...');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10
        });
        
        console.log('Location obtained:', location.coords);
        setUserLocation(location.coords);
        
        // Center map on user's current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          });
        }
      } else {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to show your current position on the map.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.log('Location permission error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const fetchUserReturns = async () => {
    try {
      const returns = await getReturnsByBuyer(user?.uid);
      const approvedReturns = returns.filter(r => r.status === 'approved' && r.returnAddressCoords);
      
      const mapLocations = approvedReturns.map(r => ({
        id: r.id,
        title: r.productName || 'Return Location',
        address: r.returnAddress || 'Address not provided',
        coords: r.returnAddressCoords,
        return: r
      }));
      
      setLocations(mapLocations);
    } catch (error) {
      console.log('Error fetching returns:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Warning', 'Please enter an address.');
      return;
    }

    try {
      const geo = await Location.geocodeAsync(searchQuery);
      if (geo.length > 0) {
        const { latitude, longitude } = geo[0];
        setSearchCoords({ latitude, longitude });
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          });
        }
      } else {
        Alert.alert('No Results Found', 'The entered address was not found. Please try a different address.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while searching for the address.');
    }
  };

  const toggleMapType = () => {
    setMapType(prev => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  const openInMaps = (location) => {
    const { latitude, longitude } = location.coords;
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(location.address)}`,
      android: `geo:${latitude},${longitude}?q=${encodeURIComponent(location.address)}`
    });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Map application not found.');
      }
    });
  };

  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <CommonHeader 
        title="Return Locations" 
        subtitle="Find approved return addresses"
        backgroundColor="#f8f9fa"
        textColor="#1a1a1a"
        centerTitle={true}
      />
      <View style={styles.screen}>
        {/* Map Controls Card */}
        <View style={styles.controlsCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>◐</Text>
            </View>
            <Text style={styles.sectionTitle}>Map Controls</Text>
          </View>
          
          <View style={styles.controlsContent}>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={toggleMapType} style={styles.actionBtn}>
                <Text style={styles.actionBtnIcon}>
                  {mapType === 'standard' ? '◐' : '◯'}
                </Text>
                <Text style={styles.actionBtnText}>
                  {mapType === 'standard' ? 'Satellite' : 'Standard'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={centerOnUserLocation} style={styles.actionBtn}>
                <Text style={styles.actionBtnIcon}>⌖</Text>
                <Text style={styles.actionBtnText}>My Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapType}
            {...(PROVIDER_GOOGLE && { provider: PROVIDER_GOOGLE })}
            initialRegion={userLocation ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05
            } : {
              latitude: 39.9334,
              longitude: 32.8597,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onPress={() => setSelectedLocation(null)}
          >
            {locations.map((loc) => (
              <Marker
                key={loc.id}
                coordinate={loc.coords}
                title={loc.title}
                description={loc.address}
                onPress={() => setSelectedLocation(loc)}
                pinColor="#10b981"
              />
            ))}

            {searchCoords && (
              <Marker
                coordinate={searchCoords}
                pinColor="#3b82f6"
                title="Search Result"
                description={searchQuery}
              />
            )}


          </MapView>
        </View>

        {/* Location Details Bottom Sheet */}
        {selectedLocation && (
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.sheetIconContainer}>
                  <Text style={styles.sheetIcon}>□</Text>
                </View>
                <View style={styles.sheetTitleContainer}>
                  <Text style={styles.sheetTitle}>{selectedLocation.title}</Text>
                  <Text style={styles.sheetSubtitle}>Return Location</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedLocation(null)} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{selectedLocation.address}</Text>
              </View>
              
              {userLocation && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Distance:</Text>
                  <Text style={styles.infoValue}>
                    {calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      selectedLocation.coords.latitude,
                      selectedLocation.coords.longitude
                    )}
                  </Text>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => openInMaps(selectedLocation)}
                >
                  <Text style={styles.primaryButtonText}>Open in Maps</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => setSelectedLocation(null)}
                >
                  <Text style={styles.secondaryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  headerSection: {
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  controlsCard: {
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
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  controlsContent: {
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    height: height * 0.55,
    width: width * 0.9,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    maxHeight: height * 0.45,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sheetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetIcon: {
    fontSize: 20,
  },
  sheetTitleContainer: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCloseText: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '600',
  },
  sheetContent: {
    padding: 20,
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    width: 80,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  webMapText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default BuyerMapScreen;