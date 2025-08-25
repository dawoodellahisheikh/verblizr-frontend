import React, {createContext, useContext, useEffect, useState} from 'react';
import {getToken, setToken as saveToken, removeToken} from '../lib/storage';

// DES Added: Extended user type to include additional profile fields
type User = { 
  id: string; 
  email: string; 
  name?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  address?: string;
  phone?: string;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await getToken();
      if (saved) setToken(saved);
      setLoading(false);
    })();
  }, []);

  const login = (newToken: string, newUser: User) => {
    console.log('AuthContext - login called with:', { hasToken: !!newToken, user: newUser }); // DES Added: Debug logging
    setToken(newToken);
    setUser(newUser);
    saveToken(newToken);
    console.log('AuthContext - State updated, token set'); // DES Added: Debug logging
  };

  const logout = () => {
    console.log('AuthContext - logout called'); // DES Added: Debug logging
    setToken(null);
    setUser(null);
    removeToken();
    console.log('AuthContext - State cleared, token removed'); // DES Added: Debug logging
  };

  return (
    <AuthContext.Provider value={{token, user, loading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);