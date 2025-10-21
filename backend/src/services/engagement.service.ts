import { prisma } from '../utils/prisma';

export class EngagementService {
  /**
   * Initialize engagement tracking for a new user
   */
  static async initializeUserEngagement(userId: string) {
    const existing = await prisma.userEngagement.findUnique({
      where: { userId }
    });

    if (!existing) {
      return await prisma.userEngagement.create({
        data: { userId }
      });
    }

    return existing;
  }

  /**
   * Update daily check-in streak
   */
  static async updateStreak(userId: string) {
    const engagement = await prisma.userEngagement.findUnique({
      where: { userId }
    });

    if (!engagement) {
      return await this.initializeUserEngagement(userId);
    }

    const now = new Date();
    const lastCheckIn = engagement.lastCheckIn;

    let newStreak = engagement.currentStreak;

    if (lastCheckIn) {
      const daysSinceLastCheckIn = Math.floor(
        (now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastCheckIn === 1) {
        // Consecutive day
        newStreak += 1;
      } else if (daysSinceLastCheckIn > 1) {
        // Streak broken
        newStreak = 1;
      }
      // Same day check-ins don't change streak
    } else {
      newStreak = 1;
    }

    const longestStreak = Math.max(engagement.longestStreak, newStreak);

    return await prisma.userEngagement.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastCheckIn: now
      }
    });
  }

  /**
   * Award points and check for new achievements
   */
  static async awardPoints(userId: string, points: number, reason: string) {
    const engagement = await prisma.userEngagement.update({
      where: { userId },
      data: {
        totalPoints: {
          increment: points
        }
      }
    });

    // Check for achievements based on total points
    await this.checkPointsAchievements(userId, engagement.totalPoints);

    return engagement;
  }

  /**
   * Increment article read count
   */
  static async incrementArticlesRead(userId: string) {
    const engagement = await prisma.userEngagement.update({
      where: { userId },
      data: {
        articlesRead: {
          increment: 1
        }
      }
    });

    await this.checkArticleAchievements(userId, engagement.articlesRead);
    await this.awardPoints(userId, 5, 'Article read');

    return engagement;
  }

  /**
   * Increment symptom logs count
   */
  static async incrementSymptomLogs(userId: string) {
    const engagement = await prisma.userEngagement.update({
      where: { userId },
      data: {
        symptomLogs: {
          increment: 1
        }
      }
    });

    await this.updateStreak(userId);
    await this.checkSymptomStreakAchievements(userId);
    await this.awardPoints(userId, 10, 'Symptom logged');

    return engagement;
  }

  /**
   * Increment goals completed count
   */
  static async incrementGoalsCompleted(userId: string) {
    const engagement = await prisma.userEngagement.update({
      where: { userId },
      data: {
        goalsCompleted: {
          increment: 1
        }
      }
    });

    await this.checkGoalAchievements(userId, engagement.goalsCompleted);
    await this.awardPoints(userId, 50, 'Goal completed');

    return engagement;
  }

  /**
   * Increment forum posts count
   */
  static async incrementForumPosts(userId: string) {
    const engagement = await prisma.userEngagement.update({
      where: { userId },
      data: {
        forumPosts: {
          increment: 1
        }
      }
    });

    await this.checkCommunityAchievements(userId, engagement.forumPosts);
    await this.awardPoints(userId, 15, 'Forum post created');

    return engagement;
  }

  /**
   * Check and award achievements based on articles read
   */
  private static async checkArticleAchievements(userId: string, articlesRead: number) {
    const thresholds = [1, 5, 10, 25, 50];

    for (const threshold of thresholds) {
      if (articlesRead === threshold) {
        await this.awardAchievement(userId, 'ARTICLES_READ', threshold);
      }
    }
  }

  /**
   * Check and award achievements based on symptom streak
   */
  private static async checkSymptomStreakAchievements(userId: string) {
    const engagement = await prisma.userEngagement.findUnique({
      where: { userId }
    });

    if (!engagement) return;

    const streakThresholds = [7, 14, 30, 60, 100];

    for (const threshold of streakThresholds) {
      if (engagement.currentStreak === threshold) {
        await this.awardAchievement(userId, 'SYMPTOM_STREAK', threshold);
      }
    }
  }

  /**
   * Check and award achievements based on goals completed
   */
  private static async checkGoalAchievements(userId: string, goalsCompleted: number) {
    const thresholds = [1, 3, 5, 10];

    for (const threshold of thresholds) {
      if (goalsCompleted === threshold) {
        await this.awardAchievement(userId, 'GOAL_COMPLETED', threshold);
      }
    }
  }

  /**
   * Check and award achievements based on community engagement
   */
  private static async checkCommunityAchievements(userId: string, forumPosts: number) {
    const thresholds = [1, 10, 25, 50];

    for (const threshold of thresholds) {
      if (forumPosts === threshold) {
        await this.awardAchievement(userId, 'COMMUNITY_ENGAGEMENT', threshold);
      }
    }
  }

  /**
   * Check and award achievements based on total points
   */
  private static async checkPointsAchievements(userId: string, totalPoints: number) {
    // You can define point-based achievements here
    // For now, this is a placeholder for future expansion
  }

  /**
   * Award an achievement to a user
   */
  private static async awardAchievement(
    userId: string,
    achievementType: string,
    requirement: number
  ) {
    // Find the achievement
    const achievement = await prisma.achievement.findFirst({
      where: {
        type: achievementType as any,
        requirement
      }
    });

    if (!achievement) return;

    // Check if user already has this achievement
    const existingAward = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    if (existingAward) return;

    // Award the achievement
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id
      }
    });

    // Award points for the achievement
    if (achievement.points > 0) {
      await prisma.userEngagement.update({
        where: { userId },
        data: {
          totalPoints: {
            increment: achievement.points
          }
        }
      });
    }
  }

  /**
   * Get user's engagement stats
   */
  static async getUserEngagement(userId: string) {
    const engagement = await prisma.userEngagement.findUnique({
      where: { userId }
    });

    if (!engagement) {
      return await this.initializeUserEngagement(userId);
    }

    return engagement;
  }

  /**
   * Get user's achievements
   */
  static async getUserAchievements(userId: string) {
    return await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true
      },
      orderBy: {
        earnedAt: 'desc'
      }
    });
  }
}
