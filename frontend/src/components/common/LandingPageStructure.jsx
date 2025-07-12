import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
  IconButton,
  Popover
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as WebsiteIcon,
  CalendarToday as EstablishedIcon,
  Login as LoginIcon,
  Event as EventIcon,
  Security as SecurityIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const LandingPageStructure = ({
  collegeInfo,
  backgroundStyle,
  headerStyle,
  footerStyle,
  onNavigate,
  showAdminButton = false,
  isPreview = false,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for mobile info popover
  const [infoAnchorEl, setInfoAnchorEl] = useState(null);
  const infoOpen = Boolean(infoAnchorEl);

  const handleInfoClick = (event) => {
    setInfoAnchorEl(event.currentTarget);
  };

  const handleInfoClose = () => {
    setInfoAnchorEl(null);
  };

  const {
    name: collegeName,
    address: collegeAddress,
    email: collegeEmail,
    phone: collegePhone,
    website: collegeWebsite,
    establishedYear,
    description: collegeDescription,
    backgroundType,
    backgroundImage,
    headerTextColor,
    footerTextColor
  } = collegeInfo;

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: isPreview ? '400px' : '100vh',
      ...backgroundStyle,
      position: 'relative'
    }}>
      {/* Glassmorphism overlay for image backgrounds */}
      {backgroundType === 'image' && backgroundImage && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.1) 100%)',
          backdropFilter: 'blur(10px)',
          zIndex: 1
        }} />
      )}

      {/* Header */}
      <Box
        sx={{
          ...headerStyle,
          py: isPreview ? 1.5 : 2,
          px: 3,
          position: 'relative',
          zIndex: 10
        }}
      >
        <Container maxWidth="lg">
          {isMobile ? (
            // Mobile Layout
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'center' }}>
              {/* College Name - Centered */}
              <Typography variant={isPreview ? "body1" : "h5"} component="div" sx={{
                fontWeight: 700,
                color: headerTextColor || 'white',
                textShadow: headerTextColor === 'white' ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none'
              }}>
                {collegeName || 'COLLEGE NAME'}
              </Typography>

              {/* Address, Established Year, and Info Icon - Centered in same line */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isPreview ? 1 : 2,
                flexWrap: 'wrap'
              }}>
                {collegeAddress && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationIcon sx={{
                      fontSize: isPreview ? 12 : 16,
                      color: headerTextColor || 'white',
                      opacity: 0.8
                    }} />
                    <Typography variant={isPreview ? "caption" : "body2"} sx={{
                      color: headerTextColor || 'white',
                      opacity: 0.9,
                      fontWeight: 500,
                      fontSize: isPreview ? '10px' : '12px',
                      textShadow: headerTextColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                    }}>
                      {collegeAddress}
                    </Typography>
                  </Box>
                )}

                {establishedYear && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EstablishedIcon sx={{
                      fontSize: isPreview ? 12 : 16,
                      color: headerTextColor || 'white',
                      opacity: 0.8
                    }} />
                    <Typography variant={isPreview ? "caption" : "body2"} sx={{
                      color: headerTextColor || 'white',
                      opacity: 0.9,
                      fontWeight: 500,
                      fontSize: isPreview ? '10px' : '12px',
                      textShadow: headerTextColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                    }}>
                      Est. {establishedYear}
                    </Typography>
                  </Box>
                )}

                {/* Info Icon - Shows email and phone on click */}
                {(collegeEmail || collegePhone) && (
                  <IconButton
                    onClick={handleInfoClick}
                    size="small"
                    sx={{
                      color: headerTextColor || 'white',
                      opacity: 0.8,
                      '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    <InfoIcon sx={{ fontSize: isPreview ? 14 : 18 }} />
                  </IconButton>
                )}
              </Box>

              {/* Popover for Email and Phone */}
              <Popover
                open={infoOpen}
                anchorEl={infoAnchorEl}
                onClose={handleInfoClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                PaperProps={{
                  sx: {
                    p: 2,
                    // Use the same background as the landing page
                    background: backgroundType === 'image' && backgroundImage
                      ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${backgroundImage})`
                      : backgroundStyle?.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backdropFilter: 'blur(15px)',
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}>
                  {collegeEmail && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon sx={{
                        fontSize: 16,
                        color: headerTextColor || 'white',
                        opacity: 0.9
                      }} />
                      <Typography variant="body2" sx={{
                        color: headerTextColor || 'white',
                        fontWeight: 500,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                      }}>
                        {collegeEmail}
                      </Typography>
                    </Box>
                  )}
                  {collegePhone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon sx={{
                        fontSize: 16,
                        color: headerTextColor || 'white',
                        opacity: 0.9
                      }} />
                      <Typography variant="body2" sx={{
                        color: headerTextColor || 'white',
                        fontWeight: 500,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                      }}>
                        {collegePhone}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Popover>
            </Box>
          ) : (
            // Desktop Layout (Original)
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Left - Quiz Platform Title */}
              <Typography variant={isPreview ? "caption" : "h6"} component="div" sx={{
                fontWeight: 600,
                color: headerTextColor || 'white',
                letterSpacing: 1,
                textShadow: headerTextColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
              }}>
                QUIZ PLATFORM
              </Typography>

              {/* Center - College Name, Address, Established Year */}
              <Box sx={{
                textAlign: 'center',
                flex: 1,
                mx: 2
              }}>
                <Typography variant={isPreview ? "body2" : "h4"} component="div" sx={{
                  fontWeight: 700,
                  color: headerTextColor || 'white',
                  mb: isPreview ? 0.5 : 1,
                  textShadow: headerTextColor === 'white' ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none'
                }}>
                  {collegeName || 'COLLEGE NAME'}
                </Typography>

                {/* Address and Established Year under college name */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: isPreview ? 2 : 4, flexWrap: 'wrap' }}>
                  {collegeAddress && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationIcon sx={{
                        fontSize: isPreview ? 14 : 18,
                        color: headerTextColor || 'white',
                        opacity: 0.8
                      }} />
                      <Typography variant={isPreview ? "caption" : "body1"} sx={{
                        color: headerTextColor || 'white',
                        opacity: 0.9,
                        fontWeight: 500,
                        textShadow: headerTextColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                      }}>
                        {collegeAddress}
                      </Typography>
                    </Box>
                  )}
                  {establishedYear && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EstablishedIcon sx={{
                        fontSize: isPreview ? 14 : 18,
                        color: headerTextColor || 'white',
                        opacity: 0.8
                      }} />
                      <Typography variant={isPreview ? "caption" : "body1"} sx={{
                        color: headerTextColor || 'white',
                        opacity: 0.9,
                        fontWeight: 500,
                        textShadow: headerTextColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                      }}>
                        Est. {establishedYear}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Right - Email and Phone */}
              <Box sx={{
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                minWidth: isPreview ? 100 : 200
              }}>
                {collegeEmail && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <EmailIcon sx={{
                      fontSize: isPreview ? 12 : 16,
                      color: headerTextColor || 'white',
                      opacity: 0.8
                    }} />
                    <Typography variant={isPreview ? "caption" : "body2"} sx={{
                      color: headerTextColor || 'white',
                      opacity: 0.9,
                      fontWeight: 500,
                      fontSize: isPreview ? '10px' : undefined,
                      textShadow: headerTextColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                    }}>
                      {collegeEmail}
                    </Typography>
                  </Box>
                )}
                {collegePhone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <PhoneIcon sx={{
                      fontSize: isPreview ? 12 : 16,
                      color: headerTextColor || 'white',
                      opacity: 0.8
                    }} />
                    <Typography variant={isPreview ? "caption" : "body2"} sx={{
                      color: headerTextColor || 'white',
                      opacity: 0.9,
                      fontWeight: 500,
                      fontSize: isPreview ? '10px' : undefined,
                      textShadow: headerTextColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                    }}>
                      {collegePhone}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Container>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: isPreview ? 2 : 8,
          position: 'relative',
          zIndex: 2
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: isPreview ? 2 : 4 }}>
            <Typography
              variant={isPreview ? "h6" : "h3"}
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: 'white',
                mb: isPreview ? 1 : 2,
                textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
              }}
            >
              Welcome to Our Quiz Platform
            </Typography>
            <Typography
              variant={isPreview ? "caption" : "h6"}
              sx={{
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.9)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                mb: isPreview ? 2 : 4,
                display: 'block'
              }}
            >
              Access your academic assessments and participate in exciting quiz events
            </Typography>
          </Box>

          {/* Action Cards - Side by Side */}
          <Box sx={{ display: 'flex', gap: isPreview ? 1 : 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Paper
              sx={{
                p: isPreview ? 1.5 : 3,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(15px)',
                borderRadius: 2,
                minWidth: isPreview ? 90 : 200,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': !isPreview ? {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                } : {}
              }}
            >
              <LoginIcon sx={{ fontSize: isPreview ? 24 : 40, color: 'primary.main', mb: 1 }} />
              <Typography variant={isPreview ? "caption" : "h6"} gutterBottom sx={{
                fontWeight: 600,
                color: 'primary.main',
                display: 'block',
                mb: isPreview ? 0.5 : undefined
              }}>
                Login
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{
                mb: isPreview ? 1 : 2,
                display: 'block',
                fontSize: isPreview ? '10px' : undefined
              }}>
                {isPreview ? 'Access your account' : 'Access your account'}
              </Typography>
              {!isPreview && (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => onNavigate('/login')}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Login Now
                </Button>
              )}
            </Paper>

            <Paper
              sx={{
                p: isPreview ? 1.5 : 3,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                minWidth: isPreview ? 90 : 200,
                textAlign: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              <EventIcon sx={{ fontSize: isPreview ? 24 : 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant={isPreview ? "caption" : "h6"} gutterBottom sx={{
                fontWeight: 600,
                color: 'secondary.main',
                display: 'block',
                mb: isPreview ? 0.5 : undefined
              }}>
                Quiz Events
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{
                mb: isPreview ? 1 : 2,
                display: 'block',
                fontSize: isPreview ? '10px' : undefined
              }}>
                {isPreview ? 'Join competitions' : 'Participate in exciting quiz competitions and events'}
              </Typography>
              {!isPreview && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => onNavigate('/events')}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  View Events
                </Button>
              )}
            </Paper>

            {showAdminButton && !loading && (
              <Paper
                sx={{
                  p: isPreview ? 1.5 : 3,
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  minWidth: isPreview ? 90 : 200,
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': !isPreview ? {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                  } : {}
                }}
              >
                <SecurityIcon sx={{ fontSize: isPreview ? 24 : 40, color: 'warning.main', mb: 1 }} />
                <Typography variant={isPreview ? "caption" : "h6"} gutterBottom sx={{
                  fontWeight: 600,
                  color: 'warning.main',
                  display: 'block',
                  mb: isPreview ? 0.5 : undefined
                }}>
                  Admin Setup
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{
                  mb: isPreview ? 1 : 2,
                  display: 'block',
                  fontSize: isPreview ? '10px' : undefined
                }}>
                  {isPreview ? 'Setup platform' : 'Set up your institution\'s quiz platform'}
                </Typography>
                {!isPreview && (
                  <Button
                    variant="contained"
                    color="warning"
                    fullWidth
                    onClick={() => onNavigate('/register?role=admin')}
                    sx={{
                      py: 1.2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Register as Admin
                  </Button>
                )}
              </Paper>
            )}
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          ...footerStyle,
          py: isPreview ? 1 : 2,
          position: 'relative',
          zIndex: 10
        }}
      >
        <Container maxWidth="lg">
          {isMobile ? (
            // Mobile Footer Layout
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              textAlign: 'center'
            }}>
              {/* College Website - Center */}
              {collegeWebsite && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                  <WebsiteIcon sx={{
                    fontSize: isPreview ? 12 : 16,
                    opacity: 0.8,
                    color: footerTextColor || 'white'
                  }} />
                  <Typography
                    variant="caption"
                    component="a"
                    href={collegeWebsite.startsWith('http') ? collegeWebsite : `https://${collegeWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      opacity: 0.9,
                      fontSize: isPreview ? '10px' : '14px',
                      fontWeight: 500,
                      color: footerTextColor || 'white',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      }
                    }}
                  >
                    {collegeWebsite}
                  </Typography>
                </Box>
              )}

              {/* Copyright */}
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.8,
                  fontSize: isPreview ? '9px' : '12px',
                  fontWeight: 400,
                  color: footerTextColor || 'white'
                }}
              >
                © {new Date().getFullYear()} {collegeName || 'Quiz Platform'}. All rights reserved.
              </Typography>
            </Box>
          ) : (
            // Desktop Footer Layout (Original)
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              minHeight: isPreview ? '30px' : '40px'
            }}>
              {/* Left - Description */}
              <Box sx={{ flex: 1, minWidth: isPreview ? 100 : 200 }}>
                {collegeDescription && (
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.9,
                      fontSize: isPreview ? '9px' : '14px',
                      fontWeight: 400,
                      color: footerTextColor || 'white',
                      lineHeight: 1.2
                    }}
                  >
                    {isPreview && collegeDescription.length > 40
                      ? `${collegeDescription.substring(0, 40)}...`
                      : collegeDescription
                    }
                  </Typography>
                )}
              </Box>

              {/* Center - Website */}
              <Box sx={{ textAlign: 'center', minWidth: isPreview ? 60 : 150 }}>
                {collegeWebsite && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <WebsiteIcon sx={{
                      fontSize: isPreview ? 12 : 16,
                      opacity: 0.8,
                      color: footerTextColor || 'white'
                    }} />
                    <Typography
                      variant="caption"
                      component="a"
                      href={collegeWebsite.startsWith('http') ? collegeWebsite : `https://${collegeWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        opacity: 0.9,
                        fontSize: isPreview ? '9px' : '14px',
                        fontWeight: 500,
                        color: footerTextColor || 'white',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        }
                      }}
                    >
                      {collegeWebsite}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Right - Copyright */}
              <Box sx={{ textAlign: 'right', minWidth: isPreview ? 80 : 150 }}>
                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.8,
                    fontSize: isPreview ? '9px' : '14px',
                    fontWeight: 400,
                    color: footerTextColor || 'white'
                  }}
                >
                  © {new Date().getFullYear()} {collegeName || 'Quiz Platform'}. All rights reserved.
                </Typography>
              </Box>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPageStructure;
