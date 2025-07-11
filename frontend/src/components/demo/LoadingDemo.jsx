import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip
} from '@mui/material';
import { useLoading } from '../../context/LoadingContext';
import withLoading from '../common/withLoading';

const LoadingDemo = () => {
  const { 
    showLoading, 
    hideLoading, 
    updateProgress, 
    updateMessage, 
    simulateLoading,
    loadWithTasks 
  } = useLoading();

  const [isDemo, setIsDemo] = useState(false);

  const handleSimpleLoading = () => {
    showLoading('Processing your request...', 0, true);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      updateProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => hideLoading(), 500);
      }
    }, 300);
  };

  const handleTaskBasedLoading = async () => {
    const tasks = [
      {
        message: 'Initializing system...',
        delay: 800
      },
      {
        message: 'Connecting to database...',
        delay: 1000
      },
      {
        message: 'Fetching user data...',
        delay: 600
      },
      {
        message: 'Loading dashboard components...',
        delay: 700
      },
      {
        message: 'Finalizing setup...',
        delay: 500
      }
    ];

    await loadWithTasks(tasks);
  };

  const handleAutoLoading = () => {
    simulateLoading(4000, 'Auto-loading demonstration...');
  };

  const DemoCard = ({ title, description, action, buttonText, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color={color}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Button 
          variant="contained" 
          color={color}
          onClick={action}
          fullWidth
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          🎬 Loading Animation Demo
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Experience different loading animations and effects
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <Chip label="Interactive Demo" color="primary" />
          <Chip label="Real-time Effects" color="secondary" />
          <Chip label="Smooth Animations" color="success" />
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <DemoCard
            title="🔄 Simple Progress Loading"
            description="Basic loading with progress bar that increments automatically"
            action={handleSimpleLoading}
            buttonText="Start Simple Loading"
            color="primary"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DemoCard
            title="📋 Task-Based Loading"
            description="Loading with specific tasks and messages that simulate real data fetching"
            action={handleTaskBasedLoading}
            buttonText="Start Task Loading"
            color="secondary"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DemoCard
            title="⚡ Auto Loading"
            description="Automatic loading simulation with smooth progress animation"
            action={handleAutoLoading}
            buttonText="Start Auto Loading"
            color="success"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          🎯 How It Works
        </Typography>
        <Typography variant="body1" paragraph>
          This loading system provides a smooth user experience while your application fetches data in the background:
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                ✨ Features
              </Typography>
              <ul>
                <li>Animated background elements</li>
                <li>Dynamic loading messages</li>
                <li>Progress tracking</li>
                <li>Smooth transitions</li>
                <li>Mobile responsive</li>
                <li>College branding integration</li>
              </ul>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1, color: 'secondary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                🚀 Benefits
              </Typography>
              <ul>
                <li>Keeps users engaged</li>
                <li>Reduces perceived wait time</li>
                <li>Professional appearance</li>
                <li>Better user experience</li>
                <li>Prevents page abandonment</li>
                <li>Shows system is working</li>
              </ul>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          🎨 Implementation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This loading system can be easily integrated into any component or page in your application.
          It automatically handles the transition from loading state to content display.
        </Typography>
      </Box>
    </Container>
  );
};

// Example of using withLoading HOC
const LoadingDemoWithHOC = withLoading(LoadingDemo, {
  minLoadingTime: 3000,
  autoProgress: true,
  message: "Loading demo page...",
  showProgress: true
});

export default LoadingDemo;
export { LoadingDemoWithHOC };
