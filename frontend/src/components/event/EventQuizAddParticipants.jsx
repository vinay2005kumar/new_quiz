import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Box,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../config/axios';

const EventQuizAddParticipants = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Individual student form
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    college: '',
    department: '',
    year: '',
    phoneNumber: '',
    admissionNumber: '',
    participantType: 'college'
  });
  
  // Team form
  const [teamForm, setTeamForm] = useState({
    teamName: '',
    teamLeader: {
      name: '',
      email: '',
      college: '',
      department: '',
      year: '',
      phoneNumber: '',
      admissionNumber: '',
      participantType: 'college'
    },
    teamMembers: []
  });
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [participantsToAdd, setParticipantsToAdd] = useState([]);

  useEffect(() => {
    fetchQuizData();
  }, [id]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/event-quiz/${id}`);
      setQuiz(response.data);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setError(error.response?.data?.message || 'Failed to fetch quiz data');
    } finally {
      setLoading(false);
    }
  };

  const isTeamMode = quiz?.participationMode === 'team';

  const handleAddStudent = () => {
    if (!studentForm.name || !studentForm.email) {
      toast.error('Name and email are required');
      return;
    }

    const newStudent = {
      ...studentForm,
      id: Date.now(),
      type: 'individual'
    };

    setParticipantsToAdd(prev => [...prev, newStudent]);
    setStudentForm({
      name: '',
      email: '',
      college: '',
      department: '',
      year: '',
      phoneNumber: '',
      admissionNumber: '',
      participantType: 'college'
    });
    setShowAddDialog(false);
    toast.success('Student added to list');
  };

  const handleAddTeam = () => {
    if (!teamForm.teamName || !teamForm.teamLeader.name || !teamForm.teamLeader.email) {
      toast.error('Team name, leader name and email are required');
      return;
    }

    const newTeam = {
      ...teamForm,
      id: Date.now(),
      type: 'team'
    };

    setParticipantsToAdd(prev => [...prev, newTeam]);
    setTeamForm({
      teamName: '',
      teamLeader: {
        name: '',
        email: '',
        college: '',
        department: '',
        year: '',
        phoneNumber: '',
        admissionNumber: '',
        participantType: 'college'
      },
      teamMembers: []
    });
    setShowAddDialog(false);
    toast.success('Team added to list');
  };

  const handleRemoveParticipant = (participantId) => {
    setParticipantsToAdd(prev => prev.filter(p => p.id !== participantId));
    toast.success('Participant removed from list');
  };

  const handleSubmitParticipants = async () => {
    if (participantsToAdd.length === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    try {
      setSubmitting(true);
      
      // Convert participants to the format expected by backend
      const participantsData = participantsToAdd.map(participant => {
        if (participant.type === 'team') {
          return {
            isTeam: true,
            teamName: participant.teamName,
            teamLeader: participant.teamLeader,
            teamMembers: participant.teamMembers
          };
        } else {
          return {
            isTeam: false,
            ...participant
          };
        }
      });

      const response = await api.post(`/api/event-quiz/${id}/add-participants`, {
        participants: participantsData
      });

      toast.success(`Successfully added ${participantsToAdd.length} participant(s) to the quiz`);
      navigate(`/event/quiz/${id}/edit`);
    } catch (error) {
      console.error('Error adding participants:', error);
      toast.error(error.response?.data?.message || 'Failed to add participants');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/event/quiz/${id}/edit`)}
          sx={{ mb: 2 }}
        >
          Back to Edit Quiz
        </Button>
        
        <Typography variant="h4" gutterBottom>
          Add Participants to Follow-up Quiz
        </Typography>
        
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {quiz?.title}
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Add {isTeamMode ? 'teams' : 'students'} who were missed from the original quiz selection. 
            They will be automatically registered and receive login credentials via email.
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* Add Participants Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {isTeamMode ? '👥 Add Teams' : '👤 Add Students'}
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowAddDialog(true)}
              fullWidth
              sx={{ mt: 2 }}
            >
              Add {isTeamMode ? 'Team' : 'Student'}
            </Button>
          </Paper>
        </Grid>

        {/* Participants List */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              📋 Participants to Add ({participantsToAdd.length})
            </Typography>
            
            {participantsToAdd.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No participants added yet
              </Typography>
            ) : (
              <List>
                {participantsToAdd.map((participant) => (
                  <ListItem key={participant.id} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {participant.type === 'team' ? <GroupIcon /> : <PersonIcon />}
                          {participant.type === 'team' ? participant.teamName : participant.name}
                        </Box>
                      }
                      secondary={
                        participant.type === 'team' 
                          ? `Leader: ${participant.teamLeader.name} (${participant.teamLeader.email})`
                          : participant.email
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            
            {participantsToAdd.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSubmitParticipants}
                  disabled={submitting}
                  fullWidth
                >
                  {submitting ? <CircularProgress size={20} /> : `Add ${participantsToAdd.length} Participant(s) to Quiz`}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Dialog - Individual Student */}
      {!isTeamMode && (
        <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Student</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="College"
                  value={studentForm.college}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, college: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={studentForm.department}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, department: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Year"
                  value={studentForm.year}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, year: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={studentForm.phoneNumber}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Admission Number"
                  value={studentForm.admissionNumber}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, admissionNumber: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddStudent} variant="contained">Add Student</Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default EventQuizAddParticipants;
