// src/utils/achievementService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

class AchievementService {
  // Save a goal achievement
  async logAchievement(type, goal, actualAmount, user) {
    try {
      const achievement = {
        id: Date.now().toString(),
        type, // 'weekly' or 'monthly'
        goalAmount: goal,
        actualAmount: actualAmount,
        achievedAt: new Date().toISOString(),
        userId: user
      };

      const existingData = await AsyncStorage.getItem(`achievements_${user}`);
      const achievements = existingData ? JSON.parse(existingData) : [];
      
      achievements.unshift(achievement); // Add to beginning
      await AsyncStorage.setItem(`achievements_${user}`, JSON.stringify(achievements));

      // Send celebration notification
      await this.sendAchievementNotification(type, goal, actualAmount);

      return { success: true, data: achievement };
    } catch (error) {
      console.error('Error logging achievement:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all achievements
  async getAchievements(user) {
    try {
      const data = await AsyncStorage.getItem(`achievements_${user}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  // Delete achievements older than specified days (user-controlled)
  async deleteOldAchievements(user, daysToKeep) {
    try {
      if (daysToKeep === 'never') return { success: true, deletedCount: 0 };

      const data = await AsyncStorage.getItem(`achievements_${user}`);
      if (!data) return { success: true, deletedCount: 0 };

      const achievements = JSON.parse(data);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysToKeep));

      const filtered = achievements.filter(a => {
        const achievedDate = new Date(a.achievedAt);
        return achievedDate >= cutoffDate;
      });

      const deletedCount = achievements.length - filtered.length;
      await AsyncStorage.setItem(`achievements_${user}`, JSON.stringify(filtered));

      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error deleting old achievements:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete ALL achievements (bulk delete)
  async deleteAllAchievements(user) {
    try {
      await AsyncStorage.setItem(`achievements_${user}`, JSON.stringify([]));
      return { success: true };
    } catch (error) {
      console.error('Error deleting all achievements:', error);
      return { success: false, error: error.message };
    }
  }

  // Get achievement statistics
  async getAchievementStats(user) {
    try {
      const achievements = await this.getAchievements(user);
      
      const weeklyCount = achievements.filter(a => a.type === 'weekly').length;
      const monthlyCount = achievements.filter(a => a.type === 'monthly').length;
      const totalSaved = achievements.reduce((sum, a) => sum + a.actualAmount, 0);

      return {
        total: achievements.length,
        weekly: weeklyCount,
        monthly: monthlyCount,
        totalSaved,
        latestAchievement: achievements[0] || null
      };
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      return { total: 0, weekly: 0, monthly: 0, totalSaved: 0, latestAchievement: null };
    }
  }

  // Send celebration notification
  async sendAchievementNotification(type, goal, actualAmount) {
    try {
      const messages = [
        `🎉 Amazing! You reached your ${type} savings goal!`,
        `🌟 Goal achieved! You saved $${actualAmount.toFixed(2)}!`,
        `🏆 Success! Your ${type} goal of $${goal.toFixed(2)} is complete!`,
        `💪 You did it! ${type} savings goal crushed!`,
        `🎊 Congratulations! Another goal achieved!`
      ];

      const message = messages[Math.floor(Math.random() * messages.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Goal Achieved!',
          body: message,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  // Get week number of year (ISO 8601 standard: Monday is first day of week)
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // Sunday = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Get month-year string for comparison (e.g., "2025-11")
  getMonthYear(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // Get week-year string for comparison (e.g., "2025-48")
  getWeekYear(date) {
    const weekNum = this.getWeekNumber(date);
    return `${date.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
  }

  // Check if goal is achieved and log it
  async checkAndLogGoalAchievement(type, goal, currentAmount, user) {
    try {
      if (currentAmount >= goal) {
        const achievements = await this.getAchievements(user);
        const now = new Date();
        
        if (type === 'weekly') {
          // Check if already logged this calendar week
          const currentWeek = this.getWeekYear(now);
          
          const alreadyLoggedThisWeek = achievements.some(a => {
            if (a.type !== 'weekly') return false;
            const achievedDate = new Date(a.achievedAt);
            const achievedWeek = this.getWeekYear(achievedDate);
            return achievedWeek === currentWeek;
          });

          if (!alreadyLoggedThisWeek) {
            console.log(`✅ Weekly goal achieved! Logging achievement for week ${currentWeek}`);
            return await this.logAchievement(type, goal, currentAmount, user);
          } else {
            console.log(`ℹ️ Weekly goal already logged for week ${currentWeek}`);
          }
        } else if (type === 'monthly') {
          // Check if already logged this calendar month
          const currentMonth = this.getMonthYear(now);
          
          const alreadyLoggedThisMonth = achievements.some(a => {
            if (a.type !== 'monthly') return false;
            const achievedDate = new Date(a.achievedAt);
            const achievedMonth = this.getMonthYear(achievedDate);
            return achievedMonth === currentMonth;
          });

          if (!alreadyLoggedThisMonth) {
            console.log(`✅ Monthly goal achieved! Logging achievement for month ${currentMonth}`);
            return await this.logAchievement(type, goal, currentAmount, user);
          } else {
            console.log(`ℹ️ Monthly goal already logged for month ${currentMonth}`);
          }
        }
      }
      return { success: false, message: 'Goal not achieved or already logged' };
    } catch (error) {
      console.error('Error checking goal achievement:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AchievementService();