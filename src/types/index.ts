export type PriorityLevel = 'Low' | 'Medium' | 'High';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type SessionStatus = 'Planned' | 'In Progress' | 'Completed' | 'Missed';
export type AssignmentStatus = 'Pending' | 'In Progress' | 'Completed';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  college?: string;
  major?: string;
  semester?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code?: string;
  description?: string;
  difficulty: DifficultyLevel;
  exam_date?: string; // YYYY-MM-DD
  priority: PriorityLevel;
  color: string;
  created_at: string;
}

export interface Topic {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  difficulty: DifficultyLevel;
  estimated_time_minutes: number;
  is_completed: boolean;
  importance: PriorityLevel;
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  description?: string;
  due_date: string; // YYYY-MM-DD or ISO
  estimated_minutes: number;
  priority: PriorityLevel;
  status: AssignmentStatus;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id?: string;
  assignment_id?: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  duration_minutes: number;
  status: SessionStatus;
  notes?: string;
  created_at: string;
}

export interface StudyPreferences {
  id?: string;
  user_id: string;
  daily_study_hours: number;
  preferred_start_time: string; // "09:00"
  preferred_days: string[]; // ["Monday", "Tuesday", ...]
  break_interval_minutes: number; // e.g. 50 min
  break_duration_minutes: number; // e.g. 10 min
  max_session_minutes: number; // e.g. 60 min
  include_assignments: boolean;
  prioritize_near_exams: boolean;
}

export interface GeneratedPlanStats {
  totalStudyMinutesNeeded: number;
  totalStudyMinutesAllocated: number;
  totalSessionsGenerated: number;
  sessionsPerDay: Record<string, number>;
  insufficientTimeNotice?: string;
  subjectsCovered: number;
}
