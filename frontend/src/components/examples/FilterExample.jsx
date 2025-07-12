import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import AcademicFilter from '../common/AcademicFilter';
import useAcademicFilters from '../../hooks/useAcademicFilters';

const FilterExample = () => {
  // Initialize filters with default values
  const {
    filters,
    handleFilterChange,
    clearFilters,
    getFilterParams,
    hasActiveFilters
  } = useAcademicFilters({
    department: '',
    year: '',
    semester: '',
    section: '',
    subject: '',
    search: ''
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Example data fetching function
  const fetchData = async () => {
    setLoading(true);
    try {
      // Simulate API call with filter parameters
      const params = getFilterParams();
      
      // Your API call would go here
      // const response = await api.get('/api/your-endpoint', { params });
      // setData(response.data);
      
      // For demo purposes, just log the filters
      setTimeout(() => {
        setData([
          { id: 1, name: 'Sample Data 1', department: 'Computer Science and Engineering', year: 1 },
          { id: 2, name: 'Sample Data 2', department: 'Electronics and Communication Engineering', year: 2 }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      setLoading(false);
    }
  };

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [filters]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Academic Filter Example
      </Typography>

      {/* Common Academic Filter Component */}
      <AcademicFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        showFilters={['department', 'year', 'semester', 'section', 'search']}
        title="Data Filters"
        showRefreshButton={true}
        onRefresh={fetchData}
        disabled={loading}
      />

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Filters:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(filters).map(([key, value]) => {
              if (value && value !== '') {
                return (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    size="small"
                    onDelete={() => handleFilterChange(key, '')}
                  />
                );
              }
              return null;
            })}
          </Box>
        </Paper>
      )}

      {/* Data Display */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Year</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.department}</TableCell>
                    <TableCell>{item.year}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Filter Parameters Display (for debugging) */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Current Filter Parameters (for API calls):
        </Typography>
        <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
          {JSON.stringify(getFilterParams(), null, 2)}
        </pre>
      </Paper>
    </Container>
  );
};

export default FilterExample;
