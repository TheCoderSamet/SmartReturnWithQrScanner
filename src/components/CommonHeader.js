import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// SmartReturn Animated Icon Components
const SmartReturnIcon = ({ size = 24, color = '#1a1a1a' }) => {
  const [rotation] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
      Animated.timing(rotation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []); 

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ rotate: spin }],
      }}
    >
      <View style={styles.smartReturnContainer}>
        <FontAwesome5 name="qrcode" size={size * 0.8} color={color} />
      </View>
    </Animated.View>
  );
};

const CommonHeader = ({ 
  title, 
  subtitle, 
  showBack = false, 
  onBack, 
  leftIcon,
  onLeftPress,
  rightIcon, 
  onRightPress,
  backgroundColor = '#ffffff',
  textColor = '#1a1a1a',
  onNotificationPress,
  unreadCount = 0,
  centerTitle = false
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { backgroundColor, paddingTop: insets.top }]}>
      <StatusBar 
        barStyle={textColor === '#ffffff' ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
        translucent={true}
      />
      
      <View style={styles.headerContent}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <FontAwesome5 name="arrow-left" size={20} color={textColor} />
          </TouchableOpacity>
        )}
        
        {leftIcon && !showBack && (
          <TouchableOpacity style={styles.leftButton} onPress={onLeftPress}>
            <SmartReturnIcon size={24} color={textColor} />
          </TouchableOpacity>
        )}
        
        <View style={[styles.titleContainer, { alignItems: centerTitle ? 'center' : 'flex-start' }]}>
          <Text style={[styles.title, { color: textColor, textAlign: centerTitle ? 'center' : 'left' }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: textColor === '#ffffff' ? '#e5e7eb' : '#666', textAlign: centerTitle ? 'center' : 'left' }]}>
              {subtitle}
            </Text>
          )}
        </View>
        
        {onNotificationPress ? (
          <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
            <FontAwesome5 name="bell" size={20} color={textColor} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : rightIcon && (
          <TouchableOpacity style={styles.rightButton} onPress={onRightPress}>
            <FontAwesome5 name={rightIcon} size={20} color={textColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  leftButton: {
    padding: 8,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'left',
  },
  rightButton: {
    padding: 8,
    marginLeft: 12,
  },
  notificationButton: {
    padding: 8,
    marginLeft: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  smartReturnContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CommonHeader;
