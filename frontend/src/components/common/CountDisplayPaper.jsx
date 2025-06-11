import { Paper, useTheme } from '@mui/material';

const CountDisplayPaper = ({ children, sx = {}, ...props }) => {
  const theme = useTheme();
  
  const countDisplayStyles = {
    backgroundColor: theme.palette.mode === 'light' ? '#f0f9ff' : '#1e3a8a',
    color: theme.palette.mode === 'light' ? '#1e3a8a' : '#f0f9ff',
    border: `1px solid ${theme.palette.mode === 'light' ? '#bfdbfe' : '#3b82f6'}`,
    ...sx
  };

  return (
    <Paper sx={countDisplayStyles} {...props}>
      {children}
    </Paper>
  );
};

export default CountDisplayPaper;
