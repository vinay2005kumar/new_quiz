const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create transporter for sending emails
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('⚠️ Email credentials not configured');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser || 'your-email@gmail.com',
      pass: emailPass || 'your-app-password'
    }
  });
};

// Generate user credentials based on registration data
const generateCredentials = (registrationData, quiz) => {
  let username, password;

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
      // Generate deterministic password for team leader using email hash
      const emailHash = teamLeader.email.toLowerCase().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const deterministicNum = Math.abs(emailHash) % 9000 + 1000; // Always 4 digits
      password = `${firstName}${deterministicNum}`;
    }
  } else {
    // For individual registration
    // Username: participant's email
    username = registrationData.email.toLowerCase();

    // Generate password: first name + admission number or first name + phone digits
    const firstName = registrationData.name.split(' ')[0].toLowerCase();
    if (registrationData.admissionNumber && registrationData.admissionNumber !== 'N/A' && registrationData.admissionNumber.trim() !== '') {
      password = `${firstName}${registrationData.admissionNumber}`;
    } else if (registrationData.phoneNumber && registrationData.phoneNumber !== 'N/A' && registrationData.phoneNumber.trim() !== '') {
      // Use last 4 digits of phone number if no admission number
      const phoneDigits = registrationData.phoneNumber.slice(-4);
      password = `${firstName}${phoneDigits}`;
    } else {
      // Generate deterministic password for external students using email hash
      // This ensures the same user always gets the same password
      const emailHash = registrationData.email.toLowerCase().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const deterministicNum = Math.abs(emailHash) % 9000 + 1000; // Always 4 digits
      password = `${firstName}${deterministicNum}`;
    }
  }

  return { username, password };
};

// Send registration confirmation email to all team members
const sendRegistrationEmail = async (registrationData, quiz, credentials) => {
  try {
    const transporter = createTransporter();
    const isTeam = registrationData.isTeamRegistration;

    if (isTeam) {
      // Send emails to all team members with complete team details and shared credentials
      const allMembers = [
        { ...registrationData.teamLeader, role: 'Team Leader' },
        ...registrationData.teamMembers.map(member => ({ ...member, role: 'Team Member' }))
      ];
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
    const endDate = new Date(quiz.endTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
    const endDate = new Date(quiz.endTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endTime = new Date(quiz.endTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Check if this is a follow-up quiz
    const isFollowUpQuiz = registrationData.isFollowUpQuiz;
    const sourceQuiz = registrationData.sourceQuiz;

    const emailSubject = isFollowUpQuiz
      ? `Follow-up Quiz Invitation - ${quiz.title}`
      : `Registration Confirmed - ${quiz.title}`;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2e7d32; text-align: center;">${isFollowUpQuiz ? '🎯 Follow-up Quiz Invitation!' : '🎉 Registration Successful!'}</h2>

        <p>Dear <strong>${registrationData.name}</strong>,</p>

        ${isFollowUpQuiz
          ? `<p>You have been selected to participate in a follow-up quiz <strong>"${quiz.title}"</strong> based on your performance in "${sourceQuiz}".</p>
             <p>This is an exclusive opportunity to showcase your skills further!</p>`
          : `<p>Thank you for registering for the quiz <strong>"${quiz.title}"</strong>!</p>`
        }

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">📋 Quiz Details</h3>
          <p><strong>Quiz:</strong> ${quiz.title}</p>
          <p><strong>Start:</strong> ${startDate} at ${startTime}</p>
          <p><strong>End:</strong> ${endDate} at ${endTime}</p>
          <p><strong>Duration:</strong> ${quiz.duration} minutes</p>
          <p><strong>College:</strong> ${registrationData.college}</p>
        </div>

        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #d32f2f; margin-top: 0;">🔐 Login Credentials</h3>
          <p><strong>Username:</strong> <code style="background-color: #fff; padding: 2px 5px; border-radius: 3px;">${credentials.username}</code> (Your Email)</p>
          ${isFollowUpQuiz
            ? `<p><strong>Password:</strong> Use your <strong>original registration password</strong> from when you first registered</p>
               <p style="color: #d32f2f; font-size: 14px;"><strong>⚠️ Important:</strong> Use the same password you used for the original quiz.</p>`
            : `<p><strong>Password:</strong> <code style="background-color: #fff; padding: 2px 5px; border-radius: 3px;">${credentials.password}</code></p>
               <p style="color: #d32f2f; font-size: 14px;"><strong>⚠️ Important:</strong> Please keep these credentials safe.</p>
               <p style="color: #666; font-size: 12px;">Password is based on: ${registrationData.phoneNumber ? 'Your phone number' : registrationData.admissionNumber ? 'Your admission number' : 'System generated password'}</p>`
          }
        </div>

        ${quiz.emailInstructions ? `
        <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #7b1fa2; margin-top: 0;">📝 Special Instructions</h3>
          <p>${quiz.emailInstructions}</p>
        </div>
        ` : ''}

        ${isFollowUpQuiz ? `
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #e65100; margin-top: 0;">🎯 Follow-up Quiz Information</h3>
          <p><strong>Source Quiz:</strong> ${sourceQuiz}</p>
          <p>You have been specially selected for this follow-up quiz based on your previous performance. This is an exclusive opportunity!</p>
        </div>
        ` : ''}

        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">📌 Important Notes</h3>
          <ul>
            <li>Your username is your email address</li>
            <li>Ensure stable internet connection</li>
            <li>Contact support if you face any technical issues</li>
            ${isFollowUpQuiz ? '<li><strong>This is a follow-up quiz - you have been specially selected!</strong></li>' : ''}
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
    return true;
  } catch (error) {
    console.error('Error sending registration email:', error.message);
    return false;
  }
};



// Send bulk email to multiple recipients
const sendBulkEmail = async ({ emails, subject, message, quizTitle, senderName }) => {
  try {
    const transporter = createTransporter();

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    // Send emails one by one to track individual failures
    for (const email of emails) {
      try {
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2e7d32; margin: 0; font-size: 28px;">📧 ${subject}</h1>
                <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Quiz Management System</p>
              </div>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #1976d2; margin: 0 0 15px 0;">📚 Quiz: ${quizTitle}</h3>
                <div style="white-space: pre-line; color: #333; font-size: 16px; line-height: 1.6;">
                  ${message}
                </div>
              </div>

              <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  Best regards,<br>
                  <strong>${senderName}</strong><br>
                  <em>Quiz Management Team</em>
                </p>
              </div>
            </div>
          </div>
        `;

        const mailOptions = {
          from: process.env.EMAIL_USER || 'noreply@quizapp.com',
          to: email,
          subject: subject,
          html: emailContent
        };

        await transporter.sendMail(mailOptions);
        successCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError.message);
        failureCount++;
        failures.push({
          email,
          error: emailError.message
        });
      }
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      failures
    };
  } catch (error) {
    console.error('Bulk email error:', error.message);
    return {
      success: false,
      successCount: 0,
      failureCount: emails.length,
      error: error.message,
      failures: emails.map(email => ({ email, error: error.message }))
    };
  }
};

// Send academic quiz notification to eligible students
const sendAcademicQuizNotification = async (quiz, eligibleStudents) => {
  try {
    console.log(`📧 Starting to send academic quiz notifications for: ${quiz.title}`);
    console.log(`📊 Total eligible students: ${eligibleStudents.length}`);

    if (eligibleStudents.length === 0) {
      console.log('⚠️ No eligible students found for this quiz');
      return { success: 0, failed: 0, total: 0 };
    }

    const transporter = createTransporter();
    let successCount = 0;
    let failedCount = 0;

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
    const endDate = new Date(quiz.endTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endTime = new Date(quiz.endTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send emails to all eligible students
    for (const student of eligibleStudents) {
      try {
        const emailSubject = `📚 New Academic Quiz Available - ${quiz.title}`;
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1976d2; margin: 0;">📚 New Academic Quiz Available!</h2>
              <p style="color: #666; font-size: 16px; margin: 10px 0;">A new quiz has been created for your class</p>
            </div>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="margin: 0 0 15px 0;">Dear <strong>${student.name}</strong>,</p>
              <p style="margin: 0 0 15px 0;">Your faculty has created a new academic quiz that you are eligible to take.</p>
            </div>

            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
              <h3 style="color: #1976d2; margin-top: 0; margin-bottom: 15px;">📋 Quiz Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Quiz Title:</td>
                  <td style="padding: 8px 0; color: #666;">${quiz.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Subject:</td>
                  <td style="padding: 8px 0; color: #666;">${quiz.subject.name} (${quiz.subject.code})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Duration:</td>
                  <td style="padding: 8px 0; color: #666;">${quiz.duration} minutes</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Total Questions:</td>
                  <td style="padding: 8px 0; color: #666;">${quiz.questions.length}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Total Marks:</td>
                  <td style="padding: 8px 0; color: #666;">${quiz.totalMarks}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">Start Date & Time:</td>
                  <td style="padding: 8px 0; color: #666;">${startDate} at ${startTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">End Date & Time:</td>
                  <td style="padding: 8px 0; color: #666;">${endDate} at ${endTime}</td>
                </tr>
              </table>
            </div>

            ${quiz.description ? `
            <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7b1fa2;">
              <h3 style="color: #7b1fa2; margin-top: 0; margin-bottom: 15px;">📝 Quiz Description</h3>
              <p style="color: #666; margin: 0; line-height: 1.6;">${quiz.description}</p>
            </div>
            ` : ''}

            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <h3 style="color: #f57c00; margin-top: 0; margin-bottom: 15px;">📌 Important Instructions</h3>
              <ul style="color: #666; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Login to your student account to access the quiz</li>
                <li>Ensure you have a stable internet connection</li>
                <li><strong>Quiz starts:</strong> ${startTime} on ${startDate}</li>
                <li><strong>Quiz ends:</strong> ${endTime} on ${endDate}</li>
                <li>Once started, you have ${quiz.duration} minutes to complete</li>
                <li>Make sure to submit your answers before time runs out</li>
                <li>Contact your faculty if you face any technical issues</li>
              </ul>
            </div>

            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="color: #4caf50; margin-top: 0; margin-bottom: 15px;">🎯 Your Academic Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #333;">Department:</td>
                  <td style="padding: 5px 0; color: #666;">${student.department}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #333;">Year:</td>
                  <td style="padding: 5px 0; color: #666;">${student.year}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #333;">Semester:</td>
                  <td style="padding: 5px 0; color: #666;">${student.semester}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; color: #333;">Section:</td>
                  <td style="padding: 5px 0; color: #666;">${student.section}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="color: #1976d2; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">🌟 Good Luck with Your Quiz! 🌟</p>
              <p style="color: #666; font-size: 16px; margin: 0 0 20px 0;">We wish you success in your academic assessment!</p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                Best regards,<br>
                <strong>Academic Team</strong><br>
                <em>Supporting Your Educational Journey</em>
              </p>
            </div>
          </div>
        `;

        const mailOptions = {
          from: process.env.EMAIL_USER || 'noreply@quizapp.com',
          to: student.email,
          subject: emailSubject,
          html: emailContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Academic quiz notification sent successfully to: ${student.email} (${student.name})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error sending academic quiz notification to ${student.email}:`, error);
        failedCount++;
      }
    }

    console.log(`📧 Academic quiz notification summary:`, {
      total: eligibleStudents.length,
      success: successCount,
      failed: failedCount,
      quizTitle: quiz.title
    });

    return {
      success: successCount,
      failed: failedCount,
      total: eligibleStudents.length
    };

  } catch (error) {
    console.error('❌ Error in sendAcademicQuizNotification:', error);
    throw error;
  }
};

// Send forgot password email with reset code
const sendForgotPasswordEmail = async (email, name, resetCode) => {
  try {
    console.log(`📧 Sending forgot password email to: ${email}`);

    const transporter = createTransporter();

    const emailSubject = `🔐 Password Reset Code - Quiz Management System`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #d32f2f; margin: 0;">🔐 Password Reset Request</h2>
          <p style="color: #666; font-size: 16px; margin: 10px 0;">We received a request to reset your password</p>
        </div>

        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="margin: 0 0 15px 0;">Dear <strong>${name}</strong>,</p>
          <p style="margin: 0 0 15px 0;">You have requested to reset your password for the Quiz Management System. Please use the verification code below to proceed with resetting your password.</p>
        </div>

        <div style="background-color: #ffebee; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f; text-align: center;">
          <h3 style="color: #d32f2f; margin-top: 0; margin-bottom: 15px;">🔢 Your Reset Code</h3>
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #d32f2f; letter-spacing: 5px; font-family: 'Courier New', monospace;">${resetCode}</span>
          </div>
          <p style="color: #666; font-size: 14px; margin: 10px 0;">This code will expire in 10 minutes</p>
        </div>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
          <h3 style="color: #f57c00; margin-top: 0; margin-bottom: 15px;">📋 Instructions</h3>
          <ol style="color: #666; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Go back to the login page</li>
            <li>Click on "Forgot Password" if you haven't already</li>
            <li>Enter this 6-digit code when prompted</li>
            <li>Create your new password</li>
            <li>Login with your new password</li>
          </ol>
        </div>

        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
          <h3 style="color: #d32f2f; margin-top: 0; margin-bottom: 15px;">⚠️ Security Notice</h3>
          <ul style="color: #666; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>This code is valid for only 10 minutes</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Never share this code with anyone</li>
            <li>Contact support if you have any concerns</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #666; font-size: 14px; margin: 0;">
            Best regards,<br>
            <strong>Quiz Management Team</strong><br>
            <em>Keeping Your Account Secure</em>
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@quizapp.com',
      to: email,
      subject: emailSubject,
      html: emailContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Forgot password email sent successfully to: ${email}`);
    console.log('Email send result:', result);
    return true;
  } catch (error) {
    console.error(`❌ Error sending forgot password email to ${email}:`, error);
    console.error('Full error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });

    // If it's a minor error but email might have been sent, don't throw
    if (error.code === 'ECONNRESET' || error.message.includes('timeout')) {
      console.log('⚠️ Network error occurred, but email might have been sent');
      return true; // Return success for network timeouts
    }

    throw error;
  }
};

// Send reattempt notification email to student
const sendReattemptNotificationEmail = async (studentData, quizData, senderInfo) => {
  try {
    console.log('📧 Sending reattempt notification email...');
    console.log('Student data:', { email: studentData.email, name: studentData.name });
    console.log('Quiz data:', { title: quizData.title, type: quizData.type });

    const transporter = createTransporter();

    const emailSubject = `🔄 Quiz Reattempt Permission Granted - ${quizData.title}`;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px;">🔄 Quiz Reattempt Permission</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You can now retake the quiz!</p>
            </div>
          </div>

          <!-- Student Info -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">👋 Hello ${studentData.name || 'Student'},</h3>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
              Good news! You have been granted permission to reattempt the quiz. Your previous submission has been reset, and you can now take the quiz again.
            </p>
          </div>

          <!-- Quiz Details -->
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2196F3;">
            <h3 style="color: #1976d2; margin: 0 0 15px 0;">📚 Quiz Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Quiz Title:</td>
                <td style="padding: 8px 0; color: #333;">${quizData.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Quiz Type:</td>
                <td style="padding: 8px 0; color: #333;">${quizData.type === 'academic' ? 'Academic Quiz' : 'Event Quiz'}</td>
              </tr>
              ${quizData.duration ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Duration:</td>
                <td style="padding: 8px 0; color: #333;">${quizData.duration} minutes</td>
              </tr>
              ` : ''}
              ${quizData.endTime ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Available Until:</td>
                <td style="padding: 8px 0; color: #333;">${new Date(quizData.endTime).toLocaleString()}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Permission Granted By -->
          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ff9800;">
            <h3 style="color: #f57c00; margin: 0 0 15px 0;">👨‍🏫 Permission Granted By</h3>
            <p style="color: #666; font-size: 16px; margin: 0;">
              <strong>${senderInfo.name}</strong> (${senderInfo.role})<br>
              ${senderInfo.email ? `📧 ${senderInfo.email}` : ''}
            </p>
          </div>

          <!-- Instructions -->
          <div style="background-color: #f1f8e9; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #4CAF50;">
            <h3 style="color: #388e3c; margin: 0 0 15px 0;">📝 What to do next?</h3>
            <ol style="color: #666; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Log in to your quiz portal</li>
              <li>Navigate to the quiz section</li>
              <li>Find "${quizData.title}" and click to start</li>
              <li>Complete the quiz before the deadline</li>
            </ol>
          </div>

          <!-- Important Note -->
          <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f44336;">
            <h3 style="color: #d32f2f; margin: 0 0 15px 0;">⚠️ Important Note</h3>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
              This is a reattempt opportunity. Your previous submission has been cleared. Make sure to complete the quiz within the given time limit.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              Best of luck with your quiz reattempt!<br>
              <strong>Quiz Management System</strong><br>
              <em>Supporting Your Academic Journey</em>
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@quizapp.com',
      to: studentData.email,
      subject: emailSubject,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Reattempt notification email sent successfully to: ${studentData.email} (${studentData.name})`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending reattempt notification email to ${studentData.email}:`, error);
    return false;
  }
};

// Send follow-up quiz invitation email (specific for invite button)
const sendQuizNotificationEmail = async (email, quiz, credentials, registrationData, isFollowUpQuiz = false) => {
  try {
    console.log(`📧 Sending follow-up quiz invitation email to: ${email}`);

    const transporter = createTransporter();

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
    const endDate = new Date(quiz.endTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endTime = new Date(quiz.endTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailSubject = `🎯 You're Invited! Follow-up Quiz - ${quiz.title}`;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2e7d32; text-align: center;">🎯 Congratulations! You're Invited to a Follow-up Quiz!</h2>

        <p>Dear <strong>${registrationData.name}</strong>,</p>

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
          <h3 style="color: #2e7d32; margin-top: 0;">🌟 Exclusive Invitation</h3>
          <p>Based on your excellent performance in the previous quiz, you have been specially selected to participate in the follow-up quiz:</p>
          <p style="font-size: 18px; font-weight: bold; color: #1976d2; text-align: center; margin: 15px 0;">
            "${quiz.title}"
          </p>
          <p>This is an exclusive opportunity to showcase your skills further!</p>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">📅 Quiz Details</h3>
          <p><strong>📚 Quiz Title:</strong> ${quiz.title}</p>
          <p><strong>📅 Start Date:</strong> ${startDate}</p>
          <p><strong>🕐 Start Time:</strong> ${startTime}</p>
          <p><strong>📅 End Date:</strong> ${endDate}</p>
          <p><strong>🕐 End Time:</strong> ${endTime}</p>
          <p><strong>⏱️ Duration:</strong> ${quiz.duration} minutes</p>
          <p><strong>❓ Total Questions:</strong> ${quiz.questions?.length || 'TBD'}</p>
        </div>

        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #e65100; margin-top: 0;">🔑 Your Login Credentials</h3>
          <p><strong>Username:</strong> ${credentials.username}</p>
          <p><strong>Password:</strong> ${credentials.password}</p>
          <p style="color: #d84315; font-weight: bold;">⚠️ Keep these credentials secure and confidential!</p>
        </div>

        ${quiz.emailInstructions ? `
        <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #7b1fa2; margin-top: 0;">📝 Special Instructions</h3>
          <p>${quiz.emailInstructions}</p>
        </div>
        ` : ''}

        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">📌 Important Guidelines</h3>
          <ul>
            <li>🔐 Use the credentials provided above</li>
            <li>🌐 Ensure stable internet connection</li>
            <li>📞 Contact support if you face any technical issues</li>
            <li>🎯 <strong>This is an exclusive follow-up quiz invitation!</strong></li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="color: #2e7d32; font-size: 18px; font-weight: bold;">🌟 Best of Luck! 🌟</p>
          <p style="color: #666; font-size: 16px;">We're excited to see your continued excellence!</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Warm regards,<br>
            <strong>Quiz Management Team</strong><br>
            <em>Recognizing Excellence, One Quiz at a Time</em>
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@quizapp.com',
      to: email,
      subject: emailSubject,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Follow-up quiz invitation sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending follow-up quiz invitation to ${email}:`, error);
    return false;
  }
};

// Send event quiz notification to eligible college students
const sendEventQuizNotification = async (quiz, eligibleStudents) => {
  try {
    console.log(`📧 Starting to send event quiz notifications for: ${quiz.title}`);
    console.log(`📊 Total eligible college students: ${eligibleStudents.length}`);

    if (eligibleStudents.length === 0) {
      console.log('⚠️ No eligible college students found for this event quiz');
      return { success: 0, failed: 0, total: 0 };
    }

    const transporter = createTransporter();
    let successCount = 0;
    let failedCount = 0;

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
    const endDate = new Date(quiz.endTime).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endTime = new Date(quiz.endTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send email to each eligible student
    for (const student of eligibleStudents) {
      try {
        const emailSubject = `🎓 ${quiz.title} - Event Quiz Invitation`;

        const emailContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="background-color: #ffffff; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;">

              <!-- Header Section -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                  🎓 Event Quiz Invitation
                </h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">
                  You're invited to participate in an exciting quiz competition!
                </p>
              </div>

              <!-- College Info Section -->
              <div style="background-color: #f8f9ff; padding: 25px; border-bottom: 3px solid #e3f2fd;">
                <div style="text-align: center;">
                  <h2 style="color: #1565c0; margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">
                    🏛️ ${process.env.COLLEGE_NAME || 'Your College Name'}
                  </h2>
                  <p style="color: #666; margin: 0; font-size: 16px; font-style: italic;">
                    Department of Computer Science & Engineering
                  </p>
                </div>
              </div>

              <!-- Quiz Details Section -->
              <div style="padding: 30px;">
                <div style="background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #2196f3;">
                  <h2 style="color: #1976D2; margin: 0 0 15px 0; font-size: 26px; font-weight: bold;">
                    📝 ${quiz.title}
                  </h2>
                  ${quiz.description ? `<p style="color: #555; margin: 0; font-size: 16px; line-height: 1.6; font-style: italic;">"${quiz.description}"</p>` : ''}
                </div>

                <!-- Quiz Statistics -->
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
                  <div style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #ffb74d;">
                    <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
                    <div style="font-size: 24px; font-weight: bold; color: #e65100; margin-bottom: 5px;">${quiz.questions ? quiz.questions.length : 'TBD'}</div>
                    <div style="font-size: 14px; color: #bf360c; font-weight: 600;">Total Questions</div>
                  </div>

                  <div style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #ba68c8;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
                    <div style="font-size: 24px; font-weight: bold; color: #6a1b9a; margin-bottom: 5px;">${quiz.totalMarks || 'TBD'}</div>
                    <div style="font-size: 14px; color: #4a148c; font-weight: 600;">Total Marks</div>
                  </div>

                  <div style="flex: 1; min-width: 200px; background: linear-gradient(135deg, ${quiz.negativeMarkingEnabled ? '#ffebee 0%, #ffcdd2 100%' : '#e8f5e8 0%, #c8e6c8 100%'}); padding: 20px; border-radius: 10px; text-align: center; border: 2px solid ${quiz.negativeMarkingEnabled ? '#ef5350' : '#66bb6a'};">
                    <div style="font-size: 32px; margin-bottom: 8px;">${quiz.negativeMarkingEnabled ? '⚠️' : '✅'}</div>
                    <div style="font-size: 18px; font-weight: bold; color: ${quiz.negativeMarkingEnabled ? '#c62828' : '#2e7d32'}; margin-bottom: 5px;">${quiz.negativeMarkingEnabled ? 'Enabled' : 'Disabled'}</div>
                    <div style="font-size: 14px; color: ${quiz.negativeMarkingEnabled ? '#b71c1c' : '#1b5e20'}; font-weight: 600;">Negative Marking</div>
                  </div>
                </div>

                <!-- Schedule Section -->
                <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #ff9800;">
                  <h3 style="color: #e65100; margin: 0 0 20px 0; font-size: 22px; font-weight: bold; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">📅</span> Quiz Schedule
                  </h3>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div style="background: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                      <div style="font-weight: bold; color: #bf360c; margin-bottom: 5px;">🚀 Start Time</div>
                      <div style="color: #555; font-size: 16px;">${startDate}</div>
                      <div style="color: #555; font-size: 16px; font-weight: bold;">${startTime}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                      <div style="font-weight: bold; color: #bf360c; margin-bottom: 5px;">🏁 End Time</div>
                      <div style="color: #555; font-size: 16px;">${endDate}</div>
                      <div style="color: #555; font-size: 16px; font-weight: bold;">${endTime}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                      <div style="font-weight: bold; color: #bf360c; margin-bottom: 5px;">⏱️ Duration</div>
                      <div style="color: #555; font-size: 20px; font-weight: bold;">${quiz.duration} minutes</div>
                    </div>
                  </div>
                </div>

                <!-- Eligibility Criteria -->
                <div style="background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #4caf50;">
                  <h3 style="color: #2e7d32; margin: 0 0 20px 0; font-size: 22px; font-weight: bold; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">🎯</span> Eligibility Criteria
                  </h3>
                  <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                      <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 8px;">🏛️</div>
                        <div style="font-weight: bold; color: #1b5e20; margin-bottom: 5px;">Departments</div>
                        <div style="color: #388e3c; font-size: 14px;">${quiz.departments && quiz.departments.includes('all') ? 'All Departments' : (quiz.departments || []).join(', ')}</div>
                      </div>
                      <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 8px;">📚</div>
                        <div style="font-weight: bold; color: #1b5e20; margin-bottom: 5px;">Years</div>
                        <div style="color: #388e3c; font-size: 14px;">${quiz.years && quiz.years.includes('all') ? 'All Years' : (quiz.years || []).map(y => `Year ${y}`).join(', ')}</div>
                      </div>
                      <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 8px;">📖</div>
                        <div style="font-weight: bold; color: #1b5e20; margin-bottom: 5px;">Semesters</div>
                        <div style="color: #388e3c; font-size: 14px;">${quiz.semesters && quiz.semesters.includes('all') ? 'All Semesters' : (quiz.semesters || []).map(s => `Semester ${s}`).join(', ')}</div>
                      </div>
                    </div>
                  </div>
                  <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px; border: 1px dashed #4caf50;">
                    <div style="text-align: center; color: #2e7d32; font-weight: bold;">
                      ✅ You are eligible to participate in this quiz!
                    </div>
                  </div>
                </div>

                <!-- Participation Details -->
                <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #2196f3;">
                  <h3 style="color: #1565c0; margin: 0 0 20px 0; font-size: 22px; font-weight: bold; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">📋</span> How to Participate
                  </h3>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 10px; text-align: center;">
                      <div style="font-size: 32px; margin-bottom: 10px;">📝</div>
                      <div style="font-weight: bold; color: #0d47a1; margin-bottom: 8px;">Registration</div>
                      <div style="color: #1565c0; font-size: 14px;">${quiz.registrationEnabled ? '✅ Open Registration Available' : '⚠️ Limited Registration'}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 10px; text-align: center;">
                      <div style="font-size: 32px; margin-bottom: 10px;">${quiz.participationMode === 'team' ? '👥' : '👤'}</div>
                      <div style="font-weight: bold; color: #0d47a1; margin-bottom: 8px;">Mode</div>
                      <div style="color: #1565c0; font-size: 14px;">${quiz.participationMode === 'team' ? `Team (${quiz.teamSize} members)` : 'Individual'}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 10px; text-align: center;">
                      <div style="font-size: 32px; margin-bottom: 10px;">🔐</div>
                      <div style="font-weight: bold; color: #0d47a1; margin-bottom: 8px;">Access</div>
                      <div style="color: #1565c0; font-size: 14px;">Login credentials after registration</div>
                    </div>
                  </div>
                </div>

              ${quiz.instructions ? `
                <div style="background-color: #FFF8E1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                  <h3 style="color: #F9A825; margin: 0 0 15px 0; font-size: 18px;">📝 Instructions</h3>
                  <p style="color: #555; margin: 0; font-size: 16px; line-height: 1.6;">${quiz.instructions}</p>
                </div>
              ` : ''}

                <!-- Student Details -->
                <div style="background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #ffc107;">
                  <h3 style="color: #e65100; margin: 0 0 20px 0; font-size: 22px; font-weight: bold; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">🎓</span> Your Academic Profile
                  </h3>
                  <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 10px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                      <div style="text-align: center; padding: 15px; background: rgba(255,193,7,0.1); border-radius: 8px;">
                        <div style="font-size: 20px; margin-bottom: 8px;">👤</div>
                        <div style="font-weight: bold; color: #e65100; margin-bottom: 5px;">Name</div>
                        <div style="color: #bf360c; font-size: 16px;">${student.name}</div>
                      </div>
                      <div style="text-align: center; padding: 15px; background: rgba(255,193,7,0.1); border-radius: 8px;">
                        <div style="font-size: 20px; margin-bottom: 8px;">🏛️</div>
                        <div style="font-weight: bold; color: #e65100; margin-bottom: 5px;">Department</div>
                        <div style="color: #bf360c; font-size: 16px;">${student.department}</div>
                      </div>
                      <div style="text-align: center; padding: 15px; background: rgba(255,193,7,0.1); border-radius: 8px;">
                        <div style="font-size: 20px; margin-bottom: 8px;">📚</div>
                        <div style="font-weight: bold; color: #e65100; margin-bottom: 5px;">Year & Semester</div>
                        <div style="color: #bf360c; font-size: 16px;">Year ${student.year}, Sem ${student.semester}</div>
                      </div>
                      ${student.section ? `
                      <div style="text-align: center; padding: 15px; background: rgba(255,193,7,0.1); border-radius: 8px;">
                        <div style="font-size: 20px; margin-bottom: 8px;">📝</div>
                        <div style="font-weight: bold; color: #e65100; margin-bottom: 5px;">Section</div>
                        <div style="color: #bf360c; font-size: 16px;">${student.section}</div>
                      </div>
                      ` : ''}
                    </div>
                  </div>
                </div>

                ${quiz.instructions ? `
                <!-- Instructions Section -->
                <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #ff9800;">
                  <h3 style="color: #e65100; margin: 0 0 15px 0; font-size: 22px; font-weight: bold; display: flex; align-items: center;">
                    <span style="margin-right: 10px;">📝</span> Special Instructions
                  </h3>
                  <div style="background: rgba(255,255,255,0.8); padding: 20px; border-radius: 10px; color: #555; font-size: 16px; line-height: 1.6;">
                    ${quiz.instructions}
                  </div>
                </div>
                ` : ''}

                <!-- Call to Action -->
                <div style="text-align: center; margin: 40px 0;">
                  <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 20px 40px; border-radius: 50px; display: inline-block; font-size: 20px; font-weight: bold; box-shadow: 0 8px 20px rgba(76,175,80,0.3); text-decoration: none; border: none; cursor: pointer;">
                    🚀 Register Now to Participate!
                  </div>
                  <div style="margin-top: 15px; color: #666; font-size: 14px;">
                    Click above to start your registration process
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: linear-gradient(135deg, #37474f 0%, #263238 100%); padding: 25px; text-align: center; color: white;">
                <div style="margin-bottom: 15px;">
                  <h4 style="margin: 0; font-size: 18px; font-weight: bold;">📧 Automated Quiz Notification System</h4>
                </div>
                <div style="font-size: 14px; opacity: 0.8; line-height: 1.5;">
                  <p style="margin: 5px 0;">🏛️ ${process.env.COLLEGE_NAME || 'Your College Name'}</p>
                  <p style="margin: 5px 0;">🏢 Department of Computer Science & Engineering</p>
                  <p style="margin: 5px 0;">📧 This is an automated notification for eligible college students</p>
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 12px; opacity: 0.7;">
                  <p style="margin: 0;">© 2025 Quiz Management System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        `;

        const mailOptions = {
          from: process.env.EMAIL_USER || 'noreply@quizapp.com',
          to: student.email,
          subject: emailSubject,
          html: emailContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Event quiz notification sent successfully to: ${student.email} (${student.name})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error sending event quiz notification to ${student.email}:`, error);
        failedCount++;
      }
    }

    console.log(`📧 Event quiz notification summary:`, {
      total: eligibleStudents.length,
      success: successCount,
      failed: failedCount,
      quizTitle: quiz.title
    });

    return {
      success: successCount,
      failed: failedCount,
      total: eligibleStudents.length
    };
  } catch (error) {
    console.error('❌ Error in sendEventQuizNotification:', error);
    return {
      success: 0,
      failed: eligibleStudents?.length || 0,
      total: eligibleStudents?.length || 0
    };
  }
};

module.exports = {
  generateCredentials,
  sendRegistrationEmail,
  sendBulkEmail,
  sendAcademicQuizNotification,
  sendEventQuizNotification,
  sendForgotPasswordEmail,
  sendReattemptNotificationEmail,
  sendQuizNotificationEmail
};
