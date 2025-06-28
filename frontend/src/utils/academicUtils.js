/**
 * Utility functions for academic data operations
 */

/**
 * Get available semesters for a specific department and year from academic details
 * @param {Array} academicDetails - Array of academic detail objects
 * @param {string} department - Department name
 * @param {number} year - Year number
 * @returns {Array} Array of semester numbers sorted in ascending order
 */
export const getAvailableSemesters = (academicDetails, department, year) => {
  if (!academicDetails || !Array.isArray(academicDetails) || !department || !year) {
    return [];
  }
  
  console.log('getAvailableSemesters called with:', { department, year });
  console.log('Academic details:', academicDetails);
  
  // Get all semesters configured for this department and year
  const semesters = academicDetails
    .filter(detail => detail.department === department && detail.year === Number(year))
    .map(detail => detail.semester)
    .sort((a, b) => a - b);
  
  console.log('Found semesters for', department, 'year', year, ':', semesters);
  
  return semesters;
};

/**
 * Get available sections for a specific department, year, and semester
 * @param {Array} academicDetails - Array of academic detail objects
 * @param {string} department - Department name
 * @param {number} year - Year number
 * @param {number} semester - Semester number
 * @returns {Array} Array of section letters
 */
export const getAvailableSections = (academicDetails, department, year, semester) => {
  if (!academicDetails || !Array.isArray(academicDetails) || !department || !year || !semester) {
    return [];
  }
  
  const detail = academicDetails.find(d => 
    d.department === department && 
    d.year === Number(year) && 
    d.semester === Number(semester)
  );
  
  if (!detail || !detail.sections) {
    return [];
  }
  
  return detail.sections.split(',').map(s => s.trim()).filter(Boolean);
};

/**
 * Get available subjects for a specific department, year, and semester
 * @param {Array} academicDetails - Array of academic detail objects
 * @param {string} department - Department name
 * @param {number} year - Year number
 * @param {number} semester - Semester number
 * @returns {Array} Array of subject objects with name and code
 */
export const getAvailableSubjects = (academicDetails, department, year, semester) => {
  if (!academicDetails || !Array.isArray(academicDetails) || !department || !year || !semester) {
    return [];
  }
  
  const detail = academicDetails.find(d => 
    d.department === department && 
    d.year === Number(year) && 
    d.semester === Number(semester)
  );
  
  if (!detail || !detail.subjects) {
    return [];
  }
  
  const subjects = detail.subjects.split(',').map(s => s.trim()).filter(Boolean);
  return subjects.map(subject => {
    const match = subject.match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
    if (match) {
      return {
        name: match[1].trim(),
        code: match[2],
        fullName: subject
      };
    }
    return null;
  }).filter(Boolean);
}; 