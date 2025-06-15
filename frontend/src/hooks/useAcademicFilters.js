import { useState, useCallback } from 'react';

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

  return {
    filters,
    setFilters,
    handleFilterChange,
    clearFilters,
    setSpecificFilter,
    getActiveFilters,
    hasActiveFilters,
    getFilterParams
  };
};

export default useAcademicFilters;
