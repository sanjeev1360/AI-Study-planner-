import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Calculator,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { StudySession, GeneratedPlanStats } from '../../types';
import { PrioritizedItem } from '../../lib/scheduler';
import { ActiveTab } from '../layout/Sidebar';
import { Modal } from '../common/Modal';

interface PlanGeneratorViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const PlanGeneratorView: React.FC<PlanGeneratorViewProps> = ({ setActiveTab }) => {
  const {
    subjects,
    topics,
    assignments,
    preferences,
    updatePreferences,
    generatePlanPreview,
    commitGeneratedPlan,
  } = usePlanner();

  // Generator Options State
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [daysToPlan, setDaysToPlan] = useState<number>(7);
  const [dailyHours, setDailyHours] = useState<number>(preferences.daily_study_hours || 4);
  const [startTime, setStartTime] = useState<string>(preferences.preferred_start_time || '09:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    preferences.preferred_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [breakMinutes, setBreakMinutes] = useState<number>(preferences.break_duration_minutes || 10);
  const [maxSessionMinutes, setMaxSessionMinutes] = useState<number>(preferences.max_session_minutes || 60);
  const [includeAssignments, setIncludeAssignments] = useState<boolean>(preferences.include_assignments ?? true);
  const [includeRevision, setIncludeRevision] = useState<boolean>(false);

  // Generated results
  const [previewSessions, setPreviewSessions] = useState<StudySession[] | null>(null);
  const [planStats, setPlanStats] = useState<GeneratedPlanStats | null>(null);
  const [prioritizedList, setPrioritizedList] = useState<PrioritizedItem[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  // Apply modal confirmation
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [replaceFuture, setReplaceFuture] = useState<boolean>(true);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setAppliedSuccess(false);

    // Save updated preferences to context
    updatePreferences({
      daily_study_hours: dailyHours,
      preferred_start_time: startTime,
      preferred_days: selectedDays,
      break_duration_minutes: breakMinutes,
      max_session_minutes: maxSessionMinutes,
      include_assignments: includeAssignments,
    });

    try {
      const result = generatePlanPreview({
        startDate,
        daysToPlan,
        includeAssignments,
        includeCompletedTopicsForRevision: includeRevision,
        preferences: {
          ...preferences,
          daily_study_hours: dailyHours,
          preferred_start_time: startTime,
          preferred_days: selectedDays,
          break_duration_minutes: breakMinutes,
          max_session_minutes: maxSessionMinutes,
          include_assignments: includeAssignments,
        },
      });

      setPreviewSessions(result.sessions);
      setPlanStats(result.stats);
      setPrioritizedList(result.prioritizedItems);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitPlan = async () => {
    if (!previewSessions) return;
    await commitGeneratedPlan(previewSessions, replaceFuture ? startDate : undefined);
    setIsApplyModalOpen(false);
    setAppliedSuccess(true);
  };

  // Group preview sessions by date
  const sessionsByDate: Record<string, StudySession[]> = {};
  if (previewSessions) {
    for (const s of previewSessions) {
      sessionsByDate[s.date] = sessionsByDate[s.date] || [];
      sessionsByDate[s.date].push(s);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 sm:p-8 rounded-2xl shadow-md">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>AI Dynamic Priority Scheduling Algorithm</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Personalized Study Plan Generator
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100 leading-relaxed">
            Generate an optimal daily and weekly timetable based on upcoming exam dates, topic difficulty, estimated study time, and your personal availability.
          </p>
        </div>

        {/* Algorithm Formula Card */}
        <div className="mt-5 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Core Scheduling Priority Formula:
              </span>
            </div>
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="text-xs text-blue-200 hover:text-white flex items-center gap-1 font-medium underline"
            >
              {showFormulaDetails ? 'Hide Explanation' : 'View Weights Breakdown'}
              {showFormulaDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          <div className="mt-2 text-sm sm:text-base font-mono font-bold text-white bg-slate-900/60 p-2.5 rounded-lg border border-white/10">
            Priority Score = (0.4 × Deadline Urgency) + (0.3 × Topic Difficulty) + (0.3 × Incomplete Work)
          </div>

          {showFormulaDetails && (
            <div className="mt-3 pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-100">
              <div className="p-2.5 rounded-lg bg-black/20">
                <p className="font-bold text-amber-300">0.4 × Deadline Urgency</p>
                <p className="text-[11px] mt-1 text-blue-200">
                  Normalizes exam date proximity or assignment due date. Exams within 3 days score 0.9–1.0; 7 days score 0.65.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-black/20">
                <p className="font-bold text-amber-300">0.3 × Topic Difficulty</p>
                <p className="text-[11px] mt-1 text-blue-200">
                  Hard topics (1.0) and High-priority subjects receive maximum weighting to guarantee deep conceptual focus.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-black/20">
                <p className="font-bold text-amber-300">0.3 × Incomplete Work</p>
                <p className="text-[11px] mt-1 text-blue-200">
                  Ratio of uncompleted topics and pending deliverables in that subject to avoid student backlog accumulation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters Column */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-blue-600" />
              Study Availability & Constraints
            </h2>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Timetable Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Horizon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planning Horizon
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDaysToPlan(7)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    daysToPlan === 7
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  7 Days (Weekly)
                </button>
                <button
                  type="button"
                  onClick={() => setDaysToPlan(14)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    daysToPlan === 14
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  14 Days (Bi-Weekly)
                </button>
              </div>
            </div>

            {/* Daily Study Hours Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Daily Study Target
                </label>
                <span className="text-xs font-bold text-blue-600">{dailyHours} hours/day</span>
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
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1h (Light)</span>
                <span>4h (Standard)</span>
                <span>10h (Intensive)</span>
              </div>
            </div>

            {/* Preferred Start Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Study Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Preferred Study Days */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Preferred Study Days ({selectedDays.length} days selected)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ALL_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`py-1.5 text-[11px] font-semibold rounded-md border transition-all ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session & Break durations */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Max Session
                </label>
                <select
                  value={maxSessionMinutes}
                  onChange={(e) => setMaxSessionMinutes(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Short Break
                </label>
                <select
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeAssignments}
                  onChange={(e) => setIncludeAssignments(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include upcoming assignments in schedule</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeRevision}
                  onChange={(e) => setIncludeRevision(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include completed topics for revision</span>
              </label>
            </div>

            {/* Run Generator CTA */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || subjects.length === 0}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Computing Optimal Slots...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Run Scheduling Engine</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results & Schedule Preview Column */}
        <div className="lg:col-span-2 space-y-5">
          {appliedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold">
                  New study timetable successfully committed to database!
                </span>
              </div>
              <button
                onClick={() => setActiveTab('timetable')}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Go to Timetable →
              </button>
            </div>
          )}

          {!previewSessions ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Ready to generate your study timetable
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Configure your preferred study hours and days on the left, then click{' '}
                <strong className="text-slate-700">'Run Scheduling Engine'</strong>. The algorithm will compute priority scores for all course topics and build your timetable.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Timetable Now
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Stats Bar */}
              {planStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Sessions Generated</span>
                    <p className="text-xl font-bold text-slate-800">
                      {planStats.totalSessionsGenerated}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Hours Allocated</span>
                    <p className="text-xl font-bold text-blue-600">
                      {(planStats.totalStudyMinutesAllocated / 60).toFixed(1)} hrs
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Hours Needed</span>
                    <p className="text-xl font-bold text-slate-800">
                      {(planStats.totalStudyMinutesNeeded / 60).toFixed(1)} hrs
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500">Subjects Covered</span>
                    <p className="text-xl font-bold text-purple-600">
                      {planStats.subjectsCovered}
                    </p>
                  </div>
                </div>
              )}

              {/* Insufficient Time Warning Notice */}
              {planStats?.insufficientTimeNotice && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Capacity Notice: Available Study Time is Insufficient for All Topics
                    </h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      {planStats.insufficientTimeNotice}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Bar: Apply Plan */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Previewing {previewSessions.length} Study Sessions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review the schedule below before applying to your live timetable.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerate}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Regenerate</span>
                  </button>
                  <button
                    onClick={() => setIsApplyModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Apply to My Timetable</span>
                  </button>
                </div>
              </div>

              {/* Prioritized Ranking Mathematical Verification Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-indigo-600" />
                  Priority Scoring Algorithm Audit Table
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Verification of calculated normalized factors: Priority = 0.4(Urgency) + 0.3(Difficulty) + 0.3(Incomplete).
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2 px-3 font-semibold">Rank & Topic</th>
                        <th className="py-2 px-2 font-semibold">Subject</th>
                        <th className="py-2 px-2 font-semibold text-center">Urgency (0.4)</th>
                        <th className="py-2 px-2 font-semibold text-center">Difficulty (0.3)</th>
                        <th className="py-2 px-2 font-semibold text-center">Incomplete (0.3)</th>
                        <th className="py-2 px-2 font-semibold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prioritizedList.slice(0, 8).map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-400 mr-2">#{index + 1}</span>
                            <span className="font-semibold text-slate-800">{item.title}</span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${item.subjectColor}15`,
                                color: item.subjectColor,
                              }}
                            >
                              {item.subjectName}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              {item.deadlineUrgency}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                              {item.difficultyScore}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                              {item.incompleteWorkScore}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-700">
                            {item.priorityScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grouped Timetable Preview */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Generated Timetable Sessions Preview
                </h3>

                {Object.keys(sessionsByDate).length === 0 ? (
                  <p className="text-xs text-slate-500">No sessions could be generated.</p>
                ) : (
                  Object.entries(sessionsByDate).map(([dateStr, daySessions]) => {
                    const d = new Date(dateStr);
                    const formattedDate = d.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    });

                    const dayTotalMins = daySessions.reduce(
                      (acc, s) => acc + s.duration_minutes,
                      0
                    );

                    return (
                      <div
                        key={dateStr}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                      >
                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800">
                            {formattedDate}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {daySessions.length} session{daySessions.length === 1 ? '' : 's'} •{' '}
                            {(dayTotalMins / 60).toFixed(1)} hrs total
                          </span>
                        </div>

                        <div className="p-4 divide-y divide-slate-100">
                          {daySessions.map((session) => {
                            const sub = subjects.find((s) => s.id === session.subject_id);

                            return (
                              <div
                                key={session.id}
                                className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-2.5 h-10 rounded-full"
                                    style={{ backgroundColor: sub?.color || '#3B82F6' }}
                                  />
                                  <div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                      <span>
                                        {session.start_time} - {session.end_time}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        ({session.duration_minutes}m)
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                        {sub?.name}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                                      {session.title}
                                    </h4>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal to Commit Plan */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply Generated Plan to Timetable"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are about to save <strong className="text-slate-900">{previewSessions?.length}</strong>{' '}
            new study sessions to your academic timetable.
          </p>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="radio"
                name="replaceChoice"
                checked={replaceFuture}
                onChange={() => setReplaceFuture(true)}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <span className="font-semibold block text-slate-800">
                  Replace all existing planned sessions from {startDate} (Recommended)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Preserves past completed sessions, replacing uncompleted planned sessions to avoid duplicates.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-700 pt-1 border-t border-slate-200">
              <input
                type="radio"
                name="replaceChoice"
                checked={!replaceFuture}
                onChange={() => setReplaceFuture(false)}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <span className="font-semibold block text-slate-800">
                  Append to existing timetable without deleting
                </span>
                <span className="text-slate-500 text-[11px]">
                  Keeps all existing scheduled sessions intact.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitPlan}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              Confirm & Save Timetable
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
