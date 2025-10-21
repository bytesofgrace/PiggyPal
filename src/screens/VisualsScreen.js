// src/screens/VisualsScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { colors, motivationalMessages } from '../utils/colors';

const screenWidth = Dimensions.get('window').width;

export default function VisualsScreen() {
  const [totalSaving, setTotalSaving] = useState(0);
  const [totalSpending, setTotalSpending] = useState(0);
  const [motivation, setMotivation] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [allExpenses, setAllExpenses] = useState([]);

  useEffect(() => {
    loadExpenseData();
    
    // Set random motivational message
    const randomMessage =
      motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setMotivation(randomMessage);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.motivationCard}>
        <Text style={styles.motivationEmoji}>✨</Text>
        <Text style={styles.motivationText}>{motivation}</Text>
      </View>

      <View style={styles.monthSelector}>
        <Text style={styles.monthSelectorTitle}>📅 View Month:</Text>
        <View style={styles.monthButtons}>
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={() => {
              const prevMonth = new Date(selectedMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setSelectedMonth(prevMonth);
            }}
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
            onPress={() => {
              const nextMonth = new Date(selectedMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setSelectedMonth(nextMonth);
            }}
          >
            <Text style={styles.monthNavButtonText}>→</Text>
          </TouchableOpacity>
        </View>
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
            <PieChart
              data={pieData}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
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
                    fontSize: 8,
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

      <View style={styles.progressCard}>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  monthSelector: {
    backgroundColor: colors.white,
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
});