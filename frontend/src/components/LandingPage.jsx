import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import LandingPageStructure from './common/LandingPageStructure';
import LoadingScreen from './common/LoadingScreen';
import { Fade, Box } from '@mui/material';

// Note: We manage college info locally here for loading animation control
// Other components can still use useCollegeInfo hook

// Cache utilities for landing page data
const CACHE_KEY = 'landingPageCache';
const NAVIGATION_KEY = 'isNavigation';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const getCachedData = () => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const now = Date.now();

    if (now - data.timestamp > CACHE_EXPIRY) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

const isNavigationReturn = () => {
  const isNavigation = sessionStorage.getItem(NAVIGATION_KEY);
  return isNavigation === 'true';
};

const setNavigationFlag = () => {
  sessionStorage.setItem(NAVIGATION_KEY, 'true');
};

const setCachedData = (adminButtonState) => {
  try {
    const data = {
      adminButtonState,
      timestamp: Date.now()
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

const clearCache = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Landing page cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

const isPageReload = () => {
  // Use performance.navigation.type to detect reload
  // 0 = navigate, 1 = reload, 2 = back/forward
  if (performance.navigation && performance.navigation.type === 1) {
    return true;
  }

  // Fallback: Check if this is a fresh browser session
  const isNavigation = sessionStorage.getItem(NAVIGATION_KEY);

  // If we have navigation flag, it's navigation (not reload)
  if (isNavigation === 'true') {
    sessionStorage.removeItem(NAVIGATION_KEY);
    return false;
  }

  // For first time visit or unclear cases, show loading
  return true;
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [loading, setLoading] = useState(true); // Always start with loading true
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [showContent, setShowContent] = useState(false);

  // Manage college info directly in this component
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
    isSetup: false
  });

  console.log('🚀 LandingPage render - loading:', loading, 'showContent:', showContent);

  // Set navigation flag when component mounts (for future navigation)
  useEffect(() => {
    return () => {
      // Set flag when leaving the component (for navigation detection)
      setNavigationFlag();
    };
  }, []);

  // Check if we should show loading animation
  const shouldShowLoading = () => {
    const cachedData = getCachedData();
    return !cachedData; // Show loading only if no valid cached data
  };

  // Get the background style based on type
  const getBackgroundStyle = () => {
    if (collegeInfo.backgroundType === 'image' && collegeInfo.backgroundImage) {
      return {
        backgroundImage: `url(${collegeInfo.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    }
    return {
      background: collegeInfo.backgroundValue || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
  };

  // Get header style
  const getHeaderStyle = () => ({
    background: collegeInfo.headerColor || 'rgba(255, 255, 255, 0.1)',
    backdropFilter: collegeInfo.headerStyle === 'transparent' ? 'blur(20px)' : 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  });

  // Get footer style
  const getFooterStyle = () => ({
    background: collegeInfo.footerColor || 'rgba(0, 0, 0, 0.8)',
    backdropFilter: collegeInfo.footerStyle === 'transparent' ? 'blur(20px)' : 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    color: collegeInfo.footerTextColor || 'white'
  });

  useEffect(() => {
    const initializePage = async () => {
      // Always show loading on page reload, even if we have cached data
      const isReload = isPageReload();
      const cachedData = getCachedData();

      console.log('🔍 Landing Page Debug:', {
        isReload,
        hasCachedData: !!cachedData,
        navigationType: performance.navigation?.type,
        navigationFlag: sessionStorage.getItem(NAVIGATION_KEY)
      });

      if (cachedData && !isReload) {
        console.log('📋 Using cached landing page data (navigation)');
        setShowAdminButton(cachedData.adminButtonState);
        setLoading(false);
        setShowContent(true);
        return;
      }

      if (isReload) {
        console.log('🔄 Page reload detected - showing loading animation');
      } else {
        console.log('🔄 Loading fresh landing page data');
      }

      // Show loading sequence for college info data only
      const loadingSequence = async () => {
        try {
          // Step 1: Initialize
          setLoadingMessage('Initializing...');
          setLoadingProgress(10);

          // Step 2: Fetch college information (real backend call)
          setLoadingMessage('Loading college information...');
          setLoadingProgress(30);

          console.log('🏫 Fetching college info from /api/setup/college-info...');

          // Make the actual API call to fetch college info
          const response = await api.get('/api/setup/college-info');
          console.log('✅ College info fetched successfully:', response);

          // Update college info state with fetched data
          setCollegeInfo({
            ...response,
            // Keep default values for any missing fields
            backgroundType: response.backgroundType || 'gradient',
            backgroundValue: response.backgroundValue || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            headerStyle: response.headerStyle || 'transparent',
            headerColor: response.headerColor || 'rgba(255, 255, 255, 0.1)',
            headerTextColor: response.headerTextColor || 'white',
            footerStyle: response.footerStyle || 'solid',
            footerColor: response.footerColor || 'rgba(0, 0, 0, 0.8)',
            footerTextColor: response.footerTextColor || 'white'
          });

          setLoadingProgress(80);

          // Step 3: Complete
          setLoadingMessage('Ready!');
          setLoadingProgress(100);

          // Set a default admin button state (no API call needed)
          setShowAdminButton(false);
          setCachedData(false);

        } catch (error) {
          console.error('Error loading college info:', error);
          setLoadingMessage('Loading complete');
          setLoadingProgress(100);
          setShowAdminButton(false);
          setCachedData(false);
        } finally {
          // Hide loading screen and show content
          setTimeout(() => {
            setLoading(false);
            setTimeout(() => setShowContent(true), 200);
          }, 300);
        }
      };

      await loadingSequence();
    };

    initializePage();
  }, []);

  // Add keyboard shortcut to clear cache (Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        clearCache();
        window.location.reload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading screen while loading
  if (loading) {
    return (
      <LoadingScreen
        message={loadingMessage}
        progress={loadingProgress}
        showProgress={true}
        brandName="Quiz Management System"
      />
    );
  }

  // Show content with fade-in animation
  return (
    <Fade in={showContent} timeout={800}>
      <Box>
        <LandingPageStructure
          collegeInfo={collegeInfo}
          backgroundStyle={getBackgroundStyle()}
          headerStyle={getHeaderStyle()}
          footerStyle={getFooterStyle()}
          onNavigate={navigate}
          showAdminButton={showAdminButton}
          loading={false}
          isPreview={false}
        />
      </Box>
    </Fade>
  );
};

export default LandingPage;