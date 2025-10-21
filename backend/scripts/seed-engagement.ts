import { prisma } from '../src/utils/prisma';

async function seedEngagement() {
  console.log('🌱 Seeding engagement data...');

  try {
    // Seed achievements
    console.log('Creating achievements...');

    const achievements = [
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

    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: { type: achievement.type as any },
        update: achievement,
        create: achievement
      });
    }

    console.log(`✅ Created ${achievements.length} achievements`);

    // Seed forum categories
    console.log('Creating forum categories...');

    const forumCategories = [
      {
        name: 'Tinnitus Support',
        description: 'Share experiences and coping strategies for managing tinnitus',
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Hearing Loss',
        description: 'Discuss hearing loss challenges and solutions',
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Hyperacusis & Misophonia',
        description: 'Support for those with sound sensitivity conditions',
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'General Wellness',
        description: 'Overall health, lifestyle, and wellness discussions',
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'Success Stories',
        description: 'Share your journey and celebrate milestones',
        sortOrder: 5,
        isActive: true
      }
    ];

    for (const category of forumCategories) {
      const existing = await prisma.forumCategory.findFirst({
        where: { name: category.name }
      });

      if (!existing) {
        await prisma.forumCategory.create({
          data: category
        });
      } else {
        console.log(`ℹ️ Forum category "${category.name}" already exists, skipping...`);
      }
    }

    console.log(`✅ Forum categories ready`);

    console.log('✨ Engagement data seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding engagement data:', error);
    throw error;
  }
}

seedEngagement()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
