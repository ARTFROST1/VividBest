import React, { createContext, useContext } from 'react';

export type AuthContextType = {
  isAuth: boolean;
  logout: () => void;
  setIsAuth: (v: boolean) => void;
};

export const AuthContext = createContext<AuthContextType>({
  isAuth: false,
  logout: () => {},
  setIsAuth: () => {},
});

export const useAuth = () => useContext(AuthContext); 