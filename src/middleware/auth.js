const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'dev-7yf0quijjygyy5p0.us.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://wegwiser-api';

// JWKS client for token verification
const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Get signing key for token verification
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

function normalizeRoles(decoded) {
  const roleClaims = [
    decoded['https://wegwiser-api/roles'],
    decoded['https://wegwiser.ai/roles'],
    decoded.app_metadata?.roles,
    decoded.app_metadata?.role,
    decoded.role,
  ];

  for (const claim of roleClaims) {
    if (!claim) continue;
    if (Array.isArray(claim)) return claim.map(String);
    return [String(claim)];
  }

  return ['user'];
}

// JWT verification middleware
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  jwt.verify(token, getKey, {
    audience: AUTH0_AUDIENCE,
    issuer: `https://${AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Extract user info and role from token
    const roles = normalizeRoles(decoded);

    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      roles,
      role: roles[0]
    };

    console.log('Authenticated user:', {
      email: req.user.email,
      role: req.user.role
    });

    next();
  });
};

// Role-based access control middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    
    // Check if user has any of the allowed roles
    const matchedRole = userRoles.find((role) => allowedRoles.includes(role));
    if (!matchedRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRoles
      });
    }

    req.user.role = matchedRole;
    console.log(`User ${req.user.email} (${matchedRole}) authorized for roles:`, allowedRoles);
    next();
  };
};

module.exports = {
  verifyJWT,
  requireRole
}; 