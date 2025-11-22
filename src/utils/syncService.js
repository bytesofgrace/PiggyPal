// src/utils/syncService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class SyncService {
  constructor() {
    this.isOnline = true;
    this.syncQueue = [];
    this.isSyncing = false;
    this.listeners = new Set();
    
    // Initialize network listener
    this.initNetworkListener();
    // Load pending operations from storage
    this.loadPendingOperations();
  }

  // Network connectivity management
  initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;
      
      this.notifyListeners({
        type: 'network_change',
        isOnline: this.isOnline
      });

      // If we just came back online, try to sync
      if (wasOffline && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  // Event listener management
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Queue management
  async addToQueue(operation) {
    const queueItem = {
      id: Date.now() + Math.random().toString(36),
      ...operation,
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(queueItem);
    await this.savePendingOperations();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }

    return queueItem.id;
  }

  async savePendingOperations() {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  async loadPendingOperations() {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  // Main sync processing
  async processSyncQueue() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start' });

    const failedOperations = [];

    for (const operation of [...this.syncQueue]) {
      try {
        await this.executeOperation(operation);
        
        // Remove from queue on success
        this.syncQueue = this.syncQueue.filter(item => item.id !== operation.id);
        
        this.notifyListeners({
          type: 'operation_synced',
          operation: operation
        });
        
      } catch (error) {
        console.error('Sync operation failed:', error);
        
        operation.retries = (operation.retries || 0) + 1;
        operation.lastError = error.message;

        // Remove after 3 failed attempts
        if (operation.retries >= 3) {
          this.syncQueue = this.syncQueue.filter(item => item.id !== operation.id);
          failedOperations.push(operation);
          
          this.notifyListeners({
            type: 'operation_failed',
            operation: operation,
            error: error.message
          });
        }
      }
    }

    await this.savePendingOperations();
    
    this.isSyncing = false;
    this.notifyListeners({ 
      type: 'sync_complete',
      failedCount: failedOperations.length
    });
  }

  async executeOperation(operation) {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const { type, collection, docId, data } = operation;

    switch (type) {
      case 'CREATE':
      case 'UPDATE':
        await setDoc(doc(db, collection, docId), data, { merge: type === 'UPDATE' });
        break;
        
      case 'DELETE':
        await deleteDoc(doc(db, collection, docId));
        break;
        
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Public API methods
  async saveExpense(expense, user) {
    // Save locally first
    try {
      const existingExpenses = await AsyncStorage.getItem(`expenses_${user}`);
      const expenses = existingExpenses ? JSON.parse(existingExpenses) : [];
      
      const updatedExpenses = expense.id 
        ? expenses.map(e => e.id === expense.id ? expense : e)
        : [...expenses, { ...expense, id: Date.now().toString() }];
      
      await AsyncStorage.setItem(`expenses_${user}`, JSON.stringify(updatedExpenses));
      
      // Queue for sync
      if (auth.currentUser) {
        await this.addToQueue({
          type: expense.id ? 'UPDATE' : 'CREATE',
          collection: 'expenses',
          docId: `${auth.currentUser.uid}_${expense.id || Date.now()}`,
          data: {
            ...expense,
            userId: auth.currentUser.uid,
            syncedAt: Date.now()
          }
        });
      }
      
      return { success: true, data: updatedExpenses };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteExpense(expenseId, user) {
    try {
      const existingExpenses = await AsyncStorage.getItem(`expenses_${user}`);
      const expenses = existingExpenses ? JSON.parse(existingExpenses) : [];
      
      const updatedExpenses = expenses.filter(e => e.id !== expenseId);
      await AsyncStorage.setItem(`expenses_${user}`, JSON.stringify(updatedExpenses));
      
      // Queue for sync
      if (auth.currentUser) {
        await this.addToQueue({
          type: 'DELETE',
          collection: 'expenses',
          docId: `${auth.currentUser.uid}_${expenseId}`
        });
      }
      
      return { success: true, data: updatedExpenses };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveUserSetting(field, value) {
    try {
      // Save locally first
      await AsyncStorage.setItem(`setting_${field}`, JSON.stringify(value));
      
      // Queue for sync
      if (auth.currentUser) {
        await this.addToQueue({
          type: 'UPDATE',
          collection: 'users',
          docId: auth.currentUser.uid,
          data: {
            [field]: value,
            updatedAt: Date.now()
          }
        });
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Enhanced settings sync methods
  async saveGoalSetting(goalType, value) {
    try {
      const localKey = goalType === 'weekly' ? 'piggypal_weekly_goal' : 'piggypal_monthly_goal';
      
      // Save locally first
      await AsyncStorage.setItem(localKey, JSON.stringify(value));
      
      // Queue for sync
      if (auth.currentUser) {
        await this.addToQueue({
          type: 'UPDATE',
          collection: 'users',
          docId: auth.currentUser.uid,
          data: {
            [`${goalType}Goal`]: value,
            updatedAt: Date.now()
          }
        });
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveNotificationSettings(settings) {
    try {
      // Save each notification setting locally
      const settingsToSave = {
        notificationsEnabled: settings.enabled,
        dailyReminderEnabled: settings.dailyReminder,
        reminderTime: settings.reminderTime
      };

      // Save locally
      for (const [key, value] of Object.entries(settingsToSave)) {
        await AsyncStorage.setItem(`setting_${key}`, JSON.stringify(value));
      }
      
      // Queue for sync
      if (auth.currentUser) {
        await this.addToQueue({
          type: 'UPDATE',
          collection: 'users',
          docId: auth.currentUser.uid,
          data: {
            notificationSettings: settingsToSave,
            updatedAt: Date.now()
          }
        });
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveUserProfile(profileData) {
    try {
      // Save locally first
      if (profileData.name) {
        await AsyncStorage.setItem('currentUserName', profileData.name);
      }
      if (profileData.photo) {
        await AsyncStorage.setItem('currentUserPhoto', profileData.photo);
      }
      
      // Queue for sync
      if (auth.currentUser) {
        await this.addToQueue({
          type: 'UPDATE',
          collection: 'users',
          docId: auth.currentUser.uid,
          data: {
            ...profileData,
            updatedAt: Date.now()
          }
        });
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Pull settings from server when online
  async syncSettingsFromServer() {
    try {
      if (!auth.currentUser || !this.isOnline) {
        return { success: false, error: 'Not authenticated or offline' };
      }

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      
      if (userDoc.exists()) {
        const serverData = userDoc.data();
        
        // Sync profile data
        if (serverData.name) {
          await AsyncStorage.setItem('currentUserName', serverData.name);
        }
        if (serverData.profilePhoto) {
          await AsyncStorage.setItem('currentUserPhoto', serverData.profilePhoto);
        }
        
        // Sync goal data
        if (serverData.weeklyGoal !== undefined) {
          await AsyncStorage.setItem('piggypal_weekly_goal', JSON.stringify(serverData.weeklyGoal));
        }
        if (serverData.monthlyGoal !== undefined) {
          await AsyncStorage.setItem('piggypal_monthly_goal', JSON.stringify(serverData.monthlyGoal));
        }
        
        // Sync notification settings
        if (serverData.notificationSettings) {
          const { notificationsEnabled, dailyReminderEnabled, reminderTime } = serverData.notificationSettings;
          
          await AsyncStorage.setItem('setting_notificationsEnabled', JSON.stringify(notificationsEnabled));
          await AsyncStorage.setItem('setting_dailyReminderEnabled', JSON.stringify(dailyReminderEnabled));
          await AsyncStorage.setItem('setting_reminderTime', JSON.stringify(reminderTime));
        }
        
        this.notifyListeners({
          type: 'settings_synced',
          data: serverData
        });
        
        return { success: true, data: serverData };
      }
      
      return { success: true, data: null };
      
    } catch (error) {
      console.error('Error syncing settings from server:', error);
      return { success: false, error: error.message };
    }
  }

  // Status methods
  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: this.syncQueue.length,
      queueItems: this.syncQueue.map(item => ({
        id: item.id,
        type: item.type,
        retries: item.retries || 0,
        timestamp: item.timestamp
      }))
    };
  }

  async manualSync() {
    if (this.isOnline) {
      return this.processSyncQueue();
    } else {
      throw new Error('No network connection');
    }
  }

  async clearQueue() {
    this.syncQueue = [];
    await this.savePendingOperations();
    this.notifyListeners({ type: 'queue_cleared' });
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;