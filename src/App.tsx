import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from "./pages/PendingApproval";
import ClerkDashboard from "./pages/ClerkDashboard";
import SalesRepDashboard from "./pages/SalesRepDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isAuthenticated, currentRole, currentUser } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check for pending status
  if (currentUser?.status === 'pending') {
    return <Navigate to="/pending" replace />;
  }

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, currentRole, currentUser } = useApp();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            currentUser?.status === 'pending' ? <Navigate to="/pending" replace /> :
              <Navigate to={
                currentRole === 'clerk' ? '/clerk' :
                  currentRole === 'salesRep' ? '/sales-rep' : '/admin'
              } replace />
          ) : (
            <Login />
          )
        }
      />
      <Route path="/register" element={<Register />} />
      <Route
        path="/pending"
        element={
          isAuthenticated && currentUser?.status === 'pending'
            ? <PendingApproval />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/clerk"
        element={
          <ProtectedRoute allowedRoles={['clerk']}>
            <ClerkDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-rep"
        element={
          <ProtectedRoute allowedRoles={['salesRep']}>
            <SalesRepDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['manager', 'director']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
