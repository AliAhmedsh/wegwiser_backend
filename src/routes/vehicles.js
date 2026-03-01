const express = require('express');

const router = express.Router();

let nextVehicleId = 1;
let nextMemberId = 1;
const vehicles = [];
const membersByVehicle = new Map();
const filesByVehicle = new Map();

function nowISO() {
  return new Date().toISOString();
}

function getVehicle(id) {
  return vehicles.find((item) => item.id === id);
}

function ensureVehicleMembers(vehicleId) {
  if (!membersByVehicle.has(vehicleId)) {
    membersByVehicle.set(vehicleId, []);
  }
  return membersByVehicle.get(vehicleId);
}

function ensureVehicleFiles(vehicleId) {
  if (!filesByVehicle.has(vehicleId)) {
    filesByVehicle.set(vehicleId, []);
  }
  return filesByVehicle.get(vehicleId);
}

router.get('/form-data/:productId', (req, res) => {
  return res.json({
    success: true,
    data: {
      productId: Number(req.params.productId),
      vehicleTypes: ['feature', 'initiative', 'epic'],
    },
  });
});

router.post('/basic-info', (req, res) => {
  const name = String(req.body.name || req.body.vehicle_name || 'Untitled Vehicle');
  const vehicle = {
    id: nextVehicleId++,
    productId: Number(req.body.productId || req.body.product_id || 0) || null,
    name,
    description: String(req.body.description || ''),
    status: 'draft',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  vehicles.unshift(vehicle);
  return res.status(201).json({ success: true, vehicle });
});

router.post('/:vehicleId/product-relationship', (req, res) => {
  return res.json({ success: true, relationship: req.body || {} });
});

router.post('/:vehicleId/outline', (req, res) => {
  return res.json({ success: true, outline: req.body || {} });
});

router.get('/:vehicleId/team-members', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  return res.json({
    success: true,
    members: ensureVehicleMembers(vehicleId),
  });
});

router.get('/suggested-members/:productId', (req, res) => {
  return res.json({
    success: true,
    members: [
      { id: 101, name: 'Suggested PM', email: 'pm@wegwiser.local', role: 'product_manager' },
      { id: 102, name: 'Suggested Engineer', email: 'eng@wegwiser.local', role: 'engineer' },
    ],
  });
});

router.post('/:vehicleId/team-members', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const members = ensureVehicleMembers(vehicleId);
  const user = {
    id: nextMemberId++,
    name: String(req.body.name || 'Team Member'),
    email: String(req.body.email || ''),
    role: String(req.body.role || 'member'),
  };
  members.push(user);
  return res.status(201).json({ success: true, member: user });
});

router.post('/:vehicleId/team-members/batch', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const members = ensureVehicleMembers(vehicleId);
  const incoming = Array.isArray(req.body.members) ? req.body.members : [];
  const created = incoming.map((member) => {
    const next = {
      id: nextMemberId++,
      name: String(member.name || 'Team Member'),
      email: String(member.email || ''),
      role: String(member.role || 'member'),
    };
    members.push(next);
    return next;
  });
  return res.status(201).json({ success: true, members: created });
});

router.delete('/:vehicleId/team-members/:memberId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const memberId = Number(req.params.memberId);
  const members = ensureVehicleMembers(vehicleId);
  const next = members.filter((member) => member.id !== memberId);
  membersByVehicle.set(vehicleId, next);
  return res.json({ success: true, message: 'Member removed' });
});

router.get('/:vehicleId/review', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'Vehicle not found' });
  }
  return res.json({
    success: true,
    vehicle,
    members: ensureVehicleMembers(vehicleId),
    files: ensureVehicleFiles(vehicleId),
  });
});

router.post('/:vehicleId/finalize', (req, res) => {
  const vehicle = getVehicle(Number(req.params.vehicleId));
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'Vehicle not found' });
  }
  vehicle.status = 'finalized';
  vehicle.updatedAt = nowISO();
  return res.json({ success: true, vehicle });
});

router.post('/:vehicleId/impact-analysis', (req, res) => {
  return res.json({
    success: true,
    result: {
      score: 0.72,
      summary: 'Impact analysis completed (mock)',
    },
  });
});

router.post('/ai-elaborate', (req, res) => {
  return res.json({
    success: true,
    description: String(req.body.description || ''),
  });
});

router.post('/:vehicleId/files', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const files = ensureVehicleFiles(vehicleId);
  const file = {
    id: files.length + 1,
    vehicleId,
    name: String(req.body.name || `vehicle-file-${files.length + 1}.txt`),
    createdAt: nowISO(),
  };
  files.push(file);
  return res.status(201).json({ success: true, file });
});

router.get('/:vehicleId/files', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  return res.json({ success: true, files: ensureVehicleFiles(vehicleId) });
});

router.post('/', (req, res) => {
  const vehicle = {
    id: nextVehicleId++,
    productId: Number(req.body.productId || req.body.product_id || 0) || null,
    name: String(req.body.name || req.body.vehicle_name || 'Untitled Vehicle'),
    description: String(req.body.description || ''),
    status: 'draft',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  vehicles.unshift(vehicle);
  return res.status(201).json({ success: true, vehicle });
});

router.get('/', (req, res) => {
  const productId = Number(req.query.productId || req.query.product_id || 0);
  const list = productId ? vehicles.filter((item) => item.productId === productId) : vehicles;
  return res.json({ success: true, vehicles: list });
});

router.get('/:id', (req, res) => {
  const vehicle = getVehicle(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'Vehicle not found' });
  }
  return res.json({ success: true, vehicle });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = vehicles.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Vehicle not found' });
  }
  vehicles.splice(index, 1);
  membersByVehicle.delete(id);
  filesByVehicle.delete(id);
  return res.json({ success: true, message: 'Vehicle deleted' });
});

router.get('/user/:userId/task-completion', (req, res) => {
  return res.json({
    success: true,
    userId: Number(req.params.userId),
    completion: 0,
  });
});

router.post('/:vehicleId/approve', (req, res) => {
  const vehicle = getVehicle(Number(req.params.vehicleId));
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'Vehicle not found' });
  }
  vehicle.status = 'approved';
  vehicle.updatedAt = nowISO();
  return res.json({ success: true, vehicle });
});

router.post('/:vehicleId/launch', (req, res) => {
  const vehicle = getVehicle(Number(req.params.vehicleId));
  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'Vehicle not found' });
  }
  vehicle.status = 'launched';
  vehicle.updatedAt = nowISO();
  return res.json({ success: true, vehicle });
});

module.exports = router;
