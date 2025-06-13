import { useState, useEffect } from 'react';
import api from '../config/axios';

export const useCollegeInfo = () => {
  const [collegeInfo, setCollegeInfo] = useState({
    name: 'Your College Name',
    address: '',
    email: '',
    phone: '',
    website: '',
    establishedYear: '',
    description: '',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundImage: '',
    headerStyle: 'transparent',
    headerColor: 'rgba(255, 255, 255, 0.1)',
    headerTextColor: 'white',
    footerStyle: 'solid',
    footerColor: 'rgba(0, 0, 0, 0.8)',
    footerTextColor: 'white',
    isSetup: false,
    loading: true,
    error: null
  });

  const fetchCollegeInfo = async () => {
    try {
      setCollegeInfo(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.get('/api/setup/college-info');
      setCollegeInfo({
        ...response,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching college info:', error);
      setCollegeInfo(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch college information'
      }));
    }
  };

  useEffect(() => {
    fetchCollegeInfo();
  }, []);

  return {
    ...collegeInfo,
    refetch: fetchCollegeInfo
  };
};
