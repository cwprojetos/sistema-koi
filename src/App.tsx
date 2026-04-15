
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Agenda from "./pages/Agenda";
import Escalas from "./pages/Escalas";
import Oracao from "./pages/Oracao";
import Midia from "./pages/Midia";
import Louvor from "./pages/Louvor";
import Financeiro from "./pages/Financeiro";
import Conselho from "./pages/Conselho";
import Membros from "./pages/Membros";
import PastorCorner from "./pages/PastorCorner";
import Projetos from "./pages/Projetos";
import EscolaBiblica from "./pages/EscolaBiblica";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Churches from "./pages/Churches";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';

// Standard Route Guard for Module Access
const ModuleGuard = ({ children, module }: { children: React.ReactNode, module: string }) => {
  const { canRead, isLoading, role } = useAuth();
  if (isLoading) return null;
  if (role === 'guest' || !canRead(module)) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Admin Guard for Management Pages
const AdminGuard = ({ children, superOnly = false }: { children: React.ReactNode, superOnly?: boolean }) => {
  const { isAdmin, isSuperAdmin, isLoading, canWrite } = useAuth();
  if (isLoading) return null;
  if (superOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  
  const canManage = isAdmin || canWrite('secretaria');
  if (!canManage) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

const queryClient = new QueryClient();

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { role, isLoading } = useAuth();
  if (isLoading) return null;
  if (role === 'guest') return <Navigate to="/login" replace />;
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-full overflow-hidden bg-[#f8fafc]">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfigProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/*" element={
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Agenda />} />
                    <Route path="/escalas" element={<Escalas />} />
                    <Route path="/oracao" element={<Oracao />} />
                    <Route path="/projetos" element={<Projetos />} />
                    <Route path="/escola-biblica" element={<EscolaBiblica />} />
                    <Route path="/pastor" element={<PastorCorner />} />

                    <Route path="/midia" element={<ModuleGuard module="midia"><Midia /></ModuleGuard>} />
                    <Route path="/louvor" element={<ModuleGuard module="louvor"><Louvor /></ModuleGuard>} />
                    <Route path="/financeiro" element={<ModuleGuard module="financeiro"><Financeiro /></ModuleGuard>} />
                    <Route path="/conselho" element={<ModuleGuard module="conselho"><Conselho /></ModuleGuard>} />
                    <Route path="/membros" element={<ModuleGuard module="secretaria"><Membros /></ModuleGuard>} />

                    <Route path="/admin/users" element={<AdminGuard><Users /></AdminGuard>} />
                    <Route path="/admin/churches" element={<AdminGuard superOnly><Churches /></AdminGuard>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </MainLayout>
              } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </ConfigProvider>
      </AuthProvider>
  </QueryClientProvider>
);

export default App;
