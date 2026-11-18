import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Calendar,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Subject, PriorityLevel, DifficultyLevel } from '../../types';
import { usePlanner } from '../../context/PlannerContext';
import { PriorityBadge, DifficultyBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface SubjectsViewProps {
  onAddTopicForSubject?: (subjectId: string) => void;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#EF4444', // Red
];

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  onAddTopicForSubject,
  isAddModalOpen = false,
  onCloseAddModal,
}) => {
  const { subjects, topics, addSubject, updateSubject, deleteSubject } = usePlanner();

  // Internal modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [examDate, setExamDate] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  // Delete confirmation
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setDescription('');
    setDifficulty('Medium');
    setExamDate('');
    setPriority('Medium');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setCode(subject.code || '');
    setDescription(subject.description || '');
    setDifficulty(subject.difficulty);
    setExamDate(subject.exam_date || '');
    setPriority(subject.priority);
    setColor(subject.color || PRESET_COLORS[0]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingSubject) {
      await updateSubject(editingSubject.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        difficulty,
        exam_date: examDate || undefined,
        priority,
        color,
      });
    } else {
      await addSubject({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        difficulty,
        exam_date: examDate || undefined,
        priority,
        color,
      });
    }
    closeModal();
  };

  const confirmDelete = async () => {
    if (deletingSubject) {
      await deleteSubject(deletingSubject.id);
      setDeletingSubject(null);
    }
  };

  const effectiveOpen = isModalOpen || isAddModalOpen;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            My Academic Subjects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your courses, target exam dates, syllabus complexity, and track subject-level completion.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Subject</span>
        </button>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <BookOpen className="h-12 w-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No subjects added yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Get started by adding your college courses (e.g. Data Structures, Operating Systems, Database Systems).
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Subject</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => {
            const subTopics = topics.filter((t) => t.subject_id === sub.id);
            const completedCount = subTopics.filter((t) => t.is_completed).length;
            const remainingCount = subTopics.length - completedCount;
            const percentage =
              subTopics.length > 0
                ? Math.round((completedCount / subTopics.length) * 100)
                : 0;

            const totalStudyMins = subTopics.reduce(
              (acc, t) => acc + (t.estimated_time_minutes || 45),
              0
            );
            const totalHours = (totalStudyMins / 60).toFixed(1);

            let daysUntilExam: number | null = null;
            if (sub.exam_date) {
              const diff = new Date(sub.exam_date).getTime() - new Date().setHours(0, 0, 0, 0);
              daysUntilExam = Math.ceil(diff / (1000 * 60 * 60 * 24));
            }

            return (
              <div
                key={sub.id}
                className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Subject color top bar */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: sub.color || '#3B82F6' }}
                />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Code & Action icons */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {sub.code && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
                            {sub.code}
                          </span>
                        )}
                        <PriorityBadge priority={sub.priority} size="sm" />
                      </div>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(sub)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Subject"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingSubject(sub)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {sub.name}
                    </h3>
                    {sub.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {sub.description}
                      </p>
                    )}

                    {/* Metadata Badges */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      <DifficultyBadge difficulty={sub.difficulty} size="sm" />

                      {sub.exam_date && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                            daysUntilExam !== null && daysUntilExam <= 7
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(sub.exam_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {daysUntilExam !== null && (
                              <span className="ml-1 text-[10px] font-bold">
                                ({daysUntilExam <= 0 ? 'Today' : `${daysUntilExam}d`})
                              </span>
                            )}
                          </span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/60">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{totalHours}h est.</span>
                      </span>
                    </div>
                  </div>

                  {/* Syllabus Progress Bar */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600">Syllabus Progress</span>
                      <span className="text-slate-900 font-bold">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: sub.color || '#3B82F6',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                      <span className="text-emerald-600">{completedCount} Completed</span>
                      <span className="text-slate-500">{remainingCount} Remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={effectiveOpen}
        onClose={closeModal}
        title={editingSubject ? 'Edit Course Subject' : 'Add New Subject'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Code (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS301"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description or Syllabus Scope
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key concepts, textbook chapters, or exam focus areas..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Card Accent Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingSubject)}
        onClose={() => setDeletingSubject(null)}
        title="Delete Subject Confirmation"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">{deletingSubject?.name}</strong>?
          </p>
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>
              All associated topics, study sessions, and assignments for this subject will also be deleted.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDeletingSubject(null)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
