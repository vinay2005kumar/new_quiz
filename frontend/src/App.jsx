import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { NavigationProvider } from './context/NavigationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navigation from './components/common/Navigation';
import PrivateRoute from './components/common/PrivateRoute';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import QuizList from './components/quiz/QuizList';
import QuizCreate from './components/quiz/QuizCreate';
import QuizFileUpload from './components/quiz/QuizFileUpload';
import QuizAttempt from './components/quiz/QuizAttempt';
import QuizReview from './components/quiz/QuizReview';
import QuizSubmissions from './components/quiz/QuizSubmissions';
import QuizEdit from './components/quiz/QuizEdit';
import SubjectList from './components/subject/SubjectList';
import SubjectCreate from './components/subject/SubjectCreate';
import SubjectEdit from './components/subject/SubjectEdit';
import AdmissionRanges from './components/admin/AdmissionRanges';
import QuizOverview from './components/quiz/QuizOverview';
import QuizStatistics from './components/quiz/QuizStatistics';
import AdminRoutes from './routes/AdminRoutes';
import EventQuizAccounts from './components/admin/EventQuizAccounts';
import AdminEventQuizzes from './components/admin/EventQuizzes';
import PublicEventQuizzes from './components/quiz/EventQuizzes';
import AccountManagement from './components/admin/AccountManagement';
import Profile from './components/profile/Profile';
import StudentAccounts from './components/admin/StudentAccounts';
import LandingPage from './components/LandingPage';
import EventPage from './components/event/EventPage';
import LoadingScreen from './components/common/LoadingScreen';
import RoleBasedRedirect from './components/auth/RoleBasedRedirect';
import EventQuizCreate from './components/event/EventQuizCreate';
import EventQuizList from './components/event/EventQuizList';
import FacultyAccounts from './components/admin/FacultyAccounts';
import EventQuizEdit from './components/event/EventQuizEdit';
import EventQuizSubmissions from './components/event/EventQuizSubmissions';
import EventQuizSubmissionView from './components/event/EventQuizSubmissionView';
import CollegeSettings from './components/admin/CollegeSettings';
import AdminQuizzes from './components/admin/AdminQuizzes';



// Root level routing component that handles auth state
const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Show loading screen while checking auth status
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <Routes>
        {/* Public Routes - accessible to all */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <RoleBasedRedirect /> : <Login />} />
        <Route path="/register" element={user ? <RoleBasedRedirect /> : <Register />} />
        <Route path="/events" element={<PublicEventQuizzes />} />

        {/* Event Routes */}
        <Route path="/event/*" element={
          <PrivateRoute roles={['event']}>
            <Navigation />
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quizzes" element={<EventQuizList />} />
                <Route path="/quiz/create" element={<EventQuizCreate />} />
                <Route path="/quiz/edit/:id" element={<EventQuizEdit />} />
                <Route path="/quiz/:id/submissions" element={<EventQuizSubmissions />} />
                <Route path="/quiz/:quizId/submission/:studentId" element={<EventQuizSubmissionView />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </Box>
          </PrivateRoute>
        } />

        {/* Student Routes */}
        <Route path="/student/*" element={
          <PrivateRoute roles={['student']}>
            <Navigation />
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quizzes" element={<QuizList type="academic" />} />
                <Route path="/event-quizzes" element={<EventQuizList />} />
                <Route path="/quizzes/:id/attempt" element={<QuizAttempt />} />
                <Route path="/quizzes/:id/review" element={<QuizReview />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </Box>
          </PrivateRoute>
        } />

        {/* Faculty Routes */}
        <Route path="/faculty/*" element={
          <PrivateRoute roles={['faculty']}>
            <Navigation />
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quizzes" element={<QuizList type="academic" />} />
                <Route path="/quizzes/create" element={<QuizCreate />} />
                <Route path="/quizzes/:id/edit" element={<QuizEdit />} />
                <Route path="/quizzes/:id/submissions" element={<QuizSubmissions />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </Box>
          </PrivateRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <PrivateRoute roles={['admin']}>
            <Navigation />
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/students" element={<StudentAccounts />} />
                <Route path="/faculty" element={<FacultyAccounts />} />
                <Route path="/event-accounts" element={<EventQuizAccounts />} />
                <Route path="/settings" element={<CollegeSettings />} />
                <Route path="/quizzes" element={<AdminQuizzes />} />
                <Route path="/quiz/:id/edit" element={<QuizEdit />} />
                <Route path="/quiz/:id/submissions" element={<QuizSubmissions />} />
                <Route path="/event-quiz/:id/edit" element={<EventQuizEdit />} />
                <Route path="/event-quiz/:id/submissions" element={<EventQuizSubmissions />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </Box>
          </PrivateRoute>
        } />

        {/* Default redirect based on role */}
        <Route path="/dashboard" element={<RoleBasedRedirect />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <NavigationProvider>
              <AppRoutes />
            </NavigationProvider>
          </AuthProvider>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;