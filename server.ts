import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);

const MYSQL_HOST = process.env.MYSQL_HOST?.trim() || '';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER?.trim() || '';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE?.trim() || 'ai_study_planner';

const isMySqlConfigured = (): boolean => {
  if (process.env.MYSQL_ENABLED === 'false') return false;
  if (process.env.MYSQL_ENABLED === 'true') return true;
  return Boolean(MYSQL_HOST && MYSQL_USER);
};

let pool: Pool | null = null;
let lastConnectionError: string | null = null;
let schemaInitialized = false;

const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, stored: string): boolean => {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, 'hex');
  if (derived.length !== originalBuffer.length) return false;
  return crypto.timingSafeEqual(derived, originalBuffer);
};

const ensureDatabaseAndTables = async (): Promise<Pool> => {
  if (pool && schemaInitialized) {
    // Quick ping to ensure connection is alive
    await pool.query('SELECT 1');
    return pool;
  }

  // First connect without specifying a database so we can create it if missing
  const bootstrapConn = await mysql.createConnection({
    host: MYSQL_HOST || 'localhost',
    port: MYSQL_PORT,
    user: MYSQL_USER || 'root',
    password: MYSQL_PASSWORD,
  });

  try {
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrapConn.end();
  }

  if (!pool) {
    pool = mysql.createPool({
      host: MYSQL_HOST || 'localhost',
      port: MYSQL_PORT,
      user: MYSQL_USER || 'root',
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(128) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT,
      full_name VARCHAR(255) NOT NULL,
      college VARCHAR(255),
      major VARCHAR(255),
      semester VARCHAR(100),
      created_at VARCHAR(64) NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(64),
      description TEXT,
      difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Medium',
      exam_date VARCHAR(32),
      priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
      color VARCHAR(32) NOT NULL DEFAULT '#4F46E5',
      created_at VARCHAR(64) NOT NULL,
      INDEX idx_subjects_user (user_id),
      CONSTRAINT fk_subjects_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS topics (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      subject_id VARCHAR(128) NOT NULL,
      name VARCHAR(255) NOT NULL,
      difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Medium',
      estimated_time_minutes INT NOT NULL DEFAULT 45,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      importance ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
      notes TEXT,
      completed_at VARCHAR(64),
      created_at VARCHAR(64) NOT NULL,
      INDEX idx_topics_user (user_id),
      INDEX idx_topics_subject (subject_id),
      CONSTRAINT fk_topics_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_topics_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      subject_id VARCHAR(128) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date VARCHAR(64) NOT NULL,
      estimated_minutes INT NOT NULL DEFAULT 60,
      priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
      status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
      created_at VARCHAR(64) NOT NULL,
      INDEX idx_assignments_user (user_id),
      CONSTRAINT fk_assignments_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_assignments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      subject_id VARCHAR(128) NOT NULL,
      topic_id VARCHAR(128),
      assignment_id VARCHAR(128),
      title VARCHAR(255) NOT NULL,
      date VARCHAR(32) NOT NULL,
      start_time VARCHAR(16) NOT NULL,
      end_time VARCHAR(16) NOT NULL,
      duration_minutes INT NOT NULL,
      status ENUM('Planned', 'In Progress', 'Completed', 'Missed') NOT NULL DEFAULT 'Planned',
      notes TEXT,
      created_at VARCHAR(64) NOT NULL,
      INDEX idx_sessions_user_date (user_id, date),
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_sessions_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_preferences (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL UNIQUE,
      daily_study_hours DECIMAL(4,1) NOT NULL DEFAULT 4.0,
      preferred_start_time VARCHAR(16) NOT NULL DEFAULT '09:00',
      preferred_days JSON NOT NULL,
      break_interval_minutes INT NOT NULL DEFAULT 50,
      break_duration_minutes INT NOT NULL DEFAULT 10,
      max_session_minutes INT NOT NULL DEFAULT 60,
      include_assignments BOOLEAN NOT NULL DEFAULT TRUE,
      prioritize_near_exams BOOLEAN NOT NULL DEFAULT TRUE,
      CONSTRAINT fk_prefs_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  schemaInitialized = true;
  lastConnectionError = null;
  return pool;
};

const getActivePool = async (): Promise<Pool | null> => {
  if (!isMySqlConfigured()) return null;
  try {
    return await ensureDatabaseAndTables();
  } catch (err: any) {
    lastConnectionError = err?.message || 'Unable to connect to MySQL';
    schemaInitialized = false;
    return null;
  }
};

// Row normalizers so MySQL DECIMAL/TINYINT/JSON match TypeScript types exactly
const normalizeProfile = (row: RowDataPacket) => ({
  id: row.id,
  email: row.email,
  full_name: row.full_name,
  college: row.college || undefined,
  major: row.major || undefined,
  semester: row.semester || undefined,
  created_at: row.created_at,
});

const normalizeSubject = (row: RowDataPacket) => ({
  id: row.id,
  user_id: row.user_id,
  name: row.name,
  code: row.code || undefined,
  description: row.description || undefined,
  difficulty: row.difficulty,
  exam_date: row.exam_date || undefined,
  priority: row.priority,
  color: row.color,
  created_at: row.created_at,
});

const normalizeTopic = (row: RowDataPacket) => ({
  id: row.id,
  user_id: row.user_id,
  subject_id: row.subject_id,
  name: row.name,
  difficulty: row.difficulty,
  estimated_time_minutes: Number(row.estimated_time_minutes),
  is_completed: Boolean(row.is_completed),
  importance: row.importance,
  notes: row.notes || undefined,
  completed_at: row.completed_at || undefined,
  created_at: row.created_at,
});

const normalizeAssignment = (row: RowDataPacket) => ({
  id: row.id,
  user_id: row.user_id,
  subject_id: row.subject_id,
  title: row.title,
  description: row.description || undefined,
  due_date: row.due_date,
  estimated_minutes: Number(row.estimated_minutes),
  priority: row.priority,
  status: row.status,
  created_at: row.created_at,
});

const normalizeSession = (row: RowDataPacket) => ({
  id: row.id,
  user_id: row.user_id,
  subject_id: row.subject_id,
  topic_id: row.topic_id || undefined,
  assignment_id: row.assignment_id || undefined,
  title: row.title,
  date: row.date,
  start_time: row.start_time,
  end_time: row.end_time,
  duration_minutes: Number(row.duration_minutes),
  status: row.status,
  notes: row.notes || undefined,
  created_at: row.created_at,
});

const normalizePreferences = (row: RowDataPacket) => {
  let preferredDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (Array.isArray(row.preferred_days)) {
    preferredDays = row.preferred_days;
  } else if (typeof row.preferred_days === 'string') {
    try {
      const parsed = JSON.parse(row.preferred_days);
      if (Array.isArray(parsed)) preferredDays = parsed;
    } catch {
      // keep default
    }
  }

  return {
    id: row.id,
    user_id: row.user_id,
    daily_study_hours: Number(row.daily_study_hours),
    preferred_start_time: row.preferred_start_time,
    preferred_days: preferredDays,
    break_interval_minutes: Number(row.break_interval_minutes),
    break_duration_minutes: Number(row.break_duration_minutes),
    max_session_minutes: Number(row.max_session_minutes),
    include_assignments: Boolean(row.include_assignments),
    prioritize_near_exams: Boolean(row.prioritize_near_exams),
  };
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Initialize MySQL at boot only if configured
  if (isMySqlConfigured()) {
    const active = await getActivePool();
    if (active) {
      console.log(`[MySQL] Connected to ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE} and verified schema.`);
    } else {
      console.warn(`[MySQL] Configured but unreachable (${lastConnectionError}). Falling back gracefully.`);
    }
  } else {
    console.log('[MySQL] Not configured in environment. Running in Local Storage / Supabase mode.');
  }

  // Health Check
  app.get('/api/health', async (_req: Request, res: Response) => {
    const configured = isMySqlConfigured();
    if (!configured) {
      res.json({
        mysqlConfigured: false,
        mysqlConnected: false,
        database: MYSQL_DATABASE,
      });
      return;
    }

    const db = await getActivePool();
    res.json({
      mysqlConfigured: true,
      mysqlConnected: Boolean(db),
      database: MYSQL_DATABASE,
      error: db ? undefined : lastConnectionError || 'Connection failed',
    });
  });

  // Middleware helper for routes requiring active MySQL
  const requireDb = async (res: Response): Promise<Pool | null> => {
    const db = await getActivePool();
    if (!db) {
      res.status(503).json({
        error: lastConnectionError || 'MySQL database is not connected.',
      });
      return null;
    }
    return db;
  };

  // --- Auth Routes ---
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;

    try {
      const { email, password, fullName, college, major, semester } = req.body;
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) {
        res.status(400).json({ error: 'Email is required.' });
        return;
      }

      const [existing] = await db.query<RowDataPacket[]>(
        'SELECT id FROM profiles WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [cleanEmail]
      );

      if (existing.length > 0) {
        res.status(409).json({
          error: 'An account with this email already exists. Please sign in instead.',
        });
        return;
      }

      const userId = `student-${crypto.randomUUID().slice(0, 12)}`;
      const createdAt = new Date().toISOString();
      const passwordHash = password ? hashPassword(String(password)) : null;

      await db.query(
        `INSERT INTO profiles (id, email, password_hash, full_name, college, major, semester, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          cleanEmail,
          passwordHash,
          fullName || cleanEmail.split('@')[0],
          college || 'State University',
          major || 'Computer Science & Engineering',
          semester || '6th Semester',
          createdAt,
        ]
      );

      const prefId = `pref-${crypto.randomUUID().slice(0, 10)}`;
      await db.query(
        `INSERT INTO study_preferences
          (id, user_id, daily_study_hours, preferred_start_time, preferred_days, break_interval_minutes, break_duration_minutes, max_session_minutes, include_assignments, prioritize_near_exams)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prefId,
          userId,
          4.0,
          '09:00',
          JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
          50,
          10,
          60,
          true,
          true,
        ]
      );

      res.status(201).json({
        user: {
          id: userId,
          email: cleanEmail,
          full_name: fullName || cleanEmail.split('@')[0],
          college: college || 'State University',
          major: major || 'Computer Science & Engineering',
          semester: semester || '6th Semester',
          created_at: createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Signup failed in MySQL.' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;

    try {
      const { email, password } = req.body;
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) {
        res.status(400).json({ error: 'Email is required.' });
        return;
      }

      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM profiles WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [cleanEmail]
      );

      if (rows.length === 0) {
        res.status(401).json({
          error: 'No account found with this email in MySQL. Please create an account first.',
        });
        return;
      }

      const userRow = rows[0];
      if (userRow.password_hash) {
        if (!password || !verifyPassword(String(password), String(userRow.password_hash))) {
          res.status(401).json({ error: 'Invalid email or password.' });
          return;
        }
      }

      res.json({ user: normalizeProfile(userRow) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Login failed in MySQL.' });
    }
  });

  // --- Profiles ---
  app.get('/api/profiles/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM profiles WHERE id = ? LIMIT 1', [
        req.params.userId,
      ]);
      if (rows.length === 0) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      res.json(normalizeProfile(rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.put('/api/profiles/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const p = req.body;
      const userId = req.params.userId;
      await db.query(
        `INSERT INTO profiles (id, email, full_name, college, major, semester, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           email = VALUES(email),
           full_name = VALUES(full_name),
           college = VALUES(college),
           major = VALUES(major),
           semester = VALUES(semester)`,
        [
          userId,
          p.email,
          p.full_name,
          p.college || null,
          p.major || null,
          p.semester || null,
          p.created_at || new Date().toISOString(),
        ]
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Subjects ---
  app.get('/api/subjects/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM subjects WHERE user_id = ? ORDER BY created_at DESC',
        [req.params.userId]
      );
      res.json(rows.map(normalizeSubject));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/subjects', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const s = req.body;
      await db.query(
        `INSERT INTO subjects (id, user_id, name, code, description, difficulty, exam_date, priority, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           code = VALUES(code),
           description = VALUES(description),
           difficulty = VALUES(difficulty),
           exam_date = VALUES(exam_date),
           priority = VALUES(priority),
           color = VALUES(color)`,
        [
          s.id,
          s.user_id,
          s.name,
          s.code || null,
          s.description || null,
          s.difficulty,
          s.exam_date || null,
          s.priority,
          s.color,
          s.created_at,
        ]
      );
      res.json(s);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/subjects/:id', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      await db.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Topics ---
  app.get('/api/topics/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM topics WHERE user_id = ? ORDER BY created_at DESC',
        [req.params.userId]
      );
      res.json(rows.map(normalizeTopic));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/topics', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const t = req.body;
      await db.query(
        `INSERT INTO topics (id, user_id, subject_id, name, difficulty, estimated_time_minutes, is_completed, importance, notes, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           subject_id = VALUES(subject_id),
           name = VALUES(name),
           difficulty = VALUES(difficulty),
           estimated_time_minutes = VALUES(estimated_time_minutes),
           is_completed = VALUES(is_completed),
           importance = VALUES(importance),
           notes = VALUES(notes),
           completed_at = VALUES(completed_at)`,
        [
          t.id,
          t.user_id,
          t.subject_id,
          t.name,
          t.difficulty,
          t.estimated_time_minutes,
          Boolean(t.is_completed),
          t.importance,
          t.notes || null,
          t.completed_at || null,
          t.created_at,
        ]
      );
      res.json(t);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/topics/:id', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      await db.query('DELETE FROM topics WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Assignments ---
  app.get('/api/assignments/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC',
        [req.params.userId]
      );
      res.json(rows.map(normalizeAssignment));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/assignments', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const a = req.body;
      await db.query(
        `INSERT INTO assignments (id, user_id, subject_id, title, description, due_date, estimated_minutes, priority, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           subject_id = VALUES(subject_id),
           title = VALUES(title),
           description = VALUES(description),
           due_date = VALUES(due_date),
           estimated_minutes = VALUES(estimated_minutes),
           priority = VALUES(priority),
           status = VALUES(status)`,
        [
          a.id,
          a.user_id,
          a.subject_id,
          a.title,
          a.description || null,
          a.due_date,
          a.estimated_minutes,
          a.priority,
          a.status,
          a.created_at,
        ]
      );
      res.json(a);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.delete('/api/assignments/:id', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      await db.query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Study Sessions ---
  app.get('/api/sessions/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM study_sessions WHERE user_id = ? ORDER BY date ASC, start_time ASC',
        [req.params.userId]
      );
      res.json(rows.map(normalizeSession));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/sessions', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const s = req.body;
      await db.query(
        `INSERT INTO study_sessions (id, user_id, subject_id, topic_id, assignment_id, title, date, start_time, end_time, duration_minutes, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           subject_id = VALUES(subject_id),
           topic_id = VALUES(topic_id),
           assignment_id = VALUES(assignment_id),
           title = VALUES(title),
           date = VALUES(date),
           start_time = VALUES(start_time),
           end_time = VALUES(end_time),
           duration_minutes = VALUES(duration_minutes),
           status = VALUES(status),
           notes = VALUES(notes)`,
        [
          s.id,
          s.user_id,
          s.subject_id,
          s.topic_id || null,
          s.assignment_id || null,
          s.title,
          s.date,
          s.start_time,
          s.end_time,
          s.duration_minutes,
          s.status,
          s.notes || null,
          s.created_at,
        ]
      );
      res.json(s);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/sessions/bulk', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    const conn = await db.getConnection();
    try {
      const { userId, sessions, replaceFromDate } = req.body;
      await conn.beginTransaction();

      if (replaceFromDate && userId) {
        await conn.query(
          "DELETE FROM study_sessions WHERE user_id = ? AND date >= ? AND status != 'Completed'",
          [userId, replaceFromDate]
        );
      }

      if (Array.isArray(sessions)) {
        for (const s of sessions) {
          await conn.query(
            `INSERT INTO study_sessions (id, user_id, subject_id, topic_id, assignment_id, title, date, start_time, end_time, duration_minutes, status, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               subject_id = VALUES(subject_id),
               topic_id = VALUES(topic_id),
               assignment_id = VALUES(assignment_id),
               title = VALUES(title),
               date = VALUES(date),
               start_time = VALUES(start_time),
               end_time = VALUES(end_time),
               duration_minutes = VALUES(duration_minutes),
               status = VALUES(status),
               notes = VALUES(notes)`,
            [
              s.id,
              s.user_id,
              s.subject_id,
              s.topic_id || null,
              s.assignment_id || null,
              s.title,
              s.date,
              s.start_time,
              s.end_time,
              s.duration_minutes,
              s.status,
              s.notes || null,
              s.created_at,
            ]
          );
        }
      }

      await conn.commit();
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM study_sessions WHERE user_id = ? ORDER BY date ASC, start_time ASC',
        [userId]
      );
      res.json(rows.map(normalizeSession));
    } catch (err: any) {
      await conn.rollback();
      res.status(500).json({ error: err?.message });
    } finally {
      conn.release();
    }
  });

  app.delete('/api/sessions/:id', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      await db.query('DELETE FROM study_sessions WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Preferences ---
  app.get('/api/preferences/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM study_preferences WHERE user_id = ? LIMIT 1',
        [req.params.userId]
      );
      if (rows.length === 0) {
        res.status(404).json({ error: 'Preferences not found' });
        return;
      }
      res.json(normalizePreferences(rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.put('/api/preferences/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    try {
      const p = req.body;
      const userId = req.params.userId;
      const prefId = p.id || `pref-${userId}`;
      await db.query(
        `INSERT INTO study_preferences
          (id, user_id, daily_study_hours, preferred_start_time, preferred_days, break_interval_minutes, break_duration_minutes, max_session_minutes, include_assignments, prioritize_near_exams)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           daily_study_hours = VALUES(daily_study_hours),
           preferred_start_time = VALUES(preferred_start_time),
           preferred_days = VALUES(preferred_days),
           break_interval_minutes = VALUES(break_interval_minutes),
           break_duration_minutes = VALUES(break_duration_minutes),
           max_session_minutes = VALUES(max_session_minutes),
           include_assignments = VALUES(include_assignments),
           prioritize_near_exams = VALUES(prioritize_near_exams)`,
        [
          prefId,
          userId,
          p.daily_study_hours,
          p.preferred_start_time,
          JSON.stringify(p.preferred_days || []),
          p.break_interval_minutes,
          p.break_duration_minutes,
          p.max_session_minutes,
          Boolean(p.include_assignments),
          Boolean(p.prioritize_near_exams),
        ]
      );
      res.json({ ...p, id: prefId, user_id: userId });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // --- Seed Demo Data ---
  app.post('/api/seed-demo/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    const conn = await db.getConnection();
    try {
      const userId = req.params.userId;
      const { profile, subjects, topics, assignments, sessions, preferences } = req.body;

      await conn.beginTransaction();

      if (profile) {
        await conn.query(
          `INSERT INTO profiles (id, email, full_name, college, major, semester, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             full_name = VALUES(full_name),
             college = VALUES(college),
             major = VALUES(major),
             semester = VALUES(semester)`,
          [
            userId,
            profile.email,
            profile.full_name,
            profile.college || null,
            profile.major || null,
            profile.semester || null,
            profile.created_at,
          ]
        );
      }

      if (Array.isArray(subjects)) {
        for (const s of subjects) {
          await conn.query(
            `INSERT INTO subjects (id, user_id, name, code, description, difficulty, exam_date, priority, color, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               code = VALUES(code),
               description = VALUES(description),
               difficulty = VALUES(difficulty),
               exam_date = VALUES(exam_date),
               priority = VALUES(priority),
               color = VALUES(color)`,
            [
              s.id,
              userId,
              s.name,
              s.code || null,
              s.description || null,
              s.difficulty,
              s.exam_date || null,
              s.priority,
              s.color,
              s.created_at,
            ]
          );
        }
      }

      if (Array.isArray(topics)) {
        for (const t of topics) {
          await conn.query(
            `INSERT INTO topics (id, user_id, subject_id, name, difficulty, estimated_time_minutes, is_completed, importance, notes, completed_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               subject_id = VALUES(subject_id),
               name = VALUES(name),
               difficulty = VALUES(difficulty),
               estimated_time_minutes = VALUES(estimated_time_minutes),
               is_completed = VALUES(is_completed),
               importance = VALUES(importance),
               notes = VALUES(notes),
               completed_at = VALUES(completed_at)`,
            [
              t.id,
              userId,
              t.subject_id,
              t.name,
              t.difficulty,
              t.estimated_time_minutes,
              Boolean(t.is_completed),
              t.importance,
              t.notes || null,
              t.completed_at || null,
              t.created_at,
            ]
          );
        }
      }

      if (Array.isArray(assignments)) {
        for (const a of assignments) {
          await conn.query(
            `INSERT INTO assignments (id, user_id, subject_id, title, description, due_date, estimated_minutes, priority, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               subject_id = VALUES(subject_id),
               title = VALUES(title),
               description = VALUES(description),
               due_date = VALUES(due_date),
               estimated_minutes = VALUES(estimated_minutes),
               priority = VALUES(priority),
               status = VALUES(status)`,
            [
              a.id,
              userId,
              a.subject_id,
              a.title,
              a.description || null,
              a.due_date,
              a.estimated_minutes,
              a.priority,
              a.status,
              a.created_at,
            ]
          );
        }
      }

      if (Array.isArray(sessions)) {
        for (const s of sessions) {
          await conn.query(
            `INSERT INTO study_sessions (id, user_id, subject_id, topic_id, assignment_id, title, date, start_time, end_time, duration_minutes, status, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               subject_id = VALUES(subject_id),
               topic_id = VALUES(topic_id),
               assignment_id = VALUES(assignment_id),
               title = VALUES(title),
               date = VALUES(date),
               start_time = VALUES(start_time),
               end_time = VALUES(end_time),
               duration_minutes = VALUES(duration_minutes),
               status = VALUES(status),
               notes = VALUES(notes)`,
            [
              s.id,
              userId,
              s.subject_id,
              s.topic_id || null,
              s.assignment_id || null,
              s.title,
              s.date,
              s.start_time,
              s.end_time,
              s.duration_minutes,
              s.status,
              s.notes || null,
              s.created_at,
            ]
          );
        }
      }

      if (preferences) {
        await conn.query(
          `INSERT INTO study_preferences
            (id, user_id, daily_study_hours, preferred_start_time, preferred_days, break_interval_minutes, break_duration_minutes, max_session_minutes, include_assignments, prioritize_near_exams)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             daily_study_hours = VALUES(daily_study_hours),
             preferred_start_time = VALUES(preferred_start_time),
             preferred_days = VALUES(preferred_days),
             break_interval_minutes = VALUES(break_interval_minutes),
             break_duration_minutes = VALUES(break_duration_minutes),
             max_session_minutes = VALUES(max_session_minutes),
             include_assignments = VALUES(include_assignments),
             prioritize_near_exams = VALUES(prioritize_near_exams)`,
          [
            preferences.id || `pref-${userId}`,
            userId,
            preferences.daily_study_hours,
            preferences.preferred_start_time,
            JSON.stringify(preferences.preferred_days || []),
            preferences.break_interval_minutes,
            preferences.break_duration_minutes,
            preferences.max_session_minutes,
            Boolean(preferences.include_assignments),
            Boolean(preferences.prioritize_near_exams),
          ]
        );
      }

      await conn.commit();
      res.json({ ok: true });
    } catch (err: any) {
      await conn.rollback();
      res.status(500).json({ error: err?.message });
    } finally {
      conn.release();
    }
  });

  // --- Reset User Data ---
  app.delete('/api/reset/:userId', async (req: Request, res: Response) => {
    const db = await requireDb(res);
    if (!db) return;
    const conn = await db.getConnection();
    try {
      const userId = req.params.userId;
      await conn.beginTransaction();
      await conn.query('DELETE FROM study_sessions WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM assignments WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM topics WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM subjects WHERE user_id = ?', [userId]);
      await conn.commit();
      res.json({ ok: true });
    } catch (err: any) {
      await conn.rollback();
      res.status(500).json({ error: err?.message });
    } finally {
      conn.release();
    }
  });

  // Vite middleware for dev / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname || '.', 'dist');
    app.use(express.static(distDir));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Study Planner server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
