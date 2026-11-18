import React, { useState } from 'react';
import {
  Settings,
  User,
  Sliders,
  Database,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Download,
  RotateCcw,
  Trash2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlanner } from '../../context/PlannerContext';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig,
  isSupabaseConfigured,
} from '../../lib/supabase';
import { MYSQL_SQL_SCHEMA, SUPABASE_SQL_SCHEMA } from '../../lib/sqlSchema';
import { getCachedMySqlHealth } from '../../lib/mysqlApi';
import { Modal } from '../common/Modal';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SettingsView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { preferences, updatePreferences, reloadAllData, resetAllUserData, seedDemoData, subjects, topics, assignments, sessions, isMysql, isSupabase } =
    usePlanner();

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [college, setCollege] = useState(user?.college || '');
  const [major, setMajor] = useState(user?.major || '');
  const [semester, setSemester] = useState(user?.semester || '6th Semester');
  const [profileSaved, setProfileSaved] = useState(false);

  // Preferences form
  const [dailyHours, setDailyHours] = useState(preferences.daily_study_hours || 4);
  const [startTime, setStartTime] = useState(preferences.preferred_start_time || '09:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    preferences.preferred_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [breakInterval, setBreakInterval] = useState(preferences.break_interval_minutes || 50);
  const [breakDuration, setBreakDuration] = useState(preferences.break_duration_minutes || 10);
  const [maxSession, setMaxSession] = useState(preferences.max_session_minutes || 60);
  const [prefSaved, setPrefSaved] = useState(false);

  // Supabase Config form
  const currentConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.anonKey);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [schemaTab, setSchemaTab] = useState<'mysql' | 'supabase'>('mysql');

  // Reset modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      full_name: fullName,
      college,
      major,
      semester,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePreferences({
      daily_study_hours: dailyHours,
      preferred_start_time: startTime,
      preferred_days: selectedDays,
      break_interval_minutes: breakInterval,
      break_duration_minutes: breakDuration,
      max_session_minutes: maxSession,
    });
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  const handleSaveSupabase = () => {
    if (supabaseUrl && supabaseKey) {
      if (!supabaseUrl.startsWith('https://')) {
        setSupabaseStatus('Error: Supabase URL must begin with https://');
        return;
      }
      saveStoredSupabaseConfig({
        url: supabaseUrl.trim(),
        anonKey: supabaseKey.trim(),
      });
      setSupabaseStatus('Supabase configuration saved! Re-syncing database tables...');
      reloadAllData();
    } else {
      clearStoredSupabaseConfig();
      setSupabaseStatus('Switched to local storage mode.');
      reloadAllData();
    }
    setTimeout(() => setSupabaseStatus(null), 4000);
  };

  const copySql = () => {
    const schema = schemaTab === 'mysql' ? MYSQL_SQL_SCHEMA : SUPABASE_SQL_SCHEMA;
    navigator.clipboard.writeText(schema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const exportData = () => {
    const backup = {
      profile: user,
      preferences,
      subjects,
      topics,
      assignments,
      sessions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-study-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    await resetAllUserData();
    setIsResetModalOpen(false);
  };

  const mysqlHealth = getCachedMySqlHealth();
  const isConnected = isMysql || isSupabase || isSupabaseConfigured();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          Profile & Academic Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure your academic info, study time allocations, Supabase cloud database, and system backups.
        </p>
      </div>

      {/* 1. Student Profile */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-blue-600" />
            Student Identity & College Information
          </h2>
          {profileSaved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Profile Updated
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                College / Institute
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. NIT / IIT / State University"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Major / Branch
              </label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science & Eng"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="4th Semester">4th Semester</option>
                <option value="5th Semester">5th Semester</option>
                <option value="6th Semester">6th Semester</option>
                <option value="7th Semester">7th Semester</option>
                <option value="8th Semester">8th Semester</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Save Profile Details
            </button>
          </div>
        </form>
      </div>

      {/* 2. Study Preferences */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-purple-600" />
            Default Scheduling Preferences
          </h2>
          {prefSaved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Preferences Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Target Daily Study Capacity
                </label>
                <span className="text-xs font-bold text-blue-600">{dailyHours} hrs/day</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Study Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Available Study Days of the Week
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Break Interval
              </label>
              <select
                value={breakInterval}
                onChange={(e) => setBreakInterval(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value={45}>Every 45 min</option>
                <option value={50}>Every 50 min</option>
                <option value={60}>Every 60 min</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Break Duration
              </label>
              <select
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Session Length
              </label>
              <select
                value={maxSession}
                onChange={(e) => setMaxSession(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors"
            >
              Update Preferences
            </button>
          </div>
        </form>
      </div>

      {/* 3. SQL Database Configuration (Local MySQL & Supabase PostgreSQL) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              SQL Database Connection (Local MySQL & Supabase)
            </h2>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isConnected
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {isMysql
              ? 'MySQL Connected'
              : isSupabase
              ? 'Supabase Connected'
              : 'Local Persistence Engine'}
          </span>
        </div>

        {/* Local MySQL Status Panel */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">
              Local MySQL 8 Backend (/api/* via Express)
            </span>
            <button
              type="button"
              onClick={reloadAllData}
              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
            >
              Refresh Connection Status
            </button>
          </div>
          <p className="text-xs text-slate-600">
            {isMysql
              ? `Active connection to MySQL database "${mysqlHealth?.database || 'ai_study_planner'}". Accounts, courses, topics, assignments, and schedules save directly to MySQL.`
              : mysqlHealth?.mysqlConfigured
              ? `MySQL environment variables detected, but connection failed: ${mysqlHealth.error || 'Ensure MySQL service is running on localhost:3306'}. Falling back to browser storage.`
              : 'To connect your local MySQL Workbench / XAMPP server in VS Code, create a .env file from .env.example with MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE, then run npm run dev.'}
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Optional Cloud Sync: Enter your Supabase project URL and Anon Public Key below to sync data to PostgreSQL when not using local MySQL.
        </p>

        {supabaseStatus && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
            {supabaseStatus}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={copySql}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5 text-blue-600" />
              <span>
                {copiedSql
                  ? 'SQL Copied!'
                  : schemaTab === 'mysql'
                  ? 'Copy MySQL 8 Schema'
                  : 'Copy Supabase SQL Script'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSaveSupabase}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              Save & Connect Supabase
            </button>
          </div>
        </div>

        {/* SQL Schema Preview Collapsible */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-xs font-bold text-slate-700">
              SQL DDL Schema (For B.Tech SESD Project Evaluation):
            </p>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setSchemaTab('mysql')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  schemaTab === 'mysql'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                MySQL 8
              </button>
              <button
                type="button"
                onClick={() => setSchemaTab('supabase')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  schemaTab === 'supabase'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Supabase PostgreSQL
              </button>
            </div>
          </div>
          <pre className="max-h-48 overflow-y-auto p-3 bg-slate-900 text-slate-300 rounded-lg text-[11px] font-mono leading-relaxed">
            {schemaTab === 'mysql' ? MYSQL_SQL_SCHEMA : SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      </div>

      {/* 4. Academic Data Management & Backups */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-slate-600" />
          Academic Data Management & Backups
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={exportData}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 text-left transition-all"
          >
            <Download className="h-4 w-4 text-blue-600 mb-1" />
            <h4 className="text-xs font-bold text-slate-800">Export Backup JSON</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Download full timetable & course snapshot</p>
          </button>

          <button
            onClick={seedDemoData}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 text-left transition-all"
          >
            <RotateCcw className="h-4 w-4 text-purple-600 mb-1" />
            <h4 className="text-xs font-bold text-slate-800">Reload Demo Dataset</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Restore 5 courses, 14 topics & test sessions</p>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="p-3.5 rounded-xl border border-rose-200 hover:border-rose-300 bg-rose-50/40 hover:bg-rose-50 text-left transition-all"
          >
            <Trash2 className="h-4 w-4 text-rose-600 mb-1" />
            <h4 className="text-xs font-bold text-rose-800">Clear All Records</h4>
            <p className="text-[11px] text-rose-600 mt-0.5">Wipe all subjects, topics & sessions</p>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset All Student Data"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to erase all your subjects, topics, assignments, and study sessions? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
