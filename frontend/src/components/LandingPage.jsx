import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { useCollegeInfo } from '../hooks/useCollegeInfo';
import LandingPageStructure from './common/LandingPageStructure';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [loading, setLoading] = useState(true);
  const collegeInfo = useCollegeInfo();

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
    const fetchData = async () => {
      try {
        const adminResponse = await api.get('/api/auth/check-admin');
        const adminExists = adminResponse?.adminExists || adminResponse?.data?.adminExists;
        setShowAdminButton(!adminExists);
      } catch (error) {
        console.error('Error fetching data:', error);
        setShowAdminButton(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <LandingPageStructure
      collegeInfo={collegeInfo}
      backgroundStyle={getBackgroundStyle()}
      headerStyle={getHeaderStyle()}
      footerStyle={getFooterStyle()}
      onNavigate={navigate}
      showAdminButton={showAdminButton}
      loading={loading}
      isPreview={false}
    />
  );
};

export default LandingPage;