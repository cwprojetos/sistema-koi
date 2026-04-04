import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/services/api';

type UserRole = 'super_admin' | 'admin_igreja' | 'admin' | 'user' | 'visitante' | 'guest';
type PermissionLevel = 'none' | 'read' | 'write';

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  church_id: number;
  avatar_url?: string;
  permissions?: Record<string, PermissionLevel>;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: any) => Promise<void>;
  loginAsVisitor: (churchId: number) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  canRead: (module: string) => boolean;
  canWrite: (module: string) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          if (userData.permissions) {
            setPermissions(userData.permissions);
          }
        } catch (err) {
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: any) => {
    const { token, user: loggedUser, permissions: userPerms } = await authApi.login(credentials);
    sessionStorage.setItem('token', token);
    setUser(loggedUser);
    setPermissions(userPerms || {});
  };

  const loginAsVisitor = async (churchId: number) => {
    const { token, user: loggedUser } = await authApi.loginAsVisitor(churchId);
    sessionStorage.setItem('token', token);
    setUser(loggedUser);
    setPermissions({
        agenda: 'read',
        oracao: 'read',
        escola_biblica: 'read',
        pastor: 'read',
        projetos: 'read',
        estudos: 'read'
    });
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
    setPermissions({});
  };

  const getPermission = (module: string): PermissionLevel => {
    if (user?.role === 'super_admin' || user?.role === 'admin_igreja' || user?.role === 'admin') return 'write';
    return permissions[module] || 'none';
  };

  const canRead = (module: string) => {
    if (user?.role === 'super_admin' || user?.role === 'admin_igreja' || user?.role === 'admin') return true;
    if (user?.role === 'visitante') {
      const allowed = ['agenda', 'oracao', 'escola_biblica', 'pastor', 'projetos', 'estudos'];
      return allowed.includes(module);
    }
    return getPermission(module) !== 'none';
  };

  const canWrite = (module: string) => {
    const role = user?.role;
    if (role === 'super_admin' || role === 'admin_igreja' || role === 'admin') return true;
    if (role === 'visitante' || role === 'guest') return false;
    return getPermission(module) === 'write';
  };

  const role = user?.role || 'guest';
  const isAdmin = role === 'admin_igreja' || role === 'super_admin' || role === 'admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      login, 
      loginAsVisitor,
      logout, 
      isLoading,
      canRead,
      canWrite,
      isAdmin,
      isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
