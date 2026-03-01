const fs = require('fs');
const path = require('path');

console.log('🔧 Wegwiser Backend Environment Setup');
console.log('=====================================');
console.log('');

console.log('📋 Please follow these steps:');
console.log('');
console.log('1. Go to Auth0 Dashboard: https://manage.auth0.com/dashboard/us/dev-7yf0quijjygyy5p0/applications');
console.log('2. Click "+ Create Application"');
console.log('3. Name it: "Wegwiser Backend API"');
console.log('4. Select "Machine to Machine Applications"');
console.log('5. Click "Create"');
console.log('');
console.log('6. In your new M2M app, go to the "APIs" tab');
console.log('7. Find "Auth0 Management API" and toggle it ON');
console.log('8. Select these permissions:');
console.log('   - create:users');
console.log('   - read:users');
console.log('   - read:roles');
console.log('   - assign:roles_to_users');
console.log('9. Click "Authorize"');
console.log('');
console.log('10. Copy the new Client ID and Client Secret');
console.log('');

console.log('📝 Create a .env file in your backend directory with:');
console.log('');
console.log('AUTH0_DOMAIN=dev-7yf0quijjygyy5p0.us.auth0.com');
console.log('AUTH0_CLIENT_ID=YOUR_NEW_M2M_CLIENT_ID_HERE');
console.log('AUTH0_CLIENT_SECRET=YOUR_NEW_M2M_CLIENT_SECRET_HERE');
console.log('AUTH0_AUDIENCE=https://wegwiser-api');
console.log('PORT=3001');
console.log('NODE_ENV=development');
console.log('');

console.log('✅ After creating the .env file, restart your backend server');
console.log(''); 