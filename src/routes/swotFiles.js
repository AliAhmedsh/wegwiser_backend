const express = require('express');

const router = express.Router();

let nextFileId = 1;
let nextCommentId = 1;
const filesByProduct = new Map();
const commentsByFile = new Map();

function nowISO() {
  return new Date().toISOString();
}

function getProductFiles(productId) {
  if (!filesByProduct.has(productId)) {
    filesByProduct.set(productId, []);
  }
  return filesByProduct.get(productId);
}

function findFile(fileId) {
  for (const [, files] of filesByProduct.entries()) {
    const file = files.find((item) => item.id === fileId);
    if (file) {
      return file;
    }
  }
  return null;
}

router.post('/', (req, res) => {
  const productId = Number(req.body.productId || req.body.product_id);
  if (!productId) {
    return res.status(400).json({ success: false, error: 'productId is required' });
  }

  const file = {
    id: nextFileId++,
    productId,
    name: String(req.body.name || req.body.filename || `PRD-${productId}.md`),
    type: String(req.body.type || 'prd'),
    content: String(req.body.content || ''),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  getProductFiles(productId).unshift(file);
  return res.status(201).json({
    success: true,
    file,
  });
});

router.get('/product/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  return res.json({
    success: true,
    files: getProductFiles(productId),
  });
});

router.get('/product/:productId/files/:fileId', (req, res) => {
  const productId = Number(req.params.productId);
  const fileId = Number(req.params.fileId);
  const file = getProductFiles(productId).find((item) => item.id === fileId);

  if (!file) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  return res.json({
    success: true,
    file,
  });
});

router.put('/:fileId', (req, res) => {
  const fileId = Number(req.params.fileId);
  const file = findFile(fileId);
  if (!file) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  if (req.body.name !== undefined) {
    file.name = String(req.body.name);
  }
  if (req.body.content !== undefined) {
    file.content = String(req.body.content);
  }
  if (req.body.type !== undefined) {
    file.type = String(req.body.type);
  }
  file.updatedAt = nowISO();

  return res.json({
    success: true,
    file,
  });
});

router.delete('/:fileId', (req, res) => {
  const fileId = Number(req.params.fileId);
  for (const [productId, files] of filesByProduct.entries()) {
    const index = files.findIndex((item) => item.id === fileId);
    if (index !== -1) {
      files.splice(index, 1);
      filesByProduct.set(productId, files);
      commentsByFile.delete(fileId);
      return res.json({
        success: true,
        message: 'File deleted',
      });
    }
  }
  return res.status(404).json({ success: false, error: 'File not found' });
});

router.get('/product/:productId/files/:fileId/comments', (req, res) => {
  const fileId = Number(req.params.fileId);
  return res.json({
    success: true,
    comments: commentsByFile.get(fileId) || [],
  });
});

router.post('/product/:productId/files/:fileId/comments', (req, res) => {
  const fileId = Number(req.params.fileId);
  const comment = {
    id: nextCommentId++,
    fileId,
    text: String(req.body.text || req.body.comment || ''),
    author: String(req.body.author || 'Wegwiser User'),
    createdAt: nowISO(),
  };

  if (!commentsByFile.has(fileId)) {
    commentsByFile.set(fileId, []);
  }
  commentsByFile.get(fileId).push(comment);

  return res.status(201).json({
    success: true,
    comment,
  });
});

module.exports = router;
