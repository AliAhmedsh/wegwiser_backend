const express = require('express');
const router = express.Router();
const axios = require('axios');

// Debug: Check environment variables
console.log('DEBUG Environment Variables:', {
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? '***SET***' : 'undefined',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE
});

// Auth0 Management API configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'dev-7yf0quijjygyy5p0.us.auth0.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://wegwiser-api';

// Role mapping (only used for user creation and role assignment)
const ROLE_MAPPING = {
  'Product manager / Owner': 'product_manager',
  'UX / Visual designer': 'designer',
  'Engineer / QA': 'engineer',
  'Founder / CEO / CPO': 'product_manager'
};

const LEGACY_POSITION_MAPPING = {
  'PM/OWNER': 'Product manager / Owner',
  'PRODUCT_MANAGER': 'Product manager / Owner',
  'PRODUCT MANAGER / OWNER': 'Product manager / Owner',
  'UX/VISUAL DESIGNER': 'UX / Visual designer',
  'DESIGNER': 'UX / Visual designer',
  'ENGINEER/QA': 'Engineer / QA',
  'ENGINEER': 'Engineer / QA',
  'QA': 'Engineer / QA',
  'FOUNDER/CEO/CPO': 'Founder / CEO / CPO',
  'FOUNDER': 'Founder / CEO / CPO'
};

const ROLE_TO_POSITION = {
  product_manager: 'Product manager / Owner',
  designer: 'UX / Visual designer',
  engineer: 'Engineer / QA',
  user: 'Product manager / Owner'
};

function splitFullName(name = '') {
  const cleaned = String(name || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = cleaned.split(' ');
  return {
    firstName,
    lastName: rest.join(' ') || firstName
  };
}

function normalizePosition(position, role) {
  if (position && ROLE_MAPPING[position]) {
    return position;
  }

  const normalizedKey = String(position || '').trim().toUpperCase();
  if (normalizedKey && LEGACY_POSITION_MAPPING[normalizedKey]) {
    return LEGACY_POSITION_MAPPING[normalizedKey];
  }

  const normalizedRole = String(role || '').trim().toLowerCase();
  if (normalizedRole && ROLE_TO_POSITION[normalizedRole]) {
    return ROLE_TO_POSITION[normalizedRole];
  }

  return '';
}

function normalizeSignupPayload(payload = {}) {
  const email = payload.workEmail || payload.email || '';
  const firstName = payload.firstName || splitFullName(payload.name).firstName;
  const lastName = payload.lastName || splitFullName(payload.name).lastName;
  const jobTitle = payload.jobTitle || payload.job_title || '';
  const position = normalizePosition(payload.position, payload.role);

  return {
    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim(),
    workEmail: String(email || '').trim().toLowerCase(),
    jobTitle: String(jobTitle || '').trim(),
    position: String(position || '').trim()
  };
}

// Get Auth0 Management API access token
async function getManagementToken() {
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      client_id: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
      client_secret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials'
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting management token:', error.response?.data || error.message);
    throw new Error('Failed to get management token');
  }
}

// Create user in Auth0 (without password, email not verified)
async function createAuth0UserWithoutPassword(userData, managementToken) {
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/api/v2/users`, {
      email: userData.workEmail,
      password: 'TempPassword123!', // Temporary password that will be changed
      name: `${userData.firstName} ${userData.lastName}`,
      given_name: userData.firstName,
      family_name: userData.lastName,
      nickname: userData.jobTitle,
      connection: 'Username-Password-Authentication',
      email_verified: false, // Email not verified yet
      app_metadata: {
        role: ROLE_MAPPING[userData.position] || 'user',
        jobTitle: userData.jobTitle,
        position: userData.position
      }
    }, {
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating Auth0 user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create user');
  }
}

// Update user password in Auth0
async function updateUserPassword(userId, password, managementToken) {
  try {
    await axios.patch(`https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
      password,
      connection: 'Username-Password-Authentication'
    }, {
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      }
    });
    return true;
  } catch (error) {
    console.error('Error updating user password:', error.response?.data || error.message);
    throw new Error('Failed to update user password');
  }
}

// Assign role to user
async function assignRoleToUser(userId, role, managementToken) {
  try {
    // First, get the role ID by name
    const rolesResponse = await axios.get(`https://${AUTH0_DOMAIN}/api/v2/roles`, {
      headers: {
        'Authorization': `Bearer ${managementToken}`
      }
    });
    
    const roleObj = rolesResponse.data.find(r => r.name === role);
    if (!roleObj) {
      console.warn(`Role ${role} not found, skipping role assignment`);
      return;
    }

    // Assign role to user
    await axios.post(`https://${AUTH0_DOMAIN}/api/v2/users/${userId}/roles`, {
      roles: [roleObj.id]
    }, {
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error assigning role:', error.response?.data || error.message);
    // Don't throw error for role assignment failure
  }
}

// Get user access token
async function getUserAccessToken(email, password) {
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'password',
      username: email,
      password: password,
      scope: 'openid profile email',
      audience: AUTH0_AUDIENCE,
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      realm: 'Username-Password-Authentication'
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate user');
  }
}

// Step 1: Create user in Auth0 and send verification email
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, workEmail, jobTitle, position } = normalizeSignupPayload(req.body);

    // Validate required fields
    if (!firstName || !lastName || !workEmail || !jobTitle || !position) {
      return res.status(400).json({
        error: 'All fields are required',
        required_fields: ['firstName', 'lastName', 'workEmail', 'jobTitle', 'position']
      });
    }

    // Get management token
    const managementToken = await getManagementToken();

    // Create user in Auth0 (without password, email not verified)
    const auth0User = await createAuth0UserWithoutPassword({
      firstName,
      lastName,
      workEmail,
      jobTitle,
      position
    }, managementToken);

    // Send verification email via Auth0
    await axios.post(`https://${AUTH0_DOMAIN}/api/v2/jobs/verification-email`, {
      user_id: auth0User.user_id
    }, {
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.status(201).json({
      message: 'User created and verification email sent',
      user: {
        id: auth0User.user_id,
        email: auth0User.email,
        name: auth0User.name
      }
    });

  } catch (error) {
    console.error('Signup error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to create user' 
    });
  }
});

// Shared implementation for both /set-password and legacy /set-final-password
async function handleSetPassword(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Get management token
    const managementToken = await getManagementToken();

    // Find user by email
    const usersResponse = await axios.get(`https://${AUTH0_DOMAIN}/api/v2/users-by-email`, {
      params: { email },
      headers: { Authorization: `Bearer ${managementToken}` }
    });

    const user = usersResponse.data[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(400).json({ error: 'Email not verified yet. Please check your inbox and click the verification link.' });
    }

    // Update user password
    await updateUserPassword(user.user_id, password, managementToken);

    // Wait a moment for password to be set
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get user access token
    const tokens = await getUserAccessToken(email, password);

    res.json({
      message: 'Password set successfully',
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name
      },
      tokens: {
        access_token: tokens.access_token,
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in
      }
    });

  } catch (error) {
    console.error('Set password error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to set password' 
    });
  }
}

// Step 2: Check if email is verified and set password
router.post('/set-password', handleSetPassword);
router.post('/set-final-password', handleSetPassword);

// Check if email is verified
router.post('/check-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get management token
    const managementToken = await getManagementToken();

    // Find user by email
    const usersResponse = await axios.get(`https://${AUTH0_DOMAIN}/api/v2/users-by-email`, {
      params: { email },
      headers: { Authorization: `Bearer ${managementToken}` }
    });

    const user = usersResponse.data[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      verified: user.email_verified,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Check verification error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to check verification status' 
    });
  }
});

// Backward-compatible alias used by some web flows.
router.post('/update-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const managementToken = await getManagementToken();
    const usersResponse = await axios.get(`https://${AUTH0_DOMAIN}/api/v2/users-by-email`, {
      params: { email },
      headers: { Authorization: `Bearer ${managementToken}` }
    });

    const user = usersResponse.data[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      verified: user.email_verified,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Update verification error:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.message || 'Failed to update verification status'
    });
  }
});

router.post('/logout', async (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

async function triggerResetPasswordEmail(email) {
  return axios.post(`https://${AUTH0_DOMAIN}/dbconnections/change_password`, {
    client_id: AUTH0_CLIENT_ID,
    email,
    connection: 'Username-Password-Authentication'
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await triggerResetPasswordEmail(email);
    return res.json({
      success: true,
      message: 'Password reset email sent if account exists'
    });
  } catch (error) {
    console.error('Forgot password error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to process forgot password request'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await triggerResetPasswordEmail(email);
    return res.json({
      success: true,
      message: 'Password reset email sent if account exists'
    });
  } catch (error) {
    console.error('Reset password error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to process reset password request'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user access token
    const tokens = await getUserAccessToken(email, password);

    // Get user info
    const userInfoResponse = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    res.json({
      message: 'Login successful',
      user: userInfoResponse.data,
      tokens: {
        access_token: tokens.access_token,
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in
      }
    });

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(401).json({ 
      error: 'Invalid email or password' 
    });
  }
});

module.exports = router; 