# 🐷 PiggyPal - Your Personal Savings Companion

PiggyPal is an iOS savings tracker app that helps you manage your finances, set goals, and build better saving habits.

## ✨ Features

- 💰 Track expenses and savings
- 🎯 Set and monitor savings goals
- 📊 Visual progress tracking with charts
- 🔔 Flexible reminder notifications (daily/weekly/custom)
- 👤 User profiles with customizable avatars
- 🔄 Offline support with automatic sync
- 🔐 Firebase authentication and cloud storage

## 📱 Platform Support

**iOS Only** - This app is optimized for iOS devices and uses iOS-specific features.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. Open the app on your iOS device:

- Press `i` to open in [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/) (macOS only)
- Scan the QR code with [Expo Go](https://expo.dev/go) on your iPhone
- Use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) for full features

## 🛠️ Development

The app is built with:
- **React Native** with Expo
- **Firebase** for authentication and data storage
- **Expo Notifications** for reminder functionality
- **AsyncStorage** for offline data persistence

### Project Structure

```
src/
├── components/     # Reusable UI components
├── config/         # Firebase and app configuration
├── navigation/     # Navigation setup
├── screens/        # Main app screens
└── utils/          # Helper functions and services
```

### Notifications

PiggyPal includes flexible reminder notifications:
- **Daily reminders** - Set a specific time for daily check-ins
- **Weekly reminders** - Choose specific days of the week
- **One-time reminders** - Set custom one-off reminders
- **In-app demo** - Test notifications in Expo Go

### Icons & Assets

To regenerate app icons:
```bash
node generate-icons.js
```

## 📝 Notes

- **iOS-focused**: This app is designed and tested for iOS devices
- **Expo Go limitations**: Some notification features work best in a development build
- **Offline support**: The app works offline and syncs when connection is restored

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [React Native documentation](https://reactnative.dev/)
- [Firebase documentation](https://firebase.google.com/docs)
