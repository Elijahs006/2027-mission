export interface SavingsEntry {
  id: string;
  date: string;
  amount: number;
}

export interface Milestone {
  id: string;
  label: string;
  amount: number;
  icon: string;
}

export interface SavingsStats {
  totalSaved: number;
  remaining: number;
  percentage: number;
  daysRemaining: number;
  requiredDaily: number;
  isAhead: boolean;
  variance: number;
  unlockedMilestones: string[];
  averageDailySavings: number;
  predictedCompletionDate: string | null;
  disciplineScore: number;
  streak: number;
  recommendedToday: number;
}

export interface UserSettings {
  goalAmount: number;
  goalMonths: number;
  startDate: string;
  notifications: {
    dailyReminders: boolean;
    milestoneAlerts: boolean;
  };
}
