import { Subject, Topic, Assignment, StudySession, StudyPreferences, GeneratedPlanStats } from '../types';

export interface PlanGenerationOptions {
  startDate: string; // YYYY-MM-DD
  daysToPlan: number; // 7 for weekly, 14, etc.
  includeAssignments: boolean;
  includeCompletedTopicsForRevision?: boolean;
  preferences: StudyPreferences;
}

export interface PrioritizedItem {
  id: string;
  type: 'topic' | 'assignment';
  title: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedMinutes: number;
  remainingMinutes: number;
  priorityScore: number;
  deadlineUrgency: number;
  difficultyScore: number;
  incompleteWorkScore: number;
  dueDateOrExamDate?: string;
  daysRemaining?: number;
  originalTopic?: Topic;
  originalAssignment?: Assignment;
}

/**
 * Normalizes deadline urgency into [0, 1]
 * If exam or assignment is today or tomorrow -> close to 1.0
 * If 3 days -> ~0.85
 * If 7 days -> ~0.65
 * If 14 days -> ~0.45
 * If 30+ days -> ~0.20
 * If no date -> 0.10
 */
export function calculateDeadlineUrgency(targetDateStr?: string, fromDateStr?: string): { score: number; daysLeft?: number } {
  if (!targetDateStr) return { score: 0.1 };
  
  const from = fromDateStr ? new Date(fromDateStr) : new Date();
  const target = new Date(targetDateStr);
  
  // Set both to midnight to count pure days
  from.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - from.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysLeft <= 0) return { score: 1.0, daysLeft }; // Due today or overdue!
  if (daysLeft === 1) return { score: 0.95, daysLeft };
  if (daysLeft === 2) return { score: 0.90, daysLeft };
  if (daysLeft <= 4) return { score: 0.80, daysLeft };
  if (daysLeft <= 7) return { score: 0.65, daysLeft };
  if (daysLeft <= 14) return { score: 0.45, daysLeft };
  if (daysLeft <= 30) return { score: 0.30, daysLeft };
  return { score: 0.15, daysLeft };
}

/**
 * Normalizes difficulty [0, 1]
 * Hard = 1.0, Medium = 0.65, Easy = 0.30
 * Combined with Subject Priority (High: 1.0, Medium: 0.6, Low: 0.3)
 */
export function calculateDifficultyFactor(difficulty: 'Easy' | 'Medium' | 'Hard', subjectPriority: 'Low' | 'Medium' | 'High'): number {
  const diffMap = { Easy: 0.3, Medium: 0.65, Hard: 1.0 };
  const prioMap = { Low: 0.3, Medium: 0.65, High: 1.0 };
  
  const diffVal = diffMap[difficulty] || 0.6;
  const prioVal = prioMap[subjectPriority] || 0.6;
  
  // 60% topic difficulty, 40% subject overall priority
  return Math.min(1.0, diffVal * 0.6 + prioVal * 0.4);
}

/**
 * Normalizes incomplete work factor [0, 1]
 * Based on remaining uncompleted topics/assignments in that subject
 */
export function calculateIncompleteWorkFactor(
  subjectId: string,
  topics: Topic[],
  assignments: Assignment[]
): number {
  const subjectTopics = topics.filter((t) => t.subject_id === subjectId);
  if (subjectTopics.length === 0) return 0.5;

  const incompleteTopics = subjectTopics.filter((t) => !t.is_completed).length;
  const topicRatio = incompleteTopics / subjectTopics.length;

  const subjectAssignments = assignments.filter((a) => a.subject_id === subjectId);
  let assignmentRatio = 0.5;
  if (subjectAssignments.length > 0) {
    const incompleteAssignments = subjectAssignments.filter((a) => a.status !== 'Completed').length;
    assignmentRatio = incompleteAssignments / subjectAssignments.length;
  }

  return Math.min(1.0, topicRatio * 0.7 + assignmentRatio * 0.3);
}

/**
 * Formats minutes from midnight into "HH:mm"
 */
function minutesToTime(totalMins: number): string {
  const hours = Math.floor(totalMins / 60) % 24;
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converts "HH:mm" to minutes from midnight
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Generates an optimized, prioritized study timetable
 */
export function generateStudyPlan(
  userId: string,
  subjects: Subject[],
  topics: Topic[],
  assignments: Assignment[],
  options: PlanGenerationOptions
): {
  sessions: StudySession[];
  stats: GeneratedPlanStats;
  prioritizedItems: PrioritizedItem[];
} {
  const { startDate, daysToPlan, includeAssignments, includeCompletedTopicsForRevision, preferences } = options;

  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  // 1. Gather all candidate topics
  const candidateTopics = topics.filter((t) => {
    if (!subjectMap.has(t.subject_id)) return false;
    if (includeCompletedTopicsForRevision) return true;
    return !t.is_completed;
  });

  // 2. Gather candidate assignments if requested
  const candidateAssignments = includeAssignments
    ? assignments.filter((a) => a.status !== 'Completed' && subjectMap.has(a.subject_id))
    : [];

  // 3. Compute priority scores for each item
  // Formula: Priority Score = (0.4 × Deadline Urgency) + (0.3 × Topic Difficulty) + (0.3 × Incomplete Work)
  const prioritizedItems: PrioritizedItem[] = [];

  for (const topic of candidateTopics) {
    const subject = subjectMap.get(topic.subject_id)!;
    const { score: deadlineUrgency, daysLeft } = calculateDeadlineUrgency(subject.exam_date, startDate);
    const difficultyScore = calculateDifficultyFactor(topic.difficulty, subject.priority);
    const incompleteWorkScore = calculateIncompleteWorkFactor(subject.id, topics, assignments);

    // Apply exact formula requested
    const priorityScore =
      0.4 * deadlineUrgency +
      0.3 * difficultyScore +
      0.3 * incompleteWorkScore;

    prioritizedItems.push({
      id: topic.id,
      type: 'topic',
      title: `${topic.name}`,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color || '#4F46E5',
      difficulty: topic.difficulty,
      estimatedMinutes: topic.estimated_time_minutes || 45,
      remainingMinutes: topic.estimated_time_minutes || 45,
      priorityScore: Number(priorityScore.toFixed(3)),
      deadlineUrgency: Number(deadlineUrgency.toFixed(2)),
      difficultyScore: Number(difficultyScore.toFixed(2)),
      incompleteWorkScore: Number(incompleteWorkScore.toFixed(2)),
      dueDateOrExamDate: subject.exam_date,
      daysRemaining: daysLeft,
      originalTopic: topic,
    });
  }

  for (const asg of candidateAssignments) {
    const subject = subjectMap.get(asg.subject_id)!;
    const { score: deadlineUrgency, daysLeft } = calculateDeadlineUrgency(asg.due_date, startDate);
    const difficultyScore = calculateDifficultyFactor(asg.priority === 'High' ? 'Hard' : asg.priority === 'Medium' ? 'Medium' : 'Easy', subject.priority);
    const incompleteWorkScore = calculateIncompleteWorkFactor(subject.id, topics, assignments);

    const priorityScore =
      0.4 * deadlineUrgency +
      0.3 * difficultyScore +
      0.3 * incompleteWorkScore;

    prioritizedItems.push({
      id: asg.id,
      type: 'assignment',
      title: `Assignment: ${asg.title}`,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color || '#4F46E5',
      difficulty: asg.priority === 'High' ? 'Hard' : asg.priority === 'Medium' ? 'Medium' : 'Easy',
      estimatedMinutes: asg.estimated_minutes || 60,
      remainingMinutes: asg.estimated_minutes || 60,
      priorityScore: Number(priorityScore.toFixed(3)),
      deadlineUrgency: Number(deadlineUrgency.toFixed(2)),
      difficultyScore: Number(difficultyScore.toFixed(2)),
      incompleteWorkScore: Number(incompleteWorkScore.toFixed(2)),
      dueDateOrExamDate: asg.due_date,
      daysRemaining: daysLeft,
      originalAssignment: asg,
    });
  }

  // Sort descending by Priority Score
  prioritizedItems.sort((a, b) => b.priorityScore - a.priorityScore);

  const totalStudyMinutesNeeded = prioritizedItems.reduce((acc, item) => acc + item.estimatedMinutes, 0);

  // 4. Time slot allocation
  const sessions: StudySession[] = [];
  const maxSessionLength = preferences.max_session_minutes || 60;
  const breakDuration = preferences.break_duration_minutes || 10;
  const dailyAvailabilityMinutes = Math.round((preferences.daily_study_hours || 4) * 60);
  const preferredDaysSet = new Set((preferences.preferred_days || []).map((d) => d.toLowerCase()));

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let totalAllocatedMinutes = 0;
  const sessionsPerDay: Record<string, number> = {};
  const coveredSubjectIds = new Set<string>();

  // Clone items queue
  const queue = prioritizedItems.map((item) => ({ ...item }));

  const start = new Date(startDate);

  for (let dayOffset = 0; dayOffset < daysToPlan; dayOffset++) {
    if (queue.every((item) => item.remainingMinutes <= 0)) {
      break; // All pending work is scheduled!
    }

    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + dayOffset);
    const dayOfWeekName = dayNames[currentDay.getDay()].toLowerCase();

    // Check if this is a preferred study day
    if (preferredDaysSet.size > 0 && !preferredDaysSet.has(dayOfWeekName)) {
      continue;
    }

    const dateStr = currentDay.toISOString().split('T')[0];
    let dayAllocatedMins = 0;
    let currentClockMinutes = timeToMinutes(preferences.preferred_start_time || '09:00');

    while (dayAllocatedMins < dailyAvailabilityMinutes) {
      // Find the next item with remaining time
      const item = queue.find((i) => i.remainingMinutes > 0);
      if (!item) break;

      const remainingInDay = dailyAvailabilityMinutes - dayAllocatedMins;
      if (remainingInDay < 25) {
        // Less than 25 mins left today, wrap up for the day
        break;
      }

      // Duration for this session
      const sessionDuration = Math.min(item.remainingMinutes, maxSessionLength, remainingInDay);

      const startTime = minutesToTime(currentClockMinutes);
      const endTime = minutesToTime(currentClockMinutes + sessionDuration);

      const sessionId = `gen-${Date.now()}-${sessions.length + 1}`;
      const sessionTitle = item.type === 'assignment' ? item.title : `${item.subjectName}: ${item.title}`;

      sessions.push({
        id: sessionId,
        user_id: userId,
        subject_id: item.subjectId,
        topic_id: item.type === 'topic' ? item.id : undefined,
        assignment_id: item.type === 'assignment' ? item.id : undefined,
        title: sessionTitle,
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: sessionDuration,
        status: 'Planned',
        notes: `Priority Score: ${item.priorityScore} (Urgency: ${item.deadlineUrgency}, Difficulty: ${item.difficultyScore})`,
        created_at: new Date().toISOString(),
      });

      item.remainingMinutes -= sessionDuration;
      dayAllocatedMins += sessionDuration;
      totalAllocatedMinutes += sessionDuration;
      coveredSubjectIds.add(item.subjectId);

      sessionsPerDay[dateStr] = (sessionsPerDay[dateStr] || 0) + 1;

      // Advance clock with session + break
      currentClockMinutes += sessionDuration + breakDuration;
    }
  }

  // 5. Check if study time is insufficient
  let insufficientTimeNotice: string | undefined = undefined;
  const remainingUnscheduledMinutes = queue.reduce((sum, item) => sum + Math.max(0, item.remainingMinutes), 0);

  if (remainingUnscheduledMinutes > 0) {
    const deficitHours = (remainingUnscheduledMinutes / 60).toFixed(1);
    const availableHours = (totalAllocatedMinutes / 60).toFixed(1);
    insufficientTimeNotice = `Available study capacity across your selected days (${availableHours} hrs) is insufficient for all ${candidateTopics.length} pending topics and assignments. ${deficitHours} hrs of lower-priority material remain unscheduled. Recommended: increase daily study hours by ${(Number(deficitHours) / Math.max(1, daysToPlan)).toFixed(1)} hrs/day or add more study days.`;
  }

  const stats: GeneratedPlanStats = {
    totalStudyMinutesNeeded,
    totalStudyMinutesAllocated: totalAllocatedMinutes,
    totalSessionsGenerated: sessions.length,
    sessionsPerDay,
    insufficientTimeNotice,
    subjectsCovered: coveredSubjectIds.size,
  };

  return {
    sessions,
    stats,
    prioritizedItems,
  };
}

/**
 * Reschedule helper for missed or incomplete sessions
 */
export function rescheduleMissedSessions(
  missedSessions: StudySession[],
  existingSessions: StudySession[],
  preferences: StudyPreferences,
  fromDateStr: string
): StudySession[] {
  // Sort missed sessions by date/time
  const pendingToReschedule = [...missedSessions];

  // Map out existing busy slots on and after fromDateStr
  const existingMap = new Map<string, StudySession[]>();
  for (const s of existingSessions) {
    if (s.date >= fromDateStr && s.status !== 'Missed') {
      const list = existingMap.get(s.date) || [];
      list.push(s);
      existingMap.set(s.date, list);
    }
  }

  const newSessions: StudySession[] = [];
  const start = new Date(fromDateStr);
  const preferredDaysSet = new Set((preferences.preferred_days || []).map((d) => d.toLowerCase()));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dailyAvailabilityMinutes = Math.round((preferences.daily_study_hours || 4) * 60);
  const breakDuration = preferences.break_duration_minutes || 10;

  let dayOffset = 0;
  while (pendingToReschedule.length > 0 && dayOffset < 14) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + dayOffset);
    const dayOfWeekName = dayNames[currentDay.getDay()].toLowerCase();

    if (preferredDaysSet.size > 0 && !preferredDaysSet.has(dayOfWeekName)) {
      dayOffset++;
      continue;
    }

    const dateStr = currentDay.toISOString().split('T')[0];
    const dayExisting = existingMap.get(dateStr) || [];

    // Calculate minutes already booked on this day
    const alreadyBookedMinutes = dayExisting.reduce((acc, s) => acc + s.duration_minutes, 0);
    let remainingMinutesToday = dailyAvailabilityMinutes - alreadyBookedMinutes;

    if (remainingMinutesToday >= 30) {
      // Find latest end time of existing sessions or fallback to start time
      let lastClockMins = timeToMinutes(preferences.preferred_start_time || '09:00');
      for (const ex of dayExisting) {
        const exEnd = timeToMinutes(ex.end_time);
        if (exEnd > lastClockMins) {
          lastClockMins = exEnd + breakDuration;
        }
      }

      while (pendingToReschedule.length > 0 && remainingMinutesToday >= 30) {
        const item = pendingToReschedule.shift()!;
        const duration = Math.min(item.duration_minutes, remainingMinutesToday);

        const startTime = minutesToTime(lastClockMins);
        const endTime = minutesToTime(lastClockMins + duration);

        const rescheduled: StudySession = {
          ...item,
          id: `resched-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          status: 'Planned',
          notes: `${item.notes || ''} (Rescheduled from ${item.date})`.trim(),
        };

        newSessions.push(rescheduled);
        remainingMinutesToday -= duration;
        lastClockMins += duration + breakDuration;
      }
    }

    dayOffset++;
  }

  return newSessions;
}
