import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CaptivePortal from './components/CaptivePortal';
import AdminLogin from './components/AdminLogin';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (requireAdmin) {
    return admin ? children : <Navigate to="/admin/login" replace />;
  }

  return user ? children : <Navigate to="/" replace />;
};

// Main App Component
const AppContent = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CaptivePortal />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

// Root App Component with Auth Provider
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
