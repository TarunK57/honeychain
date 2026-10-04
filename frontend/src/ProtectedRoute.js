import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, adminOnly = false, superadminOnly = false }) => {
  const { user, profile, loading } = useAuth();

  // 1. Wait for initial auth check
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-[var(--accent-color)] animate-spin" size={48} />
      </div>
    );
  }

  // 2. No user? Redirect to login
  if (!user) return <Navigate to="/login" />;

  // 3. Have user but waiting for profile fetch? Show spinner
  // This prevents role checks from failing before profile data arrives
  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-[var(--accent-color)] animate-spin" size={48} />
      </div>
    );
  }

  // 4. Role checks (now safe because profile exists)
  if (superadminOnly && profile?.role !== 'superadmin') {
    return <Navigate to="/dashboard" />;
  }

  if (adminOnly && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
