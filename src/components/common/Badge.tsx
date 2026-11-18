import React from 'react';
import { PriorityLevel, DifficultyLevel, SessionStatus, AssignmentStatus } from '../../types';

export const PriorityBadge: React.FC<{ priority: PriorityLevel; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  const styles = {
    High: 'bg-red-50 text-red-700 border-red-200 ring-red-500/20',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
    Low: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
  };

  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ring-1 ring-inset ${styles[priority] || styles.Medium} ${sz}`}
    >
      {priority} Priority
    </span>
  );
};

export const DifficultyBadge: React.FC<{ difficulty: DifficultyLevel; size?: 'sm' | 'md' }> = ({
  difficulty,
  size = 'md',
}) => {
  const styles = {
    Hard: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20',
    Medium: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20',
    Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
  };

  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ring-1 ring-inset ${styles[difficulty] || styles.Medium} ${sz}`}
    >
      {difficulty}
    </span>
  );
};

export const SessionStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  const styles = {
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
    Planned: 'bg-slate-100 text-slate-700 border-slate-300',
    Missed: 'bg-rose-100 text-rose-800 border-rose-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.Planned}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'Completed'
            ? 'bg-emerald-500'
            : status === 'In Progress'
            ? 'bg-blue-600'
            : status === 'Missed'
            ? 'bg-rose-500'
            : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
};

export const AssignmentStatusBadge: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
  const styles = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Pending: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Pending}`}
    >
      {status}
    </span>
  );
};
