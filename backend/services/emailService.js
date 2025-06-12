const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // You can change this to your preferred email service
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// Generate user credentials based on registration data
const generateCredentials = (registrationData, quiz) => {
  let username, password, emergencyPassword;

  // Emergency password for all registrations
  emergencyPassword = "Quiz@123";

  if (registrationData.isTeamRegistration) {
    // For team registration, use team leader's email as username
    const teamLeader = registrationData.teamLeader;

    // Username: team leader's email
    username = teamLeader.email.toLowerCase();

    // Generate password: first name + admission number or first name + random
    const firstName = teamLeader.name.split(' ')[0].toLowerCase();
    if (teamLeader.admissionNumber) {
      password = `${firstName}${teamLeader.admissionNumber}`;
    } else if (teamLeader.phoneNumber) {
      // Use last 4 digits of phone number if no admission number
      const phoneDigits = teamLeader.phoneNumber.slice(-4);
      password = `${firstName}${phoneDigits}`;
    } else {
      // Generate random 4-digit number if no admission number or phone
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      password = `${firstName}${randomNum}`;
    }
  } else {
    // For individual registration
    // Username: participant's email
    username = registrationData.email.toLowerCase();

    // Generate password: first name + admission number or first name + phone digits
    const firstName = registrationData.name.split(' ')[0].toLowerCase();
    if (registrationData.admissionNumber) {
      password = `${firstName}${registrationData.admissionNumber}`;
    } else if (registrationData.phoneNumber) {
      // Use last 4 digits of phone number if no admission number
      const phoneDigits = registrationData.phoneNumber.slice(-4);
      password = `${firstName}${phoneDigits}`;
    } else {
      // Generate random 4-digit number if no admission number or phone
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      password = `${firstName}${randomNum}`;
    }
  }

  return { username, password };
};

// Send registration confirmation email to all team members
const sendRegistrationEmail = async (registrationData, quiz, credentials) => {
  try {
    console.log('📧 Starting email sending process...');
    console.log('Registration data:', {
      isTeam: registrationData.isTeamRegistration,
      teamName: registrationData.teamName,
      teamLeaderEmail: registrationData.teamLeader?.email,
      teamMembersCount: registrationData.teamMembers?.length
    });

    const transporter = createTransporter();
    const isTeam = registrationData.isTeamRegistration;

    if (isTeam) {
      // Send emails to all team members with complete team details and shared credentials
      const allMembers = [
        { ...registrationData.teamLeader, role: 'Team Leader' },
        ...registrationData.teamMembers.map(member => ({ ...member, role: 'Team Member' }))
      ];

      console.log(`📧 Preparing to send emails to ${allMembers.length} team members:`);
      allMembers.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.name} (${member.email}) - ${member.role}`);
      });

      const emailPromises = allMembers.map(member =>
        sendTeamMemberEmail(transporter, member, registrationData, quiz, credentials, allMembers)
      );

      await Promise.all(emailPromises);
      console.log(`✅ Team registration emails sent to ${allMembers.length} members`);
      return true;
    } else {
      // Send individual registration email
      console.log(`📧 Sending individual email to: ${registrationData.email}`);
      return await sendIndividualRegistrationEmail(transporter, registrationData, quiz, credentials);
    }
  } catch (error) {
    console.error('❌ Error sending registration email:', error);
    return false;
  }
};

// Send email to team member with complete team details
const sendTeamMemberEmail = async (transporter, member, registrationData, quiz, credentials, allMembers) => {
  try {
    console.log(`📧 Sending email to: ${member.name} (${member.email}) - ${member.role}`);
    // Format quiz date and time
    const startDate = new Date(quiz.startTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const startTime = new Date(quiz.startTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = new Date(quiz.endTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailSubject = `🎉 Welcome to ${quiz.title} - Team Registration Confirmed!`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2e7d32; text-align: center;">🎉 Congratulations! Team Registration Successful</h2>

        <p style="font-size: 16px;">Dear <strong>${member.name}</strong>,</p>

        <p style="font-size: 16px;">Greetings! We are delighted to inform you that your team <strong>"${registrationData.teamName}"</strong> has been successfully registered for the quiz <strong>"${quiz.title}"</strong>!</p>

        <p style="font-size: 16px;">You are registered as a <strong>${member.role}</strong> in this exciting quiz competition. Thank you for your participation!</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">📋 Quiz Information</h3>
          <p><strong>Quiz Title:</strong> ${quiz.title}</p>
          <p><strong>Date:</strong> ${startDate}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
          <p><strong>Team Name:</strong> ${registrationData.teamName}</p>
          <p><strong>Your Role:</strong> ${member.role}</p>
          <p><strong>Team Size:</strong> ${allMembers.length} members</p>
        </div>

        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #d32f2f; margin-top: 0;">🔐 Team Login Credentials</h3>
          <p><strong>Username:</strong> <code style="background-color: #fff; padding: 2px 5px; border-radius: 3px;">${credentials.username}</code></p>
          <p><strong>Password:</strong> <code style="background-color: #fff; padding: 2px 5px; border-radius: 3px;">${credentials.password}</code></p>
          <p style="color: #d32f2f; font-size: 14px;"><strong>⚠️ Important:</strong> These are your team's shared login credentials. All team members have the same login details.</p>
          <p style="color: #666; font-size: 12px;">Please keep these credentials safe and share them with your team members.</p>
        </div>

        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #f57c00; margin-top: 0;">👥 Complete Team Details</h3>
          <p><strong>Team Name:</strong> ${registrationData.teamName}</p>
          <p><strong>Total Members:</strong> ${allMembers.length}</p>

          <h4 style="color: #2e7d32; margin-bottom: 10px;">Team Leader:</h4>
          <div style="background-color: #e8f5e8; padding: 10px; border-radius: 3px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${registrationData.teamLeader.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${registrationData.teamLeader.email}</p>
            <p style="margin: 5px 0;"><strong>College:</strong> ${registrationData.teamLeader.college}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${registrationData.teamLeader.department}</p>
            <p style="margin: 5px 0;"><strong>Year:</strong> ${registrationData.teamLeader.year}</p>
            ${registrationData.teamLeader.phoneNumber ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${registrationData.teamLeader.phoneNumber}</p>` : ''}
            ${registrationData.teamLeader.admissionNumber ? `<p style="margin: 5px 0;"><strong>Admission No:</strong> ${registrationData.teamLeader.admissionNumber}</p>` : ''}
          </div>

          ${registrationData.teamMembers.length > 0 ? `
          <h4 style="color: #1976d2; margin-bottom: 10px;">Team Members:</h4>
          ${registrationData.teamMembers.map((teamMember, index) => `
          <div style="background-color: #e3f2fd; padding: 10px; border-radius: 3px; margin-bottom: 10px;">
            <p style="margin: 5px 0;"><strong>Member ${index + 1}:</strong> ${teamMember.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${teamMember.email}</p>
            <p style="margin: 5px 0;"><strong>College:</strong> ${teamMember.college}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${teamMember.department}</p>
            <p style="margin: 5px 0;"><strong>Year:</strong> ${teamMember.year}</p>
            ${teamMember.phoneNumber ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${teamMember.phoneNumber}</p>` : ''}
            ${teamMember.admissionNumber ? `<p style="margin: 5px 0;"><strong>Admission No:</strong> ${teamMember.admissionNumber}</p>` : ''}
          </div>
          `).join('')}
          ` : ''}
        </div>

        ${quiz.emailInstructions ? `
        <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #7b1fa2; margin-top: 0;">📝 Special Instructions</h3>
          <p>${quiz.emailInstructions}</p>
        </div>
        ` : ''}

        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">📌 Important Instructions for Team Quiz</h3>
          <ul>
            <li><strong>Only ONE team member should login and take the quiz</strong></li>
            <li>All team members have the same login credentials (shared username and password)</li>
            <li>Coordinate with your team to decide who will be the designated quiz taker</li>
            <li>The designated member should login using the provided credentials</li>
            <li>Login 10-15 minutes before the quiz starts</li>
            <li>Ensure stable internet connection for the quiz taker</li>
            <li>Have a backup device ready</li>
            <li>All team members should be available to help during the quiz</li>
            <li>Contact support if you face any technical issues</li>
          </ul>
        </div>

        <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #7b1fa2; margin-top: 0;">🤝 Team Coordination Tips</h3>
          <ul>
            <li>Share these credentials with all your team members</li>
            <li>Decide in advance who will take the quiz</li>
            <li>Ensure the quiz taker has a reliable internet connection</li>
            <li>Other team members can assist with research and discussion</li>
            <li>Test the login credentials before the quiz starts</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="color: #2e7d32; font-size: 18px; font-weight: bold;">🌟 Best of Luck with "${quiz.title}"! 🌟</p>
          <p style="color: #666; font-size: 16px;">We wish you and your team great success in this quiz!</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Warm regards,<br>
            <strong>Quiz Management Team</strong><br>
            <em>Empowering Knowledge, One Quiz at a Time</em>
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@quizapp.com',
      to: member.email,
      subject: emailSubject,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Team member email sent successfully to: ${member.email} (${member.role})`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending email to team member ${member.email}:`, error);
    console.error('Email error details:', error.message);
    return false;
  }
};

// Send email to individual registration
const sendIndividualRegistrationEmail = async (transporter, registrationData, quiz, credentials) => {
  try {
    // Format quiz date and time
    const startDate = new Date(quiz.startTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const startTime = new Date(quiz.startTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = new Date(quiz.endTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailSubject = `Registration Confirmed - ${quiz.title}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2e7d32; text-align: center;">🎉 Registration Successful!</h2>

        <p>Dear <strong>${registrationData.name}</strong>,</p>

        <p>Thank you for registering for the quiz <strong>"${quiz.title}"</strong>!</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">📋 Quiz Details</h3>
          <p><strong>Quiz:</strong> ${quiz.title}</p>
          <p><strong>Date:</strong> ${startDate}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
          <p><strong>College:</strong> ${registrationData.college}</p>
        </div>

        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #d32f2f; margin-top: 0;">🔐 Login Credentials</h3>
          <p><strong>Username:</strong> <code style="background-color: #fff; padding: 2px 5px; border-radius: 3px;">${credentials.username}</code> (Your Email)</p>
          <p><strong>Password:</strong> <code style="background-color: #fff; padding: 2px 5px; border-radius: 3px;">${credentials.password}</code></p>
          <p style="color: #d32f2f; font-size: 14px;"><strong>⚠️ Important:</strong> Please keep these credentials safe.</p>
          <p style="color: #666; font-size: 12px;">Password is based on: ${registrationData.phoneNumber ? 'Your phone number' : registrationData.admissionNumber ? 'Your admission number' : 'Common password (Quiz@123)'}</p>
        </div>

        ${quiz.emailInstructions ? `
        <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #7b1fa2; margin-top: 0;">📝 Special Instructions</h3>
          <p>${quiz.emailInstructions}</p>
        </div>
        ` : ''}

        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">📌 Important Notes</h3>
          <ul>
            <li>Login 10-15 minutes before the quiz starts</li>
            <li>Your username is your email address</li>
            <li>Your password is either your phone number, admission number, or "Quiz@123"</li>
            <li>Ensure stable internet connection</li>
            <li>Have a backup device ready</li>
            <li>Contact support if you face any technical issues</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666;">Best of luck with your quiz!</p>
          <p style="color: #666; font-size: 14px;">Quiz Management System</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@quizapp.com',
      to: registrationData.email,
      subject: emailSubject,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`Registration email sent to: ${registrationData.email}`);
    return true;
  } catch (error) {
    console.error('Error sending individual registration email:', error);
    return false;
  }
};



module.exports = {
  generateCredentials,
  sendRegistrationEmail
};
