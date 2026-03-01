const express = require('express');

const router = express.Router();

let nextConversationId = 1;
let nextMessageId = 1;
const conversations = [];
const messagesByConversation = new Map();

const defaultUsers = [
  { id: 1, name: 'Wegwiser User', email: 'user@wegwiser.local', role: 'product_manager' },
  { id: 2, name: 'Design User', email: 'designer@wegwiser.local', role: 'designer' },
];

function ensureConversation(conversationId) {
  const numericId = Number(conversationId);
  const conversation = conversations.find((item) => item.id === numericId);
  if (!conversation) {
    return null;
  }
  if (!messagesByConversation.has(numericId)) {
    messagesByConversation.set(numericId, []);
  }
  return conversation;
}

router.get('/current-user', (req, res) => {
  return res.json({ success: true, user: defaultUsers[0] });
});

router.get('/users', (req, res) => {
  return res.json({ success: true, users: defaultUsers });
});

router.get('/conversations', (req, res) => {
  return res.json({ success: true, conversations });
});

router.post('/conversations', (req, res) => {
  const conversation = {
    id: nextConversationId++,
    title: String(req.body.title || 'New Conversation'),
    members: Array.isArray(req.body.memberIds) ? req.body.memberIds : [1],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  conversations.unshift(conversation);
  messagesByConversation.set(conversation.id, []);
  return res.status(201).json({ success: true, conversation });
});

router.get('/conversations/:conversationId/messages', (req, res) => {
  const conversation = ensureConversation(req.params.conversationId);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  return res.json({
    success: true,
    messages: messagesByConversation.get(conversation.id) || [],
  });
});

router.post('/conversations/:conversationId/messages', (req, res) => {
  const conversation = ensureConversation(req.params.conversationId);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  const message = {
    id: nextMessageId++,
    conversationId: conversation.id,
    content: String(req.body.content || req.body.message || ''),
    senderId: Number(req.body.senderId || 1),
    createdAt: new Date().toISOString(),
  };
  messagesByConversation.get(conversation.id).push(message);
  conversation.updatedAt = new Date().toISOString();
  return res.status(201).json({ success: true, message });
});

router.post('/conversations/:conversationId/members', (req, res) => {
  const conversation = ensureConversation(req.params.conversationId);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  const incoming = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
  conversation.members = Array.from(new Set([...(conversation.members || []), ...incoming]));
  return res.json({ success: true, conversation });
});

router.post('/conversations/:conversationId/mark-read', (req, res) => {
  const conversation = ensureConversation(req.params.conversationId);
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found' });
  }
  return res.json({ success: true, conversationId: conversation.id });
});

router.get('/unread-counts', (req, res) => {
  return res.json({
    success: true,
    total: 0,
    byConversation: {},
  });
});

module.exports = router;
