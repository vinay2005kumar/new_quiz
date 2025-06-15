# Academic Filter Component

A reusable filter component that dynamically fetches academic data (departments, years, semesters, sections, subjects) from the college settings and provides consistent filtering across the application.

## Features

- **Dynamic Data**: Automatically fetches departments from `/api/admin/departments` and academic details from `/api/academic-details`
- **Consistent UI**: Provides uniform filter interface across all pages
- **Flexible Configuration**: Choose which filters to show and customize behavior
- **Active Filter Display**: Shows count of active filters and clear all functionality
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Graceful fallback to default values if API fails

## Quick Start

### 1. Import the components

```jsx
import AcademicFilter from '../common/AcademicFilter';
import useAcademicFilters from '../../hooks/useAcademicFilters';
```

### 2. Initialize the filter hook

```jsx
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
```

### 3. Use the filter component

```jsx
<AcademicFilter
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={clearFilters}
  showFilters={['department', 'year', 'semester', 'section', 'search']}
  title="Quiz Filters"
  showRefreshButton={true}
  onRefresh={fetchData}
/>
```

### 4. Use filters in API calls

```jsx
useEffect(() => {
  const fetchData = async () => {
    const params = getFilterParams();
    const response = await api.get('/api/your-endpoint', { params });
    setData(response.data);
  };
  fetchData();
}, [filters]);
```

## Props

### AcademicFilter Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | Object | `{}` | Current filter values |
| `onFilterChange` | Function | - | Called when filter changes: `(filterName, value) => {}` |
| `onClearFilters` | Function | - | Called when clear all is clicked |
| `showFilters` | Array | `['department', 'year', 'semester', 'section', 'subject']` | Which filters to display |
| `size` | String | `'small'` | Size of form controls |
| `title` | String | `'Filters'` | Title displayed in filter section |
| `showTitle` | Boolean | `true` | Whether to show the title |
| `showClearButton` | Boolean | `true` | Whether to show clear all button |
| `showRefreshButton` | Boolean | `false` | Whether to show refresh button |
| `onRefresh` | Function | - | Called when refresh is clicked |
| `customFilters` | Array | `[]` | Additional custom filter components |
| `disabled` | Boolean | `false` | Disable all filters |
| `sx` | Object | `{}` | Additional styling |

### Available Filter Types

- `department` - Dropdown with departments from college settings
- `year` - Dropdown with academic years (1-4)
- `semester` - Dropdown with semesters (1-8)
- `section` - Dropdown with sections (A, B, C, etc.)
- `subject` - Dropdown with subjects from academic details
- `search` - Text field for general search

## Hook API

### useAcademicFilters(initialFilters)

Returns an object with:

- `filters` - Current filter state
- `setFilters` - Set entire filter state
- `handleFilterChange(name, value)` - Update single filter
- `clearFilters()` - Reset all filters to initial state
- `setSpecificFilter(name, value)` - Set specific filter without dependencies
- `getActiveFilters()` - Get only filters with values
- `hasActiveFilters()` - Check if any filters are active
- `getFilterParams()` - Get filter object for API calls

## Examples

### Basic Usage

```jsx
const MyComponent = () => {
  const { filters, handleFilterChange, clearFilters } = useAcademicFilters();
  
  return (
    <AcademicFilter
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={clearFilters}
      showFilters={['department', 'year']}
    />
  );
};
```

### With Custom Filters

```jsx
const customFilters = [
  <FormControl fullWidth size="small" key="status">
    <InputLabel>Status</InputLabel>
    <Select
      value={filters.status || ''}
      onChange={(e) => handleFilterChange('status', e.target.value)}
      label="Status"
    >
      <MenuItem value="">All</MenuItem>
      <MenuItem value="active">Active</MenuItem>
      <MenuItem value="inactive">Inactive</MenuItem>
    </Select>
  </FormControl>
];

<AcademicFilter
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={clearFilters}
  showFilters={['department', 'year']}
  customFilters={customFilters}
/>
```

### Quiz Management Example

```jsx
const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const { filters, handleFilterChange, clearFilters, getFilterParams } = useAcademicFilters();

  const fetchQuizzes = async () => {
    const params = getFilterParams();
    const response = await api.get('/api/quizzes', { params });
    setQuizzes(response.data);
  };

  useEffect(() => {
    fetchQuizzes();
  }, [filters]);

  return (
    <div>
      <AcademicFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        showFilters={['department', 'year', 'semester', 'subject']}
        title="Quiz Filters"
        showRefreshButton={true}
        onRefresh={fetchQuizzes}
      />
      {/* Quiz list display */}
    </div>
  );
};
```

## Data Sources

The component automatically fetches data from:

1. **Departments**: `GET /api/admin/departments`
   - Returns array of department objects with `name` field
   
2. **Academic Details**: `GET /api/academic-details`
   - Returns array with `year`, `semester`, `sections`, `subjects` fields
   - Sections and subjects are comma-separated strings

## Error Handling

If API calls fail, the component falls back to default values:
- Departments: Common engineering departments
- Years: 1, 2, 3, 4
- Semesters: 1-8
- Sections: A, B, C, D

## Integration Guide

### Replacing Existing Filters

1. **Remove hardcoded arrays** like `['CSE', 'ECE', 'EEE']`
2. **Replace filter state** with `useAcademicFilters` hook
3. **Replace filter UI** with `<AcademicFilter>` component
4. **Update API calls** to use `getFilterParams()`

### Before (Hardcoded)
```jsx
const [filters, setFilters] = useState({ department: 'all' });
const departments = ['CSE', 'ECE', 'EEE']; // Hardcoded!

<Select value={filters.department}>
  {departments.map(dept => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
</Select>
```

### After (Dynamic)
```jsx
const { filters, handleFilterChange, clearFilters } = useAcademicFilters();

<AcademicFilter
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={clearFilters}
  showFilters={['department']}
/>
```

This ensures all filters use the same data source and stay synchronized with college settings!
