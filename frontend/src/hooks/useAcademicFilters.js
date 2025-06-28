import { useState, useCallback, useEffect } from 'react';
import api from '../config/axios';

const useAcademicFilters = (initialFilters = {}) => {
  const defaultFilters = {
    department: '',
    year: '',
    semester: '',
    section: '',
    subject: '',
    search: '',
    ...initialFilters
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [departments, setDepartments] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState({});
  const [loading, setLoading] = useState(false);

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      
      // Reset dependent filters when parent filter changes
      if (filterName === 'department') {
        newFilters.year = '';
        newFilters.semester = '';
        newFilters.section = '';
        newFilters.subject = '';
      } else if (filterName === 'year') {
        newFilters.semester = '';
        newFilters.section = '';
        newFilters.subject = '';
      } else if (filterName === 'semester') {
        newFilters.section = '';
        newFilters.subject = '';
      }
      
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const setSpecificFilter = useCallback((filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  const getActiveFilters = useCallback(() => {
    return Object.entries(filters).reduce((active, [key, value]) => {
      if (value && value !== '') {
        active[key] = value;
      }
      return active;
    }, {});
  }, [filters]);

  const hasActiveFilters = useCallback(() => {
    return Object.values(filters).some(value => value && value !== '');
  }, [filters]);

  const getFilterParams = useCallback(() => {
    // Convert filters to API query parameters
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        params[key] = value;
      }
    });
    return params;
  }, [filters]);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/settings/departments');
      if (response && response.departments && Array.isArray(response.departments)) {
        setDepartments(response.departments);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available semesters for a department and year
  const fetchAvailableSemesters = async (department, year) => {
    if (!department || !year) return [];
    
    try {
      console.log('Fetching available semesters for:', { department, year });
      const response = await api.get(`/api/academic-details?department=${department}&year=${year}`);
      console.log('Available semesters response:', response);
      
      const semesters = response
        .filter(detail => detail.department === department && detail.year === Number(year))
        .map(detail => detail.semester)
        .sort((a, b) => a - b);
      
      console.log('Found semesters:', semesters);
      
      setAvailableSemesters(prev => ({
        ...prev,
        [`${department}-${year}`]: semesters
      }));
      
      return semesters;
    } catch (error) {
      console.error('Error fetching available semesters:', error);
      setAvailableSemesters(prev => ({
        ...prev,
        [`${department}-${year}`]: []
      }));
      return [];
    }
  };

  // Get available semesters from state
  const getAvailableSemesters = (department, year) => {
    if (!department || !year) return [];
    
    const key = `${department}-${year}`;
    const semesters = availableSemesters[key] || [];
    
    console.log('getAvailableSemesters called with:', { department, year });
    console.log('Available semesters from state:', semesters);
    
    return semesters;
  };

  // Clear available semesters cache
  const clearAvailableSemesters = () => {
    setAvailableSemesters({});
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return {
    filters,
    setFilters,
    handleFilterChange,
    clearFilters,
    setSpecificFilter,
    getActiveFilters,
    hasActiveFilters,
    getFilterParams,
    departments,
    availableSemesters,
    loading,
    fetchDepartments,
    fetchAvailableSemesters,
    getAvailableSemesters,
    clearAvailableSemesters
  };
};

export default useAcademicFilters;
