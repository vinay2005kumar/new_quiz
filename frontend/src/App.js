import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Navigation from './components/common/Navigation';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import StudentAccounts from './components/admin/StudentAccounts';
import FacultyAccounts from './components/admin/FacultyAccounts';
import EventQuizAccounts from './components/admin/EventQuizAccounts';
import QuizList from './components/quiz/QuizList';
import QuizCreate from './components/quiz/QuizCreate';
import QuizEdit from './components/quiz/QuizEdit';
import QuizAttempt from './components/quiz/QuizAttempt';
import QuizReview from './components/quiz/QuizReview';
import Profile from './components/profile/Profile';
import AdminRoutes from './routes/AdminRoutes';
import InitialSetup from './components/setup/InitialSetup';
import { useSetupCheck } from './hooks/useSetupCheck';
import { CircularProgress, Box, Typography } from '@mui/material';

function App() {
  const { requiresSetup, loading, error, refetch } = useSetupCheck();

  // Show loading spinner while checking setup status
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Checking system status...
        </Typography>
      </Box>
    );
  }

  // Show error if setup check failed
  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        p={3}
      >
        <Typography variant="h5" color="error" gutterBottom>
          System Error
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {error}
        </Typography>
        <button onClick={refetch}>Retry</button>
      </Box>
    );
  }

  // Show initial setup if required
  if (requiresSetup) {
    return (
      <Router>
        <InitialSetup onSetupComplete={() => {
          // Refresh setup status after completion
          refetch();
        }} />
      </Router>
    );
  }

  // Normal app flow
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <PrivateRoute>
                <Navigation />
                <Navigate to="/dashboard" replace />
              </PrivateRoute>
            } />

            <Route path="/dashboard" element={
              <PrivateRoute>
                <Navigation />
                <Dashboard />
              </PrivateRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <PrivateRoute allowedRoles={['admin']}>
                <Navigation />
                <AdminRoutes />
              </PrivateRoute>
            } />

            {/* Quiz Routes */}
            <Route path="/quizzes" element={
              <PrivateRoute>
                <Navigation />
                <QuizList />
              </PrivateRoute>
            } />

            {/* Profile Route */}
            <Route path="/profile" element={<Profile />} />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App; 