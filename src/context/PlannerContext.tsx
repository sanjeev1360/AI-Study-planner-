import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Subject,
  Topic,
  Assignment,
  StudySession,
  StudyPreferences,
  GeneratedPlanStats,
  SessionStatus,
  AssignmentStatus,
} from '../types';
import { StorageService } from '../lib/storage';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { ensureMySqlChecked, refreshMySqlStatus } from '../lib/mysqlApi';
import { generateStudyPlan, PlanGenerationOptions, rescheduleMissedSessions as rescheduleMissedSessionsEngine, PrioritizedItem } from '../lib/scheduler';

interface PlannerContextType {
  subjects: Subject[];
  topics: Topic[];
  assignments: Assignment[];
  sessions: StudySession[];
  preferences: StudyPreferences;
  isLoading: boolean;
  isSupabase: boolean;
  isMysql: boolean;

  // Subject operations
  addSubject: (subject: Omit<Subject, 'id' | 'user_id' | 'created_at'>) => Promise<Subject>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<Subject | null>;
  deleteSubject: (id: string) => Promise<void>;

  // Topic operations
  addTopic: (topic: Omit<Topic, 'id' | 'user_id' | 'created_at'>) => Promise<Topic>;
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<Topic | null>;
  deleteTopic: (id: string) => Promise<void>;
  toggleTopicCompletion: (id: string) => Promise<void>;

  // Assignment operations
  addAssignment: (assignment: Omit<Assignment, 'id' | 'user_id' | 'created_at'>) => Promise<Assignment>;
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<Assignment | null>;
  deleteAssignment: (id: string) => Promise<void>;
  setAssignmentStatus: (id: string, status: AssignmentStatus) => Promise<void>;

  // Session operations
  addSession: (session: Omit<StudySession, 'id' | 'user_id' | 'created_at'>) => Promise<StudySession>;
  updateSession: (id: string, updates: Partial<StudySession>) => Promise<StudySession | null>;
  deleteSession: (id: string) => Promise<void>;
  setSessionStatus: (id: string, status: SessionStatus) => Promise<void>;

  // Plan generation & Rescheduling
  generatePlanPreview: (options: PlanGenerationOptions) => {
    sessions: StudySession[];
    stats: GeneratedPlanStats;
    prioritizedItems: PrioritizedItem[];
  };
  commitGeneratedPlan: (newSessions: StudySession[], replaceFromDate?: string) => Promise<void>;
  rescheduleMissed: (fromDateStr?: string) => Promise<{ count: number }>;

  // Preferences
  updatePreferences: (updates: Partial<StudyPreferences>) => Promise<void>;

  // State utilities
  reloadAllData: () => Promise<void>;
  resetAllUserData: () => Promise<void>;
  seedDemoData: () => Promise<void>;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [preferences, setPreferences] = useState<StudyPreferences>({
    user_id: user?.id || 'guest',
    daily_study_hours: 4.0,
    preferred_start_time: '09:00',
    preferred_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    break_interval_minutes: 50,
    break_duration_minutes: 10,
    max_session_minutes: 60,
    include_assignments: true,
    prioritize_near_exams: true,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabase, setIsSupabase] = useState<boolean>(false);
  const [isMysql, setIsMysql] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    const mysqlActive = await ensureMySqlChecked();
    setIsMysql(mysqlActive);
    setIsSupabase(!mysqlActive && isSupabaseConfigured());

    if (!user) {
      setSubjects([]);
      setTopics([]);
      setAssignments([]);
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [subs, tops, asgs, sess, prefs] = await Promise.all([
        StorageService.getSubjects(user.id),
        StorageService.getTopics(user.id),
        StorageService.getAssignments(user.id),
        StorageService.getStudySessions(user.id),
        StorageService.getStudyPreferences(user.id),
      ]);

      setSubjects(subs);
      setTopics(tops);
      setAssignments(asgs);
      setSessions(sess);
      if (prefs) setPreferences(prefs);
    } catch (e) {
      console.error('Failed to load planner data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Subjects ---
  const addSubject = async (data: Omit<Subject, 'id' | 'user_id' | 'created_at'>): Promise<Subject> => {
    if (!user) throw new Error('User not logged in');
    const newSubject: Subject = {
      ...data,
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    const saved = await StorageService.saveSubject(user.id, newSubject);
    setSubjects((prev) => [saved, ...prev]);
    return saved;
  };

  const updateSubject = async (id: string, updates: Partial<Subject>): Promise<Subject | null> => {
    if (!user) return null;
    const existing = subjects.find((s) => s.id === id);
    if (!existing) return null;
    const updated: Subject = { ...existing, ...updates };
    await StorageService.saveSubject(user.id, updated);
    setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const deleteSubject = async (id: string): Promise<void> => {
    if (!user) return;
    await StorageService.deleteSubject(user.id, id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopics((prev) => prev.filter((t) => t.subject_id !== id));
    setAssignments((prev) => prev.filter((a) => a.subject_id !== id));
    setSessions((prev) => prev.filter((s) => s.subject_id !== id));
  };

  // --- Topics ---
  const addTopic = async (data: Omit<Topic, 'id' | 'user_id' | 'created_at'>): Promise<Topic> => {
    if (!user) throw new Error('User not logged in');
    const newTopic: Topic = {
      ...data,
      id: `top-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    const saved = await StorageService.saveTopic(user.id, newTopic);
    setTopics((prev) => [saved, ...prev]);
    return saved;
  };

  const updateTopic = async (id: string, updates: Partial<Topic>): Promise<Topic | null> => {
    if (!user) return null;
    const existing = topics.find((t) => t.id === id);
    if (!existing) return null;
    const updated: Topic = { ...existing, ...updates };
    await StorageService.saveTopic(user.id, updated);
    setTopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const deleteTopic = async (id: string): Promise<void> => {
    if (!user) return;
    await StorageService.deleteTopic(user.id, id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTopicCompletion = async (id: string): Promise<void> => {
    if (!user) return;
    const topic = topics.find((t) => t.id === id);
    if (!topic) return;
    const nextCompleted = !topic.is_completed;
    const updated: Topic = {
      ...topic,
      is_completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : undefined,
    };
    await StorageService.saveTopic(user.id, updated);
    setTopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // --- Assignments ---
  const addAssignment = async (data: Omit<Assignment, 'id' | 'user_id' | 'created_at'>): Promise<Assignment> => {
    if (!user) throw new Error('User not logged in');
    const newAsg: Assignment = {
      ...data,
      id: `asg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    const saved = await StorageService.saveAssignment(user.id, newAsg);
    setAssignments((prev) => [...prev, saved]);
    return saved;
  };

  const updateAssignment = async (id: string, updates: Partial<Assignment>): Promise<Assignment | null> => {
    if (!user) return null;
    const existing = assignments.find((a) => a.id === id);
    if (!existing) return null;
    const updated: Assignment = { ...existing, ...updates };
    await StorageService.saveAssignment(user.id, updated);
    setAssignments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  };

  const deleteAssignment = async (id: string): Promise<void> => {
    if (!user) return;
    await StorageService.deleteAssignment(user.id, id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const setAssignmentStatus = async (id: string, status: AssignmentStatus): Promise<void> => {
    if (!user) return;
    const asg = assignments.find((a) => a.id === id);
    if (!asg) return;
    const updated: Assignment = { ...asg, status };
    await StorageService.saveAssignment(user.id, updated);
    setAssignments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  // --- Sessions ---
  const addSession = async (data: Omit<StudySession, 'id' | 'user_id' | 'created_at'>): Promise<StudySession> => {
    if (!user) throw new Error('User not logged in');
    const newSession: StudySession = {
      ...data,
      id: `ses-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    const saved = await StorageService.saveStudySession(user.id, newSession);
    setSessions((prev) => [...prev, saved]);
    return saved;
  };

  const updateSession = async (id: string, updates: Partial<StudySession>): Promise<StudySession | null> => {
    if (!user) return null;
    const existing = sessions.find((s) => s.id === id);
    if (!existing) return null;
    const updated: StudySession = { ...existing, ...updates };
    await StorageService.saveStudySession(user.id, updated);
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const deleteSession = async (id: string): Promise<void> => {
    if (!user) return;
    await StorageService.deleteStudySession(user.id, id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const setSessionStatus = async (id: string, status: SessionStatus): Promise<void> => {
    if (!user) return;
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    const updated: StudySession = { ...session, status };
    await StorageService.saveStudySession(user.id, updated);
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));

    // If marked Completed and associated with a topic, mark topic completed as well
    if (status === 'Completed' && session.topic_id) {
      const topic = topics.find((t) => t.id === session.topic_id);
      if (topic && !topic.is_completed) {
        await toggleTopicCompletion(topic.id);
      }
    }
  };

  // --- Plan Generation ---
  const generatePlanPreview = (options: PlanGenerationOptions) => {
    if (!user) {
      throw new Error('User not available');
    }
    return generateStudyPlan(user.id, subjects, topics, assignments, options);
  };

  const commitGeneratedPlan = async (newSessions: StudySession[], replaceFromDate?: string) => {
    if (!user) return;
    const saved = await StorageService.saveBulkStudySessions(user.id, newSessions, replaceFromDate);
    setSessions(saved);
  };

  const rescheduleMissed = async (fromDateStr?: string): Promise<{ count: number }> => {
    if (!user) return { count: 0 };
    const today = fromDateStr || new Date().toISOString().split('T')[0];

    // Identify missed sessions: status is 'Missed' OR (status is 'Planned' and date is prior to today)
    const missed = sessions.filter(
      (s) => s.status === 'Missed' || (s.status === 'Planned' && s.date < today)
    );

    if (missed.length === 0) return { count: 0 };

    const rescheduled = rescheduleMissedSessionsEngine(missed, sessions, preferences, today);
    if (rescheduled.length === 0) return { count: 0 };

    // Update old sessions to Missed status to keep history
    const missedIds = new Set(missed.map((m) => m.id));
    const newlyMissed = sessions.filter((s) => missedIds.has(s.id) && s.status !== 'Missed');

    await Promise.all(
      newlyMissed.map((s) => StorageService.saveStudySession(user.id, { ...s, status: 'Missed' }))
    );

    const savedSessions = await StorageService.saveBulkStudySessions(user.id, rescheduled);
    setSessions(savedSessions);

    return { count: rescheduled.length };
  };

  // --- Preferences ---
  const updatePreferences = async (updates: Partial<StudyPreferences>) => {
    if (!user) return;
    const updated: StudyPreferences = { ...preferences, ...updates, user_id: user.id };
    await StorageService.saveStudyPreferences(user.id, updated);
    setPreferences(updated);
  };

  // --- Utilities ---
  const reloadAllData = async () => {
    await refreshMySqlStatus();
    await loadData();
  };

  const resetAllUserData = async () => {
    if (!user) return;
    await StorageService.resetUserData(user.id);
    setSubjects([]);
    setTopics([]);
    setAssignments([]);
    setSessions([]);
  };

  const seedDemoData = async () => {
    if (!user) return;
    await StorageService.seedDemoData(user.id);
    await loadData();
  };

  return (
    <PlannerContext.Provider
      value={{
        subjects,
        topics,
        assignments,
        sessions,
        preferences,
        isLoading,
        isSupabase,
        isMysql,
        addSubject,
        updateSubject,
        deleteSubject,
        addTopic,
        updateTopic,
        deleteTopic,
        toggleTopicCompletion,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        setAssignmentStatus,
        addSession,
        updateSession,
        deleteSession,
        setSessionStatus,
        generatePlanPreview,
        commitGeneratedPlan,
        rescheduleMissed,
        updatePreferences,
        reloadAllData,
        resetAllUserData,
        seedDemoData,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) throw new Error('usePlanner must be used within a PlannerProvider');
  return context;
};
