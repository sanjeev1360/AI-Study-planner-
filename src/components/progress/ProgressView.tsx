import React from 'react';
import {
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Calendar,
  FileCheck2,
  PieChart as PieIcon,
  BarChart3,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { usePlanner } from '../../context/PlannerContext';

const PIE_COLORS = ['#10B981', '#3B82F6', '#94A3B8', '#EF4444']; // Completed, In Progress, Planned, Missed

export const ProgressView: React.FC = () => {
  const { subjects, topics, assignments, sessions } = usePlanner();

  // 1. Overall Topic Completion
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.is_completed).length;
  const remainingTopics = totalTopics - completedTopics;
  const topicCompletionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const topicDonutData = [
    { name: 'Completed Topics', value: completedTopics, color: '#10B981' },
    { name: 'Remaining Topics', value: remainingTopics, color: '#E2E8F0' },
  ];

  // 2. Subject-wise topic breakdown
  const subjectProgressData = subjects.map((sub) => {
    const subTopics = topics.filter((t) => t.subject_id === sub.id);
    const done = subTopics.filter((t) => t.is_completed).length;
    const remaining = subTopics.length - done;
    const pct = subTopics.length > 0 ? Math.round((done / subTopics.length) * 100) : 0;

    return {
      name: sub.code || sub.name.slice(0, 15),
      fullName: sub.name,
      completed: done,
      remaining: remaining,
      total: subTopics.length,
      percentage: pct,
      color: sub.color || '#3B82F6',
    };
  });

  // 3. Planned vs Completed Study Hours (Last 7 Days)
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

    const daySessions = sessions.filter((s) => s.date === dateStr);
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
      date: dateStr,
      planned: plannedHrs,
      completed: completedHrs,
    };
  });

  // 4. Session Status Distribution
  const sessionStatusCounts = {
    Completed: sessions.filter((s) => s.status === 'Completed').length,
    'In Progress': sessions.filter((s) => s.status === 'In Progress').length,
    Planned: sessions.filter((s) => s.status === 'Planned').length,
    Missed: sessions.filter((s) => s.status === 'Missed').length,
  };

  const sessionPieData = [
    { name: 'Completed', value: sessionStatusCounts.Completed, color: '#10B981' },
    { name: 'In Progress', value: sessionStatusCounts['In Progress'], color: '#3B82F6' },
    { name: 'Planned', value: sessionStatusCounts.Planned, color: '#94A3B8' },
    { name: 'Missed', value: sessionStatusCounts.Missed, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  // 5. Total hours computed
  const totalPlannedHours = (
    sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / 60
  ).toFixed(1);

  const totalCompletedHours = (
    sessions
      .filter((s) => s.status === 'Completed')
      .reduce((acc, s) => acc + s.duration_minutes, 0) / 60
  ).toFixed(1);

  const completedAssignments = assignments.filter((a) => a.status === 'Completed').length;
  const pendingAssignments = assignments.length - completedAssignments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Academic Progress & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time analytics computed strictly from your saved topics, completed sessions, and assignment records.
          </p>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Syllabus Covered</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{topicCompletionPct}%</p>
          <span className="text-xs text-slate-500 mt-1 block">
            {completedTopics} of {totalTopics} topics done
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Study Hours Logged</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalCompletedHours}h</p>
          <span className="text-xs text-slate-500 mt-1 block">
            out of {totalPlannedHours}h planned
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Completed Sessions</span>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {sessionStatusCounts.Completed}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {sessions.length} total scheduled
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Assignments Done</span>
            <FileCheck2 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{completedAssignments}</p>
          <span className="text-xs text-slate-500 mt-1 block">
            {pendingAssignments} tasks pending
          </span>
        </div>
      </div>

      {/* Row 1: Planned vs Completed Hours (Bar) & Session Status (Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
            <BarChart3 className="h-4.5 w-4.5 text-blue-600" />
            Daily Study Activity: Planned vs Completed (Past 7 Days)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Comparison of allocated study time versus executed completed hours.
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="planned" fill="#93C5FD" name="Planned (hrs)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#3B82F6" name="Completed (hrs)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <PieIcon className="h-4.5 w-4.5 text-purple-600" />
              Session Status Breakdown
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Distribution of all timetable sessions.
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {sessionPieData.length === 0 ? (
              <p className="text-xs text-slate-400">No sessions recorded.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sessionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 font-medium">Done: {sessionStatusCounts.Completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600 font-medium">In Prog: {sessionStatusCounts['In Progress']}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-600 font-medium">Planned: {sessionStatusCounts.Planned}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 font-medium">Missed: {sessionStatusCounts.Missed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Subject-wise Syllabus Completion */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
          <BookOpen className="h-4.5 w-4.5 text-blue-600" />
          Subject-Wise Topic Progress
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Completed vs remaining topics breakdown per academic course.
        </p>

        {subjectProgressData.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No subjects available.</p>
        ) : (
          <div className="space-y-4">
            {subjectProgressData.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-slate-800">{item.fullName}</span>
                  </div>
                  <div className="flex items-center gap-3 font-semibold text-slate-600">
                    <span className="text-emerald-600">{item.completed} Completed</span>
                    <span className="text-slate-400">/</span>
                    <span>{item.total} Total</span>
                    <span className="text-blue-600 font-bold ml-1">{item.percentage}%</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
