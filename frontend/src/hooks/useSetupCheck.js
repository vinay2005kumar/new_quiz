import { useState, useEffect } from 'react';
import api from '../config/axios';

export const useSetupCheck = () => {
  const [setupStatus, setSetupStatus] = useState({
    adminExists: false,
    collegeSetup: false,
    requiresSetup: true,
    collegeName: 'Your College Name',
    loading: true,
    error: null
  });

  const checkSetupStatus = async () => {
    try {
      setSetupStatus(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.get('/api/setup/status');
      setSetupStatus({
        ...response,
        loading: false,
        error: null
      });
    } catch (error) {
      setSetupStatus(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to check setup status'
      }));
    }
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  return {
    ...setupStatus,
    refetch: checkSetupStatus
  };
};
