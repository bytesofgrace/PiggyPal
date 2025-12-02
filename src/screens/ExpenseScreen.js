// src/screens/ExpenseScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors } from '../utils/colors';
import syncService from '../utils/syncService';
import CustomAlert, { showCustomAlert } from '../components/CustomAlert';

// Motivational messages for the header
const motivationalMessages = [
  "Your PiggyPal's waiting—how's the stash?",
  "Snout's out! Time to see what you've saved!",
  "PiggyPal says: every coin counts!",
  "Your piggy's proud of your saving skills!",
];

export default function ExpenseScreen() {
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [headerMessage, setHeaderMessage] = useState('');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('spending'); // 'spending' or 'saving'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  

  
  // Delete confirmation modal state
  const [deleteExpense, setDeleteExpense] = useState(null);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // No animation values needed

  useEffect(() => {
    const initializeData = async () => {
      await loadCurrentUser();
      await loadExpenses();
      await clearBadDrafts(); // Clear any empty drafts first
      await loadDraft(); // Load any saved draft
      await autoDeleteOldExpenses(); // Auto-delete old entries based on settings
      
      // Perform initial sync from server
      const user = await AsyncStorage.getItem('currentUser');
      if (user) {
        console.log('🔄 Performing initial sync from server...');
        const result = await syncService.performInitialSync(user);
        if (result.success) {
          console.log('✅ Initial sync successful');
          // Reload expenses after sync
          await loadExpenses();
        } else {
          console.log('⚠️ Initial sync failed:', result.error);
        }
      }
    };
    
    initializeData();
    
    // Set initial random motivational message
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setHeaderMessage(randomMessage);
  }, []);

  // Auto-save draft whenever form fields change
  useEffect(() => {
    // Only save if there's actual meaningful content and modal is visible
    const hasTitle = title && title.trim().length > 0;
    const hasAmount = amount && amount.trim().length > 0;
    
    if (modalVisible && (hasTitle || hasAmount)) {
      saveDraft();
    }
  }, [title, amount, type, selectedDate, modalVisible]);

  // Change message each time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      setHeaderMessage(randomMessage);
    }, [])
  );

  // Handle screen blur/navigation away while modal is open
  useFocusEffect(
    useCallback(() => {
      // Return cleanup function that runs when screen loses focus
      return () => {
        // If modal is open and has unsaved meaningful data, save as draft
        const hasTitle = title && title.trim().length > 0;
        const hasAmount = amount && amount.trim().length > 0;
        if (modalVisible && (hasTitle || hasAmount)) {
          saveDraft();
        }
      };
    }, [modalVisible, title, amount])
  );

  // Handle app going to background while modal is open
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // If modal is open and has unsaved meaningful data, save as draft
        const hasTitle = title && title.trim().length > 0;
        const hasAmount = amount && amount.trim().length > 0;
        if (modalVisible && (hasTitle || hasAmount)) {
          saveDraft();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [modalVisible, title, amount]);

  const loadCurrentUser = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      setCurrentUser(user);
    } catch (error) {
      console.log('Error loading user:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (user) {
        const expensesData = await AsyncStorage.getItem(`expenses_${user}`);
        if (expensesData) {
          const expensesList = JSON.parse(expensesData);
          // Sort by date, newest first
          expensesList.sort((a, b) => new Date(b.date) - new Date(a.date));
          setExpenses(expensesList);
        }
      }
    } catch (error) {
      console.log('Error loading expenses:', error);
    }
  };

  // Save draft to AsyncStorage
  const saveDraft = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) return;

      const draft = {
        title,
        amount,
        type,
        selectedDate: selectedDate.toISOString(),
        editingExpenseId: editingExpense?.id || null,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(`expense_draft_${user}`, JSON.stringify(draft));
    } catch (error) {
      console.log('Error saving draft:', error);
    }
  };

  // Load draft from AsyncStorage
  const loadDraft = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) return;

      const draftData = await AsyncStorage.getItem(`expense_draft_${user}`);
      if (draftData) {
        const draft = JSON.parse(draftData);
        
        // Only restore draft if it's less than 24 hours old
        const hoursSinceDraft = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
        if (hoursSinceDraft < 24) {
          // Check if draft has meaningful content before asking user
          const hasTitle = draft.title && typeof draft.title === 'string' && draft.title.trim().length > 0;
          const hasAmount = draft.amount && typeof draft.amount === 'string' && draft.amount.trim().length > 0;
          
          // Only show alert if draft has meaningful content - DON'T restore to form yet
          if (hasTitle || hasAmount) {
            const draftPreview = `${draft.title || 'Untitled'} - $${draft.amount || '0'}`;
            showCustomAlert(
              'Draft Found',
              `We found an unsaved ${draft.type || 'entry'}: "${draftPreview}". Would you like to keep it or start fresh?`,
              [
                { 
                  text: 'Start Fresh', 
                  onPress: async () => {
                    console.log('🔄 Start Fresh - DELETING ALL ENTRIES AND DRAFTS');
                    
                    try {
                      const user = await AsyncStorage.getItem('currentUser');
                      if (user) {
                        // DELETE ALL EXPENSE ENTRIES
                        await AsyncStorage.setItem(`expenses_${user}`, JSON.stringify([]));
                        setExpenses([]); // Clear from UI immediately
                        console.log('🗑️ ALL EXPENSE ENTRIES DELETED');
                        
                        // Clear all drafts too
                        await AsyncStorage.removeItem(`expense_draft_${user}`);
                        await AsyncStorage.removeItem(`expenseDraft`);
                        await AsyncStorage.removeItem(`draft_${user}`);
                        console.log('🗑️ ALL DRAFTS CLEARED');
                      }
                      
                      // Reset form to completely fresh state
                      setTitle('');
                      setAmount('');
                      setType('spending');
                      setSelectedDate(new Date());
                      
                      console.log('✅ COMPLETE FRESH START - ALL DATA DELETED');
                      
                      Alert.alert('🗑️ Complete Fresh Start!', 'ALL your expense entries and drafts have been DELETED! Starting completely fresh.');
                      
                    } catch (error) {
                      console.log('❌ Error deleting data:', error);
                      Alert.alert('Error', 'Could not delete all data.');
                    }
                  }
                },
                { 
                  text: 'Keep Draft', 
                  onPress: () => {
                    console.log('📝 Keeping draft - restoring to form');
                    // NOW restore the draft to the form
                    setTitle(draft.title || '');
                    setAmount(draft.amount || '');
                    setType(draft.type || 'spending');
                    setSelectedDate(draft.selectedDate ? new Date(draft.selectedDate) : new Date());
                  }
                }
              ]
            );
          } else {
            await clearDraft(); // Clear the empty draft immediately
          }
        } else {
          // Clear old draft
          await clearDraft();
        }
      }
    } catch (error) {
      console.log('Error loading draft:', error);
    }
  };

  // Clear draft from AsyncStorage
  const clearDraft = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      console.log('🔄 clearDraft called for user:', user);
      if (!user) {
        console.log('❌ No user found in clearDraft');
        return;
      }
      await AsyncStorage.removeItem(`expense_draft_${user}`);
      console.log('✅ Draft removed from storage:', `expense_draft_${user}`);
    } catch (error) {
      console.log('❌ Error clearing draft:', error);
    }
  };

  const clearBadDrafts = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) return;

      const draftData = await AsyncStorage.getItem(`expense_draft_${user}`);
      
      if (draftData) {
        const draft = JSON.parse(draftData);
        
        const hasTitle = draft.title && typeof draft.title === 'string' && draft.title.trim().length > 0;
        const hasAmount = draft.amount && typeof draft.amount === 'string' && draft.amount.trim().length > 0;
        
        // Clear draft if it has no meaningful content
        if (!hasTitle && !hasAmount) {
          await clearDraft();
        }
      }
    } catch (error) {
      console.log('Error checking drafts:', error);
    }
  };

  // Auto-delete old expenses based on settings
  const autoDeleteOldExpenses = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) return;

      const autoDeleteDays = await AsyncStorage.getItem('auto_delete_days');
      if (!autoDeleteDays || autoDeleteDays === 'never') return;

      const daysToKeep = parseInt(autoDeleteDays);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const expensesData = await AsyncStorage.getItem(`expenses_${user}`);
      if (expensesData) {
        const expensesList = JSON.parse(expensesData);
        
        // Smart deletion: Preserve current week and current month for goal tracking
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        currentWeekStart.setHours(0, 0, 0, 0);
        
        const deletedExpenseIds = [];
        const filteredExpenses = expensesList.filter(expense => {
          const expenseDate = new Date(expense.date);
          
          // Keep if within retention period
          if (expenseDate >= cutoffDate) return true;
          
          // Keep if in current week (for weekly goal tracking)
          if (expenseDate >= currentWeekStart) {
            console.log('⚠️ Preserving expense from current week for goal tracking');
            return true;
          }
          
          // Keep if in current month (for monthly goal tracking)
          if (expenseDate >= currentMonthStart) {
            console.log('⚠️ Preserving expense from current month for goal tracking');
            return true;
          }
          
          // Mark for deletion
          deletedExpenseIds.push(expense.id);
          return false;
        });

        if (deletedExpenseIds.length > 0) {
          // Update local storage
          await AsyncStorage.setItem(`expenses_${user}`, JSON.stringify(filteredExpenses));
          setExpenses(filteredExpenses);
          
          console.log(`🗑️ Auto-deleted ${deletedExpenseIds.length} old expenses (preserved current week/month)`);
          
          // Queue deletions for Firebase sync
          for (const expenseId of deletedExpenseIds) {
            try {
              await syncService.deleteExpense(expenseId, user);
              console.log(`✅ Queued deletion for expense ${expenseId}`);
            } catch (error) {
              console.error(`❌ Failed to queue deletion for expense ${expenseId}:`, error);
            }
          }
          
          // Notify that data has changed (for Visuals screen to update)
          await AsyncStorage.setItem('expenses_updated', Date.now().toString());
        } else {
          console.log('✅ No expenses to auto-delete');
        }
      }
    } catch (error) {
      console.log('❌ Error auto-deleting old expenses:', error);
    }
  };

  // Bulk delete all expenses
  const handleBulkDelete = () => {
    console.log('🗑️ Bulk delete button pressed!');
    
    // Use native Alert since CustomAlert seems to be having issues
    Alert.alert(
      '🗑️ Delete All Data?',
      'This will permanently delete ALL your savings and spending records. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export First',
          onPress: () => exportDataBeforeDelete(),
          style: 'default'
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await AsyncStorage.getItem('currentUser');
              if (!user) return;

              await AsyncStorage.setItem(`expenses_${user}`, JSON.stringify([]));
              setExpenses([]);
              
              Alert.alert(
                '✅ All Clear!',
                'All your expense records have been deleted.'
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to delete records. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Export/Share data function
  const exportData = async () => {
    if (expenses.length === 0) {
      showCustomAlert('No Data', 'You don\'t have any data to export!');
      return;
    }

    const totalSavings = expenses
      .filter(e => e.type === 'saving')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalSpending = expenses
      .filter(e => e.type === 'spending')
      .reduce((sum, e) => sum + e.amount, 0);

    // Create detailed data export
    const summary = `📊 PiggyPal Summary\n\n` +
      `💰 Total Savings: $${totalSavings.toFixed(2)}\n` +
      `💸 Total Spending: $${totalSpending.toFixed(2)}\n` +
      `📝 Total Records: ${expenses.length}\n\n` +
      `All Entries:\n` +
      expenses.map((e, index) => 
        `${index + 1}. ${e.type === 'saving' ? '💰' : '💸'} ${e.title}: $${e.amount.toFixed(2)} (${new Date(e.date).toLocaleDateString()})`
      ).join('\n');

    try {
      await Share.share({
        message: summary,
        title: '📊 PiggyPal Data Export'
      });
    } catch (error) {
      console.log('Error sharing data:', error);
      showCustomAlert('Error', 'Could not share data. Please try again.');
    }
  };

  // Export data before delete (used in bulk delete)
  const exportDataBeforeDelete = async () => {
    console.log('🔄 Export function called');
    
    if (expenses.length === 0) {
      showCustomAlert('No Data', 'You don\'t have any data to export!');
      return;
    }

    console.log('📊 Preparing export data...');
    
    const totalSavings = expenses
      .filter(e => e.type === 'saving')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalSpending = expenses
      .filter(e => e.type === 'spending')
      .reduce((sum, e) => sum + e.amount, 0);

    const summary = `📊 PiggyPal Summary\n\n` +
      `💰 Total Savings: $${totalSavings.toFixed(2)}\n` +
      `💸 Total Spending: $${totalSpending.toFixed(2)}\n` +
      `📝 Total Records: ${expenses.length}\n\n` +
      `Recent Entries:\n` +
      expenses.slice(0, 5).map(e => 
        `${e.type === 'saving' ? '💰' : '💸'} ${e.title}: $${e.amount}`
      ).join('\n');

    try {
      console.log('📤 Attempting to share data...');
      
      // Set a timeout to prevent hanging
      const sharePromise = Share.share({
        message: summary,
        title: '📊 PiggyPal Data Export'
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Share timeout')), 5000);
      });
      
      const result = await Promise.race([sharePromise, timeoutPromise]);
      
      console.log('✅ Share completed:', result);
      
      // Show success message regardless of result
      showCustomAlert(
        '✅ Export Ready!',
        'Your data export has been prepared. You can now choose to keep or delete your records.',
        [{ text: 'OK', onPress: () => console.log('Export acknowledged') }]
      );
      
    } catch (error) {
      console.log('❌ Share failed or timed out, showing data directly:', error);
      
      // Fallback: Show the data in an alert for manual copying
      showCustomAlert(
        '📊 Your Export Data',
        summary,
        [
          { text: 'Copy Text', onPress: () => {
            // Try to copy to clipboard if available
            if (Platform.OS === 'web') {
              navigator.clipboard?.writeText(summary);
            }
            showCustomAlert('📋 Ready!', 'Data displayed above. You can manually copy this information.');
          }},
          { text: 'OK', onPress: () => console.log('Data shown to user') }
        ]
      );
    }

    // After sharing, ask if they want to delete all data
    setTimeout(() => {
      showCustomAlert(
        '🗑️ Delete All Data?',
        'Now that you\'ve exported your data, would you like to delete all records?',
        [
          { text: 'Keep Data', style: 'cancel' },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              try {
                const user = await AsyncStorage.getItem('currentUser');
                if (!user) return;
                await AsyncStorage.setItem(`expenses_${user}`, JSON.stringify([]));
                setExpenses([]);
                showCustomAlert('✅ Deleted!', 'All records have been deleted.');
              } catch (error) {
                showCustomAlert('Error', 'Failed to delete records. Please try again.');
              }
            }
          }
        ]
      );
    }, 500); // Small delay to let sharing complete
  };



  const openAddModal = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setType('spending');
    setSelectedDate(new Date());
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    // If there's meaningful unsaved data, ask user
    const hasTitle = title && title.trim().length > 0;
    const hasAmount = amount && amount.trim().length > 0;
    
    if (hasTitle || hasAmount) {
      setShowUnsavedModal(true);
    } else {
      setModalVisible(false);
    }
  };

  const handleDiscardChanges = async () => {
    await clearDraft();
    setTitle('');
    setAmount('');
    setType('spending');
    setEditingExpense(null);
    setShowUnsavedModal(false);
    setModalVisible(false);
  };

  const handleKeepDraft = () => {
    setShowUnsavedModal(false);
    setModalVisible(false);
    // Draft is already saved via useEffect
  };

  const openEditModal = (expense) => {
    console.log('📝 openEditModal called for expense:', expense.title);
    
    try {
      setEditingExpense(expense);
      setTitle(expense.title);
      setAmount(expense.amount.toString());
      setType(expense.type);
      setSelectedDate(expense.date ? new Date(expense.date) : new Date());
      setModalVisible(true);
      console.log('✅ Edit modal opened successfully');
    } catch (error) {
      console.log('❌ Error opening edit modal:', error);
      Alert.alert('Error', 'Could not open edit form. Please try again.');
    }
  };

  const handleSave = async () => {
    console.log('💾 handleSave called');
    
    if (!title || !amount) {
      console.log('❌ Missing fields - title:', title, 'amount:', amount);
      Alert.alert('Oops!', 'Please fill in all fields! 📝');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.log('❌ Invalid amount:', amount);
      Alert.alert('Oops!', 'Please enter a valid amount! 💵');
      return;
    }
    
    console.log('✅ Validation passed, proceeding with save');

    setIsSaving(true);
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) {
        showCustomAlert('Error', 'User not found');
        return;
      }

      const expenseData = {
        id: editingExpense?.id || Date.now().toString(),
        userId: user,
        title,
        amount: numAmount,
        type,
        date: selectedDate.toISOString(),
      };

      // Use sync service to save expense
      const result = await syncService.saveExpense(expenseData, user);
      
      if (result.success) {
        setExpenses(result.data);
        setModalVisible(false);
        
        // Trigger confetti for new savings!
        if (!editingExpense && type === 'saving') {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
        
        // Clear form and draft
        setTitle('');
        setAmount('');
        setType('spending');
        setEditingExpense(null);
        await clearDraft(); // Clear draft after successful save
        
      } else {
        // Show detailed validation errors if available
        if (result.validationErrors && result.validationErrors.length > 0) {
          showCustomAlert(
            'Validation Error',
            result.validationErrors.join('\n')
          );
        } else {
          showCustomAlert('Error', `Failed to save: ${result.error}`);
        }
      }
      
    } catch (error) {
      showCustomAlert('Error', 'Something went wrong! 😅');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (expense) => {
    console.log('🗑️ handleDelete called for expense:', expense.title);
    
    Alert.alert(
      'Delete Expense? 🗑️',
      `Are you sure you want to delete "${expense.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('❌ Delete cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ User confirmed delete');
            confirmDelete(expense);
          }
        }
      ]
    );
  };

  const confirmDelete = async (expense) => {
    if (!expense) {
      console.log('❌ No expense provided to confirmDelete');
      return;
    }
    
    console.log('🗑️ Confirming delete for:', expense.title);
    setIsDeleting(true);
    
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) {
        console.log('❌ User not found');
        Alert.alert('Error', 'User not found');
        return;
      }

      console.log('🔄 Deleting expense with ID:', expense.id);
      const result = await syncService.deleteExpense(expense.id, user);
      
      if (result.success) {
        console.log('✅ Delete successful, updating expenses list');
        setExpenses(result.data);
        Alert.alert('✅ Deleted!', `"${expense.title}" has been deleted.`);
      } else {
        console.log('❌ Delete failed:', result.error);
        Alert.alert('Error', `Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.log('❌ Delete error:', error);
      Alert.alert('Error', 'Failed to delete! 😅');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderExpenseItem = ({ item }) => (
    <View
      style={[
        styles.expenseCard,
        { borderLeftColor: item.type === 'saving' ? colors.saving : colors.spending },
      ]}
    >
      <View style={styles.expenseContent}>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          <Text style={styles.expenseDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text
            style={[
              styles.expenseAmount,
              { color: item.type === 'saving' ? colors.saving : colors.spending },
            ]}
          >
            ${item.amount.toFixed(2)}
          </Text>
          <View style={styles.expenseActions}>
            <TouchableOpacity
              style={[styles.iconButton, {
                zIndex: 999,
                elevation: 8,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 20,
                minWidth: 40,
                minHeight: 40,
                justifyContent: 'center',
                alignItems: 'center'
              }]}
              onPress={() => {
                console.log('✏️ EDIT BUTTON TAPPED for:', item.title, item.id);
                openEditModal(item);
              }}
              activeOpacity={0.6}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              pointerEvents="auto"
            >
              <Text style={[styles.editIcon, { fontSize: 18 }]}>✏️</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.iconButton, {
                zIndex: 999,
                elevation: 8,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 20,
                minWidth: 40,
                minHeight: 40,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 8
              }]}
              onPress={() => {
                console.log('🗑️ DELETE BUTTON TAPPED for:', item.title, item.id);
                handleDelete(item);
              }}
              activeOpacity={0.6}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              pointerEvents="auto"
            >
              <Text style={[styles.deleteIcon, { fontSize: 18 }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.motivationalCard}>
          <View style={styles.motivationalCardHeader}>
            <Text style={styles.motivationalCardEmoji}>🐷</Text>
            <Text style={styles.motivationalCardTitle}>PiggyPal Says:</Text>
          </View>
          <Text style={styles.motivationalCardMessage}>{headerMessage}</Text>
        </View>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🐷</Text>
          <Text style={styles.emptyText}>No entries yet!</Text>
          
          {/* Arrow pointing to FAB */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>Tap here to get started!</Text>
            <Text style={styles.arrow}>↘️</Text>
          </View>
        </View>
      ) : (
        <View style={styles.splitContainer}>
          {/* Savings Section */}
          <View style={styles.savingsSection}>

            <FlatList
              data={expenses.filter(expense => expense.type === 'saving')}
              renderItem={renderExpenseItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.sectionList, { flexGrow: 1 }]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            />
          </View>
          
          {/* Pink Divider Line */}
          <View style={styles.dividerLine} />
          
          {/* Spendings Section */}
          <View style={styles.spendingsSection}>

            <FlatList
              data={expenses.filter(expense => expense.type === 'spending')}
              renderItem={renderExpenseItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.sectionList, { flexGrow: 1 }]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            />
          </View>
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); handleCloseModal(); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingExpense ? '✏️ Edit Entry' : '➕ Add New Entry'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="What is it for? 📝"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={styles.input}
              placeholder="Amount ($) 💵"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.typeLabel}>Date:</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateButtonText}>
                📅 {selectedDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={{ backgroundColor: '#f0f0f0', borderRadius: 10, paddingVertical: 10, marginVertical: 10, alignItems: 'center', justifyContent: 'center' }}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      setSelectedDate(date);
                    }
                  }}
                  textColor="#000000"
                />
              </View>
            )}

            <Text style={styles.typeLabel}>Type:</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'spending' && styles.typeButtonActive,
                  { backgroundColor: type === 'spending' ? colors.spending : colors.white },
                ]}
                onPress={() => setType('spending')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'spending' && styles.typeButtonTextActive,
                  ]}
                >
                  💸 Spending
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'saving' && styles.typeButtonActive,
                  { backgroundColor: type === 'saving' ? colors.saving : colors.white },
                ]}
                onPress={() => setType('saving')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'saving' && styles.typeButtonTextActive,
                  ]}
                >
                  💰 Saving
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  console.log('❌ Cancel button pressed');
                  // Force close modal immediately for now
                  setModalVisible(false);
                  setEditingExpense(null);
                  console.log('✅ Modal closed');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="white" style={styles.loadingSpinner} />
                    <Text style={styles.saveButtonText}>
                      {editingExpense ? 'Updating...' : 'Saving...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingExpense ? 'Update ✅' : 'Save ✅'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteExpense !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteExpense(null)}
      >
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setDeleteExpense(null); }}>
          <View style={styles.deleteModalOverlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={styles.deleteModalContainer}>
                <View style={styles.deleteModalHeader}>
                  <Text style={styles.deleteModalTitle}>Delete? 🗑️</Text>
                  <Text style={styles.deleteModalSubtitle}>
                    Are you sure you want to delete "{deleteExpense?.title}"?
                  </Text>
                </View>
                
                <View style={styles.deleteModalButtons}>
                  <TouchableOpacity
                    style={styles.deleteModalCancelButton}
                    onPress={() => setDeleteExpense(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.deleteModalDeleteButton, isDeleting && styles.deleteButtonDisabled]}
                    onPress={confirmDelete}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                  >
                    {isDeleting ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="white" style={styles.loadingSpinner} />
                        <Text style={styles.deleteModalDeleteText}>Deleting...</Text>
                      </View>
                    ) : (
                      <Text style={styles.deleteModalDeleteText}>Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Floating Action Button with Custom Shadow Layers */}
      <View style={styles.fabShadowContainer}>
        {/* Bottom shadow layer */}
        <View style={styles.fabBottomShadow} />
        
        {/* Main button */}
        <TouchableOpacity
          style={[styles.fab, styles.fabTouchable]}
          onPress={openAddModal}
          activeOpacity={0.7}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Bulk Delete Button - Bottom Left */}
      {expenses.length > 0 && (
        <TouchableOpacity 
          style={styles.bulkDeleteButton}
          onPress={() => {
            console.log('🔥 TouchableOpacity pressed!');
            handleBulkDelete();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="bulk-delete-button"
        >
          <Text style={styles.bulkDeleteText}>🗑️</Text>
        </TouchableOpacity>
      )}

      {/* Confetti Effect */}
      {showConfetti && (
        <ConfettiCannon
          count={100}
          origin={{x: 0, y: 0}}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={350}
          fallSpeed={2000}
          colors={['#FF6B9D', '#FFD700', '#FF69B4', '#FFA500', '#32CD32']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        />
      )}

      {/* Unsaved Changes Modal */}
      <Modal
        visible={showUnsavedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnsavedModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>📝 Unsaved Changes</Text>
            <Text style={styles.deleteModalMessage}>
              Do you want to save this as a draft?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => setShowUnsavedModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalDiscardButton}
                onPress={handleDiscardChanges}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalDiscardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalKeepButton}
                onPress={handleKeepDraft}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalKeepText}>Keep Draft</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Custom Alert */}
      <CustomAlert />

      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  motivationalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  motivationalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  motivationalCardEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  motivationalCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  motivationalCardMessage: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    textAlign: 'left',
  },
  bulkDeleteButton: {
    position: 'absolute',
    bottom: 30,
    left: 15,
    backgroundColor: colors.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
    borderWidth: 2,
    borderColor: '#fff',
  },
  bulkDeleteText: {
    fontSize: 28,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  section: {
    flex: 1,
    backgroundColor: colors.background,
  },
  savingsSection: {
    flex: 0.5, // 50% of the space for savings
    backgroundColor: colors.background,
  },
  spendingsSection: {
    flex: 0.5, // 50% of the space for spendings
    backgroundColor: colors.background,
  },
  dividerLine: {
    height: 2,
    backgroundColor: colors.primary, // Pink color
    marginHorizontal: 20,
    marginVertical: 5,
  },
  sectionHeader: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.textLight + '20',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  sectionList: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 10, // Minimal bottom padding - let content scroll to tab bar
  },
  expenseCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  expenseDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  expenseRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  expenseType: {
    fontSize: 12,
    color: colors.textLight,
  },
  expenseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 5,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  editIcon: {
    fontSize: 18,
  },
  deleteIcon: {
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 70, // Move closer to the FAB (was 100)
    right: 60,  // Move closer to the FAB (was 80)
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  arrow: {
    fontSize: 24,
    transform: [{ rotate: '5deg' }], // Much more horizontal, pointing directly at the + icon
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dateButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textLight,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: 'transparent',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: colors.textLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: 8,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteModalHeader: {
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: colors.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalDeleteButton: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalDeleteText: {
    color: '#C62828',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteModalDiscardButton: {
    backgroundColor: '#C62828',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModalDiscardText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteModalKeepButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModalKeepText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  fabShadowContainer: {
    position: 'absolute',
    bottom: 30,
    right: 15,
    width: 64,
    height: 64,
  },
  fabBottomShadow: {
    position: 'absolute',
    bottom: -8, // Offset by 8px down (like CSS 0_8px_0_0)
    left: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.2)', // Solid shadow color from CSS
    zIndex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary, // Pink color to match header
    zIndex: 2,
    // Blur shadow - mimics 0_12px_24px_rgba(0,0,0,0.15)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  fabTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  fabText: {
    color: 'white',
    fontSize: 32, // Larger + to match Plus size={32}
    fontWeight: 'bold',
    lineHeight: 32,
  },
});