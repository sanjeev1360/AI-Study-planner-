import {
  Assignment,
  StudyPreferences,
  StudySession,
  Subject,
  Topic,
  UserProfile,
} from '../types';

export interface MySqlHealthStatus {
  mysqlConfigured: boolean;
  mysqlConnected: boolean;
  database?: string;
  error?: string;
}

let cachedHealth: MySqlHealthStatus | null = null;
let healthPromise: Promise<MySqlHealthStatus> | null = null;

export const refreshMySqlStatus = async (): Promise<MySqlHealthStatus> => {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    if (!res.ok) {
      cachedHealth = { mysqlConfigured: false, mysqlConnected: false };
      return cachedHealth;
    }
    const data = (await res.json()) as MySqlHealthStatus;
    cachedHealth = data;
    return data;
  } catch {
    cachedHealth = { mysqlConfigured: false, mysqlConnected: false };
    return cachedHealth;
  }
};

export const ensureMySqlChecked = async (): Promise<boolean> => {
  if (cachedHealth !== null) {
    return cachedHealth.mysqlConnected;
  }
  if (!healthPromise) {
    healthPromise = refreshMySqlStatus().finally(() => {
      healthPromise = null;
    });
  }
  const result = await healthPromise;
  return result.mysqlConnected;
};

export const isMySqlConnected = (): boolean => {
  return Boolean(cachedHealth?.mysqlConnected);
};

export const getCachedMySqlHealth = (): MySqlHealthStatus | null => cachedHealth;

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || `Request failed with status ${res.status}`);
  }
  return payload as T;
}

export const MySqlApi = {
  // Auth
  async signup(data: {
    email: string;
    password?: string;
    fullName: string;
    college?: string;
    major?: string;
    semester?: string;
  }): Promise<UserProfile> {
    const res = await apiJson<{ user: UserProfile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  },

  async login(email: string, password?: string): Promise<UserProfile> {
    const res = await apiJson<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res.user;
  },

  // Profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await apiJson<UserProfile>(`/api/profiles/${encodeURIComponent(userId)}`);
    } catch {
      return null;
    }
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    await apiJson(`/api/profiles/${encodeURIComponent(profile.id)}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  // Subjects
  async getSubjects(userId: string): Promise<Subject[]> {
    return apiJson<Subject[]>(`/api/subjects/${encodeURIComponent(userId)}`);
  },

  async saveSubject(subject: Subject): Promise<Subject> {
    return apiJson<Subject>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(subject),
    });
  },

  async deleteSubject(subjectId: string): Promise<void> {
    await apiJson(`/api/subjects/${encodeURIComponent(subjectId)}`, {
      method: 'DELETE',
    });
  },

  // Topics
  async getTopics(userId: string): Promise<Topic[]> {
    return apiJson<Topic[]>(`/api/topics/${encodeURIComponent(userId)}`);
  },

  async saveTopic(topic: Topic): Promise<Topic> {
    return apiJson<Topic>('/api/topics', {
      method: 'POST',
      body: JSON.stringify(topic),
    });
  },

  async deleteTopic(topicId: string): Promise<void> {
    await apiJson(`/api/topics/${encodeURIComponent(topicId)}`, {
      method: 'DELETE',
    });
  },

  // Assignments
  async getAssignments(userId: string): Promise<Assignment[]> {
    return apiJson<Assignment[]>(`/api/assignments/${encodeURIComponent(userId)}`);
  },

  async saveAssignment(assignment: Assignment): Promise<Assignment> {
    return apiJson<Assignment>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  },

  async deleteAssignment(assignmentId: string): Promise<void> {
    await apiJson(`/api/assignments/${encodeURIComponent(assignmentId)}`, {
      method: 'DELETE',
    });
  },

  // Study Sessions
  async getSessions(userId: string): Promise<StudySession[]> {
    return apiJson<StudySession[]>(`/api/sessions/${encodeURIComponent(userId)}`);
  },

  async saveSession(session: StudySession): Promise<StudySession> {
    return apiJson<StudySession>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  },

  async saveBulkSessions(
    userId: string,
    sessions: StudySession[],
    replaceFromDate?: string
  ): Promise<StudySession[]> {
    return apiJson<StudySession[]>('/api/sessions/bulk', {
      method: 'POST',
      body: JSON.stringify({ userId, sessions, replaceFromDate }),
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    await apiJson(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  },

  // Preferences
  async getPreferences(userId: string): Promise<StudyPreferences | null> {
    try {
      return await apiJson<StudyPreferences>(`/api/preferences/${encodeURIComponent(userId)}`);
    } catch {
      return null;
    }
  },

  async savePreferences(userId: string, preferences: StudyPreferences): Promise<StudyPreferences> {
    return apiJson<StudyPreferences>(`/api/preferences/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  },

  // Seed & Reset
  async seedDemoData(
    userId: string,
    payload: {
      profile: UserProfile;
      subjects: Subject[];
      topics: Topic[];
      assignments: Assignment[];
      sessions: StudySession[];
      preferences: StudyPreferences;
    }
  ): Promise<void> {
    await apiJson(`/api/seed-demo/${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetUserData(userId: string): Promise<void> {
    await apiJson(`/api/reset/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },
};
