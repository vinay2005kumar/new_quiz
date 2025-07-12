const isDevelopment = import.meta.env.MODE === 'development';

// Get API URL from environment variable or use defaults
const getApiUrl = () => {
  // Check if custom API URL is provided via environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Default URLs based on environment
  return isDevelopment
    ? 'http://localhost:5000'
    : 'https://web-quiz-backend-h5y5.onrender.com';
};

export const config = {
  apiUrl: getApiUrl(),
  tokenKey: 'token',
  isDevelopment,
};

// Configuration loaded silently for security