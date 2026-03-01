const express = require('express');

const router = express.Router();

let nextInvitationId = 1;
const invitations = [];

function buildInvitation(body = {}, type = 'product') {
  return {
    id: nextInvitationId++,
    type,
    email: String(body.email || ''),
    name: String(body.name || ''),
    role: String(body.role || 'member'),
    productId: Number(body.productId || body.product_id || 0) || null,
    token: `invite-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
}

router.post('/product', (req, res) => {
  const invite = buildInvitation(req.body, 'product');
  invitations.push(invite);
  return res.status(201).json({ success: true, invitation: invite });
});

router.post('/product/auth0', (req, res) => {
  const invite = buildInvitation(req.body, 'product-auth0');
  invitations.push(invite);
  return res.status(201).json({ success: true, invitation: invite });
});

router.post('/product/bulk', (req, res) => {
  const items = Array.isArray(req.body.invitations) ? req.body.invitations : [];
  const created = items.map((item) => {
    const invite = buildInvitation(item, 'product');
    invitations.push(invite);
    return invite;
  });
  return res.status(201).json({ success: true, invitations: created });
});

router.post('/check-email', (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  const exists = invitations.some((invite) => String(invite.email || '').toLowerCase() === email);
  return res.json({
    success: true,
    exists,
  });
});

router.post('/facilitator', (req, res) => {
  const invite = buildInvitation(req.body, 'facilitator');
  invitations.push(invite);
  return res.status(201).json({ success: true, invitation: invite });
});

router.post('/facilitator/accept', (req, res) => {
  return res.json({
    success: true,
    message: 'Facilitator invitation accepted',
    data: req.body || {},
  });
});

router.post('/accept', (req, res) => {
  return res.json({
    success: true,
    message: 'Invitation accepted',
    data: req.body || {},
  });
});

module.exports = router;
