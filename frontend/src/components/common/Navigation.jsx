import { useState,useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  School as SchoolIcon,
  Event as EventIcon,
  People as PeopleIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import { useCollegeInfo } from '../../hooks/useCollegeInfo';

const Navigation = () => {
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useAppTheme();
  const { name: collegeName, email: collegeEmail, phone: collegePhone, address: collegeAddress } = useCollegeInfo();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Detect fullscreen mode and hide navigation
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      console.log('🖥️ Navigation: Fullscreen state changed:', isCurrentlyFullscreen);
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Check initial state
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Hide navigation when in fullscreen mode
  if (isFullscreen) {
    console.log('🖥️ Navigation: Hidden due to fullscreen mode');
    return null;
  }

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';
  const isEvent = user?.role === 'event';

  const adminMenuItems = [
    {
      title: 'Dashboard',
      path: '/admin/dashboard',
      icon: <DashboardIcon />
    },
    {
      title: 'Quizzes',
      path: '/admin/quizzes',
      icon: <QuizIcon />
    },
    {
      title: 'Student Accounts',
      path: '/admin/students',
      icon: <PeopleIcon />
    },
    {
      title: 'Faculty Accounts',
      path: '/admin/faculty',
      icon: <PersonIcon />
    },
    {
      title: 'Event Accounts',
      path: '/admin/event-accounts',
      icon: <EventIcon />
    },
    {
      title: 'College Settings',
      path: '/admin/settings',
      icon: <SettingsIcon />
    }
  ];

  const facultyMenuItems = [
    {
      title: 'Dashboard',
      path: '/faculty/dashboard',
      icon: <DashboardIcon />
    },
    {
      title: 'My Quizzes',
      path: '/faculty/quizzes',
      icon: <QuizIcon />
    },
    {
      title: 'Create Quiz',
      path: '/faculty/quizzes/create',
      icon: <AddIcon />
    }
  ];

  const studentMenuItems = [
    {
      title: 'Dashboard',
      path: '/student/dashboard',
      icon: <DashboardIcon />
    },
    {
      title: 'Available Quizzes',
      path: '/student/quizzes',
      icon: <QuizIcon />
    },
    {
      title: 'Review Quizzes',
      path: '/student/review-quizzes',
      icon: <AssessmentIcon />
    }
  ];

  const eventMenuItems = [
    {
      title: 'Dashboard',
      path: '/event/dashboard',
      icon: <DashboardIcon />
    },
    {
      title: 'My Quizzes',
      path: '/event/quizzes',
      icon: <QuizIcon />
    },
    {
      title: 'Create Quiz',
      path: '/event/quiz/create',
      icon: <AddIcon />
    }
  ];

  const menuItems = user?.role === 'admin' 
    ? adminMenuItems 
    : user?.role === 'faculty' 
      ? facultyMenuItems 
      : user?.role === 'event'
        ? eventMenuItems
        : studentMenuItems;

  const handleNavigation = (path) => {
    console.log('Navigation requested:', {
      currentPath: location.pathname,
      requestedPath: path,
      userRole: user?.role,
      userDetails: {
        department: user?.department,
        year: user?.year,
        semester: user?.semester,
        section: user?.section
      }
    });

    // Construct the correct path based on user role
    let fullPath = path;
    if (path === '/profile' || path === '/dashboard') {
      const rolePrefix = user?.role === 'admin' ? '/admin' :
                        user?.role === 'faculty' ? '/faculty' :
                        user?.role === 'event' ? '/event' : '/student';
      fullPath = `${rolePrefix}${path}`;
    } else if (!path.startsWith('/admin') && !path.startsWith('/faculty') &&
               !path.startsWith('/student') && !path.startsWith('/event')) {
      // For other paths, add role prefix if not already present
      const rolePrefix = user?.role === 'admin' ? '/admin' :
                        user?.role === 'faculty' ? '/faculty' :
                        user?.role === 'event' ? '/event' : '/student';
      fullPath = `${rolePrefix}${path}`;
    }

    console.log('Navigating to:', fullPath);

    if (location.pathname === fullPath) {
      return;
    }
    navigate(fullPath, { replace: true });
    setDrawerOpen(false);
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box
            sx={{
              flexGrow: { xs: 1, md: 0 },
              mr: { md: 4 },
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => handleNavigation('/dashboard')}
          >
            <QuizIcon sx={{ mr: 2 }} />
            <Box>
              <Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
                {collegeName}
              </Typography>
            </Box>
          </Box>


          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ...(location.pathname === item.path && {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    })
                  }}
                >
                  {item.icon}
                  {item.title}
                </Button>
              ))}
            </Box>
          )}

          {/* Mobile Navigation Drawer */}
          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                bgcolor: 'background.paper',
                color: 'text.primary',
                borderRight: '1px solid',
                borderColor: 'divider'
              }
            }}
          >
            <Box
              sx={{
                width: 250,
                bgcolor: 'background.paper',
                height: '100%'
              }}
              role="presentation"
            >
              <List sx={{ bgcolor: 'background.paper' }}>
                {menuItems.map((item) => (
                  <ListItem
                    button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      color: 'text.primary',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: 'text.primary'
                      },
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'action.selected'
                        }
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                        minWidth: 40
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: '0.875rem',
                          fontWeight: location.pathname === item.path ? 600 : 400
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ borderColor: 'divider' }} />
              <List sx={{ bgcolor: 'background.paper' }}>
                <ListItem
                  button
                  onClick={() => {
                    toggleTheme();
                    setDrawerOpen(false);
                  }}
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: 'text.primary'
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'text.secondary',
                      minWidth: 40
                    }}
                  >
                    {mode === 'light' ? (
                      <DarkModeIcon />
                    ) : (
                      <LightModeIcon />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={mode === 'light' ? 'Dark Mode' : 'Light Mode'}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </ListItem>
              </List>
            </Box>
          </Drawer>

          {/* User Menu */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={user?.name} src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                handleNavigation('/profile');
              }}>
                <ListItemIcon>
                  <AccountIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Profile</Typography>
              </MenuItem>
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                toggleTheme();
              }}>
                <ListItemIcon>
                  {mode === 'light' ? (
                    <DarkModeIcon fontSize="small" />
                  ) : (
                    <LightModeIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <Typography textAlign="center">
                  {mode === 'light' ? 'Dark Mode' : 'Light Mode'}
                </Typography>
              </MenuItem>
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                handleLogout();
              }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navigation; 