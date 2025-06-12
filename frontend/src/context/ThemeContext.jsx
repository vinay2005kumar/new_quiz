import { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

// Create the theme context
const ThemeContext = createContext(null);

// Custom hook for using theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme configuration function
const createAppTheme = (mode) => {
  const isLight = mode === 'light';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? '#1e3a8a' : '#3b82f6', // Brighter blue for dark mode
        light: isLight ? '#2563eb' : '#60a5fa',
        dark: isLight ? '#1e40af' : '#1d4ed8',
      },
      secondary: {
        main: isLight ? '#0f766e' : '#14b8a6', // Brighter teal for dark mode
        light: isLight ? '#0d9488' : '#2dd4bf',
        dark: isLight ? '#115e59' : '#0f766e',
      },
      background: {
        default: isLight ? '#f8fafc' : '#0f172a', // Keep dark background
        paper: isLight ? '#ffffff' : '#1e293b',   // Keep dark paper background
      },
      text: {
        primary: isLight ? '#1f2937' : '#f1f5f9',
        secondary: isLight ? '#6b7280' : '#cbd5e1',
        disabled: isLight ? '#9ca3af' : '#6b7280',
      },
      action: {
        active: isLight ? '#374151' : '#e5e7eb',
        hover: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        selected: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)',
        disabled: isLight ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
        disabledBackground: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
      },
      error: {
        main: isLight ? '#dc2626' : '#ef4444',
        light: isLight ? '#f87171' : '#fca5a5',
        dark: isLight ? '#b91c1c' : '#dc2626',
      },
      success: {
        main: isLight ? '#16a34a' : '#22c55e',
        light: isLight ? '#4ade80' : '#86efac',
        dark: isLight ? '#15803d' : '#16a34a',
      },
      warning: {
        main: isLight ? '#d97706' : '#f59e0b',
        light: isLight ? '#fbbf24' : '#fcd34d',
        dark: isLight ? '#b45309' : '#d97706',
      },
      info: {
        main: isLight ? '#0ea5e9' : '#06b6d4',
        light: isLight ? '#38bdf8' : '#67e8f9',
        dark: isLight ? '#0284c7' : '#0891b2',
      },
      // Custom semantic colors
      purple: {
        main: isLight ? '#7c3aed' : '#a855f7',
        light: isLight ? '#a78bfa' : '#c084fc',
        dark: isLight ? '#6d28d9' : '#9333ea',
        50: isLight ? '#faf5ff' : '#581c87',
      },
      orange: {
        main: isLight ? '#ea580c' : '#fb923c',
        light: isLight ? '#fb923c' : '#fdba74',
        dark: isLight ? '#c2410c' : '#ea580c',
        50: isLight ? '#fff7ed' : '#9a3412',
      },
      divider: isLight ? '#e5e7eb' : '#374151',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      button: {
        textTransform: 'none', // Prevents all-caps buttons
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiContainer: {
        styleOverrides: {
          root: {
            height: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '2rem',
            paddingBottom: '2rem',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '6px',
            padding: '0.5rem 1.5rem',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: isLight 
                ? '0 2px 4px rgba(0,0,0,0.1)' 
                : '0 2px 4px rgba(0,0,0,0.3)',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: isLight 
                ? '0 4px 6px rgba(0,0,0,0.12)' 
                : '0 4px 6px rgba(0,0,0,0.4)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: isLight
              ? '0 1px 3px rgba(0,0,0,0.1)'
              : 'none', // Remove shadows in dark mode
            borderRadius: '12px',
            backgroundImage: 'none', // Remove default gradient in dark mode
            backgroundColor: isLight ? undefined : 'transparent', // Remove paper background in dark mode
            border: isLight ? 'none' : '1px solid #374151', // Add border in dark mode instead of background
            // Override any hardcoded background colors
            '&[style*="background-color: rgb(245, 245, 245)"]': {
              backgroundColor: `${isLight ? '#f5f5f5' : 'transparent'} !important`,
              color: isLight ? '#1f2937' : '#f9fafb',
              border: isLight ? 'none' : '1px solid #374151',
            },
            // Target papers with the specific bgcolor class
            '&.count-display-paper': {
              backgroundColor: isLight ? '#f0f9ff' : 'transparent',
              color: isLight ? '#1e3a8a' : '#60a5fa',
              border: `1px solid ${isLight ? '#bfdbfe' : '#3b82f6'}`,
            },
          },
          elevation1: {
            boxShadow: isLight
              ? '0 1px 3px rgba(0,0,0,0.1)'
              : 'none',
          },
          elevation2: {
            boxShadow: isLight
              ? '0 4px 6px -1px rgba(0,0,0,0.1)'
              : 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            backgroundColor: isLight ? undefined : 'transparent', // Remove background in dark mode
            boxShadow: isLight
              ? '0 1px 3px rgba(0,0,0,0.1)'
              : 'none', // Remove shadow in dark mode
            border: isLight ? 'none' : '1px solid #374151', // Add border in dark mode
            '&:hover': {
              boxShadow: isLight
                ? '0 4px 6px -1px rgba(0,0,0,0.1)'
                : 'none',
              borderColor: isLight ? undefined : '#60a5fa', // Change border color on hover in dark mode
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Remove default gradient
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? '#e0e7ff' : 'transparent', // Remove background in dark mode
            '& .MuiTableCell-head': {
              backgroundColor: isLight ? '#e0e7ff' : 'transparent', // Remove background in dark mode
              color: isLight ? '#1e3a8a' : '#60a5fa', // Strong contrast text
              fontWeight: 700, // Bolder text
              borderBottom: `2px solid ${isLight ? '#3b82f6' : '#60a5fa'}`, // Thicker border
              fontSize: '0.95rem', // Slightly larger text
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${isLight ? '#e5e7eb' : '#4b5563'}`,
            color: isLight ? '#1f2937' : '#f9fafb',
          },
          head: {
            backgroundColor: isLight ? '#e0e7ff' : 'transparent', // Remove background in dark mode
            color: isLight ? '#1e3a8a' : '#60a5fa', // Strong contrast
            fontWeight: 700, // Bolder
            fontSize: '0.95rem', // Slightly larger
            textTransform: 'uppercase', // Make headers stand out more
            letterSpacing: '0.05em', // Better spacing
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:nth-of-type(odd)': {
              backgroundColor: isLight ? '#ffffff' : 'transparent',
            },
            '&:nth-of-type(even)': {
              backgroundColor: isLight ? '#f9fafb' : 'transparent',
            },
            '&:hover': {
              backgroundColor: isLight ? '#f3f4f6' : 'transparent', // No background on hover in dark mode
              '& .MuiTableCell-root': {
                color: isLight ? undefined : '#60a5fa', // Change text color on hover in dark mode
              },
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: isLight ? '#d1d5db' : '#6b7280',
              },
              '&:hover fieldset': {
                borderColor: isLight ? '#9ca3af' : '#9ca3af',
              },
              '&.Mui-focused fieldset': {
                borderColor: isLight ? '#3b82f6' : '#60a5fa',
              },
            },
            '& .MuiInputLabel-root': {
              color: isLight ? '#6b7280' : '#d1d5db',
            },
            '& .MuiOutlinedInput-input': {
              color: isLight ? '#1f2937' : '#f9fafb',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isLight ? '#d1d5db' : '#6b7280',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isLight ? '#9ca3af' : '#9ca3af',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: isLight ? '#3b82f6' : '#60a5fa',
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: isLight ? '#1f2937' : '#f9fafb',
            '&:hover': {
              backgroundColor: isLight ? '#f3f4f6' : 'transparent',
              color: isLight ? undefined : '#60a5fa', // Change text color on hover in dark mode
            },
            '&.Mui-selected': {
              backgroundColor: isLight ? '#e0e7ff' : 'transparent',
              color: isLight ? undefined : '#60a5fa', // Selected text color in dark mode
              '&:hover': {
                backgroundColor: isLight ? '#c7d2fe' : 'transparent',
                color: isLight ? undefined : '#3b82f6', // Darker blue on hover when selected
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? '#f3f4f6' : 'transparent',
            color: isLight ? '#1f2937' : '#f9fafb',
            border: isLight ? 'none' : '1px solid #60a5fa',
            '& .MuiChip-deleteIcon': {
              color: isLight ? '#6b7280' : '#d1d5db',
              '&:hover': {
                color: isLight ? '#374151' : '#f9fafb',
              },
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: isLight ? '#6b7280' : '#d1d5db',
            '&:hover': {
              backgroundColor: isLight ? '#f3f4f6' : 'transparent',
              color: isLight ? undefined : '#60a5fa', // Change color on hover in dark mode
            },
            // Semantic colors for different actions
            '&.edit-icon': {
              color: isLight ? '#0ea5e9' : '#38bdf8', // Blue for edit
              '&:hover': {
                backgroundColor: isLight ? '#e0f2fe' : 'transparent',
                color: isLight ? '#0284c7' : '#60a5fa',
              },
            },
            '&.delete-icon': {
              color: isLight ? '#dc2626' : '#ef4444', // Red for delete
              '&:hover': {
                backgroundColor: isLight ? '#fef2f2' : 'transparent',
                color: isLight ? '#b91c1c' : '#f87171',
              },
            },
            '&.view-icon': {
              color: isLight ? '#16a34a' : '#22c55e', // Green for view/visibility
              '&:hover': {
                backgroundColor: isLight ? '#f0fdf4' : 'transparent',
                color: isLight ? '#15803d' : '#4ade80',
              },
            },
            '&.download-icon': {
              color: isLight ? '#7c3aed' : '#a855f7', // Purple for download
              '&:hover': {
                backgroundColor: isLight ? '#faf5ff' : 'transparent',
                color: isLight ? '#6d28d9' : '#c084fc',
              },
            },
            '&.upload-icon': {
              color: isLight ? '#ea580c' : '#fb923c', // Orange for upload
              '&:hover': {
                backgroundColor: isLight ? '#fff7ed' : 'transparent',
                color: isLight ? '#c2410c' : '#fdba74',
              },
            },
            '&.add-icon': {
              color: isLight ? '#059669' : '#10b981', // Emerald for add/create
              '&:hover': {
                backgroundColor: isLight ? '#ecfdf5' : 'transparent',
                color: isLight ? '#047857' : '#6ee7b7',
              },
            },
            '&.filter-icon': {
              color: isLight ? '#7c2d12' : '#ea580c', // Brown/orange for filter
              '&:hover': {
                backgroundColor: isLight ? '#fef7ed' : 'transparent',
                color: isLight ? '#9a3412' : '#fb923c',
              },
            },
            '&.settings-icon': {
              color: isLight ? '#4b5563' : '#9ca3af', // Gray for settings
              '&:hover': {
                backgroundColor: isLight ? '#f9fafb' : 'transparent',
                color: isLight ? '#374151' : '#d1d5db',
              },
            },
          },
        },
      },
    },
  });
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    // Get theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('themeMode');
    return savedTheme || 'light';
  });

  // Save theme preference to localStorage and update body data-theme whenever it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    document.body.setAttribute('data-theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const theme = createAppTheme(mode);

  const value = {
    mode,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
