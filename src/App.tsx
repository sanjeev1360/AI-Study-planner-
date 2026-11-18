import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlannerProvider } from './context/PlannerContext';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AuthView } from './components/auth/AuthView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SubjectsView } from './components/subjects/SubjectsView';
import { TopicsView } from './components/topics/TopicsView';
import { PlanGeneratorView } from './components/planner/PlanGeneratorView';
import { TimetableView } from './components/timetable/TimetableView';
import { AssignmentsView } from './components/assignments/AssignmentsView';
import { ProgressView } from './components/progress/ProgressView';
import { SettingsView } from './components/settings/SettingsView';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Global Quick Add Modal States
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading AI Study Planner...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50/70 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileNavOpen}
        setMobileOpen={setMobileNavOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenMobileNav={() => setMobileNavOpen(true)}
          setActiveTab={setActiveTab}
          onOpenAddSubject={() => setIsAddSubjectOpen(true)}
          onOpenAddTopic={() => setIsAddTopicOpen(true)}
          onOpenAddAssignment={() => setIsAddAssignmentOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === 'dashboard' && (
              <DashboardView
                setActiveTab={setActiveTab}
                onOpenAddSubject={() => setIsAddSubjectOpen(true)}
                onOpenAddTopic={() => setIsAddTopicOpen(true)}
                onOpenAddAssignment={() => setIsAddAssignmentOpen(true)}
              />
            )}

            {activeTab === 'subjects' && (
              <SubjectsView
                isAddModalOpen={isAddSubjectOpen}
                onCloseAddModal={() => setIsAddSubjectOpen(false)}
              />
            )}

            {activeTab === 'topics' && (
              <TopicsView
                isAddModalOpen={isAddTopicOpen}
                onCloseAddModal={() => setIsAddTopicOpen(false)}
              />
            )}

            {activeTab === 'generate' && (
              <PlanGeneratorView setActiveTab={setActiveTab} />
            )}

            {activeTab === 'timetable' && <TimetableView />}

            {activeTab === 'assignments' && (
              <AssignmentsView
                isAddModalOpen={isAddAssignmentOpen}
                onCloseAddModal={() => setIsAddAssignmentOpen(false)}
              />
            )}

            {activeTab === 'progress' && <ProgressView />}

            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Auxiliary render of Add modals if user is not in that specific view tab */}
      {isAddSubjectOpen && activeTab !== 'subjects' && (
        <SubjectsView
          isAddModalOpen={true}
          onCloseAddModal={() => setIsAddSubjectOpen(false)}
        />
      )}
      {isAddTopicOpen && activeTab !== 'topics' && (
        <TopicsView
          isAddModalOpen={true}
          onCloseAddModal={() => setIsAddTopicOpen(false)}
        />
      )}
      {isAddAssignmentOpen && activeTab !== 'assignments' && (
        <AssignmentsView
          isAddModalOpen={true}
          onCloseAddModal={() => setIsAddAssignmentOpen(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PlannerProvider>
        <MainAppContent />
      </PlannerProvider>
    </AuthProvider>
  );
}
