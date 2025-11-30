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

  // Get random motivational message
  getRandomMotivationalMessage() {
    const { motivationalMessages } = require('./colors');
    return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  }

  // Schedule flexible reminder (daily, weekly, or once)
  async scheduleFlexibleReminder(reminderConfig) {
    try {
      const { type, time, days, title, message } = reminderConfig;
      
      // Cancel existing reminder first
      await this.cancelFlexibleReminder(type);
      
      // Parse time
      const [hours, minutes] = time.split(':').map(Number);
      
      let trigger;
      let identifier;
      
      if (type === 'once') {
        // Schedule once - use the provided date or next occurrence of time
        const triggerDate = new Date();
        triggerDate.setHours(hours, minutes, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (triggerDate <= new Date()) {
          triggerDate.setDate(triggerDate.getDate() + 1);
        }
        
        trigger = { date: triggerDate };
        
      } else if (type === 'daily') {
        // Schedule daily
        trigger = {
          hour: hours,
          minute: minutes,
          repeats: true,
        };
        
      } else if (type === 'weekly') {
        // Schedule weekly - for each selected day
        const identifiers = [];
        
        for (const day of days) {
          const weeklyId = await Notifications.scheduleNotificationAsync({
            content: {
              title: title || '💰 PiggyPal Reminder',
              body: message || this.getRandomMotivationalMessage(),
              data: { type: 'weekly_reminder', day },
            },
            trigger: {
              weekday: day, // 1 = Sunday, 2 = Monday, etc.
              hour: hours,
              minute: minutes,
              repeats: true,
            },
          });
          identifiers.push(weeklyId);
        }
        
        // Store all weekly identifiers
        await AsyncStorage.setItem(`${type}_reminder_ids`, JSON.stringify(identifiers));
        console.log(`Weekly reminders scheduled for days: ${days.join(', ')}`);
        return identifiers;
      }

      // Schedule single notification (once or daily)
      if (trigger) {
        identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: title || '💰 PiggyPal Reminder',
            body: message || this.getRandomMotivationalMessage(),
            data: { type: `${type}_reminder` },
          },
          trigger,
        });

        // Store the identifier
        await AsyncStorage.setItem(`${type}_reminder_id`, identifier);
        console.log(`${type} reminder scheduled for ${time}`);
      }
      
      return identifier;
    } catch (error) {
      console.error(`Error scheduling ${reminderConfig.type} reminder:`, error);
      return null;
    }
  }

  // Cancel flexible reminder
  async cancelFlexibleReminder(type) {
    try {
      if (type === 'weekly') {
        // Cancel all weekly reminders
        const reminderIds = await AsyncStorage.getItem(`${type}_reminder_ids`);
        if (reminderIds) {
          const ids = JSON.parse(reminderIds);
          for (const id of ids) {
            await Notifications.cancelScheduledNotificationAsync(id);
          }
          await AsyncStorage.removeItem(`${type}_reminder_ids`);
        }
      } else {
        // Cancel single reminder
        const reminderId = await AsyncStorage.getItem(`${type}_reminder_id`);
        if (reminderId) {
          await Notifications.cancelScheduledNotificationAsync(reminderId);
          await AsyncStorage.removeItem(`${type}_reminder_id`);
        }
      }
      console.log(`${type} reminder cancelled`);
    } catch (error) {
      console.error(`Error cancelling ${type} reminder:`, error);
    }
  }

  // Demonstrate notification (for testing in Expo Go)
  async demonstrateNotification(type = 'daily') {
    try {
      const motivationalMsg = this.getRandomMotivationalMessage();
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎯 PiggyPal Demo Notification',
          body: `This is how your ${type} reminder would look: ${motivationalMsg}`,
          data: { type: 'demo', originalType: type },
        },
        trigger: { seconds: 2 }, // Show in 2 seconds
      });
      
      return true;
    } catch (error) {
      console.error('Error demonstrating notification:', error);
      return false;
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

// Export helper functions for external use
export const getRandomMotivationalMessage = () => {
  return notificationService.getRandomMotivationalMessage();
};

export const demonstrateNotification = async (title, body, subtitle) => {
  return notificationService.demonstrateNotification(title, body, subtitle);
};

export const scheduleFlexibleReminder = async (reminderConfig) => {
  return notificationService.scheduleFlexibleReminder(reminderConfig);
};

export const cancelFlexibleReminder = async (type) => {
  return notificationService.cancelFlexibleReminder(type);
};