/**
 * User Context
 * Provides global access to user data throughout the app
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useUser, type UserData } from '@/hooks/useUser';

interface UserContextValue {
  user: UserData | null;
  isLoggedIn: boolean;
  setUser: (fullName: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const userState = useUser();

  return (
    <UserContext.Provider value={userState}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
