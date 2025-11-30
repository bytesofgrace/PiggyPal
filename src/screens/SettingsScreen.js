// src/screens/SettingsScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import NotificationDemo from '../components/NotificationDemo';
import ReminderConfigModal from '../components/ReminderConfigModal';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import TimePickerModal from '../components/TimePickerModal';
import { auth, db } from '../config/firebase';
import { colors } from '../utils/colors';
import { 
  cancelFlexibleReminder,
  scheduleFlexibleReminder
} from '../utils/notificationService';
import notificationService from '../utils/notificationService';
import syncService from '../utils/syncService';

export default function SettingsScreen({ navigation }) {
  const [userName, setUserName] = useState('PiggyPal User');
  const [currentUser, setCurrentUser] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('19:00');
  const [flexibleReminder, setFlexibleReminder] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [showReminderConfig, setShowReminderConfig] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ isOnline: true, pendingOperations: 0 });
  const [autoDeleteDays, setAutoDeleteDays] = useState('never');
  const [showDataRetentionModal, setShowDataRetentionModal] = useState(false);

  useEffect(() => {
    loadUserSettings();
    
    // Load initial connection status
    const status = syncService.getConnectionStatus();
    setOfflineMode(status.manualOfflineMode);
    setConnectionStatus(status);
    
    // Add sync listener for when app comes back online
    const unsubscribe = syncService.addListener((event) => {
      if (event.type === 'network_change' && event.isOnline) {
        // When back online, try to sync settings from server
        syncService.syncSettingsFromServer().then((result) => {
          if (result.success && result.data) {
            // Reload local settings if server data was synced
            loadUserSettings();
          }
        });
      }
      
      if (event.type === 'settings_synced') {
        // Settings were updated from server, reload them
        loadUserSettings();
      }

      // Update connection status display
      if (event.type === 'network_change' || event.type === 'manual_mode_change') {
        const status = syncService.getConnectionStatus();
        setConnectionStatus(status);
        setOfflineMode(status.manualOfflineMode);
      }
    });
    
    return unsubscribe;
  }, []);

  const loadUserSettings = async () => {
    try {
      // Initialize notification service
      await notificationService.initialize();
      
      // Load notification settings
      const notificationSettings = await notificationService.getNotificationSettings();
      setNotifications(notificationSettings.enabled);
      setDailyReminder(notificationSettings.dailyReminder);
      setReminderTime(notificationSettings.reminderTime);
      
      // Load flexible reminder settings
      const storedFlexibleReminder = await AsyncStorage.getItem('flexibleReminderConfig');
      if (storedFlexibleReminder) {
        setFlexibleReminder(JSON.parse(storedFlexibleReminder));
      }

      // Load auto-delete settings
      const storedAutoDelete = await AsyncStorage.getItem('auto_delete_days');
      setAutoDeleteDays(storedAutoDelete || 'never');
      
      // Load from AsyncStorage (local auth)
      const user = await AsyncStorage.getItem('currentUser');
      const userNameStored = await AsyncStorage.getItem('currentUserName');
      const profilePhotoStored = await AsyncStorage.getItem('currentUserPhoto');
      if (user) {
        setCurrentUser(user);
      }
      if (userNameStored) {
        setUserName(userNameStored);
      }
      if (profilePhotoStored) {
        setProfilePhoto(profilePhotoStored);
      }

      // Load from Firebase (if available)
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.name || userNameStored || 'PiggyPal User');
          // Use notification service settings instead of Firebase for notifications
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (field, value) => {
    try {
      const result = await syncService.saveUserSetting(field, value);
      
      if (!result.success) {
        Alert.alert('Settings Error', `Failed to save ${field}: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Settings Error', 'Failed to save setting. Please try again.');
    }
  };

  const selectProfilePhoto = () => {
    setShowAvatarModal(true);
  };

  const handleSaveFlexibleReminder = async (config) => {
    try {
      // Cancel existing flexible reminders
      if (flexibleReminder) {
        await cancelFlexibleReminder();
      }

      // Schedule new flexible reminder
      await scheduleFlexibleReminder(config);

      // Save configuration to AsyncStorage
      await AsyncStorage.setItem('flexibleReminderConfig', JSON.stringify(config));
      setFlexibleReminder(config);

      Alert.alert(
        '✅ Reminder Set!',
        `Your ${config.type} reminder has been scheduled for ${formatTime(config.time)}${
          config.type === 'weekly' 
            ? ` on ${config.days.map(id => DAYS_OF_WEEK.find(d => d.id === id)?.name).join(', ')}` 
            : ''
        }.`,
        [{ text: 'Great!', style: 'default' }]
      );
    } catch (error) {
      console.error('Error saving flexible reminder:', error);
      Alert.alert(
        'Error',
        'Failed to set reminder. Please check your notification permissions and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleCancelFlexibleReminder = async () => {
    Alert.alert(
      'Cancel Reminder',
      'Are you sure you want to cancel your flexible reminder?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelFlexibleReminder();
              await AsyncStorage.removeItem('flexibleReminderConfig');
              setFlexibleReminder(null);
              Alert.alert('Reminder Cancelled', 'Your flexible reminder has been cancelled.');
            } catch (error) {
              console.error('Error cancelling reminder:', error);
              Alert.alert('Error', 'Failed to cancel reminder.');
            }
          }
        }
      ]
    );
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Days of week for display
  const DAYS_OF_WEEK = [
    { id: 1, name: 'Sunday', short: 'Sun' },
    { id: 2, name: 'Monday', short: 'Mon' },
    { id: 3, name: 'Tuesday', short: 'Tue' },
    { id: 4, name: 'Wednesday', short: 'Wed' },
    { id: 5, name: 'Thursday', short: 'Thu' },
    { id: 6, name: 'Friday', short: 'Fri' },
    { id: 7, name: 'Saturday', short: 'Sat' }
  ];

  const toggleOfflineMode = async (value) => {
    setOfflineMode(value);
    const result = await syncService.setManualOfflineMode(value);
    
    if (result.success) {
      Alert.alert(
        value ? '📵 Offline Mode Enabled' : '🌐 Online Mode Enabled',
        value 
          ? 'Your changes will be saved locally and synced when you go back online.' 
          : 'Your device is back online! Any pending changes will sync now.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to change mode. Please try again.');
      setOfflineMode(!value); // Revert on error
    }
  };

  const handleDataRetentionChange = async (days) => {
    try {
      await AsyncStorage.setItem('auto_delete_days', days);
      setAutoDeleteDays(days);
      setShowDataRetentionModal(false);
      
      const message = days === 'never' 
        ? 'Your data will be kept forever! 📦'
        : `Data older than ${days} days will be automatically deleted. 🗑️`;
      
      Alert.alert('✅ Setting Saved', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };

  const getRetentionDisplayText = () => {
    if (autoDeleteDays === 'never') return 'Keep Forever';
    return `Delete after ${autoDeleteDays} days`;
  };

  // Avatar options data
  const avatarOptions = [
    // Farm Animals
    { emoji: '🐷', label: 'Pig' },
    { emoji: '🐮', label: 'Cow' },
    { emoji: '🐴', label: 'Horse' },
    { emoji: '🐑', label: 'Sheep' },
    { emoji: '🐐', label: 'Goat' },
    { emoji: '🐓', label: 'Rooster' },
    { emoji: '🐔', label: 'Chicken' },
    { emoji: '🐣', label: 'Chick' },
    { emoji: '🐥', label: 'Baby Chick' },
    { emoji: '🦆', label: 'Duck' },
    { emoji: '🦢', label: 'Swan' },
    
    // Pets
    { emoji: '🐶', label: 'Dog' },
    { emoji: '🐕', label: 'Dog Face' },
    { emoji: '🦮', label: 'Guide Dog' },
    { emoji: '🐕‍🦺', label: 'Service Dog' },
    { emoji: '🐩', label: 'Poodle' },
    { emoji: '🐺', label: 'Wolf' },
    { emoji: '🦊', label: 'Fox' },
    { emoji: '🦝', label: 'Raccoon' },
    { emoji: '🐱', label: 'Cat' },
    { emoji: '🐈', label: 'Cat Face' },
    { emoji: '🐈‍⬛', label: 'Black Cat' },
    { emoji: '🦁', label: 'Lion' },
    { emoji: '🐯', label: 'Tiger Face' },
    { emoji: '🐅', label: 'Tiger' },
    { emoji: '🐆', label: 'Leopard' },
    
    // Wild Animals
    { emoji: '🐎', label: 'Racing Horse' },
    { emoji: '🦄', label: 'Unicorn' },
    { emoji: '🦓', label: 'Zebra' },
    { emoji: '🦌', label: 'Deer' },
    { emoji: '🦏', label: 'Rhinoceros' },
    { emoji: '🦣', label: 'Mammoth' },
    { emoji: '🐘', label: 'Elephant' },
    { emoji: '🦒', label: 'Giraffe' },
    { emoji: '🦘', label: 'Kangaroo' },
    { emoji: '🦬', label: 'Bison' },
    { emoji: '🐃', label: 'Water Buffalo' },
    { emoji: '🐂', label: 'Ox' },
    { emoji: '🐄', label: 'Cow Face' },
    
    // Bears
    { emoji: '🐻', label: 'Bear' },
    { emoji: '🐻‍❄️', label: 'Polar Bear' },
    { emoji: '🐼', label: 'Panda' },
    { emoji: '🐨', label: 'Koala' },
    
    // Primates
    { emoji: '🐵', label: 'Monkey Face' },
    { emoji: '🐒', label: 'Monkey' },
    { emoji: '🦍', label: 'Gorilla' },
    { emoji: '🦧', label: 'Orangutan' },
    
    // Water Animals
    { emoji: '🐳', label: 'Whale' },
    { emoji: '🐋', label: 'Whale Face' },
    { emoji: '🐬', label: 'Dolphin' },
    { emoji: '🦭', label: 'Seal' },
    { emoji: '🐟', label: 'Fish' },
    { emoji: '🐠', label: 'Tropical Fish' },
    { emoji: '🐡', label: 'Pufferfish' },
    { emoji: '🦈', label: 'Shark' },
    { emoji: '🐙', label: 'Octopus' },
    { emoji: '🦑', label: 'Squid' },
    { emoji: '🦀', label: 'Crab' },
    { emoji: '🦞', label: 'Lobster' },
    { emoji: '🦐', label: 'Shrimp' },
    
    // Small Animals
    { emoji: '🐭', label: 'Mouse Face' },
    { emoji: '🐁', label: 'Mouse' },
    { emoji: '🐀', label: 'Rat' },
    { emoji: '🐹', label: 'Hamster' },
    { emoji: '🐰', label: 'Rabbit Face' },
    { emoji: '🐇', label: 'Rabbit' },
    { emoji: '🐿️', label: 'Chipmunk' },
    { emoji: '🦫', label: 'Beaver' },
    { emoji: '🦔', label: 'Hedgehog' },
    { emoji: '🦇', label: 'Bat' },
    
    // Reptiles & Amphibians
    { emoji: '🐸', label: 'Frog' },
    { emoji: '🐢', label: 'Turtle' },
    { emoji: '🦎', label: 'Lizard' },
    { emoji: '🐍', label: 'Snake' },
    { emoji: '🐲', label: 'Dragon Face' },
    { emoji: '🐉', label: 'Dragon' },
    { emoji: '🦕', label: 'Sauropod' },
    { emoji: '🦖', label: 'T-Rex' },
    
    // Birds
    { emoji: '🐦', label: 'Bird' },
    { emoji: '🐧', label: 'Penguin' },
    { emoji: '🕊️', label: 'Dove' },
    { emoji: '🦅', label: 'Eagle' },
    { emoji: '🦆', label: 'Duck' },
    { emoji: '🦢', label: 'Swan' },
    { emoji: '🦉', label: 'Owl' },
    { emoji: '🦤', label: 'Dodo' },
    { emoji: '🪶', label: 'Feather' },
    { emoji: '🦜', label: 'Parrot' },
    { emoji: '🦩', label: 'Flamingo' },
    { emoji: '🦚', label: 'Peacock' },
    
    // Insects & Bugs
    { emoji: '🐛', label: 'Bug' },
    { emoji: '🦋', label: 'Butterfly' },
    { emoji: '🐌', label: 'Snail' },
    { emoji: '🐞', label: 'Ladybug' },
    { emoji: '🐜', label: 'Ant' },
    { emoji: '🪲', label: 'Beetle' },
    { emoji: '🐝', label: 'Bee' },
    { emoji: '🪰', label: 'Fly' },
    { emoji: '🦟', label: 'Mosquito' },
    { emoji: '🦗', label: 'Cricket' },
    { emoji: '🕷️', label: 'Spider' },
    { emoji: '🕸️', label: 'Spider Web' },
    { emoji: '🦂', label: 'Scorpion' },
  ];

  const saveProfilePhoto = async (emoji) => {
    try {
      setProfilePhoto(emoji);
      setShowAvatarModal(false); // Close modal first
      
      const result = await syncService.saveUserProfile({ photo: emoji });
      
      if (result.success) {
        Alert.alert('Success! 🎉', 'Your avatar has been updated!');
      } else {
        Alert.alert('Settings Saved Locally', 'Avatar saved locally and will sync when you\'re back online.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    }
  };

  const toggleNotifications = async (value) => {
    setNotifications(value);
    await notificationService.updateNotificationSettings({ enabled: value });
    
    // Sync all notification settings
    const result = await syncService.saveNotificationSettings({
      enabled: value,
      dailyReminder: dailyReminder,
      reminderTime: reminderTime
    });
    
    if (!result.success) {
      Alert.alert('Settings Saved Locally', 'Notification settings will sync when you\'re back online.');
    }
  };

  const toggleDailyReminder = async (value) => {
    setDailyReminder(value);
    await notificationService.updateNotificationSettings({ 
      dailyReminder: value,
      reminderTime: reminderTime 
    });
    
    // Sync all notification settings
    const result = await syncService.saveNotificationSettings({
      enabled: notifications,
      dailyReminder: value,
      reminderTime: reminderTime
    });
    
    if (!result.success) {
      Alert.alert('Settings Saved Locally', 'Notification settings will sync when you\'re back online.');
    }
    
    if (value) {
      Alert.alert(
        '⏰ Daily Reminder Set!',
        `You'll receive reminders at ${formatTime(reminderTime)} every day.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleTimeChange = async (newTime) => {
    setReminderTime(newTime);
    await notificationService.updateNotificationSettings({ reminderTime: newTime });
    
    // If daily reminder is enabled, reschedule with new time
    if (dailyReminder) {
      await notificationService.updateNotificationSettings({ 
        dailyReminder: true,
        reminderTime: newTime 
      });
    }

    // Sync all notification settings
    const result = await syncService.saveNotificationSettings({
      enabled: notifications,
      dailyReminder: dailyReminder,
      reminderTime: newTime
    });
    
    if (!result.success) {
      Alert.alert('Settings Saved Locally', 'Notification settings will sync when you\'re back online.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout 🚪',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear from BOTH Firebase AND AsyncStorage
              await AsyncStorage.removeItem('currentUser');
              await AsyncStorage.removeItem('currentUserName');
              await AsyncStorage.removeItem('currentUserPhoto');
              
              // Sign out from Firebase (if using Firebase auth)
              if (auth.currentUser) {
                await signOut(auth);
              }
              
              // Navigate back to login screen
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account? ⚠️',
      'This will permanently delete ALL your data including:\n\n• Your account information\n• All expense records\n• Savings progress\n• App settings\n\nThis action CANNOT be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I understand, Delete Everything',
          style: 'destructive',
          onPress: () => {
            // Double confirmation for safety
            Alert.alert(
              'Final Confirmation 🚨',
              'Are you absolutely sure? Piggy will miss you! 🐷💔\n\nThis action is permanent and cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE EVERYTHING',
                  style: 'destructive',
                  onPress: performAccountDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    try {
      // Get current user email for cleanup
      const userEmail = await AsyncStorage.getItem('currentUser');
      
      if (userEmail) {
        // Remove user account data
        await AsyncStorage.removeItem(`user_${userEmail}`);
        
        // Remove expense data for this user
        await AsyncStorage.removeItem(`expenses_${userEmail}`);
        
        // Remove any user-specific settings
        await AsyncStorage.removeItem(`settings_${userEmail}`);
      }
      
      // Clear current session data
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('currentUserName');
      await AsyncStorage.removeItem('currentUserPhoto');
      
      // Clear any other app data
      await AsyncStorage.removeItem('expenses'); // Global expenses if any
      await AsyncStorage.removeItem('totalSavings');
      
      // Sign out from Firebase (if using Firebase auth)
      if (auth.currentUser) {
        // Note: For complete Firebase user deletion, you'd need to call
        // auth.currentUser.delete(), but this requires recent authentication
        await signOut(auth);
      }
      
      Alert.alert(
        'Account Deleted ✅',
        'Your account and all data have been permanently deleted. Thank you for using PiggyPal!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to login screen
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            }
          }
        ],
        { cancelable: false }
      );
      
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Deletion Failed ❌',
        'There was an error deleting your account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Connection Status Banner */}
      <View style={[
        styles.statusBanner,
        connectionStatus.isOnline ? styles.statusOnline : styles.statusOffline
      ]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusText}>
            {connectionStatus.isOnline ? '🌐 Online' : '📵 Offline Mode'} 
            {connectionStatus.pendingOperations > 0 && 
              ` • ${connectionStatus.pendingOperations} pending sync${connectionStatus.pendingOperations > 1 ? 's' : ''}`
            }
          </Text>
          {connectionStatus.manualOfflineMode && (
            <Text style={[styles.statusText, { fontSize: 11, marginTop: 2 }]}>
              Manual offline mode enabled
            </Text>
          )}
        </View>
        {connectionStatus.pendingOperations > 0 && connectionStatus.isOnline && (
          <TouchableOpacity 
            onPress={() => syncService.manualSync()}
            style={styles.syncButton}
          >
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={selectProfilePhoto} style={styles.profilePhotoContainer}>
          <Text style={styles.profilePhoto}>{profilePhoto || '👤'}</Text>
          <Text style={styles.photoHint}>Tap to change</Text>
        </TouchableOpacity>
        <Text style={styles.profileName}>Hello, {userName}!</Text>
        <Text style={styles.profileEmail}>
          {auth.currentUser?.email || currentUser || 'Not logged in'}
        </Text>
        <SyncStatusIndicator />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Text style={styles.settingDescription}>
              Get updates about your savings
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.textLight, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>Daily Reminder</Text>
            <Text style={styles.settingDescription}>
              Remind me to track my money
            </Text>
          </View>
          <Switch
            value={dailyReminder}
            onValueChange={toggleDailyReminder}
            trackColor={{ false: colors.textLight, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {dailyReminder && (
          <TouchableOpacity
            style={styles.timePickerRow}
            onPress={() => setShowTimePickerModal(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Reminder Time</Text>
              <Text style={styles.settingDescription}>
                Current: {formatTime(reminderTime)}
              </Text>
            </View>
            <View style={styles.timeDisplay}>
              <Text style={styles.timeText}>{formatTime(reminderTime)}</Text>
              <Text style={styles.changeTimeText}>Tap to change</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Flexible Reminders Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Flexible Reminders</Text>
        
        {flexibleReminder ? (
          <View style={styles.activeReminderContainer}>
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderType}>
                {flexibleReminder.type.charAt(0).toUpperCase() + flexibleReminder.type.slice(1)} Reminder
              </Text>
              <Text style={styles.reminderDetails}>
                {flexibleReminder.type === 'weekly' 
                  ? `${flexibleReminder.days.map(id => DAYS_OF_WEEK.find(d => d.id === id)?.short).join(', ')} at ${formatTime(flexibleReminder.time)}`
                  : `${flexibleReminder.type === 'daily' ? 'Every day' : 'One time'} at ${formatTime(flexibleReminder.time)}`
                }
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.cancelReminderButton}
              onPress={handleCancelFlexibleReminder}
            >
              <Text style={styles.cancelReminderText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowReminderConfig(true)}
          >
            <Text style={styles.buttonText}>⚙️ Set Flexible Reminder</Text>
          </TouchableOpacity>
        )}

        {flexibleReminder && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowReminderConfig(true)}
          >
            <Text style={styles.buttonText}>✏️ Edit Reminder</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification Demo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Test Notifications</Text>
        <NotificationDemo />
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗄️ Data Management</Text>
        
        <TouchableOpacity 
          style={styles.settingRow}
          onPress={() => setShowDataRetentionModal(true)}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>Auto-Delete Old Data</Text>
            <Text style={styles.settingDescription}>
              {getRetentionDisplayText()}
            </Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.dataInfoBox}>
          <Text style={styles.dataInfoText}>
            💡 Tip: Keeping less data makes the app faster! Old records are automatically cleaned up based on your settings.
          </Text>
        </View>
      </View>

      {/* Offline Mode Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Connection Settings</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>Offline Mode</Text>
            <Text style={styles.settingDescription}>
              Manually work offline for testing or data saving
            </Text>
          </View>
          <Switch
            value={offlineMode}
            onValueChange={toggleOfflineMode}
            trackColor={{ false: colors.textLight, true: colors.accent }}
            thumbColor={colors.white}
          />
        </View>

        {connectionStatus.pendingOperations > 0 && (
          <View style={styles.pendingSync}>
            <Text style={styles.pendingSyncText}>
              ⏳ {connectionStatus.pendingOperations} operation{connectionStatus.pendingOperations > 1 ? 's' : ''} waiting to sync
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Account</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert('Coming Soon', 'Profile editing coming soon! ✨')}
        >
          <Text style={styles.buttonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert('Coming Soon', 'Password change coming soon! 🔒')
          }
        >
          <Text style={styles.buttonText}>🔒 Change Password</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert(
              'About PiggyPal 🐷',
              'PiggyPal helps kids learn about saving and spending money!\n\nVersion 1.0.0'
            )
          }
        >
          <Text style={styles.buttonText}>📱 About App</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Alert.alert('Help', 'Need help? Contact support@piggypal.com 📧')
          }
        >
          <Text style={styles.buttonText}>❓ Help & Support</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>👋 Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for learning</Text>
        <Text style={styles.footerVersion}>PiggyPal v1.0.0</Text>
      </View>
    </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAvatarModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Choose Your Animal Avatar 🎭</Text>
                  <Text style={styles.modalSubtitle}>Pick any animal to represent you!</Text>
                </View>
                
                <FlatList
                  data={avatarOptions}
                  keyExtractor={(item, index) => index.toString()}
                  numColumns={4}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.avatarGrid}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.avatarOption}
                      onPress={() => saveProfilePhoto(item.emoji)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.avatarEmoji}>{item.emoji}</Text>
                      <Text style={styles.avatarLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAvatarModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Data Retention Modal */}
      <Modal
        visible={showDataRetentionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDataRetentionModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDataRetentionModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.retentionModal}>
                <Text style={styles.retentionTitle}>🗄️ Data Retention</Text>
                <Text style={styles.retentionSubtitle}>
                  Choose how long to keep your records
                </Text>

                {[
                  { value: '30', label: '30 Days', desc: 'Good for recent tracking' },
                  { value: '60', label: '2 Months', desc: 'Balance of history & speed' },
                  { value: '90', label: '3 Months', desc: 'Longer history' },
                  { value: 'never', label: 'Keep Forever', desc: 'Never auto-delete' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.retentionOption,
                      autoDeleteDays === option.value && styles.retentionOptionSelected
                    ]}
                    onPress={() => handleDataRetentionChange(option.value)}
                  >
                    <View>
                      <Text style={[
                        styles.retentionOptionLabel,
                        autoDeleteDays === option.value && styles.retentionOptionLabelSelected
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={styles.retentionOptionDesc}>{option.desc}</Text>
                    </View>
                    {autoDeleteDays === option.value && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDataRetentionModal(false)}
                >
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Flexible Reminder Config Modal */}
      <ReminderConfigModal
        visible={showReminderConfig}
        onClose={() => setShowReminderConfig(false)}
        onSave={handleSaveFlexibleReminder}
        initialConfig={flexibleReminder || { type: 'daily', time: '19:00', days: [2, 3, 4, 5, 6] }}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={showTimePickerModal}
        currentTime={reminderTime}
        onTimeChange={handleTimeChange}
        onClose={() => setShowTimePickerModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: colors.white,
    margin: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profilePhoto: {
    fontSize: 60,
    marginBottom: 5,
  },
  photoHint: {
    fontSize: 12,
    color: colors.primary,
    opacity: 0.7,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textLight,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  settingRow: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textLight,
  },
  button: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.secondary,
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 5,
  },
  footerVersion: {
    fontSize: 12,
    color: colors.textLight,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
  },
  avatarGrid: {
    paddingBottom: 20,
  },
  avatarOption: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    margin: 5,
    borderRadius: 10,
    backgroundColor: colors.background,
    minWidth: 70,
    maxWidth: 80,
  },
  avatarEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  avatarLabel: {
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: colors.textLight,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Time picker styles
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    backgroundColor: '#f8f9fa',
  },
  timeDisplay: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  changeTimeText: {
    fontSize: 12,
    color: colors.textLight,
  },
  // Flexible reminder styles
  activeReminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.lightGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  reminderDetails: {
    fontSize: 14,
    color: colors.textLight,
  },
  cancelReminderButton: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelReminderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Connection status banner
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingSync: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    marginTop: 12,
  },
  pendingSyncText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  settingArrow: {
    fontSize: 24,
    color: colors.textLight,
  },
  dataInfoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginTop: 12,
  },
  dataInfoText: {
    color: '#1565C0',
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retentionModal: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  retentionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  retentionSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  retentionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    marginBottom: 10,
  },
  retentionOptionSelected: {
    backgroundColor: colors.primary,
  },
  retentionOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  retentionOptionLabelSelected: {
    color: 'white',
  },
  retentionOptionDesc: {
    fontSize: 13,
    color: colors.textLight,
  },
  checkmark: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: colors.lightGray,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});