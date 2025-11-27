// src/utils/notificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { isFirebaseConfigured } from '../config/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  // Initialize notification service
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      await this.requestPermissions();
      
      // Get push token if Firebase is configured
      if (isFirebaseConfigured()) {
        await this.registerForPushNotifications();
      }

      // Set up listeners
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Notification permissions not granted');
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Register for push notifications
  async registerForPushNotifications() {
    try {
      if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured, skipping push token registration');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      });

      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);
      
      // Store token locally and sync
      await AsyncStorage.setItem('expo_push_token', this.expoPushToken);
      
      // TODO: Send token to Firebase/backend for push notifications
      // This would be implemented when you have a backend service
      
      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Set up notification event listeners
  setupNotificationListeners() {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification tap/interaction
  handleNotificationResponse(response) {
    const data = response.notification.request.content.data;
    
    switch (data?.type) {
      case 'daily_reminder':
        // Navigate to expense screen or show reminder
        console.log('Daily reminder tapped');
        break;
      case 'goal_achievement':
        // Navigate to visuals screen to show achievement
        console.log('Goal achievement tapped');
        break;
      case 'savings_milestone':
        // Show savings celebration
        console.log('Savings milestone tapped');
        break;
      default:
        console.log('Unknown notification type');
    }
  }

  // Schedule daily reminder notification
  async scheduleDailyReminder(enabled, time = '19:00') {
    try {
      // Cancel existing daily reminders
      await this.cancelDailyReminder();
      
      if (!enabled) return;

      const [hours, minutes] = time.split(':').map(Number);
      
      // Schedule notification to repeat daily
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🐷 PiggyPal Reminder',
          body: "Don't forget to log your daily savings! Every penny counts! 💰",
          data: { type: 'daily_reminder' },
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      // Store the identifier
      await AsyncStorage.setItem('daily_reminder_id', identifier);
      console.log('Daily reminder scheduled for', time);
      
      return identifier;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      return null;
    }
  }

  // Cancel daily reminder
  async cancelDailyReminder() {
    try {
      const reminderId = await AsyncStorage.getItem('daily_reminder_id');
      if (reminderId) {
        await Notifications.cancelScheduledNotificationAsync(reminderId);
        await AsyncStorage.removeItem('daily_reminder_id');
        console.log('Daily reminder cancelled');
      }
    } catch (error) {
      console.error('Error cancelling daily reminder:', error);
    }
  }

  // Send goal achievement notification
  async sendGoalAchievementNotification(goalType, amount) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Goal Achieved!',
          body: `Congratulations! You've reached your ${goalType} goal of $${amount}! 🏆`,
          data: { type: 'goal_achievement', goalType, amount },
        },
        trigger: null, // Send immediately
      });
      
      console.log('Goal achievement notification sent');
    } catch (error) {
      console.error('Error sending goal achievement notification:', error);
    }
  }

  // Send savings milestone notification
  async sendSavingsMilestoneNotification(amount) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💰 Great Savings!',
          body: `You just saved $${amount}! Your piggy bank is getting fuller! 🐷`,
          data: { type: 'savings_milestone', amount },
        },
        trigger: null, // Send immediately
      });
      
      console.log('Savings milestone notification sent');
    } catch (error) {
      console.error('Error sending savings milestone notification:', error);
    }
  }

  // Send custom notification
  async sendCustomNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });
      
      console.log('Custom notification sent:', title);
    } catch (error) {
      console.error('Error sending custom notification:', error);
    }
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      const settings = {
        enabled: await AsyncStorage.getItem('notifications_enabled') !== 'false',
        dailyReminder: await AsyncStorage.getItem('daily_reminder_enabled') === 'true',
        reminderTime: await AsyncStorage.getItem('reminder_time') || '19:00',
        pushToken: await AsyncStorage.getItem('expo_push_token'),
      };
      return settings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        enabled: true,
        dailyReminder: false,
        reminderTime: '19:00',
        pushToken: null,
      };
    }
  }

  // Update notification settings
  async updateNotificationSettings(settings) {
    try {
      if (settings.enabled !== undefined) {
        await AsyncStorage.setItem('notifications_enabled', settings.enabled.toString());
      }
      
      if (settings.dailyReminder !== undefined) {
        await AsyncStorage.setItem('daily_reminder_enabled', settings.dailyReminder.toString());
        // Update daily reminder schedule
        await this.scheduleDailyReminder(settings.dailyReminder, settings.reminderTime || '19:00');
      }
      
      if (settings.reminderTime !== undefined) {
        await AsyncStorage.setItem('reminder_time', settings.reminderTime);
        // Reschedule with new time if enabled
        const dailyEnabled = await AsyncStorage.getItem('daily_reminder_enabled') === 'true';
        if (dailyEnabled) {
          await this.scheduleDailyReminder(true, settings.reminderTime);
        }
      }
      
      console.log('Notification settings updated:', settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Get push token for external use
  getPushToken() {
    return this.expoPushToken;
  }

  // Check if notifications are supported
  static async isSupported() {
    try {
      return await Notifications.isAvailableAsync();
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;