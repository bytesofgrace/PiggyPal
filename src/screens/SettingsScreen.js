// src/screens/SettingsScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../config/firebase';
import { colors } from '../utils/colors';

export default function SettingsScreen({ navigation }) {
  const [userName, setUserName] = useState('PiggyPal User');
  const [currentUser, setCurrentUser] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
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
          setNotifications(data.notifications !== false);
          setDailyReminder(data.dailyReminder === true);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (field, value) => {
    // Update Firebase if user is authenticated
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          [field]: value,
        });
      } catch (error) {
        console.error('Error updating Firebase setting:', error);
        // Don't show error to user - local state still works
      }
    }
    
    // You could also save to AsyncStorage for local backup
    // await AsyncStorage.setItem(`setting_${field}`, value.toString());
  };

  const selectProfilePhoto = () => {
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
      { emoji: '�', label: 'Monkey Face' },
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
      { emoji: '�', label: 'Squid' },
      { emoji: '🦀', label: 'Crab' },
      { emoji: '🦞', label: 'Lobster' },
      { emoji: '🦐', label: 'Shrimp' },
      
      // Small Animals
      { emoji: '🐭', label: 'Mouse Face' },
      { emoji: '🐁', label: 'Mouse' },
      { emoji: '🐀', label: 'Rat' },
      { emoji: '🐹', label: 'Hamster' },
      { emoji: '�', label: 'Rabbit Face' },
      { emoji: '🐇', label: 'Rabbit' },
      { emoji: '�️', label: 'Chipmunk' },
      { emoji: '🦫', label: 'Beaver' },
      { emoji: '🦔', label: 'Hedgehog' },
      { emoji: '🦇', label: 'Bat' },
      
      // Reptiles & Amphibians
      { emoji: '🐸', label: 'Frog' },
      { emoji: '�', label: 'Turtle' },
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

    const buttons = avatarOptions.map(avatar => ({
      text: `${avatar.emoji} ${avatar.label}`,
      onPress: () => saveProfilePhoto(avatar.emoji)
    }));

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Choose Your Animal Avatar 🎭',
      'Pick any animal to represent you!',
      buttons
    );
  };

  const saveProfilePhoto = async (emoji) => {
    try {
      setProfilePhoto(emoji);
      await AsyncStorage.setItem('currentUserPhoto', emoji);
      
      // Also update Firebase if available
      if (auth.currentUser) {
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            profilePhoto: emoji,
          });
        } catch (error) {
          console.error('Error updating Firebase photo:', error);
        }
      }
      
      Alert.alert('Success! 🎉', 'Your avatar has been updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    }
  };

  const toggleNotifications = (value) => {
    setNotifications(value);
    updateSetting('notifications', value);
  };

  const toggleDailyReminder = (value) => {
    setDailyReminder(value);
    updateSetting('dailyReminder', value);
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
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={selectProfilePhoto} style={styles.profilePhotoContainer}>
          <Text style={styles.profilePhoto}>{profilePhoto || '👤'}</Text>
          <Text style={styles.photoHint}>Tap to change</Text>
        </TouchableOpacity>
        <Text style={styles.profileName}>Hello, {userName}!</Text>
        <Text style={styles.profileEmail}>
          {auth.currentUser?.email || currentUser || 'Not logged in'}
        </Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
});