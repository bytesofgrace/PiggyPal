// src/screens/ExpenseScreen.js
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../config/firebase';
import { colors } from '../utils/colors';

export default function ExpenseScreen() {
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('spending'); // 'spending' or 'saving'

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesList = [];
      snapshot.forEach((doc) => {
        expensesList.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date, newest first
      expensesList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(expensesList);
    });

    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setType('spending');
    setModalVisible(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setType(expense.type);
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
      if (editingExpense) {
        // Update existing expense
        await updateDoc(doc(db, 'expenses', editingExpense.id), {
          title,
          amount: numAmount,
          type,
        });
        Alert.alert('Success! 🎉', 'Updated successfully!');
      } else {
        // Add new expense
        await addDoc(collection(db, 'expenses'), {
          userId: auth.currentUser.uid,
          title,
          amount: numAmount,
          type,
          date: new Date().toISOString(),
        });
        Alert.alert('Success! 🎉', `${type === 'saving' ? 'Saving' : 'Spending'} added!`);
      }
      setModalVisible(false);
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
              await deleteDoc(doc(db, 'expenses', expense.id));
              Alert.alert('Deleted! ✅', 'Item removed successfully!');
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
          <Text style={styles.expenseType}>
            {item.type === 'saving' ? '💰 Saving' : '💸 Spending'}
          </Text>
        </View>
      </View>
      <View style={styles.expenseActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Money Tracker 💰</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🐷</Text>
          <Text style={styles.emptyText}>No entries yet!</Text>
          <Text style={styles.emptySubtext}>Tap "+ Add New" to get started</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
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
  },
  expenseAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  expenseType: {
    fontSize: 12,
    color: colors.textLight,
  },
  expenseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
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
});