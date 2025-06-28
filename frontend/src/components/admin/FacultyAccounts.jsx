import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Card,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Divider,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  Class as ClassIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../config/axios';
import CountDisplayPaper from '../common/CountDisplayPaper';
import AcademicFilter from '../common/AcademicFilter';
import useAcademicFilters from '../../hooks/useAcademicFilters';

const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const FacultyAccounts = () => {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const {
    filters,
    handleFilterChange,
    clearFilters,
    getFilterParams
  } = useAcademicFilters({
    department: '',
    email: '',
    name: '',
    year: '',
    semester: '',
    section: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    departments: [],
    years: [],
    semesters: [],
    sections: [],
    password: '',
    facultyList: [],
    assignments: []
  });
  const [dialogError, setDialogError] = useState('');
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [facultyInput, setFacultyInput] = useState('');
  const [currentSelections, setCurrentSelections] = useState({
    department: '',
    year: '',
    semester: '',
  });
  const [sectionInput, setSectionInput] = useState('');
  const [sectionsByKey, setSectionsByKey] = useState({});
  const [sectionInputs, setSectionInputs] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [assignedSections, setAssignedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast({ ...toast, open: false });
  };
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [academicDetails, setAcademicDetails] = useState([]);
  const [years, setYears] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState({});
  const [assignedSubjects, setAssignedSubjects] = useState({});
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentEditDialog, setAssignmentEditDialog] = useState(false);

  const getKey = (dept, year, sem) => `${dept}-${year}-${sem}`;

  const fetchSubjectsForSemester = async (department, year, semester) => {
    try {
      const response = await api.get('/api/admin/subjects', {
        params: { department, year, semester }
      });
      return response || [];
    } catch (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }
  };

  const handleSubjectToggle = (key, subject) => {
    setAssignedSubjects(prev => {
      const currentSubjects = prev[key] || [];
      const isAssigned = currentSubjects.includes(subject);

      if (isAssigned) {
        // Remove subject
        return {
          ...prev,
          [key]: currentSubjects.filter(s => s !== subject)
        };
      } else {
        // Add subject
        return {
          ...prev,
          [key]: [...currentSubjects, subject]
        };
      }
    });
  };

  const loadSubjectsForKey = async (key) => {
    const [department, year, semester] = key.split('-');
    const subjects = await fetchSubjectsForSemester(department, year, semester);
    setAvailableSubjects(prev => ({
      ...prev,
      [key]: subjects
    }));
  };

  const handleRemoveAssignment = async (facultyId, assignmentIndex) => {
    try {
      const facultyMember = faculty.find(f => f._id === facultyId);
      if (!facultyMember) return;

      const updatedAssignments = facultyMember.assignments.filter((_, index) => index !== assignmentIndex);

      // Update faculty with remaining assignments
      const updateData = {
        assignments: updatedAssignments,
        // Recalculate aggregated fields
        departments: [...new Set(updatedAssignments.map(a => a.department))],
        years: [...new Set(updatedAssignments.map(a => a.year))],
        semesters: [...new Set(updatedAssignments.map(a => a.semester))],
        sections: [...new Set(updatedAssignments.flatMap(a => a.sections))]
      };

      await api.put(`/api/admin/faculty/${facultyId}`, updateData);
      fetchFaculty(); // Refresh the list

      setToast({
        open: true,
        message: 'Assignment removed successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      setToast({
        open: true,
        message: 'Failed to remove assignment',
        severity: 'error'
      });
    }
  };

  const handleEditAssignment = (faculty, assignmentIndex) => {
    setEditingAssignment({
      faculty,
      assignmentIndex,
      assignment: faculty.assignments[assignmentIndex]
    });
    setAssignmentEditDialog(true);
  };

  const handleUpdateAssignment = async (updatedAssignment) => {
    try {
      const { faculty, assignmentIndex } = editingAssignment;
      const updatedAssignments = [...faculty.assignments];
      updatedAssignments[assignmentIndex] = updatedAssignment;

      const updateData = {
        assignments: updatedAssignments,
        // Recalculate aggregated fields
        departments: [...new Set(updatedAssignments.map(a => a.department))],
        years: [...new Set(updatedAssignments.map(a => a.year))],
        semesters: [...new Set(updatedAssignments.map(a => a.semester))],
        sections: [...new Set(updatedAssignments.flatMap(a => a.sections))]
      };

      await api.put(`/api/admin/faculty/${faculty._id}`, updateData);
      fetchFaculty(); // Refresh the list
      setAssignmentEditDialog(false);
      setEditingAssignment(null);

      setToast({
        open: true,
        message: 'Assignment updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      setToast({
        open: true,
        message: 'Failed to update assignment',
        severity: 'error'
      });
    }
  };

  const handleRemoveDepartment = async (facultyId, departmentToRemove) => {
    try {
      const facultyMember = faculty.find(f => f._id === facultyId);
      if (!facultyMember) return;

      // Remove all assignments for this department
      const updatedAssignments = facultyMember.assignments.filter(
        assignment => assignment.department !== departmentToRemove
      );

      const updateData = {
        assignments: updatedAssignments,
        // Recalculate aggregated fields from remaining assignments
        departments: [...new Set(updatedAssignments.map(a => a.department))],
        years: [...new Set(updatedAssignments.map(a => a.year))],
        semesters: [...new Set(updatedAssignments.map(a => a.semester))],
        sections: [...new Set(updatedAssignments.flatMap(a => a.sections))]
      };

      await api.put(`/api/admin/faculty/${facultyId}`, updateData);
      fetchFaculty(); // Refresh the list

      setToast({
        open: true,
        message: `Department "${departmentToRemove}" and all its assignments removed successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing department:', error);
      setToast({
        open: true,
        message: 'Failed to remove department',
        severity: 'error'
      });
    }
  };

  const handleRemoveYear = async (facultyId, yearToRemove) => {
    try {
      const facultyMember = faculty.find(f => f._id === facultyId);
      if (!facultyMember) return;

      // Remove all assignments for this year
      const updatedAssignments = facultyMember.assignments.filter(
        assignment => assignment.year !== yearToRemove
      );

      const updateData = {
        assignments: updatedAssignments,
        // Recalculate aggregated fields from remaining assignments
        departments: [...new Set(updatedAssignments.map(a => a.department))],
        years: [...new Set(updatedAssignments.map(a => a.year))],
        semesters: [...new Set(updatedAssignments.map(a => a.semester))],
        sections: [...new Set(updatedAssignments.flatMap(a => a.sections))]
      };

      await api.put(`/api/admin/faculty/${facultyId}`, updateData);
      fetchFaculty(); // Refresh the list

      setToast({
        open: true,
        message: `Year ${yearToRemove} and all its assignments removed successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing year:', error);
      setToast({
        open: true,
        message: 'Failed to remove year',
        severity: 'error'
      });
    }
  };

  const handleRemoveSemester = async (facultyId, semesterToRemove) => {
    try {
      const facultyMember = faculty.find(f => f._id === facultyId);
      if (!facultyMember) return;

      // Remove all assignments for this semester
      const updatedAssignments = facultyMember.assignments.filter(
        assignment => assignment.semester !== semesterToRemove
      );

      const updateData = {
        assignments: updatedAssignments,
        // Recalculate aggregated fields from remaining assignments
        departments: [...new Set(updatedAssignments.map(a => a.department))],
        years: [...new Set(updatedAssignments.map(a => a.year))],
        semesters: [...new Set(updatedAssignments.map(a => a.semester))],
        sections: [...new Set(updatedAssignments.flatMap(a => a.sections))]
      };

      await api.put(`/api/admin/faculty/${facultyId}`, updateData);
      fetchFaculty(); // Refresh the list

      setToast({
        open: true,
        message: `Semester ${semesterToRemove} and all its assignments removed successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing semester:', error);
      setToast({
        open: true,
        message: 'Failed to remove semester',
        severity: 'error'
      });
    }
  };

  const handleRemoveSection = async (facultyId, sectionToRemove) => {
    try {
      const facultyMember = faculty.find(f => f._id === facultyId);
      if (!facultyMember) return;

      // Remove this section from all assignments and filter out assignments with no sections left
      const updatedAssignments = facultyMember.assignments
        .map(assignment => ({
          ...assignment,
          sections: assignment.sections.filter(section => section !== sectionToRemove)
        }))
        .filter(assignment => assignment.sections.length > 0);

      const updateData = {
        assignments: updatedAssignments,
        // Recalculate aggregated fields from remaining assignments
        departments: [...new Set(updatedAssignments.map(a => a.department))],
        years: [...new Set(updatedAssignments.map(a => a.year))],
        semesters: [...new Set(updatedAssignments.map(a => a.semester))],
        sections: [...new Set(updatedAssignments.flatMap(a => a.sections))]
      };

      await api.put(`/api/admin/faculty/${facultyId}`, updateData);
      fetchFaculty(); // Refresh the list

      setToast({
        open: true,
        message: `Section ${sectionToRemove} removed from all assignments successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing section:', error);
      setToast({
        open: true,
        message: 'Failed to remove section',
        severity: 'error'
      });
    }
  };

  const handleRemoveSubject = async (facultyId, assignmentIndex, subjectToRemove) => {
    try {
      const facultyMember = faculty.find(f => f._id === facultyId);
      if (!facultyMember) return;

      const updatedAssignments = [...facultyMember.assignments];
      updatedAssignments[assignmentIndex] = {
        ...updatedAssignments[assignmentIndex],
        subjects: updatedAssignments[assignmentIndex].subjects.filter(subject => subject !== subjectToRemove)
      };

      const updateData = {
        assignments: updatedAssignments,
        // Recalculate aggregated fields from remaining assignments
        departments: [...new Set(updatedAssignments.map(a => a.department))],
        years: [...new Set(updatedAssignments.map(a => a.year))],
        semesters: [...new Set(updatedAssignments.map(a => a.semester))],
        sections: [...new Set(updatedAssignments.flatMap(a => a.sections))]
      };

      await api.put(`/api/admin/faculty/${facultyId}`, updateData);
      fetchFaculty(); // Refresh the list

      setToast({
        open: true,
        message: `Subject "${subjectToRemove}" removed successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing subject:', error);
      setToast({
        open: true,
        message: 'Failed to remove subject',
        severity: 'error'
      });
    }
  };

  const handleSectionInput = (dept, year, sem, value) => {
    const key = getKey(dept, year, sem);
    setSectionInputs(prev => ({
      ...prev,
      [key]: value
    }));

    if (value.trim()) {
      const sections = value
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);

      setSectionsByKey(prev => ({
        ...prev,
        [key]: sections
      }));

      const allSections = Object.values(sectionsByKey).flat();
      setFormData(prev => ({
        ...prev,
        sections: allSections,
        departments: [...new Set([...prev.departments, dept])],
        years: [...new Set([...prev.years, year])],
        semesters: [...new Set([...prev.semesters, sem])]
      }));
    }
  };

  const removeSection = (dept, year, sem, sectionToRemove) => {
    const key = getKey(dept, year, sem);
    const updatedSections = sectionsByKey[key].filter(s => s !== sectionToRemove);
    
    setSectionsByKey(prev => ({
      ...prev,
      [key]: updatedSections
    }));

    setSectionInputs(prev => ({
      ...prev,
      [key]: updatedSections.join(', ')
    }));

    const allSections = Object.values({
      ...sectionsByKey,
      [key]: updatedSections
    }).flat();

    setFormData(prev => ({
      ...prev,
      sections: allSections
    }));
  };

  const fetchAcademicDetails = async () => {
    try {
      const response = await api.get('/api/academic-details');
      console.log('Academic details response:', response);
      
      if (response && Array.isArray(response)) {
        setAcademicDetails(response);
        
        // Extract unique departments
        const uniqueDepartments = [...new Set(response.map(detail => detail.department))];
        setDepartments(uniqueDepartments);
      } else {
        console.error('Invalid academic details data:', response);
        setAcademicDetails([]);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching academic details:', error);
      setError('Failed to fetch academic details');
      setAcademicDetails([]);
      setDepartments([]);
    }
  };

  // Update available years when department changes
  useEffect(() => {
    if (selectedDepartment) {
      const departmentYears = [...new Set(
        academicDetails
          .filter(detail => detail.department === selectedDepartment)
          .map(detail => detail.year)
      )].sort((a, b) => a - b);
      
      console.log('Available years for department:', departmentYears);
      setYears(departmentYears);
    } else {
      setYears([]);
    }
  }, [selectedDepartment, academicDetails]);

  // Update available semesters when year changes
  useEffect(() => {
    if (selectedDepartment && selectedYear) {
      const availableSems = [...new Set(
        academicDetails
          .filter(detail => 
            detail.department === selectedDepartment && 
            detail.year === parseInt(selectedYear)
          )
          .map(detail => detail.semester)
      )].sort((a, b) => a - b);
      
      console.log('Available semesters:', availableSems);
      setAvailableSemesters(availableSems);
    } else {
      setAvailableSemesters([]);
    }
  }, [selectedDepartment, selectedYear, academicDetails]);

  // Update available sections when semester changes
  useEffect(() => {
    if (selectedDepartment && selectedYear && selectedSemester) {
      const detail = academicDetails.find(d => 
        d.department === selectedDepartment && 
        d.year === parseInt(selectedYear) && 
        d.semester === parseInt(selectedSemester)
      );

      const sections = detail?.sections ? detail.sections.split(',').map(s => s.trim()) : [];
      console.log('Available sections:', sections);
      setAvailableSections(sections);
    } else {
      setAvailableSections([]);
    }
  }, [selectedDepartment, selectedYear, selectedSemester, academicDetails]);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching faculty accounts...');
      
      // Get faculty accounts specifically
      const response = await api.get('/api/admin/accounts?role=faculty');
      console.log('Faculty response:', response);

      // Check if response exists and has the expected structure
      if (!response || !response.accounts || !Array.isArray(response.accounts)) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }

      // Process faculty accounts and reconstruct arrays for UI compatibility
      const facultyAccounts = response.accounts.map(faculty => {
        // Extract arrays from assignments for UI display
        const assignments = faculty.assignments || [];
        const years = [...new Set(assignments.map(a => a.year))];
        const semesters = [...new Set(assignments.map(a => a.semester))];
        const sections = [...new Set(assignments.flatMap(a => a.sections || []))];

        return {
          ...faculty,
          departments: Array.isArray(faculty.departments) ? faculty.departments : [faculty.department].filter(Boolean),
          years: years.length > 0 ? years : (Array.isArray(faculty.years) ? faculty.years : []),
          semesters: semesters.length > 0 ? semesters : (Array.isArray(faculty.semesters) ? faculty.semesters : []),
          sections: sections.length > 0 ? sections : (Array.isArray(faculty.sections) ? faculty.sections : [])
        };
      });

      setFaculty(facultyAccounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      let errorMessage = 'Failed to fetch faculty. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please check your authentication.';
      } else if (error.response?.status === 403) {
        errorMessage += 'You do not have permission to view faculty.';
      } else if (error.response?.status === 404) {
        errorMessage += 'The faculty list is not available at this time.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (!navigator.onLine) {
        errorMessage += 'Please check your internet connection.';
      } else {
        errorMessage += 'Please try again later.';
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await api.get('/api/academic-details');
      if (response && Array.isArray(response.data)) {
        // Extract all sections from academic details
        const allSections = response.data.reduce((acc, detail) => {
          const sectionArray = detail.sections.split(',').map(s => s.trim());
          return [...new Set([...acc, ...sectionArray])];
        }, []);
        setSections(allSections);
      } else {
        console.error('Invalid sections data:', response);
        setSections([]);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
  };

  useEffect(() => {
    fetchAcademicDetails();
    fetchFaculty();
  }, []);

  const handleOpenDialog = (faculty = null) => {
    if (faculty) {
      setSelectedFaculty(faculty);

      // For editing, populate the form with the faculty data
      const assignments = faculty.assignments || [];

      // Set faculty input and faculty list for editing
      setFacultyInput(faculty.name);

      // Create faculty list with the current faculty data
      const facultyData = {
        name: faculty.name,
        email: faculty.email,
        password: '' // Don't show existing password
      };

      setFormData({
        name: faculty.name,
        email: faculty.email,
        departments: faculty.departments || [faculty.department].filter(Boolean),
        years: [],
        semesters: [],
        sections: [],
        password: '',
        facultyList: [facultyData],
        assignments: assignments
      });

      // Populate assigned sections and subjects from assignments
      const newAssignedSections = {};
      const newAssignedSubjects = {};
      assignments.forEach(assignment => {
        const key = `${assignment.department}-${assignment.year}-${assignment.semester}`;
        newAssignedSections[key] = assignment.sections || [];
        newAssignedSubjects[key] = assignment.subjects || [];
      });
      setAssignedSections(newAssignedSections);
      setAssignedSubjects(newAssignedSubjects);

      // Set current selections to the first assignment if available
      if (assignments.length > 0) {
        const firstAssignment = assignments[0];
        setCurrentSelections({
          department: firstAssignment.department,
          year: firstAssignment.year,
          semester: firstAssignment.semester
        });
      }

      // Load subjects for all assignments
      assignments.forEach(assignment => {
        const key = `${assignment.department}-${assignment.year}-${assignment.semester}`;
        loadSubjectsForKey(key);
      });
    } else {
      // For adding new faculty
      setSelectedFaculty(null);
      setFacultyInput('');
      setFormData({
        name: '',
        email: '',
        departments: [],
        years: [],
        semesters: [],
        sections: [],
        password: '',
        facultyList: [],
        assignments: []
      });
      setAssignedSections({});
      setAssignedSubjects({});
      setCurrentSelections({
        department: '',
        year: '',
        semester: ''
      });
    }
    setDialogError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFaculty(null);
    setDialogError('');
    setFormData({
      name: '',
      email: '',
      departments: [],
      years: [],
      semesters: [],
      sections: [],
      password: '',
      facultyList: [],
      assignments: []
    });
  };

  const checkUserExists = async (email) => {
    try {
      const response = await api.get('/api/admin/accounts');
      return response.accounts && response.accounts.some(account => account.email === email);
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  };

  const handleFacultyInputChange = (e) => {
    const newValue = e.target.value;
    setFacultyInput(newValue);
    
    // Convert input to faculty array
    if (newValue.trim()) {
      const facultyNames = newValue
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      // Create email suggestions based on names
      const facultyData = facultyNames.map(name => ({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        password: `${name.toLowerCase().replace(/\s+/g, '')}123`
      }));
      
      setFormData({
        ...formData,
        facultyList: facultyData
      });
    } else {
      setFormData({
        ...formData,
        facultyList: []
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setDialogError('');
      setError('');

      // Basic validation
      if (!formData.facultyList.length) {
        setDialogError('Please add at least one faculty member');
        return;
      }

      const hasAnySections = Object.values(assignedSections).some(sections => sections.length > 0);
      if (!hasAnySections) {
        setDialogError('Please add at least one section to any semester');
        return;
      }

      // Check if we're editing or creating
      if (selectedFaculty) {
        // Update existing faculty
        const faculty = formData.facultyList[0]; // For editing, there's only one faculty member

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(faculty.email)) {
          setDialogError(`Invalid email format: ${faculty.email}`);
          return;
        }

        // Get all assignments and ensure they're not empty
        const validAssignments = Object.entries(assignedSections)
          .filter(([_, sections]) => sections && sections.length > 0)
          .map(([key, sections]) => {
            const [dept, year, sem] = key.split('-');
            return {
              department: dept,
              year: year,
              semester: sem,
              sections: sections,
              subjects: assignedSubjects[key] || []
            };
          });

        if (validAssignments.length === 0) {
          setDialogError('No valid assignments found');
          return;
        }

        // Collect all unique values
        const uniqueDepartments = [...new Set(validAssignments.map(a => a.department))];
        const uniqueYears = [...new Set(validAssignments.map(a => a.year))];
        const uniqueSemesters = [...new Set(validAssignments.map(a => a.semester))];
        const uniqueSections = [...new Set(validAssignments.reduce((acc, curr) => [...acc, ...curr.sections], []))];

        // Format the data to match server expectations
        const updateData = {
          name: faculty.name,
          email: faculty.email,
          departments: uniqueDepartments,
          years: uniqueYears,
          semesters: uniqueSemesters,
          sections: uniqueSections,
          assignments: validAssignments
        };

        // Add password only if provided
        if (faculty.password && faculty.password.trim()) {
          updateData.password = faculty.password;
        }

        console.log('Updating faculty with data:', updateData);

        // Update the faculty account
        const response = await api.put(`/api/admin/faculty/${selectedFaculty._id}`, updateData);
        console.log('Faculty updated successfully:', response);

      } else {
        // Create new faculty accounts
        for (const faculty of formData.facultyList) {
          try {
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(faculty.email)) {
              setDialogError(`Invalid email format for faculty member: ${faculty.name}`);
              return;
            }

            // Check if user exists
            const exists = await checkUserExists(faculty.email);
            if (exists) {
              setDialogError(`A user with email ${faculty.email} already exists`);
              return;
            }

            // Get all assignments and ensure they're not empty
            const validAssignments = Object.entries(assignedSections)
              .filter(([_, sections]) => sections && sections.length > 0)
              .map(([key, sections]) => {
                const [dept, year, sem] = key.split('-');
                return {
                  department: dept,
                  year: year,
                  semester: sem,
                  sections: sections,
                  subjects: assignedSubjects[key] || []
                };
              });

            if (validAssignments.length === 0) {
              setDialogError('No valid assignments found');
              return;
            }

            // Collect all unique values
            const uniqueDepartments = [...new Set(validAssignments.map(a => a.department))];
            const uniqueYears = [...new Set(validAssignments.map(a => a.year))];
            const uniqueSemesters = [...new Set(validAssignments.map(a => a.semester))];
            const uniqueSections = [...new Set(validAssignments.reduce((acc, curr) => [...acc, ...curr.sections], []))];

            // Ensure we have at least one of each required field
            if (!uniqueDepartments.length || !uniqueYears.length || !uniqueSections.length) {
              setDialogError('Please ensure at least one department, year, and section is assigned');
              return;
            }

            // Format the data to match server expectations
            const dataToSend = {
              name: faculty.name,
              email: faculty.email,
              password: faculty.password || `${faculty.name.toLowerCase().replace(/\s+/g, '')}123`,
              role: 'faculty',
              // Primary assignment data
              department: uniqueDepartments[0],
              year: uniqueYears[0],
              semester: validAssignments[0].semester,
              section: uniqueSections[0],
              // Arrays of all assigned values (required by backend validation)
              departments: uniqueDepartments,
              years: uniqueYears,
              semesters: uniqueSemesters,
              sections: uniqueSections,
              // Additional data
              assignments: validAssignments,
              isEventQuizAccount: false
            };

            console.log('Creating faculty with data:', dataToSend);

            // Create the faculty account
            const response = await api.post('/api/admin/accounts', dataToSend);
            console.log('Faculty created successfully:', response);

          } catch (error) {
            console.error('Error creating faculty:', error);
            if (error.response?.data?.message) {
              setDialogError(error.response.data.message);
            } else {
              setDialogError(`Failed to create faculty account for ${faculty.name}: ${error.message}`);
            }
            return;
          }
        }
      }

      // If we get here, all accounts were created successfully
      handleCloseDialog();
      fetchFaculty();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setDialogError(error.message || 'An unexpected error occurred while creating faculty accounts');
    }
  };

  const handleDelete = async (facultyId) => {
    try {
      await api.delete(`/api/admin/accounts/${facultyId}`);
      fetchFaculty();
      setOpenDeleteDialog(false);
      setFacultyToDelete(null);
    } catch (error) {
      setError('Failed to delete faculty account');
    }
  };

  const handleDeleteClick = (faculty) => {
    setFacultyToDelete(faculty);
    setOpenDeleteDialog(true);
  };

  const processYearSemSec = (yearSemSec) => {
    if (!yearSemSec || typeof yearSemSec !== 'string') {
      throw new Error('Year_Sem_Sec must be a non-empty string');
    }

    console.log('🔍 Processing Year_Sem_Sec:', yearSemSec);

    const assignments = [];
    // Split by semicolon for different year-semester combinations
    const pairs = yearSemSec.trim().split(';').filter(p => p.trim());

    console.log('📋 Split pairs:', pairs);

    pairs.forEach((pair, index) => {
      console.log(`🔸 Processing pair ${index + 1}:`, pair.trim());

      // Split by colon to separate year-semester from sections
      const parts = pair.trim().split(':');
      if (parts.length !== 2) {
        throw new Error(`Invalid format in pair ${index + 1}: "${pair}". Expected format: "Year-Semester:Sections"`);
      }

      const [yearSem, sections] = parts;
      console.log(`   Year-Semester part: "${yearSem.trim()}"`);
      console.log(`   Sections part: "${sections.trim()}"`);

      // Parse year-semester part
      const yearSemParts = yearSem.trim().split('-');
      if (yearSemParts.length !== 2) {
        throw new Error(`Invalid year-semester format in pair ${index + 1}: "${yearSem}". Expected format: "Year-Semester"`);
      }

      const [year, semester] = yearSemParts;
      const yearNum = parseInt(year.trim());
      const semesterNum = parseInt(semester.trim());

      // Validate year and semester
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
        throw new Error(`Invalid year in pair ${index + 1}: "${year}". Year must be 1-4`);
      }
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        throw new Error(`Invalid semester in pair ${index + 1}: "${semester}". Semester must be 1-8`);
      }

      console.log(`   Parsed Year: ${yearNum}, Semester: ${semesterNum}`);

      // Parse sections
      if (!sections.trim()) {
        throw new Error(`No sections specified in pair ${index + 1}: "${pair}"`);
      }

      const sectionList = sections.trim().split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      console.log(`   Parsed sections:`, sectionList);

      if (sectionList.length === 0) {
        throw new Error(`No valid sections found in pair ${index + 1}: "${sections}"`);
      }

      // Validate section format (should be single uppercase letters)
      const invalidSections = sectionList.filter(s => !/^[A-Z]$/.test(s));
      if (invalidSections.length > 0) {
        throw new Error(`Invalid section format in pair ${index + 1}: "${invalidSections.join(', ')}". Sections must be single uppercase letters (A, B, C, etc.)`);
      }

      const assignment = {
        year: yearNum.toString(),
        semester: semesterNum.toString(),
        sections: sectionList
      };

      console.log(`   ✅ Created assignment:`, assignment);
      assignments.push(assignment);
    });

    if (assignments.length === 0) {
      throw new Error('No valid assignments found');
    }

    console.log('🎯 Final assignments:', assignments);
    return assignments;
  };

  const processSubjects = (subjectsString, assignments) => {
    if (!subjectsString || typeof subjectsString !== 'string') {
      // Return assignments with empty subjects if no subjects provided
      return assignments.map(assignment => ({
        ...assignment,
        subjects: []
      }));
    }

    console.log('🔍 Processing Subjects:', subjectsString);

    // Create a map to store subjects for each year-semester combination
    const subjectMap = new Map();

    // Split by semicolon for different year-semester combinations
    const pairs = subjectsString.trim().split(';').filter(p => p.trim());

    pairs.forEach((pair, index) => {
      console.log(`🔸 Processing subject pair ${index + 1}:`, pair.trim());

      // Split by colon to separate year-semester from subjects
      const parts = pair.trim().split(':');
      if (parts.length !== 2) {
        throw new Error(`Invalid subject format in pair ${index + 1}: "${pair}". Expected format: "Year-Semester:Subjects"`);
      }

      const [yearSem, subjects] = parts;
      const key = yearSem.trim();

      // Parse subjects
      const subjectList = subjects.trim().split(',').map(s => s.trim()).filter(s => s);
      subjectMap.set(key, subjectList);

      console.log(`   ✅ Subjects for ${key}:`, subjectList);
    });

    // Add subjects to corresponding assignments
    const assignmentsWithSubjects = assignments.map(assignment => {
      const key = `${assignment.year}-${assignment.semester}`;
      const subjects = subjectMap.get(key) || [];

      return {
        ...assignment,
        subjects
      };
    });

    console.log('🎯 Final assignments with subjects:', assignmentsWithSubjects);
    return assignmentsWithSubjects;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadError('');
    setUploadStatus('reading');
    setUploadProgress(10);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setUploadProgress(30);
        setUploadStatus('validating');

        // Validate the data structure
        const validationErrors = [];
        const processedData = jsonData.map((row, index) => {
          console.log(`\n🔍 Processing Excel Row ${index + 2}:`, row);

          const errors = [];
          if (!row.Name && !row.name) errors.push(`Row ${index + 2}: Name is required`);
          if (!row.Email && !row.email) errors.push(`Row ${index + 2}: Email is required`);
          if (!row.Department && !row.department) errors.push(`Row ${index + 2}: Department is required`);
          if (!row.Year_Sem_Sec && !row.year_sem_sec) errors.push(`Row ${index + 2}: Year_Sem_Sec is required`);

          // Add row-specific errors to the main validation errors array
          validationErrors.push(...errors);

          const yearSemSec = row.Year_Sem_Sec || row.year_sem_sec;
          const subjectsString = row.Subjects || row.subjects || '';
          console.log(`📝 Year_Sem_Sec for row ${index + 2}:`, yearSemSec);
          console.log(`📝 Subjects for row ${index + 2}:`, subjectsString);

          let assignments = [];

          try {
            if (yearSemSec) {
              // First parse assignments without subjects
              const baseAssignments = processYearSemSec(yearSemSec);
              // Then add subjects to assignments
              assignments = processSubjects(subjectsString, baseAssignments);
              console.log(`✅ Successfully parsed assignments for row ${index + 2}:`, assignments);
            }
          } catch (e) {
            const error = `Row ${index + 2}: Invalid format - ${e.message}`;
            console.error(`❌ Error parsing row ${index + 2}:`, e.message);
            errors.push(error);
            validationErrors.push(error);
          }

          // Get unique years, semesters, and sections from assignments
          const years = [...new Set(assignments.map(a => a.year))];
          const semesters = [...new Set(assignments.map(a => a.semester))];
          const sections = [...new Set(assignments.flatMap(a => a.sections))];

          // Create faculty data in the exact format the backend expects
          const facultyData = {
            name: row.Name || row.name,
            email: row.Email || row.email,
            password: row.Password || row.password || Math.random().toString(36).slice(-8),
            department: row.Department || row.department, // Backend expects singular 'department'
            assignments: assignments.map(a => ({
              department: row.Department || row.department,
              year: a.year.toString(),
              semester: a.semester.toString(),
              sections: a.sections
            })),
            role: 'faculty', // Explicitly set role
            validationErrors: errors
          };

          // Additional validation for faculty requirements
          if (!facultyData.department) {
            errors.push(`Row ${index + 2}: No department specified`);
            validationErrors.push(`Row ${index + 2}: No department specified`);
          }
          if (facultyData.assignments.length === 0) {
            errors.push(`Row ${index + 2}: No valid assignments found`);
            validationErrors.push(`Row ${index + 2}: No valid assignments found`);
          }

          return facultyData;
        });

        setUploadProgress(50);

        if (validationErrors.length > 0) {
          setUploadError(`Validation errors found:\n${validationErrors.slice(0, 10).join('\n')}${validationErrors.length > 10 ? '\n...and more errors' : ''}`);
          setUploadStatus('error');
          return;
        }

        setUploadPreview(processedData);
        setUploadProgress(70);
        setUploadStatus('ready');

      } catch (error) {
        console.error('Error processing Excel file:', error);
        setUploadError('Failed to process Excel file. Please check the format.');
        setUploadStatus('error');
      }
    };

    reader.onerror = () => {
      setUploadError('Failed to read the file. Please try again.');
      setUploadStatus('error');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmUpload = async () => {
    try {
      setUploadStatus('uploading');
      setUploadProgress(80);

      // Upload the faculty accounts - only send fields the backend expects
      const accountsToUpload = uploadPreview.map(faculty => ({
        name: faculty.name,
        email: faculty.email,
        password: faculty.password,
        department: faculty.department,
        assignments: faculty.assignments,
        role: 'faculty'
      }));

      console.log('Uploading faculty accounts:', {
        count: accountsToUpload.length,
        accounts: accountsToUpload
      });

      const response = await api.post('/api/admin/accounts/bulk', {
        accounts: accountsToUpload
      });

      setUploadProgress(100);
      setUploadStatus('success');
      console.log('Bulk upload response:', response);

      // Show success message with details
      const successMessage = response.errors && response.errors.length > 0
        ? `Uploaded ${response.created || uploadPreview.length} faculty accounts. ${response.errors.length} errors occurred.`
        : `Successfully uploaded ${response.created || uploadPreview.length} faculty accounts`;

      setToast({
        open: true,
        message: successMessage,
        severity: response.errors && response.errors.length > 0 ? 'warning' : 'success'
      });

      // Show detailed errors if any
      if (response.errors && response.errors.length > 0) {
        console.error('Upload errors:', response.errors);
        const errorDetails = response.errors.slice(0, 5).join('\n');
        setUploadError(`Some accounts failed to create:\n${errorDetails}${response.errors.length > 5 ? '\n...and more' : ''}`);

        // Also show detailed errors in console for debugging
        console.log('Detailed error breakdown:', {
          totalAttempted: uploadPreview.length,
          successful: response.created || 0,
          failed: response.errors.length,
          errors: response.errors
        });
      }

      // Close dialog and refresh faculty list after short delay
      setTimeout(() => {
        setOpenUploadDialog(false);
        fetchFaculty();
        // Reset upload states
        setUploadedFile(null);
        setUploadPreview([]);
        setUploadProgress(0);
        setUploadStatus('');
        if (!response.errors || response.errors.length === 0) {
          setUploadError('');
        }
      }, 1500);

    } catch (error) {
      console.error('Error uploading faculty data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload faculty data';
      setUploadError(errorMessage);
      setUploadStatus('error');
      setToast({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const getFilteredFaculty = () => {
    return faculty.filter(member => {
      const departmentMatch = !filters.department || 
        (member.departments && Array.isArray(member.departments) && 
         member.departments.includes(filters.department));
      const emailMatch = !filters.email || 
        (member.email && member.email.toLowerCase().includes(filters.email.toLowerCase()));
      const nameMatch = !searchQuery || 
        (member.name && member.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return departmentMatch && emailMatch && nameMatch;
    });
  };

  // Add helper function to group faculty by department
  const getFacultyByDepartment = () => {
    const groupedFaculty = {};
    departments.forEach(dept => {
      groupedFaculty[dept.name] = faculty.filter(member => 
        member.departments.includes(dept.name)
      );
    });
    return groupedFaculty;
  };

  // Add a retry button component
  const RetryButton = () => (
    <Button 
      variant="contained" 
      onClick={fetchFaculty}
      sx={{ mt: 2 }}
    >
      Retry Loading
    </Button>
  );

  // Add toggleAllPasswords function
  const toggleAllPasswords = async () => {
    try {
      if (!showAllPasswords) {
        // Fetch all passwords at once
        const response = await api.get('/api/admin/accounts/passwords?role=faculty');
        setVisiblePasswords(response.passwords);
      } else {
        // Clear all visible passwords
        setVisiblePasswords({});
      }
      setShowAllPasswords(!showAllPasswords);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    }
  };

  // Add helper function to get available sections
  const getAvailableSections = (department, year, semester) => {
    if (!department || !year || !semester) return [];
    const matchingSection = sections.find(section => 
      section.department === department && 
      section.year.toString() === year.toString() &&
      section.semester.toString() === semester.toString()
    );
    return matchingSection ? matchingSection.sections : [];
  };

  // Add helper function to add assignment
  const handleAddAssignment = async (facultyId, type, value) => {
    try {
      const facultyToUpdate = faculty.find(f => f._id === facultyId);
      if (!facultyToUpdate) return;

      let updateData = { ...facultyToUpdate };

      // Update the specific array based on type
      switch (type) {
        case 'department':
          updateData.departments = [...new Set([...updateData.departments, value])];
          break;
        case 'year':
          updateData.years = [...new Set([...updateData.years, value])];
          break;
        case 'semester':
          updateData.semesters = [...new Set([...updateData.semesters, value])];
          break;
        case 'section':
          updateData.sections = [...new Set([...updateData.sections, value])];
          break;
        default:
          return;
      }

      // Update assignments array
      if (type === 'section') {
        // Find matching department-year-semester combinations
        const relevantAssignments = updateData.assignments || [];
        const existingAssignment = relevantAssignments.find(a => 
          a.sections.includes(value)
        );

        if (!existingAssignment) {
          // Add new assignment if it doesn't exist
          updateData.assignments = [
            ...(updateData.assignments || []),
            {
              department: updateData.departments[0],
              year: updateData.years[0],
              semester: updateData.semesters[0],
              sections: [value]
            }
          ];
        }
      }

      // Make API call to update faculty
      await api.put(`/api/admin/faculty/${facultyId}`, updateData);

      // Update local state
      setFaculty(prevFaculty => 
        prevFaculty.map(f => 
          f._id === facultyId ? { ...f, ...updateData } : f
        )
      );
    } catch (error) {
      console.error('Error updating faculty assignments:', error);
      setError('Failed to update faculty assignments');
    }
  };



  // Helper function to handle section input
  const handleAddSection = () => {
    if (!sectionInput.trim() || !selectedDepartment || !selectedYear || !selectedSemester) return;

    const key = getKey(selectedDepartment, selectedYear, selectedSemester);
    const sections = sectionInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    setAssignedSections(prev => ({
      ...prev,
      [key]: [...new Set([...(prev[key] || []), ...sections])]
    }));

    setSectionInput('');

    // Update formData
    const allSections = Object.values(assignedSections).flat();
    setFormData(prev => ({
      ...prev,
      departments: [...new Set([...prev.departments, selectedDepartment])],
      years: [...new Set([...prev.years, selectedYear])],
      semesters: [...new Set([...prev.semesters, selectedSemester])],
      sections: allSections
    }));
  };

  // Add function to toggle password visibility
  const togglePasswordVisibility = async (facultyId) => {
    try {
      if (!visiblePasswords[facultyId]) {
        // Fetch password only if not already visible
        const response = await api.get(`/api/admin/accounts/${facultyId}/password`);
        if (response && response.password) {
          setVisiblePasswords(prev => ({
            ...prev,
            [facultyId]: response.password
          }));
        } else {
          setError('Failed to fetch password');
        }
      } else {
        // Hide password
        setVisiblePasswords(prev => {
          const newState = { ...prev };
          delete newState[facultyId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error fetching password:', error);
      setError('Failed to fetch password');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // First fetch all passwords
      const response = await api.get('/api/admin/accounts/passwords?role=faculty');
      const passwords = response.passwords || {};

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Faculty Accounts', 14, 15);
      
      // Add timestamp and counts
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
      doc.text(`Total Faculty: ${faculty.length}`, 14, 28);
      doc.text(`Filtered Faculty: ${getFilteredFaculty().length}`, 14, 34);
      
      // Add filter information if any filters are active
      let filterText = '';
      if (filters.department) filterText += `Department: ${filters.department} `;
      if (searchQuery) filterText += `Search: "${searchQuery}"`;
      
      if (filterText) {
        doc.text(`Filters Applied: ${filterText}`, 14, 40);
      }
      
      // Prepare table data with original passwords
      const tableData = getFilteredFaculty().map(facultyMember => [
        facultyMember.name || '',
        facultyMember.email || '',
        facultyMember.departments?.join(', ') || '',
        facultyMember.years?.join(', ') || '',
        passwords[facultyMember._id] || '********'  // Use fetched password
      ]);
      
      // Add table using autoTable
      autoTable(doc, {
        startY: 25,
        head: [['Name', 'Email', 'Departments', 'Years', 'Password']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 71, 71] },
        columnStyles: {
          0: { cellWidth: 40 }, // Name
          1: { cellWidth: 50 }, // Email
          2: { cellWidth: 40 }, // Departments
          3: { cellWidth: 30 }, // Years
          4: { cellWidth: 30 }  // Password
        }
      });
      
      // Save PDF
      doc.save('faculty-accounts.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading faculty...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          action={<RetryButton />}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Faculty Accounts</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon className="download-icon" />}
              onClick={handleDownloadPDF}
              sx={{
                color: 'purple.main',
                borderColor: 'purple.main',
                '&:hover': {
                  borderColor: 'purple.dark',
                  backgroundColor: 'purple.50'
                }
              }}
            >
              Download PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon className="upload-icon" />}
              onClick={() => setOpenUploadDialog(true)}
              sx={{
                color: 'orange.main',
                borderColor: 'orange.main',
                '&:hover': {
                  borderColor: 'orange.dark',
                  backgroundColor: 'orange.50'
                }
              }}
            >
              Upload Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon className="add-icon" />}
              onClick={() => handleOpenDialog()}
              sx={{
                backgroundColor: 'success.main',
                '&:hover': { backgroundColor: 'success.dark' }
              }}
            >
              Add Faculty
            </Button>
          </Box>
        </Box>

        {faculty.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No faculty accounts found. Use the "Add Faculty" button above to create faculty accounts.
          </Alert>
        ) : (
          <>
            {/* Search and Filters Section */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                {/* Search Field */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search by Faculty Name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <SearchIcon color="action" sx={{ mr: 1 }} />
                      ),
                    }}
                    placeholder="Type to search..."
                  />
                </Grid>

                {/* Academic Filters */}
                <Grid item xs={12}>
                  <AcademicFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={() => {
                      clearFilters();
                      setSearchQuery('');
                    }}
                    showFilters={['department']}
                    title="Faculty Filters"
                    showRefreshButton={true}
                    onRefresh={fetchFaculty}
                    customFilters={[]}
                    sx={{ p: 0, boxShadow: 'none', bgcolor: 'transparent' }}
                  />
                </Grid>
              </Grid>

              {/* Search Results Count */}
              {searchQuery && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Found {getFilteredFaculty().length} matching faculty members
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Count Display */}
            <CountDisplayPaper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Showing {getFilteredFaculty().length} out of {faculty.length} faculty members
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    {filters.department && `Department: ${filters.department}`}
                    {searchQuery && ` • Search: "${searchQuery}"`}
                  </Typography>
                </Grid>
              </Grid>
            </CountDisplayPaper>

            {/* Table Section */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Password</strong></TableCell>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Assignments</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredFaculty().map((member) => (
                    <TableRow key={member._id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      
                      {/* Password Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {visiblePasswords[member._id] ? 
                              visiblePasswords[member._id] : 
                              '••••••••'
                            }
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => togglePasswordVisibility(member._id)}
                            sx={{ ml: 1 }}
                          >
                            {visiblePasswords[member._id] ? 
                              <VisibilityOffIcon fontSize="small" /> : 
                              <VisibilityIcon fontSize="small" />
                            }
                          </IconButton>
                        </Box>
                      </TableCell>

                      {/* Department Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {member.departments && member.departments.length > 0 ? (
                            member.departments.map((dept) => (
                              <Box key={dept} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                <Chip
                                  label={dept}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveDepartment(member._id, dept)}
                                  sx={{
                                    p: 0.25,
                                    ml: 0.25,
                                    '&:hover': {
                                      backgroundColor: 'error.light',
                                      color: 'error.contrastText'
                                    }
                                  }}
                                  title={`Remove ${dept} department and all its assignments`}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No department assigned
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Assignments Cell */}
                      <TableCell>
                        <Box sx={{ maxWidth: 400 }}>
                          {member.assignments && member.assignments.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {member.assignments.map((assignment, index) => (
                                <Card key={index} variant="outlined" sx={{ p: 1, bgcolor: 'background.paper', position: 'relative' }}>
                                  {/* Assignment Actions */}
                                  <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditAssignment(member, index)}
                                      sx={{ p: 0.25 }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveAssignment(member._id, index)}
                                      sx={{ p: 0.25 }}
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>

                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', pr: 6 }}>
                                    {/* Year Chip with Delete */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                      <Chip
                                        label={`Y${assignment.year}`}
                                        size="small"
                                        color="primary"
                                        variant="filled"
                                      />
                                      <IconButton
                                        size="small"
                                        onClick={() => handleRemoveYear(member._id, assignment.year)}
                                        sx={{
                                          p: 0.125,
                                          '&:hover': {
                                            backgroundColor: 'error.light',
                                            color: 'error.contrastText'
                                          }
                                        }}
                                        title={`Remove Year ${assignment.year} and all its assignments`}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>

                                    {/* Semester Chip with Delete */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                      <Chip
                                        label={`S${assignment.semester}`}
                                        size="small"
                                        color="secondary"
                                        variant="filled"
                                      />
                                      <IconButton
                                        size="small"
                                        onClick={() => handleRemoveSemester(member._id, assignment.semester)}
                                        sx={{
                                          p: 0.125,
                                          '&:hover': {
                                            backgroundColor: 'error.light',
                                            color: 'error.contrastText'
                                          }
                                        }}
                                        title={`Remove Semester ${assignment.semester} and all its assignments`}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>

                                    {/* Sections with Delete */}
                                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                                      {assignment.sections && assignment.sections.map((section) => (
                                        <Box key={section} sx={{ display: 'flex', alignItems: 'center', gap: 0.125 }}>
                                          <Chip
                                            label={section}
                                            size="small"
                                            color="default"
                                            variant="outlined"
                                          />
                                          <IconButton
                                            size="small"
                                            onClick={() => handleRemoveSection(member._id, section)}
                                            sx={{
                                              p: 0.125,
                                              '&:hover': {
                                                backgroundColor: 'error.light',
                                                color: 'error.contrastText'
                                              }
                                            }}
                                            title={`Remove Section ${section} from all assignments`}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                  {assignment.subjects && assignment.subjects.length > 0 && (
                                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      <Typography variant="caption" color="textSecondary" sx={{ width: '100%', mb: 0.5 }}>
                                        Subjects:
                                      </Typography>
                                      {assignment.subjects.map((subject, idx) => {
                                        const isLong = subject.length > 25;
                                        const displayText = isLong ? `${subject.substring(0, 25)}...` : subject;

                                        const subjectElement = (
                                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                            <Chip
                                              label={displayText}
                                              size="small"
                                              color="success"
                                              variant="outlined"
                                              sx={{
                                                fontSize: '0.65rem',
                                                height: '18px',
                                                '& .MuiChip-label': {
                                                  px: 0.75,
                                                  py: 0
                                                }
                                              }}
                                            />
                                            <IconButton
                                              size="small"
                                              onClick={() => handleRemoveSubject(member._id, index, subject)}
                                              sx={{
                                                p: 0.125,
                                                '&:hover': {
                                                  backgroundColor: 'error.light',
                                                  color: 'error.contrastText'
                                                }
                                              }}
                                              title={`Remove subject: ${subject}`}
                                            >
                                              <DeleteIcon fontSize="small" />
                                            </IconButton>
                                          </Box>
                                        );

                                        return isLong ? (
                                          <Tooltip key={idx} title={subject} arrow placement="top">
                                            {subjectElement}
                                          </Tooltip>
                                        ) : subjectElement;
                                      })}
                                    </Box>
                                  )}
                                </Card>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              No assignments
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Actions Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit Faculty">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(member)}
                              className="edit-icon"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Faculty">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setFacultyToDelete(member);
                                setOpenDeleteDialog(true);
                              }}
                              className="delete-icon"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Show message when no results found */}
            {getFilteredFaculty().length === 0 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  No faculty members found matching your search criteria.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Faculty Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedFaculty ? 'Edit Faculty' : 'Add Faculty'}
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Faculty Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Faculty Information</Typography>
              <TextField
                fullWidth
                label="Faculty Names (comma-separated)"
                value={facultyInput}
                onChange={handleFacultyInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && facultyInput.trim()) {
                    e.preventDefault();
                    const newValue = facultyInput + ', ';
                    setFacultyInput(newValue);
                  }
                }}
                helperText="Enter faculty names separated by commas (e.g., John Doe, Jane Smith)"
                placeholder="Type faculty names and press Enter or add commas"
                multiline
                rows={2}
              />
            </Grid>

            {formData.facultyList && formData.facultyList.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Faculty Details:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.facultyList.map((faculty, index) => (
                    <Box key={index} sx={{
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      p: 2,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      width: '100%'
                    }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Name"
                            value={faculty.name}
                            onChange={(e) => {
                              const updatedList = [...formData.facultyList];
                              updatedList[index].name = e.target.value;
                              setFormData({ ...formData, facultyList: updatedList });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Email"
                            value={faculty.email}
                            onChange={(e) => {
                              const updatedList = [...formData.facultyList];
                              updatedList[index].email = e.target.value;
                              setFormData({ ...formData, facultyList: updatedList });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Password"
                            value={faculty.password}
                            onChange={(e) => {
                              const updatedList = [...formData.facultyList];
                              updatedList[index].password = e.target.value;
                              setFormData({ ...formData, facultyList: updatedList });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const updatedList = formData.facultyList.filter((_, i) => i !== index);
                              setFormData({ ...formData, facultyList: updatedList });
                              setFacultyInput(updatedList.map(f => f.name).join(', '));
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}

            {/* Department Assignment */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Class Assignment</Typography>
              
              {/* Department Selection */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Select Department</Typography>
                <FormControl fullWidth>
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedYear('');
                      setSelectedSemester('');
                      setSectionInput('');
                    }}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select a department</em>
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>

              {/* Year Selection - Only show if department is selected */}
              {selectedDepartment && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Select Year</Typography>
                  <Grid container spacing={2}>
                    {years.map((year) => (
                      <Grid item xs={6} sm={3} key={year}>
                        <Button
                          fullWidth
                          variant={selectedYear === year.toString() ? "contained" : "outlined"}
                          onClick={() => {
                            setSelectedYear(year.toString());
                            setSelectedSemester('');
                            setSectionInput('');
                          }}
                        >
                          Year {year}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* Semester Selection - Only show if year is selected */}
              {selectedYear && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Select Semester</Typography>
                  <Grid container spacing={2}>
                    {availableSemesters.map((semester) => (
                      <Grid item xs={6} sm={3} key={semester}>
                        <Button
                          fullWidth
                          variant={selectedSemester === semester.toString() ? "contained" : "outlined"}
                          onClick={() => {
                            setSelectedSemester(semester.toString());
                            setSectionInput('');
                          }}
                        >
                          Semester {semester}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* Section Selection - Only show if semester is selected */}
              {selectedSemester && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Select Sections</Typography>
                  <Grid container spacing={2}>
                    {availableSections.map((section) => (
                      <Grid item xs={6} sm={3} key={section}>
                        <Button
                          fullWidth
                          variant={
                            assignedSections[getKey(selectedDepartment, selectedYear, selectedSemester)]?.includes(section)
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() => {
                            const key = getKey(selectedDepartment, selectedYear, selectedSemester);
                            const currentSections = assignedSections[key] || [];
                            const newSections = currentSections.includes(section)
                              ? currentSections.filter(s => s !== section)
                              : [...currentSections, section];

                            setAssignedSections(prev => ({
                              ...prev,
                              [key]: newSections
                            }));

                            // Load subjects for this semester when sections are assigned
                            if (newSections.length > 0 && !availableSubjects[key]) {
                              loadSubjectsForKey(key);
                            }
                          }}
                        >
                          Section {section}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* Subject Selection - Only show if sections are assigned for current semester */}
              {selectedSemester && assignedSections[getKey(selectedDepartment, selectedYear, selectedSemester)]?.length > 0 && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Subjects for {selectedDepartment} - Year {selectedYear} - Semester {selectedSemester}
                  </Typography>
                  {availableSubjects[getKey(selectedDepartment, selectedYear, selectedSemester)]?.length > 0 ? (
                    <Grid container spacing={1}>
                      {availableSubjects[getKey(selectedDepartment, selectedYear, selectedSemester)].map((subject, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Button
                            fullWidth
                            size="small"
                            variant={
                              assignedSubjects[getKey(selectedDepartment, selectedYear, selectedSemester)]?.includes(subject.fullName)
                                ? "contained"
                                : "outlined"
                            }
                            onClick={() => handleSubjectToggle(getKey(selectedDepartment, selectedYear, selectedSemester), subject.fullName)}
                            sx={{
                              textAlign: 'left',
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              py: 0.5
                            }}
                          >
                            {subject.name}
                            {subject.code && (
                              <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                                ({subject.code})
                              </Typography>
                            )}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        {availableSubjects[getKey(selectedDepartment, selectedYear, selectedSemester)] === undefined
                          ? 'Loading subjects...'
                          : 'No subjects found for this semester'
                        }
                      </Typography>
                      {availableSubjects[getKey(selectedDepartment, selectedYear, selectedSemester)] === undefined && (
                        <Button
                          size="small"
                          onClick={() => loadSubjectsForKey(getKey(selectedDepartment, selectedYear, selectedSemester))}
                          sx={{ mt: 1 }}
                        >
                          Load Subjects
                        </Button>
                      )}
                    </Box>
                  )}
                </Paper>
              )}

              {/* Show final submit section if any sections are added */}
              {Object.values(assignedSections).some(sections => sections.length > 0) && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      Review and Submit Assignments
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSubmit}
                      disabled={!formData.facultyList.length}
                    >
                      {selectedFaculty ? 'Update Faculty' : 'Create Faculty'}
                    </Button>
                  </Box>
                  
                  {/* Summary of assignments */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Assignment Summary:</Typography>
                    {Object.entries(assignedSections).map(([key, sections]) => {
                      if (sections.length === 0) return null;
                      const [dept, year, sem] = key.split('-');
                      const subjects = assignedSubjects[key] || [];
                      return (
                        <Box key={key} sx={{ mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            • {dept} - Year {year} - Semester {sem}: {sections.join(', ')}
                          </Typography>
                          {subjects.length > 0 && (
                            <Typography variant="caption" color="textSecondary" sx={{ ml: 2, display: 'block' }}>
                              Subjects: {subjects.length} assigned
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {Object.values(assignedSections).some(sections => sections.length > 0) && (
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.facultyList.length}
            >
              {selectedFaculty ? 'Update' : 'Add Faculty'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Upload Excel Dialog */}
      <Dialog 
        open={openUploadDialog} 
        onClose={() => {
          if (uploadStatus !== 'uploading') {
            setOpenUploadDialog(false);
            setUploadedFile(null);
            setUploadPreview([]);
            setUploadProgress(0);
            setUploadStatus('');
            setUploadError('');
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Faculty Data</DialogTitle>
        <DialogContent>
          {/* Instructions Section */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Upload Instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" gutterBottom>
                Upload an Excel file containing faculty information. The file should follow this structure:
              </Typography>
              
              <Box sx={{
                my: 2,
                p: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`
              }}>
                <Typography variant="subtitle2" gutterBottom>Required Excel Columns:</Typography>
                <Typography variant="body2" component="div">
                  <ul>
                    <li><strong>Name</strong>: Full name of the faculty member</li>
                    <li><strong>Email</strong>: Valid email address</li>
                    <li><strong>Password</strong>: Initial password (optional)</li>
                    <li><strong>Department</strong>: Department name</li>
                    <li><strong>Year_Sem_Sec</strong>: Semester-specific section assignments in format:
                      <pre style={{
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px',
                        marginTop: '8px'
                      }}>
                        Year-Semester:Sections
                      </pre>
                      Example: "2-1:A,B;2-2:B,C" means:
                      <ul>
                        <li>Year 2, Semester 1: Sections A and B</li>
                        <li>Year 2, Semester 2: Sections B and C</li>
                      </ul>
                    </li>
                    <li><strong>Subjects</strong>: Subject assignments for each semester in format:
                      <pre style={{
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px',
                        marginTop: '8px'
                      }}>
                        Year-Semester:Subject1,Subject2;Year-Semester:Subject3
                      </pre>
                      Example: "2-1:Programming Fundamentals(CS101),Data Structures(CS201);2-2:Database Systems(CS301)"
                    </li>
                  </ul>
                </Typography>
              </Box>

              {/* Example Format Section */}
              <Box sx={{ my: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Example Excel Format:</Typography>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Year_Sem_Sec</TableCell>
                        <TableCell>Subjects</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>John Doe</TableCell>
                        <TableCell>john.doe@example.com</TableCell>
                        <TableCell>Computer Science</TableCell>
                        <TableCell>2-1:A,B;2-2:B,C</TableCell>
                        <TableCell>2-1:Programming Fundamentals(CS101),Data Structures(CS201);2-2:Database Systems(CS301)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Jane Smith</TableCell>
                        <TableCell>jane.smith@example.com</TableCell>
                        <TableCell>Electronics</TableCell>
                        <TableCell>1-1:A;1-2:A;2-1:A</TableCell>
                        <TableCell>1-1:Circuit Analysis(EE101);1-2:Digital Electronics(EE102);2-1:Microprocessors(EE201)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bob Wilson</TableCell>
                        <TableCell>bob.wilson@example.com</TableCell>
                        <TableCell>Mechanical</TableCell>
                        <TableCell>3-1:B,C;3-2:A,B,C</TableCell>
                        <TableCell>3-1:Thermodynamics(ME301),Fluid Mechanics(ME302);3-2:Heat Transfer(ME401)</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Understanding Year_Sem_Sec Format:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" component="div">
                    • Format: Year-Semester:Sections;Year-Semester:Sections<br />
                    • Example: "1-1:A,B;1-2:B,C" means:<br />
                    &nbsp;&nbsp;- Year 1, Semester 1: Sections A and B<br />
                    &nbsp;&nbsp;- Year 1, Semester 2: Sections B and C<br />
                    • Use semicolon (;) to separate different semester assignments<br />
                    • Use comma (,) to separate sections within a semester<br />
                    • Use colon (:) to separate semester from its sections
                  </Typography>
                </Box>
              </Box>

              {/* Download Template Button */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    // Create a sample Excel file
                    const ws = XLSX.utils.aoa_to_sheet([
                      ['Name', 'Email', 'Password', 'Department', 'Year_Sem_Sec', 'Subjects'],
                      ['John Doe', 'john.doe@example.com', 'password123', 'Computer Science', '2-1:A,B;2-2:B,C', '2-1:Programming Fundamentals(CS101),Data Structures(CS201);2-2:Database Systems(CS301)'],
                      ['Jane Smith', 'jane.smith@example.com', 'password456', 'Electronics', '1-1:A;1-2:A;2-1:A', '1-1:Circuit Analysis(EE101);1-2:Digital Electronics(EE102);2-1:Microprocessors(EE201)'],
                      ['Bob Wilson', 'bob.wilson@example.com', 'password789', 'Mechanical', '3-1:B,C;3-2:A,B,C', '3-1:Thermodynamics(ME301),Fluid Mechanics(ME302);3-2:Heat Transfer(ME401)']
                    ]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Template');
                    XLSX.writeFile(wb, 'faculty_upload_template.xlsx');
                  }}
                >
                  Download Template
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Upload Section */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <label htmlFor="excel-upload">
                <Button 
                  variant="contained" 
                  component="span"
                  disabled={uploadStatus === 'uploading'}
                >
                  Choose File
                </Button>
              </label>
              {uploadedFile && (
                <Typography variant="body2" color="textSecondary">
                  Selected: {uploadedFile.name}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Progress and Status */}
          {uploadStatus && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {uploadStatus === 'reading' && 'Reading file...'}
                {uploadStatus === 'validating' && 'Validating data...'}
                {uploadStatus === 'ready' && 'Ready to upload'}
                {uploadStatus === 'uploading' && 'Uploading faculty data...'}
                {uploadStatus === 'success' && 'Upload successful!'}
                {uploadStatus === 'error' && 'Upload failed'}
              </Typography>
            </Box>
          )}

          {/* Error Display */}
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Upload Error:</Typography>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {uploadError}
              </pre>
            </Alert>
          )}

          {/* Preview Section */}
          {uploadPreview.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Preview ({uploadPreview.length} faculty members)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Assignments</TableCell>
                      <TableCell>Subjects</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadPreview.map((faculty, index) => {
                      // Extract data from assignments for display
                      const totalSubjects = faculty.assignments?.reduce((total, assignment) =>
                        total + (assignment.subjects?.length || 0), 0) || 0;

                      return (
                        <TableRow key={index}>
                          <TableCell>{faculty.name}</TableCell>
                          <TableCell>{faculty.email}</TableCell>
                          <TableCell>{faculty.department}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {faculty.assignments?.map((assignment, idx) => (
                                <Box key={idx} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                  <Chip label={`Y${assignment.year}S${assignment.semester}`} size="small" color="primary" />
                                  <Typography variant="caption">
                                    {assignment.sections?.join(', ')}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${totalSubjects} subjects`}
                              size="small"
                              color={totalSubjects > 0 ? "success" : "default"}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenUploadDialog(false);
              setUploadedFile(null);
              setUploadPreview([]);
              setUploadProgress(0);
              setUploadStatus('');
              setUploadError('');
            }}
            disabled={uploadStatus === 'uploading'}
          >
            Cancel
          </Button>
          {uploadPreview.length > 0 && (
            <Button
              onClick={handleConfirmUpload}
              variant="contained"
              color="primary"
              disabled={uploadStatus === 'uploading' || uploadStatus === 'error'}
            >
              Upload {uploadPreview.length} Faculty Members
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setFacultyToDelete(null);
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this faculty account?
          </Typography>
          {facultyToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Faculty Details:
              </Typography>
              <Typography variant="body2">
                Name: {facultyToDelete.name}
              </Typography>
              <Typography variant="body2">
                Email: {facultyToDelete.email}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDeleteDialog(false);
            setFacultyToDelete(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDelete(facultyToDelete._id)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Edit Dialog */}
      <AssignmentEditDialog
        open={assignmentEditDialog}
        onClose={() => {
          setAssignmentEditDialog(false);
          setEditingAssignment(null);
        }}
        editingAssignment={editingAssignment}
        onUpdate={handleUpdateAssignment}
        departments={departments}
        academicDetails={academicDetails}
      />

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Assignment Edit Dialog Component
const AssignmentEditDialog = ({ open, onClose, editingAssignment, onUpdate, departments, academicDetails }) => {
  const [assignment, setAssignment] = useState({
    department: '',
    year: '',
    semester: '',
    sections: [],
    subjects: []
  });
  const [availableSubjects, setAvailableSubjects] = useState([]);

  useEffect(() => {
    if (editingAssignment?.assignment) {
      setAssignment(editingAssignment.assignment);
      // Load subjects for this assignment
      loadSubjectsForAssignment(editingAssignment.assignment);
    }
  }, [editingAssignment]);

  const loadSubjectsForAssignment = async (assignment) => {
    try {
      const response = await api.get('/api/admin/subjects', {
        params: {
          department: assignment.department,
          year: assignment.year,
          semester: assignment.semester
        }
      });
      setAvailableSubjects(response || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
      setAvailableSubjects([]);
    }
  };

  const handleChange = (field, value) => {
    setAssignment(prev => ({
      ...prev,
      [field]: value
    }));

    // Reload subjects if department/year/semester changes
    if (['department', 'year', 'semester'].includes(field)) {
      const newAssignment = { ...assignment, [field]: value };
      if (newAssignment.department && newAssignment.year && newAssignment.semester) {
        loadSubjectsForAssignment(newAssignment);
      }
    }
  };

  const handleSubjectToggle = (subject) => {
    const subjectName = subject.fullName || `${subject.name}(${subject.code})`;
    setAssignment(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectName)
        ? prev.subjects.filter(s => s !== subjectName)
        : [...prev.subjects, subjectName]
    }));
  };

  const getAvailableYears = () => {
    if (!assignment.department) return [];
    const deptDetails = academicDetails.filter(detail => detail.department === assignment.department);
    return [...new Set(deptDetails.map(detail => detail.year))].sort((a, b) => a - b);
  };

  const getAvailableSemesters = () => {
    if (!assignment.department || !assignment.year) return [];
    const deptDetails = academicDetails.filter(detail =>
      detail.department === assignment.department && detail.year === parseInt(assignment.year)
    );
    return [...new Set(deptDetails.map(detail => detail.semester))].sort((a, b) => a - b);
  };

  const getAvailableSections = () => {
    if (!assignment.department || !assignment.year || !assignment.semester) return [];
    const detail = academicDetails.find(detail =>
      detail.department === assignment.department &&
      detail.year === parseInt(assignment.year) &&
      detail.semester === parseInt(assignment.semester)
    );
    return detail?.sections ? detail.sections.split(',').map(s => s.trim()) : [];
  };

  const handleSave = () => {
    onUpdate(assignment);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Assignment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={assignment.department}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                {departments.map(dept => (
                  <MenuItem key={dept._id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={assignment.year}
                onChange={(e) => handleChange('year', e.target.value)}
                disabled={!assignment.department}
              >
                {getAvailableYears().map(year => (
                  <MenuItem key={year} value={year.toString()}>
                    Year {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Semester</InputLabel>
              <Select
                value={assignment.semester}
                onChange={(e) => handleChange('semester', e.target.value)}
                disabled={!assignment.year}
              >
                {getAvailableSemesters().map(semester => (
                  <MenuItem key={semester} value={semester.toString()}>
                    Semester {semester}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Sections</InputLabel>
              <Select
                multiple
                value={assignment.sections}
                onChange={(e) => handleChange('sections', e.target.value)}
                disabled={!assignment.semester}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {getAvailableSections().map(section => (
                  <MenuItem key={section} value={section}>
                    Section {section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Subjects
            </Typography>
            {availableSubjects.length > 0 ? (
              <Grid container spacing={1}>
                {availableSubjects.map((subject, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Button
                      fullWidth
                      size="small"
                      variant={assignment.subjects.includes(subject.fullName || `${subject.name}(${subject.code})`) ? "contained" : "outlined"}
                      onClick={() => handleSubjectToggle(subject)}
                      sx={{
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        fontSize: '0.75rem'
                      }}
                    >
                      {subject.name}
                      {subject.code && (
                        <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                          ({subject.code})
                        </Typography>
                      )}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No subjects available for this semester
              </Typography>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FacultyAccounts;