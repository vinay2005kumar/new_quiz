import { createContext, useContext, useState, useCallback } from 'react';
import LoadingScreen from '../components/common/LoadingScreen';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(true);

  const showLoading = useCallback((message = 'Loading...', progress = 0, showProgressBar = true) => {
    setLoadingMessage(message);
    setLoadingProgress(progress);
    setShowProgress(showProgressBar);
    setIsGlobalLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsGlobalLoading(false);
  }, []);

  const updateProgress = useCallback((progress) => {
    setLoadingProgress(progress);
  }, []);

  const updateMessage = useCallback((message) => {
    setLoadingMessage(message);
  }, []);

  // Simulate loading with automatic progress
  const simulateLoading = useCallback((duration = 3000, message = 'Loading...') => {
    showLoading(message, 0, true);
    
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => hideLoading(), 500);
          return 100;
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showLoading, hideLoading]);

  // Loading with specific tasks
  const loadWithTasks = useCallback(async (tasks) => {
    showLoading('Initializing...', 0, true);
    
    const totalTasks = tasks.length;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      updateMessage(task.message || `Processing task ${i + 1}...`);
      
      try {
        if (task.action) {
          await task.action();
        } else if (task.delay) {
          await new Promise(resolve => setTimeout(resolve, task.delay));
        }
        
        const progress = ((i + 1) / totalTasks) * 100;
        updateProgress(progress);
        
        // Small delay between tasks for visual effect
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Task ${i + 1} failed:`, error);
      }
    }
    
    setTimeout(() => hideLoading(), 500);
  }, [showLoading, hideLoading, updateMessage, updateProgress]);

  const value = {
    isGlobalLoading,
    loadingMessage,
    loadingProgress,
    showProgress,
    showLoading,
    hideLoading,
    updateProgress,
    updateMessage,
    simulateLoading,
    loadWithTasks
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isGlobalLoading && (
        <LoadingScreen
          message={loadingMessage}
          progress={loadingProgress}
          showProgress={showProgress}
          brandName="Quiz Management System"
        />
      )}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;
