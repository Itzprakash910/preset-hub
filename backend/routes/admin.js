const express = require('express');
const auth = require('../middleware/auth');
const { getDB } = require('../db/db');

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
  const db = await getDB();
  const users = db.data.users.map(({ password, ...rest }) => rest);
  res.json(users);
});

// Approve/reject preset
router.put('/presets/:id/status', auth, isAdmin, async (req, res) => {
  const { status } = req.body;
  const db = await getDB();
  const preset = db.data.presets.find(p => p.id === req.params.id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });
  preset.status = status;
  await db.write();
  res.json(preset);
});

// Platform analytics
router.get('/analytics', auth, isAdmin, async (req, res) => {
  const db = await getDB();
  const totalUsers = db.data.users.length;
  const totalPresets = db.data.presets.length;
  const totalDownloads = db.data.presets.reduce((sum, p) => sum + (p.downloads || 0), 0);
  const totalRevenue = db.data.orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
  res.json({ totalUsers, totalPresets, totalDownloads, totalRevenue });
});

module.exports = router;