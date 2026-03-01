const fs = require('fs');

const envContent = `# Auth0 Configuration (User Authentication)
AUTH0_DOMAIN=dev-7yf0quijjygyy5p0.us.auth0.com
AUTH0_CLIENT_ID=kJn9dlhfdmVfb3rvSSsEFFmZg8lFpKpf
AUTH0_CLIENT_SECRET=WGUtI3Y6xYNnKkAApIfRV3ZlUbHYKs7opyphQZA2s-v69bPLDom7jq27YLv23Ys4
AUTH0_AUDIENCE=https://wegwiser-api

# Auth0 Management API Configuration (M2M Application)
# Replace these with your new M2M application credentials
AUTH0_MANAGEMENT_CLIENT_ID=YOUR_NEW_M2M_CLIENT_ID
AUTH0_MANAGEMENT_CLIENT_SECRET=YOUR_NEW_M2M_CLIENT_SECRET

# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration (if needed later)
DATABASE_URL=postgresql://localhost:5432/wegwiser

# Redis Configuration (if needed later)
REDIS_URL=redis://localhost:6379
`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created successfully!');
  console.log('📋 Environment variables configured:');
  console.log('   - AUTH0_DOMAIN: dev-7yf0quijjygyy5p0.us.auth0.com');
  console.log('   - AUTH0_CLIENT_ID: kJn9dlhfdmVfb3rvSSsEFFmZg8lFpKpf');
  console.log('   - AUTH0_CLIENT_SECRET: [configured]');
  console.log('   - AUTH0_AUDIENCE: https://wegwiser-api');
  console.log('');
  console.log('⚠️  IMPORTANT: You need to create a new M2M application in Auth0 and update:');
  console.log('   - AUTH0_MANAGEMENT_CLIENT_ID');
  console.log('   - AUTH0_MANAGEMENT_CLIENT_SECRET');
  console.log('');
  console.log('🚀 After updating the M2M credentials, restart your backend server!');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
} 