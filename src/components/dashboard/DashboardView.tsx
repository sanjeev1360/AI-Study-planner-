import React from 'react';
import {
  BookOpen,
  ListTree,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Plus,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { usePlanner } from '../../context/PlannerContext';
import { ActiveTab } from '../layout/Sidebar';
import { PriorityBadge, DifficultyBadge, SessionStatusBadge } from '../common/Badge';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddSubject: () => void;
  onOpenAddTopic: () => void;
  onOpenAddAssignment: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onOpenAddSubject,
  onOpenAddTopic,
  onOpenAddAssignment,
}) => {
  const { user } = useAuth();
  const {
    subjects,
    topics,
    assignments,
    sessions,
    setSessionStatus,
    rescheduleMissed,
  } = usePlanner();

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculations
  const totalSubjects = subjects.length;
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.is_completed).length;
  const overallProgressPercent =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const pendingAssignments = assignments.filter((a) => a.status !== 'Completed').length;

  // Today's sessions
  const todaysSessions = sessions
    .filter((s) => s.date === todayStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const todaysPlannedMinutes = todaysSessions.reduce(
    (acc, s) => acc + s.duration_minutes,
    0
  );
  const todaysPlannedHours = (todaysPlannedMinutes / 60).toFixed(1);

  const completedSessions = sessions.filter((s) => s.status === 'Completed').length;

  // Upcoming deadlines (exams and assignments within next 14 days)
  const upcomingExams = subjects
    .filter((s) => s.exam_date && s.exam_date >= todayStr)
    .map((s) => ({
      id: s.id,
      title: `${s.name} Exam`,
      date: s.exam_date!,
      type: 'Exam' as const,
      color: s.color,
      code: s.code,
    }));

  const upcomingAssignments = assignments
    .filter((a) => a.status !== 'Completed' && a.due_date >= todayStr)
    .map((a) => {
      const sub = subjects.find((s) => s.id === a.subject_id);
      return {
        id: a.id,
        title: a.title,
        date: a.due_date,
        type: 'Assignment' as const,
        color: sub?.color || '#8B5CF6',
        code: sub?.code,
      };
    });

  const combinedDeadlines = [...upcomingExams, ...upcomingAssignments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Check for missed sessions in the past that can be rescheduled
  const missedCount = sessions.filter(
    (s) => s.status === 'Missed' || (s.status === 'Planned' && s.date < todayStr)
  ).length;

  // Chart data: 7 days study progress (Planned vs Completed minutes)
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 3 + i);
    const dateKey = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    const daySessions = sessions.filter((s) => s.date === dateKey);
    const plannedHrs = Number(
      (daySessions.reduce((acc, s) => acc + s.duration_minutes, 0) / 60).toFixed(1)
    );
    const completedHrs = Number(
      (
        daySessions
          .filter((s) => s.status === 'Completed')
          .reduce((acc, s) => acc + s.duration_minutes, 0) / 60
      ).toFixed(1)
    );

    return {
      day: dayLabel,
      planned: plannedHrs,
      completed: completedHrs,
      isToday: dateKey === todayStr,
    };
  });

  const handleReschedule = async () => {
    const res = await rescheduleMissed(todayStr);
    if (res.count > 0) {
      alert(`Successfully rescheduled ${res.count} missed study sessions into upcoming open slots!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              {user?.semester || 'Semester Active'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Here is your personalized academic roadmap and today's study schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddSubject}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Plus className="h-4 w-4 text-blue-600" />
            <span>Subject</span>
          </button>
          <button
            onClick={onOpenAddTopic}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Plus className="h-4 w-4 text-purple-600" />
            <span>Topic</span>
          </button>
          <button
            onClick={onOpenAddAssignment}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Plus className="h-4 w-4 text-amber-600" />
            <span>Assignment</span>
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/25 transition-all"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Generate Study Plan</span>
          </button>
        </div>
      </div>

      {/* Missed sessions banner if applicable */}
      {missedCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                You have {missedCount} unfinished or missed study session{missedCount > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-amber-700">
                Our AI rescheduling algorithm can re-balance them into your upcoming study hours without double-booking.
              </p>
            </div>
          </div>
          <button
            onClick={handleReschedule}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reschedule Unfinished Work</span>
          </button>
        </div>
      )}

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Subjects</span>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalSubjects}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active coursework</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Topics Tracked</span>
            <ListTree className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalTopics}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            {completedTopics} completed
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Tasks</span>
            <FileCheck2 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{pendingAssignments}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Assignments & labs</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Planned Today</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{todaysPlannedHours}h</p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {todaysSessions.length} session{todaysSessions.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Completed Sessions</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{completedSessions}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Total milestone logs</span>
        </div>

        <div className="p-4 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-100">
            <span className="text-xs font-semibold">Overall Syllabus</span>
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-2xl font-extrabold">{overallProgressPercent}%</p>
            <div className="w-full bg-white/30 rounded-full h-1.5 mt-2">
              <div
                className="bg-white rounded-full h-1.5 transition-all duration-500"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Timetable + Weekly Progress Chart & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Timetable */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Today's Study Timetable
                </h2>
                <p className="text-xs text-slate-500">
                  {todaysSessions.length === 0
                    ? 'No sessions scheduled for today yet.'
                    : `${todaysSessions.length} scheduled session(s) totaling ${todaysPlannedHours} hours`}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('timetable')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Full Timetable <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {todaysSessions.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Sparkles className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No sessions planned for today</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click 'Generate Study Plan' to generate an optimized daily timetable tailored to your upcoming exams and hardest topics.
                </p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Timetable Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysSessions.map((session) => {
                  const subject = subjects.find((s) => s.id === session.subject_id);
                  return (
                    <div
                      key={session.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-slate-50/40"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2.5 self-stretch rounded-full shrink-0 my-0.5"
                          style={{ backgroundColor: subject?.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              {session.start_time} - {session.end_time}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              ({session.duration_minutes} min)
                            </span>
                            <SessionStatusBadge status={session.status} />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800 mt-0.5">
                            {session.title}
                          </h4>
                          {session.notes && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{session.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 sm:mt-0 flex items-center gap-1.5 shrink-0 pl-5 sm:pl-0">
                        {session.status !== 'Completed' && (
                          <button
                            onClick={() => setSessionStatus(session.id, 'Completed')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Done</span>
                          </button>
                        )}
                        {session.status !== 'In Progress' && session.status !== 'Completed' && (
                          <button
                            onClick={() => setSessionStatus(session.id, 'In Progress')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            title="Start Session"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Start</span>
                          </button>
                        )}
                        {session.status !== 'Missed' && session.status !== 'Completed' && (
                          <button
                            onClick={() => setSessionStatus(session.id, 'Missed')}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Mark as Missed"
                          >
                            Missed
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly Progress Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
                  Weekly Study Hours (Planned vs Completed)
                </h3>
                <p className="text-xs text-slate-500">
                  Visual breakdown of study volume across this week
                </p>
              </div>
              <button
                onClick={() => setActiveTab('progress')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Deep Analytics <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="h" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="planned" fill="#93C5FD" name="Planned (hrs)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#3B82F6" name="Completed (hrs)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Deadlines & Quick Subject Health */}
        <div className="space-y-6">
          {/* Upcoming Deadlines & Exams */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                Deadlines & Exams
              </h3>
              <button
                onClick={() => setActiveTab('assignments')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View All
              </button>
            </div>

            {combinedDeadlines.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No upcoming exams or assignments logged. Add an exam date to your subjects or add an assignment!
              </p>
            ) : (
              <div className="space-y-3">
                {combinedDeadlines.map((item) => {
                  const target = new Date(item.date);
                  const todayDate = new Date(todayStr);
                  const diffDays = Math.ceil(
                    (target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {item.type} {item.code ? `• ${item.code}` : ''}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Due: {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          diffDays <= 3
                            ? 'bg-rose-100 text-rose-800'
                            : diffDays <= 7
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {diffDays <= 0 ? 'Today' : `${diffDays}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subject Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-blue-600" />
                Subject Progress
              </h3>
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Manage
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No subjects added yet.</p>
            ) : (
              <div className="space-y-3.5">
                {subjects.slice(0, 4).map((sub) => {
                  const subTopics = topics.filter((t) => t.subject_id === sub.id);
                  const subCompleted = subTopics.filter((t) => t.is_completed).length;
                  const pct =
                    subTopics.length > 0
                      ? Math.round((subCompleted / subTopics.length) * 100)
                      : 0;

                  return (
                    <div key={sub.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                          {sub.name}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {subCompleted}/{subTopics.length} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: sub.color || '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
