export const SUPABASE_SQL_SCHEMA = `-- AI Study Planner: Supabase Schema & Row-Level Security (RLS)
-- Suitable for B.Tech Software Engineering & System Design (SESD) Submission

-- 1. Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  college TEXT,
  major TEXT,
  semester TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium' NOT NULL,
  exam_date DATE,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium' NOT NULL,
  color TEXT DEFAULT '#4F46E5' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium' NOT NULL,
  estimated_time_minutes INTEGER DEFAULT 45 NOT NULL CHECK (estimated_time_minutes > 0),
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  importance TEXT CHECK (importance IN ('Low', 'Medium', 'High')) DEFAULT 'Medium' NOT NULL,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  estimated_minutes INTEGER DEFAULT 60 NOT NULL CHECK (estimated_minutes > 0),
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium' NOT NULL,
  status TEXT CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Study Sessions Table (Timetable Records)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Missed')) DEFAULT 'Planned' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Study Preferences Table
CREATE TABLE IF NOT EXISTS public.study_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  daily_study_hours NUMERIC(3,1) DEFAULT 4.0 NOT NULL,
  preferred_start_time TIME DEFAULT '09:00:00' NOT NULL,
  preferred_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  break_interval_minutes INTEGER DEFAULT 50 NOT NULL,
  break_duration_minutes INTEGER DEFAULT 10 NOT NULL,
  max_session_minutes INTEGER DEFAULT 60 NOT NULL,
  include_assignments BOOLEAN DEFAULT TRUE NOT NULL,
  prioritize_near_exams BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Indexes for Query Performance
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_user ON public.topics(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON public.study_sessions(user_id, date);

-- 8. Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_preferences ENABLE ROW LEVEL SECURITY;

-- 9. Row-Level Security Policies (Users can only access their own records)
CREATE POLICY "Users can manage their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Users can manage their own subjects"
  ON public.subjects FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own topics"
  ON public.topics FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own assignments"
  ON public.assignments FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own study sessions"
  ON public.study_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
  ON public.study_preferences FOR ALL
  USING (auth.uid() = user_id);

-- 10. Auto-Profile Creation Trigger on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, college, major, semester)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student'),
    COALESCE(new.raw_user_meta_data->>'college', 'Engineering College'),
    COALESCE(new.raw_user_meta_data->>'major', 'Computer Science & Engineering'),
    COALESCE(new.raw_user_meta_data->>'semester', '6th Semester')
  );
  
  INSERT INTO public.study_preferences (user_id)
  VALUES (new.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;

export const MYSQL_SQL_SCHEMA = `-- AI Study Planner: Local MySQL 8 Schema
-- Run automatically by server.ts or manually in MySQL Workbench / phpMyAdmin

CREATE DATABASE IF NOT EXISTS ai_study_planner;
USE ai_study_planner;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  full_name VARCHAR(255) NOT NULL,
  college VARCHAR(255),
  major VARCHAR(255),
  semester VARCHAR(100),
  created_at VARCHAR(64) NOT NULL
);

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64),
  description TEXT,
  difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Medium',
  exam_date VARCHAR(32),
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  color VARCHAR(32) NOT NULL DEFAULT '#4F46E5',
  created_at VARCHAR(64) NOT NULL,
  INDEX idx_subjects_user (user_id),
  CONSTRAINT fk_subjects_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3. Topics Table
CREATE TABLE IF NOT EXISTS topics (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  subject_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Medium',
  estimated_time_minutes INT NOT NULL DEFAULT 45,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  importance ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  notes TEXT,
  completed_at VARCHAR(64),
  created_at VARCHAR(64) NOT NULL,
  INDEX idx_topics_user (user_id),
  INDEX idx_topics_subject (subject_id),
  CONSTRAINT fk_topics_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_topics_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 4. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  subject_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date VARCHAR(64) NOT NULL,
  estimated_minutes INT NOT NULL DEFAULT 60,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
  created_at VARCHAR(64) NOT NULL,
  INDEX idx_assignments_user (user_id),
  CONSTRAINT fk_assignments_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 5. Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  subject_id VARCHAR(128) NOT NULL,
  topic_id VARCHAR(128),
  assignment_id VARCHAR(128),
  title VARCHAR(255) NOT NULL,
  date VARCHAR(32) NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  duration_minutes INT NOT NULL,
  status ENUM('Planned', 'In Progress', 'Completed', 'Missed') NOT NULL DEFAULT 'Planned',
  notes TEXT,
  created_at VARCHAR(64) NOT NULL,
  INDEX idx_sessions_user_date (user_id, date),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 6. Study Preferences Table
CREATE TABLE IF NOT EXISTS study_preferences (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL UNIQUE,
  daily_study_hours DECIMAL(4,1) NOT NULL DEFAULT 4.0,
  preferred_start_time VARCHAR(16) NOT NULL DEFAULT '09:00',
  preferred_days JSON NOT NULL,
  break_interval_minutes INT NOT NULL DEFAULT 50,
  break_duration_minutes INT NOT NULL DEFAULT 10,
  max_session_minutes INT NOT NULL DEFAULT 60,
  include_assignments BOOLEAN NOT NULL DEFAULT TRUE,
  prioritize_near_exams BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_prefs_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
`;

