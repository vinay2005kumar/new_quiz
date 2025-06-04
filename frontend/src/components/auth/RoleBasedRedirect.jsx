import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../common/LoadingScreen';

const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'faculty':
      return <Navigate to="/faculty/dashboard" replace />;
    case 'student':
      return <Navigate to="/student/dashboard" replace />;
    case 'event':
      return <Navigate to="/event/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default RoleBasedRedirect; 