import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Fade,
  Slide,
  Zoom,
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';
import { keyframes } from '@mui/system';
import SchoolIcon from '@mui/icons-material/School';
import QuizIcon from '@mui/icons-material/Quiz';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// Custom animations
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const LoadingScreen = ({
  message = "Loading your dashboard...",
  progress = 0,
  showProgress = true,
  brandName = "Quiz Management System"
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayText, setDisplayText] = useState('');

  const loadingSteps = [
    "Initializing system...",
    "Connecting to database...",
    "Fetching your data...",
    "Loading dashboard...",
    "Almost ready..."
  ];

  const features = [
    { icon: <QuizIcon />, title: "Smart Quizzes", desc: "Create and manage quizzes effortlessly" },
    { icon: <GroupIcon />, title: "Student Management", desc: "Track student progress and performance" },
    { icon: <SchoolIcon />, title: "Academic Excellence", desc: "Enhance learning with digital assessments" },
    { icon: <TrendingUpIcon />, title: "Analytics", desc: "Detailed insights and reporting" }
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % loadingSteps.length);
    }, 1500);

    return () => clearInterval(stepInterval);
  }, []);

  useEffect(() => {
    setDisplayText(loadingSteps[currentStep]);
  }, [currentStep]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: 2
      }}
    >
      {/* Background animated elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          animation: `${float} 3s ease-in-out infinite`,
          animationDelay: '0s'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '15%',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          animation: `${float} 3s ease-in-out infinite`,
          animationDelay: '1s'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '20%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          animation: `${float} 3s ease-in-out infinite`,
          animationDelay: '2s'
        }}
      />

      {/* Main loading content */}
      <Fade in={true} timeout={1000}>
        <Box sx={{ textAlign: 'center', zIndex: 1 }}>
          {/* College Logo/Icon */}
          <Zoom in={true} timeout={1500}>
            <Box
              sx={{
                mb: 4,
                animation: `${pulse} 2s ease-in-out infinite`
              }}
            >
              <SchoolIcon
                sx={{
                  fontSize: 80,
                  color: 'white',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                }}
              />
            </Box>
          </Zoom>

          {/* Brand Name */}
          <Slide direction="down" in={true} timeout={1000}>
            <Typography
              variant="h3"
              sx={{
                color: 'white',
                fontWeight: 'bold',
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              {brandName}
            </Typography>
          </Slide>

          {/* Loading spinner */}
          <Box sx={{ mb: 4 }}>
            <CircularProgress
              size={60}
              thickness={4}
              sx={{
                color: 'white',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            />
          </Box>

          {/* Dynamic loading text */}
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              mb: 3,
              minHeight: 32,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              fontSize: { xs: '1rem', md: '1.25rem' }
            }}
          >
            {displayText}
          </Typography>

          {/* Progress bar */}
          {showProgress && (
            <Box sx={{
              width: '100%',
              maxWidth: 400,
              mb: 4,
              mx: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'white',
                    borderRadius: 4
                  }
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: 'white',
                  mt: 1,
                  opacity: 0.8,
                  textAlign: 'center'
                }}
              >
                {Math.round(progress)}% Complete
              </Typography>
            </Box>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

export default LoadingScreen;