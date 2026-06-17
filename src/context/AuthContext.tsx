import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthUserId } from '../api';
import type { User } from '../api';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const USER_KEY = '@auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then(raw => {
        if (raw) {
          const stored: User = JSON.parse(raw);
          setUser(stored);
          setAuthUserId(stored.id);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (u: User) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    setAuthUserId(u.id);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setAuthUserId(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
