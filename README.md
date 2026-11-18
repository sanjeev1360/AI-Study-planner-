# AI Study Planner 🎓

> **AI-Based Personalized Study Planner for College Students**  
> Built as a B.Tech Software Engineering and System Design (SESD) course project at SR University.

---

## 📌 Project Overview

**AI Study Planner** is a responsive web application designed to help university students organize academic coursework, syllabus topics, and assignments, generate mathematically prioritized study timetables, track study analytics, and automatically reschedule missed study sessions.

### 🌟 Key Features
- **Dynamic Priority Scheduling Algorithm:**
  $$\text{Priority Score} = 0.4 \times (\text{Deadline Urgency}) + 0.3 \times (\text{Topic Difficulty}) + 0.3 \times (\text{Incomplete Work})$$
- **Subject & Topic Management:** Track difficulty ratings (`Easy`, `Medium`, `Hard`), exam countdowns, estimated completion minutes, and notes.
- **Assignment & Deadlines Tracking:** Visual indicators for overdue submissions and approaching deadlines ($\le 3$ days).
- **Interactive Timetable:** Dual **Weekly** and **Daily** views with session lifecycles (`Planned`, `In Progress`, `Completed`, `Missed`).
- **Auto-Rescheduling Engine:** Re-allocates unfinished tasks into upcoming free slots without double-booking.
- **Progress Reports & Analytics:** Interactive charts powered by Recharts (Planned vs. Completed hours, syllabus coverage, status distribution).
- **Dual Persistence:** Instant local storage persistence with Supabase PostgreSQL cloud synchronization and Row-Level Security (RLS).

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Icons:** Lucide React
- **Build Tool:** Vite 8
- **Database & Auth:** Supabase (PostgreSQL 15 with RLS) & LocalStorage Cache

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/poladivasavi/ai-study-planner.git
cd ai-study-planner
```

### 2. Install dependencies
```bash
npm install
```
*(If you encounter peer dependency warnings, run: `npm install --legacy-peer-deps`)*

### 3. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Setup (Optional - Supabase)

The app runs out-of-the-box using local storage. To connect your Supabase PostgreSQL cloud database:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in Supabase and run the schema found in `src/lib/sqlSchema.ts` (or copy it from the app's **Settings** screen).
3. Create a `.env` file in the root folder:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

---

## 📜 Available Scripts

- `npm run dev` - Start local development server on port 3000
- `npm run build` - Build production bundle in `/dist`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run TypeScript compiler check
