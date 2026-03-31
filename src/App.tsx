import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  History, 
  TrendingUp, 
  Target, 
  Calendar, 
  Quote, 
  ChevronRight,
  Trash2,
  AlertCircle,
  CheckCircle2,
  LogIn,
  LogOut,
  User as UserIcon,
  Loader2,
  Trophy,
  MessageSquare,
  Award,
  Settings as SettingsIcon,
  Bell,
  Save,
  Zap,
  Activity,
  Clock
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  format, 
  addMonths, 
  differenceInDays, 
  parseISO, 
  eachDayOfInterval, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  isToday,
  addDays,
  subDays,
  startOfDay,
  isAfter,
  isBefore
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  serverTimestamp,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_SETTINGS, MOTIVATIONAL_QUOTES, MILESTONES, COACH_MESSAGES } from './constants';
import { SavingsEntry, SavingsStats, UserSettings } from './types';
import { cn, formatUGX } from './lib/utils';

// Error handling helper
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Settings View Component
const SettingsView = ({ settings, onSave }: { settings: UserSettings, onSave: (s: UserSettings) => void }) => {
  const [form, setForm] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-orange-500" />
          App Settings
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Savings Goal (UGX)</label>
              <input 
                type="number"
                value={form.goalAmount}
                onChange={(e) => setForm({ ...form, goalAmount: Number(e.target.value) })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deadline (Months)</label>
              <input 
                type="number"
                value={form.goalMonths}
                onChange={(e) => setForm({ ...form, goalMonths: Number(e.target.value) })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
            <input 
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="pt-6 border-t border-gray-50">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              Notifications
            </h4>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-700">Daily Reminders</span>
                <input 
                  type="checkbox"
                  checked={form.notifications?.dailyReminders ?? true}
                  onChange={(e) => setForm({ 
                    ...form, 
                    notifications: { ...(form.notifications || DEFAULT_SETTINGS.notifications), dailyReminders: e.target.checked } 
                  })}
                  className="w-5 h-5 accent-orange-500"
                />
              </label>
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-700">Milestone Alerts</span>
                <input 
                  type="checkbox"
                  checked={form.notifications?.milestoneAlerts ?? true}
                  onChange={(e) => setForm({ 
                    ...form, 
                    notifications: { ...(form.notifications || DEFAULT_SETTINGS.notifications), milestoneAlerts: e.target.checked } 
                  })}
                  className="w-5 h-5 accent-orange-500"
                />
              </label>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#1A1A1A] hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Settings
          </button>
        </form>
      </div>

      <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
        <p className="text-xs text-orange-800 leading-relaxed">
          <strong>Note:</strong> Changing your goal or deadline will immediately update your daily targets and progress analysis on the dashboard.
        </p>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [amountInput, setAmountInput] = useState('');
  const [currentQuote, setCurrentQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [showQuote, setShowQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        setEntries([]);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Firestore sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'entries'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavingsEntry[];
      setEntries(newEntries);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'entries');
      setIsLoading(false);
    });

    return unsubscribe;
  }, [isAuthReady, user]);

  // Settings sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const settingsRef = doc(db, 'settings', user.uid);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as UserSettings);
      } else {
        // Initialize settings if they don't exist
        setDoc(settingsRef, DEFAULT_SETTINGS).catch(err => 
          handleFirestoreError(err, OperationType.WRITE, `settings/${user.uid}`)
        );
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `settings/${user.uid}`);
    });

    return unsubscribe;
  }, [isAuthReady, user]);

  const stats = useMemo((): SavingsStats => {
    const { goalAmount, goalMonths, startDate } = settings;
    const start = parseISO(startDate);
    
    const totalSaved = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const remaining = Math.max(0, goalAmount - totalSaved);
    const percentage = Math.min(100, (totalSaved / goalAmount) * 100);
    
    const endDate = addMonths(start, goalMonths);
    const today = new Date();
    const daysRemaining = Math.max(0, differenceInDays(endDate, today));
    const totalDays = differenceInDays(endDate, start);
    const daysPassed = Math.max(0, differenceInDays(today, start));

    const requiredDaily = daysRemaining > 0 ? remaining / daysRemaining : 0;
    
    const idealDailyRate = goalAmount / totalDays;
    const idealProgress = idealDailyRate * daysPassed;
    const variance = totalSaved - idealProgress;
    const isAhead = variance >= 0;

    // Advanced Metrics
    const effectiveDaysPassed = Math.max(1, daysPassed);
    const averageDailySavings = totalSaved / effectiveDaysPassed;
    
    let predictedCompletionDate: string | null = null;
    if (averageDailySavings > 0) {
      const daysToFinish = remaining / averageDailySavings;
      predictedCompletionDate = addDays(today, daysToFinish).toISOString();
    }

    // Streak calculation
    const entryDates = new Set(entries.map(e => format(parseISO(e.date), 'yyyy-MM-dd')));
    let streak = 0;
    let checkDate = today;
    
    // Check if saved today or yesterday to continue streak
    if (!entryDates.has(format(today, 'yyyy-MM-dd'))) {
      checkDate = subDays(today, 1);
    }

    while (entryDates.has(format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }

    // Discipline Score
    const frequencyScore = (entryDates.size / effectiveDaysPassed) * 40;
    const streakScore = Math.min(30, (streak / 10) * 30);
    const progressScore = Math.min(30, (totalSaved / Math.max(1, idealProgress)) * 30);
    const disciplineScore = Math.round(frequencyScore + streakScore + progressScore);

    // Smart Recommendation
    const recommendedToday = isAhead ? requiredDaily : requiredDaily + (Math.abs(variance) / Math.max(1, daysRemaining));

    // Dynamic milestones based on goal
    const dynamicMilestones = [
      { id: 'starter', amount: goalAmount * 0.0125 }, // 100k of 8M
      { id: 'bronze', amount: goalAmount * 0.0625 }, // 500k of 8M
      { id: 'silver', amount: goalAmount * 0.125 },  // 1M of 8M
      { id: 'gold', amount: goalAmount * 0.5 },    // 4M of 8M
      { id: 'diamond', amount: goalAmount }        // 8M of 8M
    ];

    const unlockedMilestones = dynamicMilestones.filter(m => totalSaved >= m.amount).map(m => m.id);

    return {
      totalSaved,
      remaining,
      percentage,
      daysRemaining,
      requiredDaily,
      isAhead,
      variance,
      unlockedMilestones,
      averageDailySavings,
      predictedCompletionDate,
      disciplineScore,
      streak,
      recommendedToday
    };
  }, [entries, settings]);

  const chartData = useMemo(() => {
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningTotal = 0;
    return sortedEntries.map(entry => {
      runningTotal += entry.amount;
      return {
        date: format(parseISO(entry.date), 'MMM dd'),
        fullDate: format(parseISO(entry.date), 'MMMM dd, yyyy'),
        amount: entry.amount,
        total: runningTotal
      };
    });
  }, [entries]);

  const dailyTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(dateStr => {
      const dayEntries = entries.filter(e => format(parseISO(e.date), 'yyyy-MM-dd') === dateStr);
      const total = dayEntries.reduce((sum, e) => sum + e.amount, 0);
      return {
        date: format(parseISO(dateStr), 'MMM dd'),
        amount: total
      };
    });
  }, [entries]);

  const weeklyTrendData = useMemo(() => {
    const last4Weeks = Array.from({ length: 4 }).map((_, i) => {
      const date = subDays(new Date(), i * 7);
      return format(date, 'yyyy-MM-dd');
    }).reverse();

    return last4Weeks.map((dateStr, i) => {
      const weekStart = subDays(parseISO(dateStr), 6);
      const weekEnd = parseISO(dateStr);
      const weekEntries = entries.filter(e => {
        const d = parseISO(e.date);
        return d >= weekStart && d <= weekEnd;
      });
      const total = weekEntries.reduce((sum, e) => sum + e.amount, 0);
      return {
        week: `Week ${i + 1}`,
        amount: total
      };
    });
  }, [entries]);

  const coachMessage = useMemo(() => {
    if (stats.predictedCompletionDate) {
      const { goalMonths, startDate } = settings;
      const deadline = addMonths(parseISO(startDate), goalMonths);
      const predicted = parseISO(stats.predictedCompletionDate);
      
      if (isAfter(predicted, deadline)) {
        return "Warning: At your current saving rate, you will miss your deadline. Consider increasing your daily savings to stay on track.";
      }
    }

    const category = stats.isAhead ? 'ahead' : (stats.variance < -100000 ? 'behind' : 'neutral');
    const messages = COACH_MESSAGES[category as keyof typeof COACH_MESSAGES];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [stats.isAhead, stats.variance, stats.predictedCompletionDate, settings]);

  const calendarDays = useMemo(() => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayEntries = entries.filter(e => isSameDay(parseISO(e.date), day));
      const totalForDay = dayEntries.reduce((sum, e) => sum + e.amount, 0);
      return {
        date: day,
        hasSaved: dayEntries.length > 0,
        amount: totalForDay,
        isToday: isToday(day)
      };
    });
  }, [entries]);

  const [selectedDay, setSelectedDay] = useState<{date: Date, amount: number} | null>(null);
  const [lastSavedAmount, setLastSavedAmount] = useState(0);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
      setError("Failed to sign in with Google.");
    }
  };

  const handleLogout = () => signOut(auth);

  const handleAddSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const path = 'entries';
      await addDoc(collection(db, path), {
        uid: user.uid,
        amount,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      setAmountInput('');
      setLastSavedAmount(amount);
      const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setCurrentQuote(randomQuote);
      setShowQuote(true);
      setTimeout(() => setShowQuote(false), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'entries');
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'entries', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `entries/${id}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center"
        >
          <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-orange-200">
            <TrendingUp className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-4">8M Challenge</h1>
          <p className="text-gray-500 mb-10 leading-relaxed">
            Sign in to track your savings progress and sync your data across all your devices.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#1A1A1A] hover:bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">8M Challenge</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'dashboard' ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'settings' ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Settings
              </button>
            </nav>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500">
                <img src={user.photoURL || ''} className="w-6 h-6 rounded-full" alt="" />
                <span>{user.displayName}</span>
              </div>
              <button 
                onClick={() => setActiveTab(activeTab === 'dashboard' ? 'settings' : 'dashboard')}
                className="md:hidden p-2 text-gray-400 hover:text-orange-500 transition-colors"
              >
                {activeTab === 'dashboard' ? <SettingsIcon className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {activeTab === 'dashboard' ? (
          <>
            {/* Hero Stats */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Saved</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <h2 className="text-5xl font-black tracking-tighter">{formatUGX(stats.totalSaved)}</h2>
                        <span className="text-orange-500 font-bold">/ {formatUGX(settings.goalAmount)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-orange-500 font-bold text-sm uppercase tracking-widest">
                        <Zap className="w-4 h-4" />
                        Streak: {stats.streak} Days
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-blue-500 font-bold text-sm uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Discipline: {stats.disciplineScore}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span>Progress</span>
                      <span>{stats.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-orange-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                      />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50" />
              </div>

          <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Remaining</span>
              <h3 className="text-3xl font-bold mt-2">{formatUGX(stats.remaining)}</h3>
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Time Left</p>
                  <p className="font-semibold">{stats.daysRemaining} Days</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Daily Target</p>
                  <p className="font-semibold">{formatUGX(stats.requiredDaily)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Status & Input */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                Add Savings
              </h3>
              <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Rec: {formatUGX(stats.recommendedToday)}
              </div>
            </div>
            <form onSubmit={handleAddSavings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Amount (UGX)</label>
                <input 
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-lg font-semibold focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
              >
                Record Savings
              </button>
            </form>
          </div>

          <div className={cn(
            "rounded-3xl p-8 shadow-sm border flex flex-col justify-center items-center text-center",
            stats.isAhead ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
          )}>
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4",
              stats.isAhead ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}>
              {stats.isAhead ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {stats.isAhead ? "Ahead of Schedule!" : "Behind Schedule"}
            </h3>
            <p className="text-sm text-gray-600 max-w-[240px]">
              {stats.isAhead 
                ? `You are ${formatUGX(stats.variance)} ahead of your ideal progress. Keep it up!`
                : `You are ${formatUGX(Math.abs(stats.variance))} behind. Try to save a bit more this week.`
              }
            </p>
          </div>
        </section>

        {/* Motivational Quote Toast */}
        <AnimatePresence>
          {showQuote && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50"
            >
            <div className="bg-[#1A1A1A] text-white p-6 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-4">
              <div className="flex gap-4 items-start">
                <Quote className="w-8 h-8 text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium leading-relaxed italic">"{currentQuote}"</p>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Daily Motivation</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400">
                  You just got <span className="text-orange-400 font-bold">{formatUGX(lastSavedAmount)}</span> closer to your 8M goal!
                </p>
                <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500" 
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Coach & Milestones */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold">Smart Savings Coach</h3>
            </div>
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
              <p className="text-blue-900 font-medium leading-relaxed">
                {coachMessage}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                    <Target className="w-3 h-3" />
                    Recommended Today
                  </div>
                  <p className="text-lg font-black text-blue-600">{formatUGX(stats.recommendedToday)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Required Daily
                  </div>
                  <p className="text-lg font-black text-gray-900">{formatUGX(stats.requiredDaily)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold">Milestones</h3>
            </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'starter', icon: '🌱', label: 'Starter', amount: settings.goalAmount * 0.0125 },
                    { id: 'bronze', icon: '🥉', label: 'Bronze', amount: settings.goalAmount * 0.0625 },
                    { id: 'silver', icon: '🥈', label: 'Silver', amount: settings.goalAmount * 0.125 },
                    { id: 'gold', icon: '🥇', label: 'Gold', amount: settings.goalAmount * 0.5 },
                    { id: 'diamond', icon: '💎', label: 'Diamond', amount: settings.goalAmount }
                  ].map((m) => {
                    const isUnlocked = stats.unlockedMilestones.includes(m.id);
                    return (
                      <div 
                        key={m.id}
                        className={cn(
                          "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                          isUnlocked ? "bg-purple-100 text-purple-600 scale-105 shadow-sm" : "bg-gray-50 text-gray-300 grayscale opacity-50"
                        )}
                        title={`${m.label}: ${formatUGX(m.amount)}`}
                      >
                        <span className="text-xl">{m.icon}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-gray-400 text-center">
                  {stats.unlockedMilestones.length} of 5 badges earned
                </p>
              </div>
            </section>

        {/* Discipline & Streak */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin-slow flex items-center justify-center relative">
              <span className="text-xl font-black text-blue-600">{stats.disciplineScore}</span>
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 -z-10" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Discipline Score</h4>
              <p className="text-xs text-gray-500 mt-1">Based on consistency and progress</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{stats.streak} Day Streak</h4>
              <p className="text-xs text-gray-500 mt-1">Keep saving daily to grow your streak!</p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-3xl p-8 shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h4 className="font-bold text-white">Prediction</h4>
              <p className="text-xs text-gray-400 mt-1">
                {stats.predictedCompletionDate 
                  ? `Finish by ${format(parseISO(stats.predictedCompletionDate), 'MMM dd, yyyy')}`
                  : 'More data needed'}
              </p>
            </div>
          </div>
        </section>

        {/* Advanced Analytics */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                Daily Trend (Last 7 Days)
              </h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: '#F8F9FA' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1A1A] text-white p-3 rounded-xl shadow-xl text-xs">
                            <p className="font-bold">{payload[0].payload.date}</p>
                            <p className="text-orange-400">{formatUGX(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {dailyTrendData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#f97316' : '#E2E8F0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Weekly Performance
              </h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrendData}>
                  <defs>
                    <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1A1A1A] text-white p-3 rounded-xl shadow-xl text-xs">
                            <p className="font-bold">{payload[0].payload.week}</p>
                            <p className="text-blue-400">{formatUGX(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorWeekly)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Calendar & Chart */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                Savings Calendar
              </h3>
              <span className="text-xs font-bold text-gray-400 uppercase">{format(new Date(), 'MMMM')}</span>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-gray-300 py-1">{d}</div>
              ))}
              {/* Padding for start of month */}
              {Array.from({ length: startOfMonth(new Date()).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {calendarDays.map((day) => (
                <button
                  key={day.date.toISOString()}
                  onClick={() => setSelectedDay({ date: day.date, amount: day.amount })}
                  className={cn(
                    "aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-all relative",
                    day.hasSaved ? "bg-green-500 text-white shadow-sm shadow-green-200" : "bg-gray-50 text-gray-400 hover:bg-gray-100",
                    day.isToday && !day.hasSaved && "ring-2 ring-orange-500 ring-offset-2"
                  )}
                >
                  {format(day.date, 'd')}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {selectedDay && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(selectedDay.date, 'MMMM dd, yyyy')}</p>
                      <p className="text-lg font-bold">{formatUGX(selectedDay.amount)}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedDay(null)}
                      className="text-xs font-bold text-gray-400 hover:text-[#1A1A1A]"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Savings Growth
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94A3B8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94A3B8' }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{data.fullDate}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-8">
                                <span className="text-xs text-gray-500">Saved:</span>
                                <span className="text-xs font-bold text-orange-500">{formatUGX(data.amount)}</span>
                              </div>
                              <div className="flex justify-between gap-8">
                                <span className="text-xs text-gray-500">Total:</span>
                                <span className="text-xs font-bold text-[#1A1A1A]">{formatUGX(data.total)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* History */}
        <section className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" />
              Recent Entries
            </h3>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-gray-400 italic">
                        No savings recorded yet. Start today!
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-8 py-4">
                          <div className="font-medium">{format(parseISO(entry.date), 'MMM dd, yyyy')}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{format(parseISO(entry.date), 'hh:mm a')}</div>
                        </td>
                        <td className="px-8 py-4 font-bold text-orange-600">
                          {formatUGX(entry.amount)}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button 
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
          </>
        ) : (
          <SettingsView 
            settings={settings} 
            onSave={async (newSettings) => {
              try {
                await setDoc(doc(db, 'settings', user.uid), {
                  ...newSettings,
                  updatedAt: serverTimestamp()
                });
                setActiveTab('dashboard');
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `settings/${user.uid}`);
              }
            }} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-gray-400">
          "The best time to plant a tree was 20 years ago. The second best time is now."
        </p>
      </footer>
    </div>
  );
}
