// src/screens/VisualsScreen.js
import {
    collection,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { auth, db } from '../config/firebase';
import { colors, motivationalMessages } from '../utils/colors';

const screenWidth = Dimensions.get('window').width;

export default function VisualsScreen() {
  const [totalSaving, setTotalSaving] = useState(0);
  const [totalSpending, setTotalSpending] = useState(0);
  const [motivation, setMotivation] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let savingSum = 0;
      let spendingSum = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'saving') {
          savingSum += data.amount;
        } else {
          spendingSum += data.amount;
        }
      });

      setTotalSaving(savingSum);
      setTotalSpending(spendingSum);
    });

    // Set random motivational message
    const randomMessage =
      motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setMotivation(randomMessage);

    return () => unsubscribe();
  }, []);

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

  const barData = {
    labels: ['Savings', 'Spending'],
    datasets: [
      {
        data: [totalSaving, totalSpending],
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
  };

  const total = totalSaving + totalSpending;
  const savingsPercentage = total > 0 ? ((totalSaving / total) * 100).toFixed(1) : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.motivationCard}>
        <Text style={styles.motivationEmoji}>✨</Text>
        <Text style={styles.motivationText}>{motivation}</Text>
      </View>

      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { backgroundColor: colors.saving }]}>
          <Text style={styles.summaryEmoji}>💰</Text>
          <Text style={styles.summaryLabel}>Total Savings</Text>
          <Text style={styles.summaryAmount}>${totalSaving.toFixed(2)}</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.spending }]}>
          <Text style={styles.summaryEmoji}>💸</Text>
          <Text style={styles.summaryLabel}>Total Spending</Text>
          <Text style={styles.summaryAmount}>${totalSpending.toFixed(2)}</Text>
        </View>
      </View>

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
            <Text style={styles.chartTitle}>Comparison Chart 📈</Text>
            <BarChart
              data={barData}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              style={styles.barChart}
              fromZero
              showValuesOnTopOfBars
            />
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
    marginBottom: 15,
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