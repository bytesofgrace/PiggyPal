// src/screens/ExpenseScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Platform,
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

  // No animation values needed

  useEffect(() => {
    loadCurrentUser();
    loadExpenses();
    
    // Set initial random motivational message
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setHeaderMessage(randomMessage);
  }, []);

  // Change message each time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      setHeaderMessage(randomMessage);
    }, [])
  );

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

  // No animation functions needed

  const openAddModal = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setType('spending');
    setSelectedDate(new Date());
    setModalVisible(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setType(expense.type);
    setSelectedDate(expense.date ? new Date(expense.date) : new Date());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title || !amount) {
      Alert.alert('Oops!', 'Please fill in all fields! 📝');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Oops!', 'Please enter a valid amount! 💵');
      return;
    }

    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) {
        Alert.alert('Error', 'User not found');
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
        
        // Clear form
        setTitle('');
        setAmount('');
        setType('spending');
        setEditingExpense(null);
        
      } else {
        Alert.alert('Error', `Failed to save: ${result.error}`);
      }
      
    } catch (error) {
      Alert.alert('Error', 'Something went wrong! 😅');
      console.error(error);
    }
  };

  const handleDelete = (expense) => {
    Alert.alert(
      'Delete? 🗑️',
      `Are you sure you want to delete "${expense.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await AsyncStorage.getItem('currentUser');
              if (!user) {
                Alert.alert('Error', 'User not found');
                return;
              }

              const result = await syncService.deleteExpense(expense.id, user);
              
              if (result.success) {
                setExpenses(result.data);
              } else {
                Alert.alert('Error', `Failed to delete: ${result.error}`);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete! 😅');
            }
          },
        },
      ]
    );
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
              style={styles.iconButton}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerMessage}</Text>
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
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingExpense ? '✏️ Edit Entry' : '➕ Add New Entry'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="What is it for? 📝"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textLight}
            />

            <TextInput
              style={styles.input}
              placeholder="Amount ($) 💵"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.typeLabel}>Date:</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                📅 {selectedDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
              />
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
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingExpense ? 'Update ✅' : 'Save ✅'}
                </Text>
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
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

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
    </View>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
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