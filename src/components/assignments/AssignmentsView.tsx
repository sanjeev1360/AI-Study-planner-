import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Filter,
  Search,
} from 'lucide-react';
import { Assignment, AssignmentStatus, PriorityLevel } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { PriorityBadge, AssignmentStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface AssignmentsViewProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  isAddModalOpen = false,
  onCloseAddModal,
}) => {
  const { subjects, assignments, addAssignment, updateAssignment, deleteAssignment, setAssignmentStatus } =
    usePlanner();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [status, setStatus] = useState<AssignmentStatus>('Pending');

  const todayStr = new Date().toISOString().split('T')[0];

  const openCreateModal = () => {
    setEditingAssignment(null);
    setTitle('');
    setSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setDescription('');
    // Default to 4 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 4);
    setDueDate(d.toISOString().split('T')[0]);
    setEstimatedMinutes(60);
    setPriority('Medium');
    setStatus('Pending');
    setIsModalOpen(true);
  };

  const openEditModal = (a: Assignment) => {
    setEditingAssignment(a);
    setTitle(a.title);
    setSubjectId(a.subject_id);
    setDescription(a.description || '');
    setDueDate(a.due_date.split('T')[0]);
    setEstimatedMinutes(a.estimated_minutes);
    setPriority(a.priority);
    setStatus(a.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId || !dueDate) return;

    if (editingAssignment) {
      await updateAssignment(editingAssignment.id, {
        title: title.trim(),
        subject_id: subjectId,
        description: description.trim() || undefined,
        due_date: dueDate,
        estimated_minutes: Number(estimatedMinutes),
        priority,
        status,
      });
    } else {
      await addAssignment({
        title: title.trim(),
        subject_id: subjectId,
        description: description.trim() || undefined,
        due_date: dueDate,
        estimated_minutes: Number(estimatedMinutes),
        priority,
        status,
      });
    }

    closeModal();
  };

  const confirmDelete = async () => {
    if (deletingAssignment) {
      await deleteAssignment(deletingAssignment.id);
      setDeletingAssignment(null);
    }
  };

  // Overdue and Approaching Deadlines calculations
  const overdueAssignments = assignments.filter(
    (a) => a.status !== 'Completed' && a.due_date < todayStr
  );

  const approachingAssignments = assignments.filter((a) => {
    if (a.status === 'Completed' || a.due_date < todayStr) return false;
    const diff = new Date(a.due_date).getTime() - new Date().setHours(0, 0, 0, 0);
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 3;
  });

  // Filtered
  const filteredAssignments = assignments.filter((a) => {
    if (selectedSubjectId !== 'all' && a.subject_id !== selectedSubjectId) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchDesc = a.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const effectiveOpen = isModalOpen || isAddModalOpen;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-amber-600" />
            Assignments & Deadlines
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track lab reports, coursework submissions, and academic milestones with deadline urgency alerts.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          disabled={subjects.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm shadow-amber-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Critical Alert Banners */}
      {overdueAssignments.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900">
              {overdueAssignments.length} Overdue Assignment{overdueAssignments.length > 1 ? 's' : ''}!
            </h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Please submit or mark completed:{' '}
              {overdueAssignments.map((a) => a.title).join(', ')}
            </p>
          </div>
        </div>
      )}

      {approachingAssignments.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">
              {approachingAssignments.length} Deadline{approachingAssignments.length > 1 ? 's' : ''} Due in 3 Days or Less
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              These are prioritized heavily in your AI study plan schedule.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="all">All Subjects ({assignments.length})</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <FileCheck2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No assignments found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Add coursework, homework problems, or mini-projects to factor them into your study plan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((asg) => {
            const subject = subjects.find((s) => s.id === asg.subject_id);
            const isOverdue = asg.status !== 'Completed' && asg.due_date < todayStr;
            const diff = new Date(asg.due_date).getTime() - new Date().setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

            return (
              <div
                key={asg.id}
                className={`p-5 rounded-2xl border bg-white transition-all flex flex-col justify-between ${
                  isOverdue
                    ? 'border-rose-300 ring-2 ring-rose-500/10'
                    : asg.status === 'Completed'
                    ? 'border-slate-200 opacity-75'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: `${subject?.color || '#F59E0B'}15`,
                          color: subject?.color || '#F59E0B',
                        }}
                      >
                        {subject?.name || 'Course'}
                      </span>
                      <PriorityBadge priority={asg.priority} size="sm" />
                      <AssignmentStatusBadge status={asg.status} />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(asg)}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingAssignment(asg)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3
                    className={`text-sm font-bold ${
                      asg.status === 'Completed'
                        ? 'line-through text-slate-400'
                        : 'text-slate-900'
                    }`}
                  >
                    {asg.title}
                  </h3>

                  {asg.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {asg.description}
                    </p>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isOverdue
                          ? 'text-rose-600'
                          : daysLeft <= 3
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Due: {new Date(asg.due_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" />
                      {(asg.estimated_minutes / 60).toFixed(1)}h
                    </span>
                  </div>

                  {/* Quick status toggle button */}
                  {asg.status !== 'Completed' ? (
                    <button
                      onClick={() => setAssignmentStatus(asg.id, 'Completed')}
                      className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      Mark Complete
                    </button>
                  ) : (
                    <button
                      onClick={() => setAssignmentStatus(asg.id, 'Pending')}
                      className="px-2 py-1 text-[11px] font-medium rounded text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Assignment Modal */}
      <Modal
        isOpen={effectiveOpen}
        onClose={closeModal}
        title={editingAssignment ? 'Edit Assignment' : 'Add New Course Assignment'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Course Subject *
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
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
              Assignment Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement B+ Tree Indexing in C++"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Work Time (Minutes)
              </label>
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                required
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssignmentStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deliverable Description / Submission Details
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Requirements, portal upload links, or rubric notes..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
            >
              {editingAssignment ? 'Save Changes' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingAssignment)}
        onClose={() => setDeletingAssignment(null)}
        title="Delete Assignment"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">{deletingAssignment?.title}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDeletingAssignment(null)}
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
