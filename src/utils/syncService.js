// src/utils/syncService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class SyncService {
  constructor() {
    this.isOnline = true;
    this.manualOfflineMode = false;
    this.syncQueue = [];
    this.isSyncing = false;
    this.listeners = new Set();
    
    // Initialize network listener
    this.initNetworkListener();
    // Load pending operations from storage
    this.loadPendingOperations();
    // Load manual offline mode setting
    this.loadOfflineModeSetting();
  }

  // Network connectivity management
  initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      // Only update online status if not in manual offline mode
      if (!this.manualOfflineMode) {
        this.isOnline = state.isConnected;
      } else {
        this.isOnline = false;
      }
      
      this.notifyListeners({
        type: 'network_change',
        isOnline: this.isOnline,
        manualMode: this.manualOfflineMode
      });

      // If we just came back online, try to sync
      if (wasOffline && this.isOnline && !this.manualOfflineMode) {
        this.processSyncQueue();
      }
    });
  }

  // Load manual offline mode setting
  async loadOfflineModeSetting() {
    try {
      const setting = await AsyncStorage.getItem('manual_offline_mode');
      this.manualOfflineMode = setting === 'true';
      if (this.manualOfflineMode) {
        this.isOnline = false;
      }
    } catch (error) {
      console.error('Error loading offline mode setting:', error);
    }
  }

  // Toggle manual offline mode
  async setManualOfflineMode(enabled) {
    try {
      this.manualOfflineMode = enabled;
      await AsyncStorage.setItem('manual_offline_mode', enabled.toString());
      
      if (enabled) {
        this.isOnline = false;
      } else {
        // Check actual network status
        const state = await NetInfo.fetch();
        this.isOnline = state.isConnected;
        // Try to sync if back online
        if (this.isOnline) {
          this.processSyncQueue();
        }
      }
      
      this.notifyListeners({
        type: 'manual_mode_change',
        isOnline: this.isOnline,
        manualMode: this.manualOfflineMode
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error setting offline mode:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current mode status
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      manualOfflineMode: this.manualOfflineMode,
      pendingOperations: this.syncQueue.length
    };
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
    // Check for duplicate CREATE operations
    if (operation.type === 'CREATE') {
      const isDuplicate = this.syncQueue.some(item => 
        item.type === 'CREATE' &&
        item.collection === operation.collection &&
        item.docId === operation.docId
      );
      
      if (isDuplicate) {
        console.log('⚠️ Duplicate CREATE operation detected, skipping');
        // Return existing queue item ID
        const existing = this.syncQueue.find(item => 
          item.type === 'CREATE' && item.docId === operation.docId
        );
        return existing?.id || null;
      }
    }
    
    // Check for duplicate UPDATE operations (update existing instead)
    if (operation.type === 'UPDATE') {
      const existingIndex = this.syncQueue.findIndex(item => 
        item.docId === operation.docId &&
        item.collection === operation.collection &&
        (item.type === 'UPDATE' || item.type === 'CREATE')
      );
      
      if (existingIndex !== -1) {
        console.log('⚠️ Updating existing queued operation instead of adding duplicate');
        // Update the existing queue item with new data
        this.syncQueue[existingIndex].data = {
          ...this.syncQueue[existingIndex].data,
          ...operation.data,
          updatedAt: Date.now()
        };
        await this.savePendingOperations();
        return this.syncQueue[existingIndex].id;
      }
    }

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
        const parsed = JSON.parse(queueData);
        
        // Validate queue structure
        if (!Array.isArray(parsed)) {
          console.error('⚠️ Invalid queue structure, resetting');
          this.syncQueue = [];
          await this.savePendingOperations();
          return;
        }
        
        // Validate and sanitize each item
        this.syncQueue = parsed.filter(item => {
          const isValid = 
            item.id && 
            item.type && 
            item.timestamp &&
            ['CREATE', 'UPDATE', 'DELETE'].includes(item.type) &&
            item.collection &&
            item.docId &&
            (item.type === 'DELETE' || item.data !== undefined);
          
          if (!isValid) {
            console.warn('⚠️ Removing invalid queue item:', item);
          }
          return isValid;
        });
        
        console.log(`✅ Loaded ${this.syncQueue.length} valid operations from queue`);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
      await this.savePendingOperations(); // Reset corrupted queue
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
    const docRef = doc(db, collection, docId);

    switch (type) {
      case 'CREATE':
        // Check if document already exists (prevent duplicates)
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
          console.log('⚠️ Document already exists, converting CREATE to UPDATE');
          // Document exists, merge instead
          await setDoc(docRef, {
            ...data,
            updatedAt: Date.now()
          }, { merge: true });
        } else {
          // Normal create
          await setDoc(docRef, data);
        }
        break;
        
      case 'UPDATE':
        // Fetch current server version for conflict detection
        const serverDoc = await getDoc(docRef);
        
        if (serverDoc.exists()) {
          const serverData = serverDoc.data();
          
          // Conflict detection: Check if server has newer data
          if (serverData.updatedAt && data.updatedAt && serverData.updatedAt > data.updatedAt) {
            console.log('⚠️ Conflict detected: Server data is newer, merging...');
            
            // Merge strategy: Keep newer values for each field
            const mergedData = {
              ...serverData,
              ...data,
              updatedAt: Date.now(),
              conflictResolved: true,
              lastSyncedAt: Date.now()
            };
            
            await setDoc(docRef, mergedData, { merge: true });
          } else {
            // No conflict or client data is newer
            await setDoc(docRef, {
              ...data,
              lastSyncedAt: Date.now()
            }, { merge: true });
          }
        } else {
          // Document doesn't exist, create it
          await setDoc(docRef, data);
        }
        break;
        
      case 'DELETE':
        await deleteDoc(docRef);
        break;
        
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Data validation helper
  validateExpense(expense) {
    const errors = [];
    
    if (!expense.title || typeof expense.title !== 'string' || expense.title.trim() === '') {
      errors.push('Title is required and must be a non-empty string');
    }
    if (!expense.amount || isNaN(parseFloat(expense.amount)) || parseFloat(expense.amount) <= 0) {
      errors.push('Valid amount greater than 0 is required');
    }
    if (!['spending', 'saving'].includes(expense.type)) {
      errors.push('Type must be either "spending" or "saving"');
    }
    if (!expense.date) {
      errors.push('Date is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Public API methods
  async saveExpense(expense, user) {
    // Validate expense data before saving
    const validation = this.validateExpense(expense);
    if (!validation.valid) {
      console.error('❌ Expense validation failed:', validation.errors);
      return { 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}`,
        validationErrors: validation.errors
      };
    }

    // Save locally first
    try {
      const existingExpenses = await AsyncStorage.getItem(`expenses_${user}`);
      const expenses = existingExpenses ? JSON.parse(existingExpenses) : [];
      
      const expenseId = expense.id || Date.now().toString();
      const updatedExpense = {
        ...expense,
        id: expenseId,
        updatedAt: Date.now()
      };
      
      // Check if this expense already exists in the array
      const existingIndex = expenses.findIndex(e => e.id === expenseId);
      let updatedExpenses;
      
      if (existingIndex !== -1) {
        // Update existing expense
        updatedExpenses = [...expenses];
        updatedExpenses[existingIndex] = updatedExpense;
      } else {
        // Add new expense
        updatedExpenses = [...expenses, updatedExpense];
      }
      
      await AsyncStorage.setItem(`expenses_${user}`, JSON.stringify(updatedExpenses));
      
      // Queue for sync
      if (auth.currentUser) {
        await this.addToQueue({
          type: existingIndex !== -1 ? 'UPDATE' : 'CREATE',
          collection: 'expenses',
          docId: `${auth.currentUser.uid}_${expenseId}`,
          data: {
            ...updatedExpense,
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

  // Merge expenses with conflict resolution
  mergeExpenses(localExpenses, serverExpenses) {
    const merged = new Map();
    
    // Add all local expenses
    localExpenses.forEach(expense => {
      merged.set(expense.id, expense);
    });
    
    // Merge server expenses (newer timestamp wins)
    serverExpenses.forEach(serverExpense => {
      const localExpense = merged.get(serverExpense.id);
      
      if (!localExpense) {
        // New expense from server
        merged.set(serverExpense.id, serverExpense);
      } else {
        // Conflict: Keep newer version based on updatedAt
        const localTime = localExpense.updatedAt || localExpense.date || 0;
        const serverTime = serverExpense.updatedAt || serverExpense.date || 0;
        
        if (serverTime > localTime) {
          merged.set(serverExpense.id, serverExpense);
        }
        // Otherwise keep local version
      }
    });
    
    return Array.from(merged.values());
  }

  // Fetch expenses from server and merge with local data
  async syncExpensesFromServer(userId) {
    try {
      if (!auth.currentUser || !this.isOnline) {
        return { success: false, error: 'Not authenticated or offline' };
      }

      console.log('📥 Fetching expenses from server...');
      
      // Import query, collection, where, getDocs
      const { query, collection, where, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const serverExpenses = [];
      
      snapshot.forEach(doc => {
        serverExpenses.push({ 
          id: doc.id.split('_')[1] || doc.id, // Remove userId prefix
          ...doc.data() 
        });
      });
      
      console.log(`📥 Found ${serverExpenses.length} expenses on server`);
      
      // Get local expenses
      const localData = await AsyncStorage.getItem(`expenses_${userId}`);
      const localExpenses = localData ? JSON.parse(localData) : [];
      
      console.log(`💾 Found ${localExpenses.length} expenses locally`);
      
      // Merge with conflict resolution
      const mergedExpenses = this.mergeExpenses(localExpenses, serverExpenses);
      
      console.log(`✅ Merged to ${mergedExpenses.length} total expenses`);
      
      // Save merged data locally
      await AsyncStorage.setItem(`expenses_${userId}`, JSON.stringify(mergedExpenses));
      
      this.notifyListeners({
        type: 'expenses_synced',
        data: mergedExpenses
      });
      
      return { success: true, data: mergedExpenses };
      
    } catch (error) {
      console.error('Error syncing expenses from server:', error);
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

  // Initial sync: Pull all data from server on app startup
  async performInitialSync(userId) {
    try {
      if (!this.isOnline) {
        console.log('⚠️ Offline, skipping initial sync');
        return { success: false, error: 'Offline' };
      }

      console.log('🔄 Starting initial sync from server...');
      
      const results = {
        expenses: await this.syncExpensesFromServer(userId),
        settings: await this.syncSettingsFromServer()
      };
      
      // Process any pending operations
      await this.processSyncQueue();
      
      console.log('✅ Initial sync complete');
      
      this.notifyListeners({
        type: 'initial_sync_complete',
        results
      });
      
      return { success: true, results };
      
    } catch (error) {
      console.error('Error during initial sync:', error);
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