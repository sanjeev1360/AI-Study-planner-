import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Pencil,
  Trash2,
  Calendar,
  Filter,
} from 'lucide-react';
import { StudySession, SessionStatus } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { SessionStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

export const TimetableView: React.FC = () => {
  const {
    subjects,
    topics,
    assignments,
    sessions,
    addSession,
    updateSession,
    deleteSession,
    setSessionStatus,
    rescheduleMissed,
  } = usePlanner();

  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<'all' | SessionStatus>('all');

  // Manual Session Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [deletingSession, setDeletingSession] = useState<StudySession | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [sessionDate, setSessionDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  // Reschedule alert states
  const [rescheduleResult, setRescheduleResult] = useState<string | null>(null);

  // Missed sessions calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const missedSessions = sessions.filter(
    (s) => s.status === 'Missed' || (s.status === 'Planned' && s.date < todayStr)
  );

  const openCreateModal = () => {
    setEditingSession(null);
    setTitle('');
    setSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setTopicId('');
    setSessionDate(selectedDate);
    setStartTime('09:00');
    setEndTime('10:00');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: StudySession) => {
    setEditingSession(s);
    setTitle(s.title);
    setSubjectId(s.subject_id);
    setTopicId(s.topic_id || '');
    setSessionDate(s.date);
    setStartTime(s.start_time);
    setEndTime(s.end_time);
    setNotes(s.notes || '');
    setIsModalOpen(true);
  };

  const calculateDuration = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const totalStart = (sh || 0) * 60 + (sm || 0);
    const totalEnd = (eh || 0) * 60 + (em || 0);
    return Math.max(15, totalEnd - totalStart);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    const duration = calculateDuration(startTime, endTime);

    if (editingSession) {
      await updateSession(editingSession.id, {
        title: title.trim(),
        subject_id: subjectId,
        topic_id: topicId || undefined,
        date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        notes: notes.trim() || undefined,
      });
    } else {
      await addSession({
        title: title.trim(),
        subject_id: subjectId,
        topic_id: topicId || undefined,
        date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        status: 'Planned',
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingSession) {
      await deleteSession(deletingSession.id);
      setDeletingSession(null);
    }
  };

  const handleRescheduleAll = async () => {
    const res = await rescheduleMissed(todayStr);
    if (res.count > 0) {
      setRescheduleResult(`Successfully rescheduled ${res.count} unfinished sessions into future time slots!`);
      setTimeout(() => setRescheduleResult(null), 5000);
    } else {
      setRescheduleResult('No unfinished sessions found to reschedule.');
      setTimeout(() => setRescheduleResult(null), 4000);
    }
  };

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Dates to display
  let displayedDates: string[] = [];
  if (viewMode === 'daily') {
    displayedDates = [selectedDate];
  } else {
    // 7-day week beginning from current selectedDate
    displayedDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-blue-600" />
            My Study Timetable
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View, track, execute, and reschedule your personalized academic study sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Study Session</span>
          </button>
        </div>
      </div>

      {/* Missed Sessions Auto-Rescheduling Alert */}
      {missedSessions.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {missedSessions.length} Unfinished / Missed Session{missedSessions.length > 1 ? 's' : ''} Detected
              </h4>
              <p className="text-xs text-amber-700">
                You can automatically recalculate open slots and redistribute unfinished topics across your available upcoming days.
              </p>
            </div>
          </div>
          <button
            onClick={handleRescheduleAll}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Auto-Reschedule All Missed</span>
          </button>
        </div>
      )}

      {rescheduleResult && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{rescheduleResult}</span>
        </div>
      )}

      {/* View Mode & Date Navigation Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Daily / Weekly toggle */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-100 flex items-center">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Weekly View
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Daily View
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Session Statuses</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Missed">Missed</option>
          </select>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(viewMode === 'weekly' ? -7 : -1)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={() => setSelectedDate(todayStr)}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Today
          </button>

          <span className="text-xs font-bold text-slate-800 px-2 min-w-[120px] text-center">
            {new Date(selectedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {viewMode === 'weekly' && (
              <span className="text-slate-400 font-normal"> +6 days</span>
            )}
          </span>

          <button
            onClick={() => shiftDate(viewMode === 'weekly' ? 7 : 1)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Timetable Days Grouped View */}
      <div className="space-y-5">
        {displayedDates.map((dateStr) => {
          const dayDate = new Date(dateStr);
          const isToday = dateStr === todayStr;
          const formattedHeader = dayDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });

          const daySessions = filteredSessions
            .filter((s) => s.date === dateStr)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          const totalMins = daySessions.reduce((acc, s) => acc + s.duration_minutes, 0);

          return (
            <div
              key={dateStr}
              className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                isToday
                  ? 'border-blue-400 ring-2 ring-blue-500/10 shadow-sm'
                  : 'border-slate-200 shadow-xs'
              }`}
            >
              {/* Day Header Bar */}
              <div
                className={`px-5 py-3 border-b flex items-center justify-between ${
                  isToday
                    ? 'bg-blue-50/70 border-blue-200'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">{formattedHeader}</h3>
                  {isToday && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                      Today
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">
                    {daySessions.length} session{daySessions.length === 1 ? '' : 's'} •{' '}
                    {(totalMins / 60).toFixed(1)} hrs
                  </span>
                  <button
                    onClick={() => {
                      setSessionDate(dateStr);
                      openCreateModal();
                    }}
                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-white"
                    title="Add session to this day"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sessions list */}
              {daySessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No study sessions scheduled for this day.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 p-3 sm:p-4 space-y-1">
                  {daySessions.map((session) => {
                    const subject = subjects.find((s) => s.id === session.subject_id);

                    return (
                      <div
                        key={session.id}
                        className="py-3 px-3 rounded-xl hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-2.5 self-stretch rounded-full shrink-0 my-0.5"
                            style={{ backgroundColor: subject?.color || '#3B82F6' }}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">
                                {session.start_time} – {session.end_time}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                ({session.duration_minutes} min)
                              </span>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-semibold"
                                style={{
                                  backgroundColor: `${subject?.color || '#3B82F6'}15`,
                                  color: subject?.color || '#3B82F6',
                                }}
                              >
                                {subject?.name || 'Subject'}
                              </span>
                              <SessionStatusBadge status={session.status} />
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                              {session.title}
                            </h4>
                            {session.notes && (
                              <p className="text-xs text-slate-500 mt-0.5">{session.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Status change actions & edit */}
                        <div className="flex items-center gap-1.5 shrink-0 pl-5 sm:pl-0">
                          {session.status !== 'Completed' && (
                            <button
                              onClick={() => setSessionStatus(session.id, 'Completed')}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              Done
                            </button>
                          )}
                          {session.status !== 'In Progress' && session.status !== 'Completed' && (
                            <button
                              onClick={() => setSessionStatus(session.id, 'In Progress')}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              In Progress
                            </button>
                          )}
                          {session.status !== 'Missed' && session.status !== 'Completed' && (
                            <button
                              onClick={() => setSessionStatus(session.id, 'Missed')}
                              className="px-2 py-1 text-xs font-medium rounded-md text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              Missed
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(session)}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                            title="Edit Session"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingSession(session)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                            title="Delete Session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Add / Edit Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSession ? 'Edit Study Session' : 'Schedule Study Session'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Course Subject *
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId('');
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="">Select Course</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Topic (Optional)
            </label>
            <select
              value={topicId}
              onChange={(e) => {
                const id = e.target.value;
                setTopicId(id);
                const found = topics.find((t) => t.id === id);
                if (found && !title) {
                  setTitle(found.name);
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="">None / Custom Topic</option>
              {topics
                .filter((t) => (subjectId ? t.subject_id === subjectId : true))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.difficulty})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dijkstra Algorithm Practice & Time Complexity Proof"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Study Notes / Goals
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Objectives for this session..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              {editingSession ? 'Update Session' : 'Save Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingSession)}
        onClose={() => setDeletingSession(null)}
        title="Delete Study Session"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove the session{' '}
            <strong className="text-slate-900">{deletingSession?.title}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDeletingSession(null)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
