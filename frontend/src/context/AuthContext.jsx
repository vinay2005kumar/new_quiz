import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axios';

// Debug: Check if toast is properly imported
console.log('Toast imported:', toast);
console.log('Toast methods:', Object.keys(toast));

// Create the auth context
const AuthContext = createContext(null);

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found in localStorage');
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('Verifying token and fetching user data...');
        // Make API call to verify token and get user data
        const response = await api.get('/api/auth/me');
        
        // Handle both response structures (direct or nested in data)
        const userData = response.data?.user || response.user;
        
        if (userData) {
          console.log('User data received:', {
            id: userData.id,
            role: userData.role,
            department: userData.department,
            year: userData.year,
            section: userData.section
          });
          setUser(userData);
        } else {
          console.log('No user data received, clearing auth state');
          // If no user data, clear token and user state
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        // Only clear auth if it's an auth error (401/403)
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Auth error - clearing user state');
          localStorage.removeItem('token');
          setUser(null);
        }
        setAuthError(error.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up interval to periodically check token validity
    const authCheckInterval = setInterval(checkAuth, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(authCheckInterval);
  }, [navigate]);

  const login = async (email, password) => {
    try {
      setAuthError(null);
      // Don't set loading here as it causes UI flickering - let components manage their own loading

      // Make the API request
      const response = await api.post('/api/auth/login', {
        email,
        password
      });

      // Extract token and user data from response
      const { token, user, success, message } = response.data || response;

      if (!success || !token || !user) {
        const errorMsg = message || 'Invalid credentials';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Login successful:', {
        userId: user.id,
        role: user.role,
        department: user.department,
        year: user.year,
        section: user.section
      });

      // Store token and update user state
      localStorage.setItem('token', token);
      setUser(user);

      toast.success(message || 'Login successful!');
      return { success: true, user };
    } catch (error) {
      console.error('Login failed:', error.response?.status, error.response?.data?.message || error.message);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to login';
      setAuthError(errorMessage);

      // Show toast notification for specific error types

      // Check for specific error messages regardless of status code
      const lowerErrorMessage = errorMessage.toLowerCase();

      if (error.response?.status === 404 || lowerErrorMessage.includes('user not found') || lowerErrorMessage.includes('no account found') || lowerErrorMessage.includes('user does not exist')) {
        toast.error('No account found with this email address');
      } else if (error.response?.status === 401 || lowerErrorMessage.includes('incorrect password') || lowerErrorMessage.includes('invalid password') || lowerErrorMessage.includes('wrong password')) {
        toast.error('Incorrect password. Please try again.');
      } else if (error.response?.status === 400 || lowerErrorMessage.includes('email and password required') || lowerErrorMessage.includes('missing credentials')) {
        toast.error('Please provide both email and password');
      } else if (lowerErrorMessage.includes('invalid credentials') || lowerErrorMessage.includes('authentication failed')) {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else {
        toast.error(errorMessage);
      }

      return { success: false, error: errorMessage };
    } finally {
      // Don't set loading here - let components manage their own loading state
    }
  };

  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  // Provide auth state and methods to consuming components
  const value = {
    user,
    loading,
    authError,
    login,
    logout,
    setAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;