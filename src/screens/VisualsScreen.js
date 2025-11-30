// src/screens/VisualsScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import achievementService from '../utils/achievementService';
import { colors, motivationalMessages } from '../utils/colors';
import syncService from '../utils/syncService';

const screenWidth = Dimensions.get('window').width;

export default function VisualsScreen({ navigation }) {
  const [totalSaving, setTotalSaving] = useState(0);
  const [totalSpending, setTotalSpending] = useState(0);
  const [motivation, setMotivation] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [allExpenses, setAllExpenses] = useState([]);
  
  // Goal-related state
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [tempGoalAmount, setTempGoalAmount] = useState('');
  const [tempGoalPeriod, setTempGoalPeriod] = useState('weekly');
  const [currentGoalView, setCurrentGoalView] = useState(0); // 0 for weekly, 1 for monthly
  const goalScrollViewRef = useRef(null);
  
  // Navigation functions
  const goToPreviousMonth = () => {
    const prevMonth = new Date(selectedMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setSelectedMonth(prevMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setSelectedMonth(nextMonth);
  };

  const goToPreviousGoal = () => {
    if (weeklyGoal > 0 && monthlyGoal > 0) {
      const newView = currentGoalView === 0 ? 1 : 0;
      setCurrentGoalView(newView);
      goalScrollViewRef.current?.scrollTo({
        x: newView * (screenWidth - 40),
        animated: true,
      });
    }
  };

  const goToNextGoal = () => {
    if (weeklyGoal > 0 && monthlyGoal > 0) {
      const newView = currentGoalView === 1 ? 0 : 1;
      setCurrentGoalView(newView);
      goalScrollViewRef.current?.scrollTo({
        x: newView * (screenWidth - 40),
        animated: true,
      });
    }
  };



  useEffect(() => {
    loadExpenseData();
    loadGoalData();
    
    // Set random motivational message
    const randomMessage =
      motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setMotivation(randomMessage);
    
    // Add sync listener for when app comes back online
    const unsubscribe = syncService.addListener((event) => {
      if (event.type === 'network_change' && event.isOnline) {
        // When back online, try to sync settings from server (including goals)
        syncService.syncSettingsFromServer().then((result) => {
          if (result.success && result.data) {
            // Reload goals if server data was synced
            loadGoalData();
          }
        });
      }
      
      if (event.type === 'settings_synced') {
        // Settings were updated from server, reload goals
        loadGoalData();
      }
    });
    
    return unsubscribe;
  }, []);

  // Filter expenses when selected month changes
  useEffect(() => {
    if (allExpenses.length > 0) {
      filterExpensesByMonth(allExpenses, selectedMonth);
    }
  }, [selectedMonth, allExpenses]);

  // Refresh data when screen comes into focus (when user switches to this tab)
  useFocusEffect(
    useCallback(() => {
      loadExpenseData();
    }, [])
  );

  const loadExpenseData = async () => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) return;

      const expensesData = await AsyncStorage.getItem(`expenses_${user}`);
      if (expensesData) {
        const expenses = JSON.parse(expensesData);
        setAllExpenses(expenses);
        filterExpensesByMonth(expenses, selectedMonth);
      } else {
        // No expenses yet
        setAllExpenses([]);
        setTotalSaving(0);
        setTotalSpending(0);
      }
    } catch (error) {
      console.log('Error loading expense data:', error);
    }
  };

  const filterExpensesByMonth = (expenses, month) => {
    const filtered = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === month.getMonth() && 
             expenseDate.getFullYear() === month.getFullYear();
    });

    let savingSum = 0;
    let spendingSum = 0;

    filtered.forEach((expense) => {
      if (expense.type === 'saving') {
        savingSum += expense.amount;
      } else {
        spendingSum += expense.amount;
      }
    });

    setTotalSaving(savingSum);
    setTotalSpending(spendingSum);

    // Check and log goal achievements
    checkGoalAchievements(savingSum);
  };

  const checkGoalAchievements = async (currentSavings) => {
    try {
      const user = await AsyncStorage.getItem('currentUser');
      if (!user) return;

      // Check weekly goal
      if (weeklyGoal > 0) {
        await achievementService.checkAndLogGoalAchievement(
          'weekly',
          weeklyGoal,
          currentSavings,
          user
        );
      }

      // Check monthly goal
      if (monthlyGoal > 0) {
        await achievementService.checkAndLogGoalAchievement(
          'monthly',
          monthlyGoal,
          currentSavings,
          user
        );
      }
    } catch (error) {
      console.log('Error checking goal achievements:', error);
    }
  };

  const getYearlyData = () => {
    const year = selectedMonth.getFullYear();
    const monthlyData = {
      savings: new Array(12).fill(0),
      spending: new Array(12).fill(0)
    };

    allExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (expenseDate.getFullYear() === year) {
        const month = expenseDate.getMonth();
        if (expense.type === 'saving') {
          monthlyData.savings[month] += expense.amount;
        } else {
          monthlyData.spending[month] += expense.amount;
        }
      }
    });

    return monthlyData;
  };

  const pieData = [
    {
      name: 'Savings',
      amount: totalSaving,
      color: colors.saving,
      legendFontColor: colors.text,
      legendFontSize: 14,
    },
    {
      name: 'Spending',
      amount: totalSpending,
      color: colors.spending,
      legendFontColor: colors.text,
      legendFontSize: 14,
    },
  ];

  const yearlyData = getYearlyData();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Create completely minimal spacing approach
  const groupedLabels = [];
  const groupedData = [];
  const groupedColors = [];
  
  monthNames.forEach((month, index) => {
    // Use empty strings and the month name only once per pair
    groupedLabels.push(month, ''); // Month name for first bar, empty for second
    groupedData.push(yearlyData.savings[index], yearlyData.spending[index]);
    groupedColors.push(colors.saving, colors.spending);
  });
  
  const barData = {
    labels: groupedLabels,
    datasets: [
      {
        data: groupedData,
        colors: groupedColors.map(color => () => color),
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    color: (opacity = 1) => `rgba(165, 139, 250, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 2,
    useShadowColorFromDataset: false,
    fillShadowGradient: colors.primary,
    fillShadowGradientOpacity: 1,
  };

  const total = totalSaving + totalSpending;
  const savingsPercentage = total > 0 ? ((totalSaving / total) * 100).toFixed(1) : 0;

  // Goal-related functions
  const loadGoalData = async () => {
    try {
      const weeklyData = await AsyncStorage.getItem('piggypal_weekly_goal');
      const monthlyData = await AsyncStorage.getItem('piggypal_monthly_goal');
      
      if (weeklyData) {
        const parsed = JSON.parse(weeklyData);
        if (parsed && typeof parsed === 'number') {
          setWeeklyGoal(parsed);
        }
      }
      
      if (monthlyData) {
        const parsed = JSON.parse(monthlyData);
        if (parsed && typeof parsed === 'number') {
          setMonthlyGoal(parsed);
        }
      }
    } catch (error) {
      // Reset to defaults if any error
      setWeeklyGoal(0);
      setMonthlyGoal(0);
    }
  };

  const saveGoal = async () => {
    try {
      if (!tempGoalAmount || tempGoalAmount.trim() === '') {
        Alert.alert('Error', 'Please enter a goal amount.');
        return;
      }

      const amount = parseFloat(tempGoalAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount greater than 0.');
        return;
      }

      // Update local state
      if (tempGoalPeriod === 'weekly') {
        setWeeklyGoal(amount);
      } else {
        setMonthlyGoal(amount);
      }

      // Save and sync goal
      const result = await syncService.saveGoalSetting(tempGoalPeriod, amount);
      
      setGoalModalVisible(false);
      setTempGoalAmount('');
      
      if (result.success) {
        Alert.alert('Success! 🎉', `Your ${tempGoalPeriod} goal of $${amount} has been set!`);
      } else {
        Alert.alert('Goal Saved Locally! 🎯', `Your ${tempGoalPeriod} goal of $${amount} has been saved and will sync when you're back online.`);
      }
      
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    }
  };

  const openGoalModal = (editPeriod = null) => {
    if (editPeriod === 'weekly' && weeklyGoal > 0) {
      setTempGoalAmount(weeklyGoal.toString());
      setTempGoalPeriod('weekly');
    } else if (editPeriod === 'monthly' && monthlyGoal > 0) {
      setTempGoalAmount(monthlyGoal.toString());
      setTempGoalPeriod('monthly');
    } else {
      setTempGoalAmount('');
      setTempGoalPeriod('weekly');
    }
    setGoalModalVisible(true);
  };

  const getWeeklyProgress = () => {
    if (weeklyGoal <= 0) return { progress: 0, isComplete: false };
    const progress = Math.min((totalSaving / weeklyGoal) * 100, 100);
    const isComplete = totalSaving >= weeklyGoal;
    return { progress, isComplete };
  };

  const getMonthlyProgress = () => {
    if (monthlyGoal <= 0) return { progress: 0, isComplete: false };
    const progress = Math.min((totalSaving / monthlyGoal) * 100, 100);
    const isComplete = totalSaving >= monthlyGoal;
    return { progress, isComplete };
  };

  const getProgressEmoji = (progress) => {
    if (progress === 0) return '😴'; // No progress
    if (progress < 25) return '😞'; // Sad face
    if (progress < 50) return '😐'; // Neutral
    if (progress < 75) return '🙂'; // Slight smile
    if (progress < 100) return '😊'; // Happy
    return '🤩'; // Star eyes - complete!
  };

  const weeklyProgress = getWeeklyProgress();
  const monthlyProgress = getMonthlyProgress();

  return (
    <ScrollView style={styles.container}>
      {/* Month Selector at Top */}
      <View style={styles.monthSelector}>
        <Text style={styles.monthSelectorTitle}>📅 View Month:</Text>
        <View style={styles.monthButtons}>
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={goToPreviousMonth}
          >
            <Text style={styles.monthNavButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.selectedMonthContainer}>
            <Text style={styles.selectedMonthText}>
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={goToNextMonth}
          >
            <Text style={styles.monthNavButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Combined Goals and Progress Section */}
      <View style={styles.piggyBankContainer}>
        <Text style={styles.goalTitle}>Your Savings Goals</Text>
        <TouchableOpacity onPress={openGoalModal} style={styles.targetSection}>
          <Text style={styles.motivationEmoji}>🎯</Text>
          <Text style={styles.tapToEditHint}>Tap target to edit</Text>
        </TouchableOpacity>
        
        {weeklyGoal > 0 || monthlyGoal > 0 ? (
          <View>
            <ScrollView 
              ref={goalScrollViewRef}
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              style={styles.goalScrollView}
              onMomentumScrollEnd={(event) => {
                const page = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 40));
                setCurrentGoalView(page);
              }}
            >
              {/* Weekly Goal View */}
              {weeklyGoal > 0 && (
                <View style={[styles.goalView, { width: screenWidth - 40 }]}>
                  <Text style={styles.goalViewTitle}>📅 Weekly Goal</Text>
                  <View style={styles.piggyBankProgress}>
                    <Text style={styles.progressEmoji}>{getProgressEmoji(weeklyProgress.progress)}</Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${weeklyProgress.progress}%` },
                          weeklyProgress.isComplete && styles.progressComplete
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      ${totalSaving.toFixed(2)} out of ${weeklyGoal}
                    </Text>
                    <Text style={styles.progressSubtext}>
                      {weeklyProgress.isComplete 
                        ? `🎉 Weekly Goal Achieved!`
                        : `${weeklyProgress.progress.toFixed(0)}% Complete - Keep going!`
                      }
                    </Text>
                  </View>
                </View>
              )}

              {/* Monthly Goal View */}
              {monthlyGoal > 0 && (
                <View style={[styles.goalView, { width: screenWidth - 40 }]}>
                  <Text style={styles.goalViewTitle}>🗓️ Monthly Goal</Text>
                  <View style={styles.piggyBankProgress}>
                    <Text style={styles.progressEmoji}>{getProgressEmoji(monthlyProgress.progress)}</Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${monthlyProgress.progress}%` },
                          monthlyProgress.isComplete && styles.progressComplete
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      ${totalSaving.toFixed(2)} out of ${monthlyGoal}
                    </Text>
                    <Text style={styles.progressSubtext}>
                      {monthlyProgress.isComplete 
                        ? `🎉 Monthly Goal Achieved!`
                        : `${monthlyProgress.progress.toFixed(0)}% Complete - Keep going!`
                      }
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Page Dots - only show when both goals exist */}
            {weeklyGoal > 0 && monthlyGoal > 0 && (
              <View style={styles.pageIndicator}>
                <View style={[
                  styles.pageDot, 
                  currentGoalView === 0 && styles.activeDot
                ]} />
                <View style={[
                  styles.pageDot, 
                  currentGoalView === 1 && styles.activeDot
                ]} />
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity onPress={openGoalModal} style={styles.noGoalsPrompt}>
            <Text style={styles.motivationEmoji}>🎯</Text>
            <Text style={styles.motivationText}>Tap to set your savings goals!</Text>
          </TouchableOpacity>
        )}

        {/* View Achievements Button */}
        <TouchableOpacity 
          style={styles.achievementsButton}
          onPress={() => navigation.navigate('Achievements')}
        >
          <Text style={styles.achievementsButtonText}>🏆 View Achievement History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { backgroundColor: colors.saving }]}>
          <Text style={styles.summaryEmoji}>💰</Text>
          <Text style={styles.summaryLabel}>Month Savings</Text>
          <Text style={styles.summaryAmount}>${totalSaving.toFixed(2)}</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.spending }]}>
          <Text style={styles.summaryEmoji}>💸</Text>
          <Text style={styles.summaryLabel}>Month Spending</Text>
          <Text style={styles.summaryAmount}>${totalSpending.toFixed(2)}</Text>
        </View>
      </View>

      {total > 0 && (
        <>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Money Breakdown 📊</Text>
            <View style={styles.pieChartContainer}>
              <PieChart
                data={pieData}
                width={screenWidth - 60}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  propsForLabels: {
                    fontSize: 0, // Hide the amount labels on the chart
                  },
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
              />
            </View>
            
            {/* Savings Rate Section */}
            <View style={styles.savingsRateSection}>
              <Text style={styles.progressTitle}>Savings Rate</Text>
              <Text style={styles.progressPercentage}>{savingsPercentage}%</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${savingsPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {savingsPercentage > 50
                  ? 'Amazing! You\'re saving more than spending! 🌟'
                  : 'Keep going! Try to save a bit more! 💪'}
              </Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {selectedMonth.getFullYear()} Monthly Overview 📈
            </Text>
            <Text style={styles.chartSubtitle}>
              Swipe right to see more months →
            </Text>
            <ScrollView 
              horizontal={true} 
              showsHorizontalScrollIndicator={true}
              style={styles.chartScrollView}
            >
              <BarChart
                data={barData}
                width={screenWidth * 3.5}
                height={260}
                chartConfig={{
                  ...chartConfig,
                  barPercentage: 1.0,
                  categoryPercentage: 0.98,
                  decimalPlaces: 0,
                  propsForLabels: {
                    fontSize: 12,
                  },
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
                style={styles.barChart}
                fromZero
                showValuesOnTopOfBars={true}
                showLegend={false}
                withCustomBarColorFromData={true}
              />
            </ScrollView>
          </View>
        </>
      )}

      {total === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>No data yet!</Text>
          <Text style={styles.emptySubtext}>
            Add some savings or spending to see your charts
          </Text>
        </View>
      )}



      {/* Goal Setting Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={goalModalVisible}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              🎯 {(tempGoalPeriod === 'weekly' && weeklyGoal > 0) || (tempGoalPeriod === 'monthly' && monthlyGoal > 0) 
                ? 'Edit Your Savings Goal' 
                : 'Set Your Savings Goal'}
            </Text>
            
            <Text style={styles.modalLabel}>Goal Amount ($):</Text>
            <TextInput
              style={styles.modalInput}
              value={tempGoalAmount}
              onChangeText={setTempGoalAmount}
              placeholder="Enter amount (e.g., 500)"
              keyboardType="numeric"
            />
            
            <Text style={styles.modalLabel}>Goal Period:</Text>
            <View style={styles.periodButtons}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  tempGoalPeriod === 'weekly' && styles.periodButtonActive
                ]}
                onPress={() => setTempGoalPeriod('weekly')}
              >
                <Text style={[
                  styles.periodButtonText,
                  tempGoalPeriod === 'weekly' && styles.periodButtonTextActive
                ]}>
                  Weekly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  tempGoalPeriod === 'monthly' && styles.periodButtonActive
                ]}
                onPress={() => setTempGoalPeriod('monthly')}
              >
                <Text style={[
                  styles.periodButtonText,
                  tempGoalPeriod === 'monthly' && styles.periodButtonTextActive
                ]}>
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={saveGoal}
              >
                <Text style={styles.modalButtonSaveText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  motivationCard: {
    backgroundColor: colors.accent,
    margin: 20,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
    textAlign: 'center',
  },
  goalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  monthSelector: {
    backgroundColor: colors.white,
    margin: 20,
    marginTop: 15,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  monthButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  selectedMonthContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  selectedMonthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  progressCard: {
    backgroundColor: colors.white,
    margin: 20,
    marginTop: 0,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  savingsRateSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  progressPercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 15,
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: colors.white,
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  chartSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  chartScrollView: {
    flexDirection: 'row',
  },
  barChart: {
    borderRadius: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
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
  goalProgress: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  tapToEditHint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  goalProgressMain: {
    fontSize: 16,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  // Piggy Bank Progress Styles
  piggyBankContainer: {
    backgroundColor: colors.accent,
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  piggyBankTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  piggyBankProgress: {
    alignItems: 'center',
  },
  piggyBank: {
    alignItems: 'center',
    marginBottom: 15,
  },
  piggyBankEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  progressBar: {
    width: 200,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 2,
  },
  progressComplete: {
    backgroundColor: colors.success,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  progressNavButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNavButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },

  moneyCoins: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
  },
  coin: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  celebration: {
    fontSize: 24,
    marginLeft: 5,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  swipeHint: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  goalScrollView: {
    marginHorizontal: -20,
  },
  goalView: {
    paddingHorizontal: 20,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textLight,
    marginHorizontal: 4,
    opacity: 0.3,
  },
  activeDot: {
    backgroundColor: colors.primary,
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  goalViewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 15,
  },
  goalArrow: {
    fontSize: 18,
    color: colors.textLight,
    fontWeight: 'bold',
  },
  editHint: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  progressEmoji: {
    fontSize: 40,
    marginBottom: 5,
  },
  progressSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 5,
  },
  noGoalsPrompt: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  targetSection: {
    alignItems: 'center',
    marginVertical: 5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 30,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 25,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: colors.background,
  },
  periodButtons: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textLight,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#FF6B9D20',
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
  },
  periodButtonTextActive: {
    color: colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 25,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.textLight,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
  },
  modalButtonSave: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  achievementsButton: {
    backgroundColor: '#FFF8E1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: '#FFD54F',
  },
  achievementsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57F17',
  },
});