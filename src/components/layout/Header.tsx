import React, { useState } from 'react';
import {
  Menu,
  Calendar,
  Plus,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookPlus,
  FilePlus,
  ListPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlanner } from '../../context/PlannerContext';
import { ActiveTab } from './Sidebar';
import { Modal } from '../common/Modal';
import { MYSQL_SQL_SCHEMA, SUPABASE_SQL_SCHEMA } from '../../lib/sqlSchema';

interface HeaderProps {
  onOpenMobileNav: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddSubject: () => void;
  onOpenAddTopic: () => void;
  onOpenAddAssignment: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  setActiveTab,
  onOpenAddSubject,
  onOpenAddTopic,
  onOpenAddAssignment,
}) => {
  const { isSupabase, isMysql } = usePlanner();
  const [showDbInfoModal, setShowDbInfoModal] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [schemaTab, setSchemaTab] = useState<'mysql' | 'supabase'>('mysql');

  // Today's date formatting
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const activeSqlSchema = schemaTab === 'mysql' ? MYSQL_SQL_SCHEMA : SUPABASE_SQL_SCHEMA;

  const copySqlSchema = () => {
    navigator.clipboard.writeText(activeSqlSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const isAnyRemoteDb = isMysql || isSupabase;
  const badgeText = isMysql
    ? 'MySQL Connected'
    : isSupabase
    ? 'Supabase Cloud Sync'
    : 'Local Persistence (MySQL / Supabase Ready)';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-6 backdrop-blur-md">
        {/* Left side: hamburger + Date display */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Today:</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Right side: Database status pill + Quick Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Database status badge */}
          <button
            onClick={() => setShowDbInfoModal(true)}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              isAnyRemoteDb
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>{badgeText}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          </button>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenAddSubject}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              title="Add Subject"
            >
              <BookPlus className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Subject</span>
            </button>

            <button
              onClick={onOpenAddTopic}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              title="Add Topic"
            >
              <ListPlus className="h-3.5 w-3.5 text-purple-600" />
              <span className="hidden sm:inline">Topic</span>
            </button>

            <button
              onClick={onOpenAddAssignment}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              title="Add Assignment"
            >
              <FilePlus className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden sm:inline">Assignment</span>
            </button>

            <button
              onClick={() => setActiveTab('generate')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-xs shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden xs:inline">Generate Plan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Database Architecture & Status Modal */}
      <Modal
        isOpen={showDbInfoModal}
        onClose={() => setShowDbInfoModal(false)}
        title="SQL Database & Architecture Status"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Connection State:</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isAnyRemoteDb
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {isMysql
                  ? 'Connected to Local MySQL Database'
                  : isSupabase
                  ? 'Connected to Supabase Project'
                  : 'Running in Local Storage Engine'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isMysql
                ? 'All accounts, subjects, topics, assignments, study preferences, and timetable sessions are actively persisting to your local MySQL database via Express (/api/*).'
                : isSupabase
                ? 'All subjects, topics, assignments, study preferences, and timetable sessions are syncing directly to your Supabase PostgreSQL database tables.'
                : 'Data is persistently stored in browser storage with identical SQL schema parity. Set MYSQL_HOST/MYSQL_USER in .env for local MySQL or configure Supabase in Settings.'}
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSchemaTab('mysql')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    schemaTab === 'mysql'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  MySQL 8 Schema
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaTab('supabase')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    schemaTab === 'supabase'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Supabase PostgreSQL
                </button>
              </div>
              <button
                onClick={copySqlSchema}
                className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
              >
                {copiedSchema ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
                <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              {schemaTab === 'mysql'
                ? 'server.ts creates this database and all 6 tables automatically on startup when .env has your MySQL credentials.'
                : 'Run this script directly in the Supabase SQL Editor to provision tables, foreign keys, and Row-Level Security (RLS) policies.'}
            </p>
            <pre className="max-h-56 overflow-y-auto p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono leading-relaxed border border-slate-800">
              {activeSqlSchema}
            </pre>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setShowDbInfoModal(false);
                setActiveTab('settings');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Configure Database in Settings
            </button>
            <button
              onClick={() => setShowDbInfoModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
