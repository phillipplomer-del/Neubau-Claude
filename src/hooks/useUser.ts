/**
 * User Management Hook
 * Manages user data in localStorage for personalized experience
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'pvcs_prism_user';

export interface UserData {
  fullName: string;
  firstName: string;
  createdAt: string;
}

export interface UseUserReturn {
  user: UserData | null;
  isLoggedIn: boolean;
  setUser: (fullName: string) => void;
  logout: () => void;
}

/**
 * Extract first name from full name
 */
function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

/**
 * Load user data from localStorage
 */
function loadUser(): UserData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserData;
  } catch {
    return null;
  }
}

/**
 * Save user data to localStorage
 */
function saveUser(userData: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

/**
 * Remove user data from localStorage
 */
function removeUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function useUser(): UseUserReturn {
  const [user, setUserState] = useState<UserData | null>(() => loadUser());

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setUserState(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setUser = useCallback((fullName: string) => {
    const trimmedName = fullName.trim();
    if (!trimmedName) return;

    const userData: UserData = {
      fullName: trimmedName,
      firstName: extractFirstName(trimmedName),
      createdAt: new Date().toISOString(),
    };

    saveUser(userData);
    setUserState(userData);
  }, []);

  const logout = useCallback(() => {
    removeUser();
    setUserState(null);
  }, []);

  return {
    user,
    isLoggedIn: user !== null,
    setUser,
    logout,
  };
}
