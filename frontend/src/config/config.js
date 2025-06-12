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

console.log('Environment Mode:', import.meta.env.MODE);

export const config = {
  apiUrl: getApiUrl(),
  tokenKey: 'token',
  isDevelopment,
};

// Log configuration
console.log('🌍 Environment:', import.meta.env.MODE);
console.log('🔗 API URL:', config.apiUrl);
console.log('🔧 Custom API URL from env:', import.meta.env.VITE_API_URL || 'Not set');

// Log configuration in development mode only
if (isDevelopment) {
  console.log('🚀 Development mode - using localhost backend');
} else {
  console.log('🌐 Production mode - using hosted backend');
}