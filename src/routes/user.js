const express = require('express');

const router = express.Router();

router.get('/profile', (req, res) => {
  const email = req.headers['x-user-email'] || 'user@wegwiser.local';
  const name = req.headers['x-user-name'] || 'Wegwiser User';
  const role = req.headers['x-user-role'] || 'product_manager';

  return res.json({
    success: true,
    user: {
      id: 1,
      email,
      name,
      role,
      roles: [role],
    },
  });
});

module.exports = router;
