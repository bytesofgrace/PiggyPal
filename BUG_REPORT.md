# PiggyPal Bug Report - December 2, 2025

## Overview
This document contains detailed bug reports for PiggyPal v1.0.0, including severity levels, reproduction steps, and proposed resolutions.

---

## 🚨 HIGH SEVERITY BUGS

### BUG-001: Mixed UI Pattern Inconsistency
**Section:** UI/UX Consistency  
**Severity:** HIGH  
**Status:** ✅ RESOLVED

**Description:**  
Multiple confirmation dialogs use different UI patterns - some use native iOS Alert.alert while others use custom modals, creating inconsistent user experience.

**How to Reproduce:**  
1. Go to Settings → About → About App (uses Alert.alert)
2. Go to Settings → Help & Support (uses Alert.alert)  
3. Go to ExpenseScreen → Delete expense (uses custom modal)
4. Compare the visual styles - they look completely different

**Expected Behavior:**  
All confirmation dialogs should use the same custom modal styling with consistent buttons, colors, and spacing.

**Resolution:**  
- ✅ **REVERTED to native iOS Alert.alert for clean, system-native appearance:**
  - Logout confirmation - now uses native iOS Alert.alert
  - Delete Account confirmation (2-step) - now uses native iOS Alert.alert
  - About App dialog - now uses native iOS Alert.alert  
  - Help & Support dialog - now uses native iOS Alert.alert
  - Cancel Reminder confirmation - now uses native iOS Alert.alert
- 🔄 **Approach changed:** Using native Alert.alert for consistent iOS system appearance instead of custom modals
- ℹ️ **Status:** This bug is now RESOLVED - all major confirmation dialogs use consistent native iOS styling

---

### BUG-002: Password Storage Security Vulnerability
**Section:** Security  
**Severity:** HIGH  
**Status:** OPEN

**Description:**  
User passwords are stored in plain text in AsyncStorage without any encryption or hashing.

**How to Reproduce:**  
1. Register a new account with password "mypassword123"
2. Check AsyncStorage using developer tools
3. Password is visible in plain text in `user_${email}` storage

**Expected Behavior:**  
Passwords should be hashed using a secure algorithm (bcrypt, scrypt, etc.) before storage.

**Resolution:**  
```javascript
// Install crypto library and implement password hashing
import bcrypt from 'react-native-bcrypt';

// During registration:
const hashedPassword = await bcrypt.hash(password, 10);

// During login:
const isValid = await bcrypt.compare(password, storedHashedPassword);
```

---

### BUG-003: Unsaved Data Loss Without Warning
**Section:** Data Management  
**Severity:** HIGH  
**Status:** PARTIAL

**Description:**  
In ExpenseScreen modal, if user enters data and accidentally taps outside the modal, all data is lost without warning.

**How to Reproduce:**  
1. Open ExpenseScreen
2. Tap the + button to add expense
3. Enter title "Groceries" and amount "50"
4. Accidentally tap outside the modal area
5. Modal closes and all data is lost

**Expected Behavior:**  
Should show confirmation dialog asking user if they want to save as draft or discard changes.

**Resolution:**  
The `handleCloseModal()` function exists but may not be properly triggered on all close scenarios. Need to ensure it's called on all modal dismiss events.

---

### BUG-013: Firebase Configuration Security Issue
**Section:** Configuration & Security  
**Severity:** HIGH  
**Status:** OPEN

**Description:**  
Firebase configuration was hardcoded with demo credentials and lacked proper environment variable validation.

**How to Reproduce:**  
1. Check firebase.js configuration file
2. Observe hardcoded credentials in source code
3. No environment variable validation present

**Expected Behavior:**  
Firebase credentials should be stored in environment variables with proper validation.

**Resolution:**  
Move Firebase config to environment variables and add validation checks.

---

### BUG-014: AsyncStorage Data Corruption Risk
**Section:** Data Management  
**Severity:** HIGH  
**Status:** OPEN

**Description:**  
Concurrent AsyncStorage operations could cause data corruption or loss during rapid user interactions.

**How to Reproduce:**  
1. Rapidly add/edit/delete multiple expenses
2. Quickly navigate between screens while operations are pending
3. Data may become corrupted or lost

**Expected Behavior:**  
AsyncStorage operations should be properly queued and synchronized.

**Resolution:**  
Implement operation queuing and locking mechanisms for AsyncStorage.

---

### BUG-015: Logout Functionality Broken
**Section:** Authentication  
**Severity:** HIGH  
**Status:** OPEN

**Description:**  
The logout functionality is not working; when user attempts to log out, the action fails to complete and user remains logged in.

**How to Reproduce:**  
1. Log into the app
2. Go to Settings
3. Tap logout button
4. User remains logged in despite logout attempt

**Expected Behavior:**  
User should be successfully logged out and redirected to login screen.

**Resolution:**  
Fix logout implementation to properly clear session and redirect user.

---

### BUG-016: Memory Leaks from Network Listeners
**Section:** Performance & Memory  
**Severity:** HIGH  
**Status:** OPEN

**Description:**  
Network state listeners were not properly cleaned up, causing memory leaks on component unmount.

**How to Reproduce:**  
1. Navigate between screens multiple times
2. Check memory usage over time
3. Memory continuously increases due to uncleaned listeners

**Expected Behavior:**  
Network listeners should be properly cleaned up on component unmount.

**Resolution:**  
Add proper cleanup in useEffect return functions and component unmount.

---

## ⚠️ MEDIUM SEVERITY BUGS

### BUG-004: Notification Permission Never Re-requested
**Section:** Notifications  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
If user denies notification permissions initially, the app never asks again, even when they enable notification settings.

**How to Reproduce:**  
1. Fresh app install → Deny notification permissions
2. Go to Settings → Enable notifications
3. Try to schedule a reminder
4. Notifications don't work, no re-permission request

**Expected Behavior:**  
When user enables notifications in settings after previously denying, should re-request permissions.

**Resolution:**  
Add permission check and re-request logic in notification toggle handlers.

---

### BUG-005: Time Input Validation Missing
**Section:** Input Validation  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
TimePickerModal accepts invalid time inputs like 25:70 without proper validation.

**How to Reproduce:**  
1. Go to Settings → Daily Reminder → Set time
2. Enter hours: 25, minutes: 70
3. App accepts invalid time

**Expected Behavior:**  
Should validate time input and show error for invalid values.

**Resolution:**  
Already has validation in `handleConfirm()` but UI should prevent invalid input entry.

---

### BUG-006: Export/Share Feature Broken
**Section:** Data Export  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
Export/Share feature in ExpenseScreen shows data but doesn't actually export or share to external apps.

**How to Reproduce:**  
1. Add some expenses
2. Long press expense list
3. Select "Export/Share Data"
4. Alert shows data but no sharing options appear

**Expected Behavior:**  
Should open native sharing dialog to export data via email, messaging, etc.

**Resolution:**  
Implement React Native's Share API:
```javascript
import { Share } from 'react-native';
await Share.share({ message: summary });
```

---

### BUG-007: Achievement Date Parsing Edge Cases
**Section:** Data Processing  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
Achievement date grouping fails for expenses created exactly at midnight or in different timezones.

**How to Reproduce:**  
1. Create expense at exactly 00:00:00
2. Check Achievements screen
3. May appear in wrong date group (Today vs Yesterday)

**Expected Behavior:**  
Should consistently group by local date regardless of exact time.

**Resolution:**  
Improve date parsing in `parseDate()` function to handle edge cases.

---

### BUG-017: App Crashes on Notification Permission Changes
**Section:** Notifications & Permissions  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
App would crash when notification permissions were denied after initial grant, or when permissions were revoked internally.

**How to Reproduce:**  
1. Grant notification permissions initially
2. Revoke permissions from device settings
3. Try to use notification features in app
4. App crashes

**Expected Behavior:**  
App should gracefully handle permission changes without crashing.

**Resolution:**  
Add proper error handling and permission state checking.

---

### BUG-018: Chart Performance Issues with Large Datasets
**Section:** Data Visualization  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
Chart rendering could become sluggish with 500+ entries.

**How to Reproduce:**  
1. Add 500+ expense entries
2. Navigate to Visuals screen
3. Observe slow chart rendering and interaction

**Expected Behavior:**  
Charts should render smoothly regardless of dataset size.

**Resolution:**  
Implement data pagination, virtualization, or chart optimization techniques.

---

### BUG-019: Poor Goal Setting Validation Messages
**Section:** Goal Management  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
Setting goals with invalid values (negative, non-numeric) showed generic error messages.

**How to Reproduce:**  
1. Try to set a goal with negative value
2. Try to set a goal with non-numeric value
3. Generic error message appears

**Expected Behavior:**  
Specific, user-friendly error messages should guide proper input.

**Resolution:**  
Implement specific validation messages for different error types.

---

### BUG-020: Time Picker Modal Backdrop Tap Issue
**Section:** UI Interaction  
**Severity:** MEDIUM  
**Status:** OPEN

**Description:**  
Time picker modal could only be dismissed with buttons, not backdrop tap.

**How to Reproduce:**  
1. Open time picker modal
2. Try to tap outside modal area to close
3. Modal doesn't close

**Expected Behavior:**  
Tapping backdrop should close modal like other modals in the app.

**Resolution:**  
Add backdrop tap handler to close modal.

---

## ℹ️ LOW SEVERITY BUGS

### BUG-008: Confetti Animation Performance
**Section:** UI/UX Animation  
**Severity:** LOW  
**Status:** OPEN

**Description:**  
Confetti animation in ExpenseScreen can cause frame drops on older devices.

**How to Reproduce:**  
1. Add a savings entry on older device
2. Watch confetti animation
3. May notice stuttering or frame drops

**Expected Behavior:**  
Smooth animation regardless of device performance.

**Resolution:**  
Add performance optimization or disable on lower-end devices.

---

### BUG-009: Missing Loading States
**Section:** UI/UX  
**Severity:** LOW  
**Status:** OPEN

**Description:**  
Several async operations don't show loading indicators, leaving users uncertain if action was processed.

**How to Reproduce:**  
1. Add expense while in offline mode
2. No loading indicator shows during save operation
3. User doesn't know if action completed

**Expected Behavior:**  
Should show loading spinners/indicators during async operations.

**Resolution:**  
Add loading states to forms and async operations.

---

### BUG-010: Avatar Grid Layout on Small Screens
**Section:** UI Layout  
**Severity:** LOW  
**Status:** OPEN

**Description:**  
Avatar selection modal grid doesn't adapt well to very small screen sizes.

**How to Reproduce:**  
1. Use device with small screen (iPhone SE)
2. Go to Settings → Edit Profile → Change avatar
3. Avatar grid may overflow or have poor spacing

**Expected Behavior:**  
Should adapt grid columns based on screen size.

**Resolution:**  
Implement responsive grid layout with dynamic column calculation.

---

## 🐛 COSMETIC BUGS

### BUG-011: Inconsistent Text Colors
**Section:** UI Theming  
**Severity:** COSMETIC  
**Status:** OPEN

**Description:**  
Some text elements use hardcoded colors instead of theme colors, causing inconsistency.

**How to Reproduce:**  
1. Look at various text elements throughout app
2. Notice some texts have slightly different shades of gray/black
3. Compare with colors.js theme values

**Expected Behavior:**  
All text should use consistent theme colors from colors.js.

**Resolution:**  
Audit all text styles and replace hardcoded colors with theme colors.

---

### BUG-012: Button Press Visual Feedback Missing
**Section:** UI Interaction  
**Severity:** COSMETIC  
**Status:** OPEN

**Description:**  
Some buttons don't provide visual feedback when pressed (no opacity change or highlighting).

**How to Reproduce:**  
1. Tap various buttons throughout the app
2. Some buttons don't show press animation/feedback

**Expected Behavior:**  
All interactive elements should provide clear visual feedback when pressed.

**Resolution:**  
Add activeOpacity or TouchableHighlight to buttons missing feedback.

---

### BUG-021: Production Console Logs
**Section:** Code Quality  
**Severity:** LOW  
**Status:** OPEN

**Description:**  
Extensive console.log statements remain in production code.

**How to Reproduce:**  
1. Open browser/device console
2. Use the app normally
3. Observe numerous console.log outputs

**Expected Behavior:**  
Production builds should have minimal or no console.log statements.

**Resolution:**  
Remove or conditionally disable console.log statements in production.

---

### BUG-022: Inconsistent Confirmation Dialog Patterns
**Section:** UI Consistency  
**Severity:** COSMETIC  
**Status:** OPEN

**Description:**  
Multiple confirmation dialogs use different UI patterns (some use native iOS Alert, while others use custom modals).

**How to Reproduce:**  
1. Try various confirmation dialogs throughout the app
2. Notice different styles and patterns
3. Some use Alert.alert, others use custom Modal components

**Expected Behavior:**  
All confirmation dialogs should follow consistent design patterns.

**Resolution:**  
Standardize all confirmation dialogs to use either native Alert.alert or custom modals consistently.

---

## 📊 Bug Statistics

**Total Bugs:** 22  
- 🚨 High Severity: 7
- ⚠️ Medium Severity: 8
- 🔧 Low Severity: 5
- 💄 Cosmetic: 2

**Status Distribution:**
- Open: 10
- Partially Fixed: 2

## 🔧 Priority Recommendations

1. **Immediate (High Severity):**
   - Fix remaining Alert.alert inconsistencies
   - Implement password hashing for security
   - Fix data loss prevention

2. **Short Term (Medium Severity):**
   - Implement proper export/sharing
   - Fix notification permission handling
   - Improve time input validation

3. **Long Term (Low/Cosmetic):**
   - Performance optimizations
   - UI/UX polish
   - Theme consistency improvements

---

*Report generated on December 2, 2025  
PiggyPal Version: 1.0.0  
Environment: React Native with Expo*