import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';
import { EngagementService } from '../services/engagement.service';

/**
 * Get user's engagement stats
 */
export const getUserEngagement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const engagement = await EngagementService.getUserEngagement(userId);
    const achievements = await EngagementService.getUserAchievements(userId);

    res.json({
      status: 'success',
      data: {
        engagement,
        achievements
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get leaderboard (top users by points)
 */
export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string);

    const topUsers = await prisma.userEngagement.findMany({
      take: limitNum,
      orderBy: {
        totalPoints: 'desc'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        leaderboard: topUsers.map((entry, index) => ({
          rank: index + 1,
          userId: entry.userId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          points: entry.totalPoints,
          currentStreak: entry.currentStreak
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available achievements
 */
export const getAllAchievements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const allAchievements = await prisma.achievement.findMany({
      orderBy: [
        { type: 'asc' },
        { requirement: 'asc' }
      ]
    });

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true }
    });

    const earnedIds = new Set(userAchievements.map(ua => ua.achievementId));

    const achievements = allAchievements.map(achievement => ({
      ...achievement,
      earned: earnedIds.has(achievement.id)
    }));

    res.json({
      status: 'success',
      data: { achievements }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Seed initial achievements
 */
export const seedAchievements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const achievements: Prisma.AchievementCreateInput[] = [
      // First login
      {
        type: 'FIRST_LOGIN',
        name: 'Welcome!',
        description: 'Log in to the patient portal for the first time',
        badgeIcon: '👋',
        points: 10,
        requirement: 1
      },
      // Profile complete
      {
        type: 'PROFILE_COMPLETE',
        name: 'All Set Up',
        description: 'Complete your profile information',
        badgeIcon: '✅',
        points: 25,
        requirement: 1
      },
      // Articles read
      {
        type: 'ARTICLES_READ',
        name: 'First Steps',
        description: 'Read your first educational article',
        badgeIcon: '📖',
        points: 10,
        requirement: 1
      },
      {
        type: 'ARTICLES_READ',
        name: 'Knowledge Seeker',
        description: 'Read 5 educational articles',
        badgeIcon: '📚',
        points: 50,
        requirement: 5
      },
      {
        type: 'ARTICLES_READ',
        name: 'Bookworm',
        description: 'Read 10 educational articles',
        badgeIcon: '🤓',
        points: 100,
        requirement: 10
      },
      {
        type: 'ARTICLES_READ',
        name: 'Scholar',
        description: 'Read 25 educational articles',
        badgeIcon: '🎓',
        points: 250,
        requirement: 25
      },
      {
        type: 'ARTICLES_READ',
        name: 'Expert',
        description: 'Read 50 educational articles',
        badgeIcon: '🏆',
        points: 500,
        requirement: 50
      },
      // Symptom tracking streaks
      {
        type: 'SYMPTOM_STREAK',
        name: 'Week Warrior',
        description: 'Log symptoms for 7 consecutive days',
        badgeIcon: '💪',
        points: 75,
        requirement: 7
      },
      {
        type: 'SYMPTOM_STREAK',
        name: 'Two Week Champion',
        description: 'Log symptoms for 14 consecutive days',
        badgeIcon: '🔥',
        points: 150,
        requirement: 14
      },
      {
        type: 'SYMPTOM_STREAK',
        name: 'Month Master',
        description: 'Log symptoms for 30 consecutive days',
        badgeIcon: '⭐',
        points: 300,
        requirement: 30
      },
      {
        type: 'SYMPTOM_STREAK',
        name: 'Streak Legend',
        description: 'Log symptoms for 60 consecutive days',
        badgeIcon: '🌟',
        points: 600,
        requirement: 60
      },
      {
        type: 'SYMPTOM_STREAK',
        name: 'Century Club',
        description: 'Log symptoms for 100 consecutive days',
        badgeIcon: '💯',
        points: 1000,
        requirement: 100
      },
      // Goals completed
      {
        type: 'GOAL_COMPLETED',
        name: 'Goal Getter',
        description: 'Complete your first goal',
        badgeIcon: '🎯',
        points: 100,
        requirement: 1
      },
      {
        type: 'GOAL_COMPLETED',
        name: 'Triple Threat',
        description: 'Complete 3 goals',
        badgeIcon: '🏅',
        points: 250,
        requirement: 3
      },
      {
        type: 'GOAL_COMPLETED',
        name: 'Milestone Maker',
        description: 'Complete 5 goals',
        badgeIcon: '🥇',
        points: 500,
        requirement: 5
      },
      {
        type: 'GOAL_COMPLETED',
        name: 'Achievement Unlocked',
        description: 'Complete 10 goals',
        badgeIcon: '👑',
        points: 1000,
        requirement: 10
      },
      // Community engagement
      {
        type: 'COMMUNITY_ENGAGEMENT',
        name: 'Breaking the Ice',
        description: 'Make your first community post',
        badgeIcon: '💬',
        points: 25,
        requirement: 1
      },
      {
        type: 'COMMUNITY_ENGAGEMENT',
        name: 'Community Helper',
        description: 'Make 10 community posts',
        badgeIcon: '🤝',
        points: 150,
        requirement: 10
      },
      {
        type: 'COMMUNITY_ENGAGEMENT',
        name: 'Support Star',
        description: 'Make 25 community posts',
        badgeIcon: '⭐',
        points: 350,
        requirement: 25
      },
      {
        type: 'COMMUNITY_ENGAGEMENT',
        name: 'Community Champion',
        description: 'Make 50 community posts',
        badgeIcon: '🏆',
        points: 750,
        requirement: 50
      },
      // Appointment attendance
      {
        type: 'APPOINTMENT_ATTENDED',
        name: 'On Time',
        description: 'Attend your first scheduled appointment',
        badgeIcon: '⏰',
        points: 50,
        requirement: 1
      }
    ];

    // Use upsert to avoid duplicates
    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: {
          type: achievement.type
        },
        update: achievement,
        create: achievement
      });
    }

    res.json({
      status: 'success',
      message: 'Achievements seeded successfully',
      data: {
        count: achievements.length
      }
    });
  } catch (error) {
    next(error);
  }
};
