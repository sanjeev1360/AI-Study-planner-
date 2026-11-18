import React, { useState } from 'react';
import {
  ListTree,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Clock,
  BookOpen,
  Filter,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Topic, DifficultyLevel, PriorityLevel } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { DifficultyBadge, PriorityBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface TopicsViewProps {
  initialSubjectId?: string;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const TopicsView: React.FC<TopicsViewProps> = ({
  initialSubjectId,
  isAddModalOpen = false,
  onCloseAddModal,
}) => {
  const { subjects, topics, addTopic, updateTopic, deleteTopic, toggleTopicCompletion } =
    usePlanner();

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'completed'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DifficultyLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [importance, setImportance] = useState<PriorityLevel>('Medium');
  const [notes, setNotes] = useState('');

  const openCreateModal = (subjId?: string) => {
    setEditingTopic(null);
    setName('');
    setSubjectId(subjId || (subjects.length > 0 ? subjects[0].id : ''));
    setDifficulty('Medium');
    setEstimatedMinutes(45);
    setImportance('Medium');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Topic) => {
    setEditingTopic(t);
    setName(t.name);
    setSubjectId(t.subject_id);
    setDifficulty(t.difficulty);
    setEstimatedMinutes(t.estimated_time_minutes || 45);
    setImportance(t.importance);
    setNotes(t.notes || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subjectId) return;

    if (editingTopic) {
      await updateTopic(editingTopic.id, {
        name: name.trim(),
        subject_id: subjectId,
        difficulty,
        estimated_time_minutes: Number(estimatedMinutes),
        importance,
        notes: notes.trim() || undefined,
      });
    } else {
      await addTopic({
        name: name.trim(),
        subject_id: subjectId,
        difficulty,
        estimated_time_minutes: Number(estimatedMinutes),
        is_completed: false,
        importance,
        notes: notes.trim() || undefined,
      });
    }
    closeModal();
  };

  const confirmDelete = async () => {
    if (deletingTopic) {
      await deleteTopic(deletingTopic.id);
      setDeletingTopic(null);
    }
  };

  // Filter topics
  const filteredTopics = topics.filter((t) => {
    if (selectedSubjectId !== 'all' && t.subject_id !== selectedSubjectId) return false;
    if (statusFilter === 'completed' && !t.is_completed) return false;
    if (statusFilter === 'incomplete' && t.is_completed) return false;
    if (difficultyFilter !== 'all' && t.difficulty !== difficultyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      if (!matchName && !matchNotes) return false;
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
            <ListTree className="h-6 w-6 text-purple-600" />
            Topic & Syllabus Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Break down course syllabi into granular topics with difficulty ratings and time estimates.
          </p>
        </div>
        <button
          onClick={() => openCreateModal(selectedSubjectId !== 'all' ? selectedSubjectId : undefined)}
          disabled={subjects.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-sm shadow-purple-500/20 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Topic</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">Please add a subject first</h3>
          <p className="text-xs text-slate-500 mt-1">
            Topics must belong to a course subject. Add your first subject to start adding topics.
          </p>
        </div>
      ) : (
        <>
          {/* Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            {/* Subject selector pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="font-semibold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Course:
              </span>
              <button
                onClick={() => setSelectedSubjectId('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedSubjectId === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Courses ({topics.length})
              </button>
              {subjects.map((sub) => {
                const count = topics.filter((t) => t.subject_id === sub.id).length;
                const isSelected = selectedSubjectId === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: sub.color || '#3B82F6' }}
                    />
                    <span>{sub.code || sub.name}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search + Status + Difficulty filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topics or notes..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="incomplete">Incomplete Only</option>
                <option value="completed">Completed Only</option>
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Topics List */}
          {filteredTopics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <ListTree className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No matching topics found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust your filters or add a new topic to this subject.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTopics.map((topic) => {
                const subject = subjects.find((s) => s.id === topic.subject_id);

                return (
                  <div
                    key={topic.id}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                      topic.is_completed
                        ? 'bg-slate-50/70 border-slate-200 opacity-80'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTopicCompletion(topic.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none shrink-0"
                        title={topic.is_completed ? 'Mark as Incomplete' : 'Mark as Completed'}
                      >
                        {topic.is_completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700"
                            style={{
                              backgroundColor: `${subject?.color || '#3B82F6'}15`,
                              borderLeft: `3px solid ${subject?.color || '#3B82F6'}`,
                            }}
                          >
                            {subject?.name}
                          </span>
                          <DifficultyBadge difficulty={topic.difficulty} size="sm" />
                          <PriorityBadge priority={topic.importance} size="sm" />
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <Clock className="h-3 w-3" />
                            {topic.estimated_time_minutes} min
                          </span>
                        </div>

                        <h3
                          className={`text-sm font-semibold mt-1.5 ${
                            topic.is_completed
                              ? 'line-through text-slate-500'
                              : 'text-slate-900 group-hover:text-blue-600'
                          }`}
                        >
                          {topic.name}
                        </h3>

                        {topic.notes && (
                          <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{topic.notes}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 sm:mt-0 flex items-center justify-end gap-1 shrink-0 pl-8 sm:pl-0">
                      <button
                        onClick={() => openEditModal(topic)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Topic"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTopic(topic)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Topic"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Topic Modal */}
      <Modal
        isOpen={effectiveOpen}
        onClose={closeModal}
        title={editingTopic ? 'Edit Topic' : 'Add New Topic to Syllabus'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Associated Course Subject *
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
            >
              <option value="">Select Course Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.difficulty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Topic Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Graph Algorithms: Dijkstra & Bellman-Ford"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              >
                <option value="Easy">Easy (Conceptual/Intro)</option>
                <option value="Medium">Medium (Standard Problems)</option>
                <option value="Hard">Hard (Complex/High Weightage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Importance / Priority
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Study Time (Minutes)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={15}
                max={360}
                step={15}
                required
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-32 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
              <span className="text-xs text-slate-500">
                (~{(estimatedMinutes / 60).toFixed(1)} hours)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Study Notes or Key References
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on proofs, time complexities, or practice question 4 from Chapter 3"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-xs"
            >
              {editingTopic ? 'Save Changes' : 'Add Topic'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingTopic)}
        onClose={() => setDeletingTopic(null)}
        title="Delete Topic Confirmation"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">{deletingTopic?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDeletingTopic(null)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
            >
              Delete Topic
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
