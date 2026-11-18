import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { DEMO_USER } from '../lib/demoData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { StorageService, saveLocalData } from '../lib/storage';
import { validateEmailAddress } from '../lib/emailValidator';
import { ensureMySqlChecked, MySqlApi, refreshMySqlStatus } from '../lib/mysqlApi';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isDemoUser: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    email: string;
    password?: string;
    fullName: string;
    college?: string;
    major?: string;
    semester?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  useDemoAccount: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AUTH_USER_KEY = 'ai_study_planner_current_user';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const mysqlHealth = await refreshMySqlStatus();
      const supabase = getSupabaseClient();

      if (!mysqlHealth.mysqlConnected && supabase && isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await StorageService.getProfile(session.user.id);
            if (profile) {
              setUser(profile);
              setIsDemoUser(false);
              setIsLoading(false);
              return;
            } else {
              const newProfile: UserProfile = {
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || 'Student',
                college: session.user.user_metadata?.college || 'Engineering College',
                major: session.user.user_metadata?.major || 'Computer Science',
                semester: session.user.user_metadata?.semester || '6th Semester',
                created_at: new Date().toISOString(),
              };
              await StorageService.saveProfile(newProfile);
              setUser(newProfile);
              setIsDemoUser(false);
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Supabase session load error:', e);
        }
      }

      // Check local storage session
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as UserProfile;
          if (mysqlHealth.mysqlConnected) {
            const remoteProfile = await MySqlApi.getProfile(parsed.id);
            if (remoteProfile) {
              setUser(remoteProfile);
              localStorage.setItem(AUTH_USER_KEY, JSON.stringify(remoteProfile));
            } else if (parsed.id === DEMO_USER.id) {
              await StorageService.seedDemoData(DEMO_USER.id);
              setUser(parsed);
            } else {
              await MySqlApi.saveProfile(parsed);
              setUser(parsed);
            }
          } else {
            setUser(parsed);
          }
          setIsDemoUser(parsed.id === DEMO_USER.id);
        } catch (e) {
          console.error(e);
          setUser(null);
          setIsDemoUser(false);
        }
      } else {
        // Do not auto-login; show the Sign In / Sign Up page to the student
        setUser(null);
        setIsDemoUser(false);
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    const supabase = getSupabaseClient();

    // Validate email format and domain existence before processing
    const emailValidation = await validateEmailAddress(email);
    if (!emailValidation.isValid) {
      setIsLoading(false);
      return { success: false, error: emailValidation.error || 'Please enter a valid, active email address.' };
    }

    if (await ensureMySqlChecked()) {
      try {
        const profile = await MySqlApi.login(email, password);
        saveLocalData(profile.id, 'profile', profile);
        setUser(profile);
        setIsDemoUser(profile.id === DEMO_USER.id);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'MySQL authentication failed' };
      }
    }

    if (supabase && isSupabaseConfigured() && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        if (data.user) {
          let profile = await StorageService.getProfile(data.user.id);
          if (!profile) {
            profile = {
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || 'Student',
              college: data.user.user_metadata?.college,
              major: data.user.user_metadata?.major,
              semester: data.user.user_metadata?.semester,
              created_at: new Date().toISOString(),
            };
            await StorageService.saveProfile(profile);
          }
          setUser(profile);
          setIsDemoUser(false);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
          setIsLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'Supabase authentication failed' };
      }
    }

    // Local / Offline auth simulation
    const simulatedId = `student-${btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;
    let profile = await StorageService.getProfile(simulatedId);
    if (!profile) {
      profile = {
        id: simulatedId,
        email,
        full_name: email.split('@')[0].replace(/[._]/g, ' '),
        college: 'State University',
        major: 'Computer Science',
        semester: '6th Semester',
        created_at: new Date().toISOString(),
      };
      await StorageService.saveProfile(profile);
    }
    setUser(profile);
    setIsDemoUser(false);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
    setIsLoading(false);
    return { success: true };
  };

  const signup = async (data: {
    email: string;
    password?: string;
    fullName: string;
    college?: string;
    major?: string;
    semester?: string;
  }) => {
    setIsLoading(true);
    const supabase = getSupabaseClient();

    // Validate email format and domain existence before processing
    const emailValidation = await validateEmailAddress(data.email);
    if (!emailValidation.isValid) {
      setIsLoading(false);
      return { success: false, error: emailValidation.error || 'Please enter a valid, active email address.' };
    }

    if (await ensureMySqlChecked()) {
      try {
        const profile = await MySqlApi.signup(data);
        saveLocalData(profile.id, 'profile', profile);
        setUser(profile);
        setIsDemoUser(false);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'MySQL signup failed' };
      }
    }

    if (supabase && isSupabaseConfigured() && data.password) {
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              college: data.college,
              major: data.major,
              semester: data.semester,
            },
          },
        });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        if (authData.user) {
          const profile: UserProfile = {
            id: authData.user.id,
            email: data.email,
            full_name: data.fullName,
            college: data.college,
            major: data.major,
            semester: data.semester,
            created_at: new Date().toISOString(),
          };
          await StorageService.saveProfile(profile);
          setUser(profile);
          setIsDemoUser(false);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
          setIsLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'Supabase signup failed' };
      }
    }

    // Local signup simulation
    const simulatedId = `student-${btoa(data.email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;
    const newProfile: UserProfile = {
      id: simulatedId,
      email: data.email,
      full_name: data.fullName,
      college: data.college || 'State University',
      major: data.major || 'Computer Science & Engineering',
      semester: data.semester || '6th Semester',
      created_at: new Date().toISOString(),
    };
    await StorageService.saveProfile(newProfile);
    setUser(newProfile);
    setIsDemoUser(false);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newProfile));
    setIsLoading(false);
    return { success: true };
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase logout error:', e);
      }
    }
    setUser(null);
    setIsDemoUser(false);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const resetPassword = async (email: string) => {
    if (await ensureMySqlChecked()) {
      return {
        success: true,
        message: `Local MySQL mode is active for ${email}. Please contact your local DB admin or register a new student account if needed.`,
      };
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Password reset email dispatched to ${email}` };
      } catch (e: any) {
        return { success: false, message: e.message || 'Reset password failed' };
      }
    }
    return {
      success: true,
      message: `Password reset link simulated for ${email}. (In Supabase mode, an email is sent)`,
    };
  };

  const useDemoAccount = () => {
    setUser(DEMO_USER);
    setIsDemoUser(true);
    StorageService.seedDemoData(DEMO_USER.id);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(DEMO_USER));
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    await StorageService.saveProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isDemoUser,
        login,
        signup,
        logout,
        resetPassword,
        useDemoAccount,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
