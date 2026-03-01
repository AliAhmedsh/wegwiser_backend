const express = require('express');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

let nextProductId = 1;
let nextMemberId = 1;
let nextTaskId = 1;
let nextFileId = 1;
let nextVehicleId = 1;

const products = [];
const productPRDs = new Map();
const productTasks = new Map();
const proposedVehicles = new Map();

function nowISO() {
  return new Date().toISOString();
}

function buildDefaultOwner(ownerId = 1) {
  return {
    id: ownerId,
    name: 'Wegwiser User',
    email: 'user@wegwiser.local',
    role: 'product_manager',
  };
}

function ensureCounts(product) {
  const members = Array.isArray(product.members) ? product.members : [];
  const files = Array.isArray(product.files) ? product.files : [];
  const vehicles = Array.isArray(product.vehicles) ? product.vehicles : [];
  return {
    ...product,
    _count: {
      vehicles: vehicles.length,
      members: members.length,
      files: files.length,
    },
  };
}

function getProductById(id) {
  return products.find((product) => product.id === id);
}

function parseCreatePayload(req) {
  const rawData = req.body && typeof req.body.data === 'string' ? req.body.data : null;
  if (rawData) {
    try {
      return JSON.parse(rawData);
    } catch (error) {
      return null;
    }
  }
  return req.body || {};
}

function mapUploadedFiles(productId, files = []) {
  return files.map((file) => ({
    id: nextFileId++,
    productId,
    filename: file.originalname,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: nowISO(),
  }));
}

router.get('/test', (req, res) => {
  res.json({
    message: 'Product routes are working',
    status: 'success',
  });
});

router.get('/', (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Number.parseInt(req.query.limit, 10) || 20);
  const search = String(req.query.search || '').trim().toLowerCase();

  let filtered = [...products];
  if (search) {
    filtered = filtered.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();
      return name.includes(search) || description.includes(search);
    });
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit).map(ensureCounts);

  res.json({
    success: true,
    products: paginated,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

router.get('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const product = getProductById(id);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  res.json({
    success: true,
    product: ensureCounts(product),
  });
});

router.post('/', upload.array('files'), (req, res) => {
  const payload = parseCreatePayload(req);
  if (!payload) {
    return res.status(400).json({ success: false, error: 'Invalid payload in data field' });
  }

  const name = String(payload.name || '').trim();
  if (!name) {
    return res.status(400).json({ success: false, error: 'name is required' });
  }

  const ownerId = Number(payload.ownerId) || 1;
  const owner = buildDefaultOwner(ownerId);
  const createdAt = nowISO();
  const files = mapUploadedFiles(nextProductId, req.files || []);
  const members = [
    {
      id: nextMemberId++,
      productId: nextProductId,
      userId: ownerId,
      role: 'owner',
      user: owner,
    },
  ];

  if (Array.isArray(payload.teamMembers)) {
    payload.teamMembers.forEach((member) => {
      const email = String(member.email || '').trim();
      const memberName = String(member.name || '').trim() || email || 'Team Member';
      if (!email) {
        return;
      }
      const userId = nextMemberId + 1000;
      members.push({
        id: nextMemberId++,
        productId: nextProductId,
        userId,
        role: String(member.role || 'member'),
        user: {
          id: userId,
          name: memberName,
          email,
          role: String(member.role || 'member'),
        },
      });
    });
  }

  const product = {
    id: nextProductId++,
    name,
    description: String(payload.description || ''),
    materialLink: String(payload.materialLink || ''),
    ownerId,
    createdAt,
    updatedAt: createdAt,
    owner,
    members,
    files,
    vehicles: [],
  };

  products.unshift(product);

  return res.status(201).json({
    success: true,
    product: ensureCounts(product),
  });
});

router.put('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const product = getProductById(id);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const updates = req.body || {};
  product.name = updates.name !== undefined ? String(updates.name) : product.name;
  product.description = updates.description !== undefined ? String(updates.description) : product.description;
  product.materialLink = updates.materialLink !== undefined ? String(updates.materialLink) : product.materialLink;
  product.updatedAt = nowISO();

  return res.json({
    success: true,
    product: ensureCounts(product),
  });
});

router.delete('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  products.splice(index, 1);
  productPRDs.delete(id);
  productTasks.delete(id);
  proposedVehicles.delete(id);

  return res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});

router.get('/:productId/members', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  return res.json({
    success: true,
    members: product.members || [],
  });
});

router.post('/:productId/members', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const role = String(req.body.role || 'member');
  const name = String(req.body.name || '').trim() || 'Team Member';
  const email = String(req.body.email || '').trim();
  if (!email) {
    return res.status(400).json({ success: false, error: 'email is required' });
  }
  const userId = nextMemberId + 1000;
  const member = {
    id: nextMemberId++,
    productId,
    userId,
    role,
    user: {
      id: userId,
      name,
      email,
      role,
    },
  };

  product.members.push(member);
  product.updatedAt = nowISO();

  return res.status(201).json({
    success: true,
    message: 'Member added',
    member,
  });
});

router.delete('/:productId/members/:memberId', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const memberId = Number.parseInt(req.params.memberId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  product.members = (product.members || []).filter((member) => member.id !== memberId);
  product.updatedAt = nowISO();
  return res.json({
    success: true,
    message: 'Member removed',
  });
});

router.get('/:productId/analytics', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const analytics = {
    vehicleCount: product.vehicles.length,
    memberCount: product.members.length,
    fileCount: product.files.length,
    recentVehicles: product.vehicles.slice(0, 5),
  };
  return res.json({ success: true, analytics });
});

router.get('/:productId/prd', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  if (!getProductById(productId)) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  return res.json({
    success: true,
    prd: productPRDs.get(productId) || null,
  });
});

router.put('/:productId/prd', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const body = req.body || {};
  const existing = productPRDs.get(productId);
  const now = nowISO();
  const prd = {
    id: existing?.id || productId,
    productId,
    featureName: String(body.featureName || existing?.featureName || product.name),
    goal: String(body.goal || existing?.goal || ''),
    successMetrics: String(body.successMetrics || existing?.successMetrics || ''),
    dependencies: String(body.dependencies || existing?.dependencies || ''),
    updatedBy: Number(body.updatedBy || existing?.updatedBy || product.ownerId || 1),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  productPRDs.set(productId, prd);
  return res.json({
    success: true,
    prd,
  });
});

router.get('/:productId/tasks', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  if (!getProductById(productId)) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const tasks = productTasks.get(productId) || [];
  return res.json({
    success: true,
    tasks,
  });
});

router.post('/:productId/tasks', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  if (!getProductById(productId)) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const text = String(req.body.text || '').trim();
  if (!text) {
    return res.status(400).json({ success: false, error: 'text is required' });
  }
  const now = nowISO();
  const task = {
    id: nextTaskId++,
    productId,
    text,
    done: false,
    createdBy: Number(req.body.createdBy || 1),
    createdAt: now,
    updatedAt: now,
  };
  const tasks = productTasks.get(productId) || [];
  tasks.push(task);
  productTasks.set(productId, tasks);
  return res.status(201).json({
    success: true,
    task,
  });
});

router.patch('/:productId/tasks/:taskId', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const taskId = Number.parseInt(req.params.taskId, 10);
  const tasks = productTasks.get(productId) || [];
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  if (req.body.text !== undefined) {
    task.text = String(req.body.text);
  }
  if (req.body.done !== undefined) {
    task.done = Boolean(req.body.done);
  }
  task.updatedAt = nowISO();
  return res.json({
    success: true,
    task,
  });
});

router.delete('/:productId/tasks/:taskId', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const taskId = Number.parseInt(req.params.taskId, 10);
  const tasks = productTasks.get(productId) || [];
  const nextTasks = tasks.filter((item) => item.id !== taskId);
  productTasks.set(productId, nextTasks);
  return res.json({
    success: true,
    message: 'Task deleted',
  });
});

router.post('/:productId/refine-doc', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  return res.json({
    success: true,
    data: {
      summary: product.description || `Refined documentation for ${product.name}`,
    },
  });
});

router.post('/:productId/ask-description', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const generated = product.description || `${product.name} is a newly created product in Wegwiser.`;
  return res.json({
    success: true,
    data: {
      description: generated,
    },
  });
});

router.post('/:productId/propose-vehicle', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const options = [
    {
      id: 1,
      vehicle_name: `${product.name} - Core MVP`,
      description: 'Core implementation candidate generated from product context.',
    },
    {
      id: 2,
      vehicle_name: `${product.name} - Growth`,
      description: 'Growth-oriented vehicle candidate with extended capabilities.',
    },
  ];
  proposedVehicles.set(productId, options);
  return res.json({
    success: true,
    data: options,
  });
});

router.post('/:productId/proposed-vehicles/launch', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const candidateId = Number(req.body.proposedVehicleId);
  const candidates = proposedVehicles.get(productId) || [];
  const selected =
    candidates.find((item) => Number(item.id) === candidateId) || {
      id: candidateId || 1,
      vehicle_name: `${product.name} Vehicle`,
      description: '',
    };

  const vehicle = {
    id: nextVehicleId++,
    name: selected.vehicle_name,
    type: 'product_vehicle',
    members: [],
  };
  product.vehicles.push(vehicle);
  product.updatedAt = nowISO();

  return res.json({
    success: true,
    message: 'Proposed vehicle launched',
    vehicle,
  });
});

router.get('/:productId/extract-prd-text', (req, res) => {
  const productId = Number.parseInt(req.params.productId, 10);
  const product = getProductById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const firstFile = product.files[0];
  return res.json({
    success: true,
    text: product.description || `PRD text extraction placeholder for ${product.name}`,
    filename: firstFile?.originalName,
  });
});

module.exports = router;
