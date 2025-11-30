// src/screens/AchievementsScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
    Alert,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import achievementService from '../utils/achievementService';
import { colors } from '../utils/colors';

export default function AchievementsScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [stats, setStats] = useState({ total: 0, weekly: 0, monthly: 0, totalSaved: 0 });
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadAchievements();
    }, [])
  );

  const groupAchievementsByTimeline = (achievements) => {
    const now = new Date();
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      lastWeek: [],
      thisMonth: [],
      earlier: []
    };

    // Helper to get a date with time cleared (local date only)
    const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // Robust parser for achievedAt values stored as ISO string, numeric string, or ms number
    const parseDate = (value) => {
      if (!value) return new Date(0);
      if (typeof value === 'number') return new Date(value);
      if (typeof value === 'string') {
        // numeric string (ms or seconds)
        if (/^\d+$/.test(value)) {
          const asNum = Number(value);
          // if it's a seconds timestamp (10 digits), convert to ms
          return value.length === 10 ? new Date(asNum * 1000) : new Date(asNum);
        }
        return new Date(value);
      }
      return new Date(value);
    };

    achievements.forEach(achievement => {
      const date = parseDate(achievement.achievedAt || achievement.achievedAtMs);
      // Compute difference in whole local days between now and the achievement date
      const diffDays = Math.floor((stripTime(now) - stripTime(date)) / (1000 * 60 * 60 * 24));

      // Get week numbers for comparison
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      currentWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(currentWeekStart.getDate() - 7);

      const achievementDate = stripTime(date);

      if (diffDays === 0) {
        groups.today.push(achievement);
      } else if (diffDays === 1) {
        groups.yesterday.push(achievement);
      } else if (achievementDate >= currentWeekStart) {
        groups.thisWeek.push(achievement);
      } else if (achievementDate >= lastWeekStart && achievementDate < currentWeekStart) {
        groups.lastWeek.push(achievement);
      } else if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        groups.thisMonth.push(achievement);
      } else {
        groups.earlier.push(achievement);
      }
    });

    const sections = [];
    if (groups.today.length > 0) {
      sections.push({ title: '📅 TODAY', data: groups.today });
    }
    if (groups.yesterday.length > 0) {
      sections.push({ title: '📅 YESTERDAY', data: groups.yesterday });
    }
    if (groups.thisWeek.length > 0) {
      sections.push({ title: '📅 THIS WEEK', data: groups.thisWeek });
    }
    if (groups.lastWeek.length > 0) {
      sections.push({ title: '📅 LAST WEEK', data: groups.lastWeek });
    }
    if (groups.thisMonth.length > 0) {
      sections.push({ title: '📅 THIS MONTH', data: groups.thisMonth });
    }
    if (groups.earlier.length > 0) {
      sections.push({ title: '📅 EARLIER', data: groups.earlier });
    }

    return sections;
  };

  const loadAchievements = async () => {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      setUser(currentUser);
      
      if (currentUser) {
        const achievementList = await achievementService.getAchievements(currentUser);
        const statistics = await achievementService.getAchievementStats(currentUser);
        // DEBUG: log raw achievement timestamps and parsed local dates to help debug date grouping
        try {
          const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const parseDate = (value) => {
            if (!value) return new Date(0);
            if (typeof value === 'number') return new Date(value);
            if (typeof value === 'string') {
              if (/^\d+$/.test(value)) {
                return value.length === 10 ? new Date(Number(value) * 1000) : new Date(Number(value));
              }
              return new Date(value);
            }
            return new Date(value);
          };

          console.log('--- Achievements DEBUG DUMP ---');
          achievementList.forEach((a, idx) => {
            const raw = { achievedAt: a.achievedAt, achievedAtMs: a.achievedAtMs };
            const parsed = parseDate(a.achievedAtMs || a.achievedAt);
            const localDate = parsed.toLocaleString();
            const diffDays = Math.floor((stripTime(new Date()) - stripTime(parsed)) / (1000 * 60 * 60 * 24));
            console.log(`[#${idx}] id=${a.id} amount=$${a.actualAmount} raw=${JSON.stringify(raw)} parsed=${parsed.toISOString()} local=${localDate} diffDays=${diffDays}`);
          });
          console.log('--- End Achievements DEBUG DUMP ---');
        } catch (e) {
          console.warn('Debug dump failed', e);
        }
        
        const groupedSections = groupAchievementsByTimeline(achievementList);
        setSections(groupedSections);
        setStats(statistics);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const handleDeleteOld = () => {
    Alert.alert(
      '🗑️ Delete Old Achievements?',
      'Choose how far back to keep your achievement history:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '30 Days',
          onPress: () => deleteOldAchievements('30')
        },
        {
          text: '90 Days',
          onPress: () => deleteOldAchievements('90')
        },
        {
          text: '6 Months',
          onPress: () => deleteOldAchievements('180')
        }
      ]
    );
  };

  const deleteOldAchievements = async (days) => {
    const result = await achievementService.deleteOldAchievements(user, days);
    if (result.success) {
      await loadAchievements();
      Alert.alert(
        '✅ Cleaned Up!',
        `Deleted ${result.deletedCount} old achievement${result.deletedCount !== 1 ? 's' : ''}.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to delete achievements.');
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      '🗑️ Delete All Achievements?',
      'This will permanently delete your entire achievement history. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            const result = await achievementService.deleteAllAchievements(user);
            if (result.success) {
              await loadAchievements();
              Alert.alert('✅ Deleted!', 'All achievements have been cleared.');
            } else {
              Alert.alert('Error', 'Failed to delete achievements.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    // Use local-date based day difference to match grouping logic
    const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((stripTime(now) - stripTime(date)) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const renderAchievement = ({ item }) => (
    <View style={styles.achievementCard}>
      <View style={styles.achievementIcon}>
        <Text style={styles.trophy}>🏆</Text>
      </View>
      <View style={styles.achievementContent}>
        <Text style={styles.achievementTitle}>
          {item.type === 'weekly' ? '📅 Weekly' : '📆 Monthly'} Goal Achieved!
        </Text>
        <Text style={styles.achievementAmount}>
          Saved ${item.actualAmount.toFixed(2)} (Goal: ${item.goalAmount.toFixed(2)})
        </Text>
        <Text style={styles.achievementDate}>{formatDate(item.achievedAt)}</Text>
      </View>
      <View style={styles.achievementBadge}>
        <Text style={styles.badgeText}>✓</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Achievements</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Goals</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.weekly}</Text>
            <Text style={styles.statLabel}>Weekly</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.monthly}</Text>
            <Text style={styles.statLabel}>Monthly</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>${stats.totalSaved.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {sections.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleDeleteOld}>
            <Text style={styles.actionButtonText}>🗑️ Delete Old</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonDanger]} 
            onPress={handleDeleteAll}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
              Delete All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Achievements List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyText}>No achievements yet!</Text>
          <Text style={styles.emptySubtext}>
            Complete your weekly or monthly savings goals to earn achievements!
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderAchievement}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
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
    backgroundColor: colors.primary,
    paddingTop: 120,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.lightGray,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonDanger: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtonTextDanger: {
    color: '#C62828',
  },
  listContainer: {
    padding: 20,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  trophy: {
    fontSize: 28,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  achievementAmount: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  achievementBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 0.5,
  },
});