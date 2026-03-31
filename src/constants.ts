import { Milestone, UserSettings } from './types';

export const DEFAULT_GOAL_AMOUNT = 8000000;
export const DEFAULT_GOAL_MONTHS = 9;
export const DEFAULT_START_DATE = '2026-03-31T00:00:00Z';

export const DEFAULT_SETTINGS: UserSettings = {
  goalAmount: DEFAULT_GOAL_AMOUNT,
  goalMonths: DEFAULT_GOAL_MONTHS,
  startDate: DEFAULT_START_DATE,
  notifications: {
    dailyReminders: true,
    milestoneAlerts: true
  }
};

export const MILESTONES: Milestone[] = [
  { id: 'starter', label: 'Starter', amount: 100000, icon: '🌱' },
  { id: 'bronze', label: 'Bronze', amount: 500000, icon: '🥉' },
  { id: 'silver', label: 'Silver', amount: 1000000, icon: '🥈' },
  { id: 'gold', label: 'Gold', amount: 4000000, icon: '🥇' },
  { id: 'diamond', label: 'Diamond', amount: 8000000, icon: '💎' },
];

export const MOTIVATIONAL_QUOTES = [
  "Small savings today build big wealth tomorrow.",
  "Discipline with money creates freedom.",
  "Every coin saved is a step toward your goal.",
  "Consistency is the key to financial success.",
  "Do not save what is left after spending, but spend what is left after saving.",
  "The goal isn't more money. The goal is living life on your terms.",
  "Wealth is the ability to fully experience life.",
  "A penny saved is a penny earned.",
  "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.",
  "The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order, trains to forethought, and so broadens the mind.",
  "Patience is a key element of success.",
  "Your future self will thank you for the sacrifices you make today."
];

export const COACH_MESSAGES = {
  ahead: [
    "You're crushing it! You're ahead of schedule. Consider putting this extra into a high-yield account.",
    "Excellent discipline. Being ahead gives you a safety buffer for rainy days.",
    "You're making great time. At this rate, you might hit your goal early!",
  ],
  behind: [
    "Don't get discouraged. Small adjustments this week can get you back on track.",
    "You're a bit behind, but the goal is still within reach. Can you find one small expense to cut today?",
    "Consistency over intensity. Even a small amount today helps bridge the gap.",
  ],
  neutral: [
    "You're exactly where you need to be. Keep this rhythm going!",
    "Steady as she goes. Your consistency is your greatest asset.",
  ]
};
