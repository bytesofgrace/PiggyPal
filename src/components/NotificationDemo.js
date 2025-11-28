// src/components/NotificationDemo.js
import { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { demonstrateNotification, getRandomMotivationalMessage } from '../utils/notificationService';
import { colors } from '../utils/colors';

export default function NotificationDemo() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoNotification = async () => {
    setIsLoading(true);
    try {
      const message = getRandomMotivationalMessage();
      await demonstrateNotification(
        '💰 PiggyPal Demo',
        message,
        '✨ This is how your reminders will look!'
      );
      
      Alert.alert(
        '🎉 Demo Sent!',
        'Check your notification! In Expo Go, notifications appear at the top of the screen.',
        [{ text: 'Got it!', style: 'default' }]
      );
    } catch (error) {
      console.error('Demo notification error:', error);
      Alert.alert(
        'Demo Error',
        'Could not send demo notification. Make sure notifications are enabled in your device settings.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>📱 Test Your Notifications</Text>
        <Text style={styles.infoText}>
          Since background notifications have limitations in Expo Go, use this demo to see how your reminders will appear!
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.demoButton, isLoading && styles.demoButtonDisabled]}
        onPress={handleDemoNotification}
        disabled={isLoading}
      >
        <Text style={styles.demoButtonText}>
          {isLoading ? '⏳ Sending Demo...' : '🔔 Send Demo Notification'}
        </Text>
      </TouchableOpacity>

      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 Tip:</Text>
        <Text style={styles.tipText}>
          The demo shows a random motivational message from your PiggyPal collection. Each reminder will inspire you to keep saving!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  demoButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  demoButtonDisabled: {
    backgroundColor: colors.lightGray,
  },
  demoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tipContainer: {
    backgroundColor: '#fff8dc',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 16,
  },
});