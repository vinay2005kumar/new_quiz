import { useState, useEffect, useCallback } from 'react';

const useLoadingProgress = (initialProgress = 0) => {
  const [progress, setProgress] = useState(initialProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);

  // Add a loading task
  const addTask = useCallback((taskName, weight = 1) => {
    setLoadingTasks(prev => [...prev, { name: taskName, weight, completed: false }]);
  }, []);

  // Mark a task as completed
  const completeTask = useCallback((taskName) => {
    setLoadingTasks(prev => 
      prev.map(task => 
        task.name === taskName ? { ...task, completed: true } : task
      )
    );
    setCompletedTasks(prev => [...prev, taskName]);
  }, []);

  // Calculate progress based on completed tasks
  useEffect(() => {
    if (loadingTasks.length === 0) return;

    const totalWeight = loadingTasks.reduce((sum, task) => sum + task.weight, 0);
    const completedWeight = loadingTasks
      .filter(task => task.completed)
      .reduce((sum, task) => sum + task.weight, 0);

    const newProgress = (completedWeight / totalWeight) * 100;
    setProgress(newProgress);

    // If all tasks are completed, finish loading
    if (newProgress >= 100) {
      setTimeout(() => {
        setIsLoading(false);
      }, 500); // Small delay for smooth transition
    }
  }, [loadingTasks]);

  // Auto-increment progress for demo purposes
  const startAutoProgress = useCallback((duration = 5000) => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 500);
          return 100;
        }
        return prev + (100 / (duration / 100)); // Increment based on duration
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Reset loading state
  const resetLoading = useCallback(() => {
    setProgress(0);
    setIsLoading(true);
    setLoadingTasks([]);
    setCompletedTasks([]);
  }, []);

  // Set progress manually
  const setManualProgress = useCallback((value) => {
    setProgress(Math.min(100, Math.max(0, value)));
    if (value >= 100) {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, []);

  return {
    progress,
    isLoading,
    loadingTasks,
    completedTasks,
    addTask,
    completeTask,
    startAutoProgress,
    resetLoading,
    setProgress: setManualProgress,
    setIsLoading
  };
};

export default useLoadingProgress;
