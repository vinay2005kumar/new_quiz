import { useState, useEffect } from 'react';
import { Fade, Box } from '@mui/material';
import LoadingScreen from './LoadingScreen';
import useLoadingProgress from '../../hooks/useLoadingProgress';

const withLoading = (WrappedComponent, loadingConfig = {}) => {
  const WithLoadingComponent = (props) => {
    const [showContent, setShowContent] = useState(false);
    const { 
      progress, 
      isLoading, 
      addTask, 
      completeTask, 
      startAutoProgress,
      setProgress 
    } = useLoadingProgress();

    const {
      minLoadingTime = 2000,
      autoProgress = true,
      tasks = [],
      message = "Loading your dashboard...",
      showProgress = true
    } = loadingConfig;

    useEffect(() => {
      // Add predefined tasks
      tasks.forEach(task => {
        addTask(task.name, task.weight || 1);
      });

      if (autoProgress) {
        // Start auto progress
        const cleanup = startAutoProgress(minLoadingTime);
        return cleanup;
      }
    }, []);

    useEffect(() => {
      if (!isLoading) {
        // Small delay before showing content for smooth transition
        const timer = setTimeout(() => {
          setShowContent(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [isLoading]);

    // Provide loading utilities to wrapped component
    const loadingUtils = {
      addTask,
      completeTask,
      setProgress,
      isLoading
    };

    if (isLoading) {
      return (
        <LoadingScreen
          message={message}
          progress={progress}
          showProgress={showProgress}
          brandName="Quiz Management System"
        />
      );
    }

    return (
      <Fade in={showContent} timeout={800}>
        <Box>
          <WrappedComponent {...props} loadingUtils={loadingUtils} />
        </Box>
      </Fade>
    );
  };

  WithLoadingComponent.displayName = `withLoading(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithLoadingComponent;
};

export default withLoading;
