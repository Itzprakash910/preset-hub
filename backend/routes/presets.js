const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const uploadFields = require('../middleware/upload');
const { getDB } = require('../db/db');

const router = express.Router();

// GET /presets – with filters
router.get('/', async (req, res) => {
  const db = await getDB();
  let presets = db.data.presets || [];
  const { category, price, rating, sort, q } = req.query;

  if (q) {
    const lowerQ = q.toLowerCase();
    presets = presets.filter(p =>
      p.name.toLowerCase().includes(lowerQ) ||
      p.author.toLowerCase().includes(lowerQ) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(lowerQ))) ||
      p.description?.toLowerCase().includes(lowerQ)
    );
  }
  if (category) presets = presets.filter(p => p.category === category);
  if (price === 'free') presets = presets.filter(p => p.price === 0);
  if (price === 'paid') presets = presets.filter(p => p.price > 0);
  if (rating) presets = presets.filter(p => (p.avgRating || 0) >= parseFloat(rating));

  switch (sort) {
    case 'popular': presets.sort((a, b) => (b.downloads || 0) - (a.downloads || 0)); break;
    case 'rating': presets.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0)); break;
    case 'newest': default: presets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
  }
  res.json(presets);
});

// Smart search
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const db = await getDB();
  const presets = db.data.presets || [];
  const lowerQ = q.toLowerCase();

  const results = presets
    .map(p => {
      let score = 0;
      const nameLower = p.name.toLowerCase();
      const authorLower = p.author.toLowerCase();
      const tagsLower = p.tags?.map(t => t.toLowerCase()) || [];
      const descLower = p.description?.toLowerCase() || '';

      if (nameLower.includes(lowerQ)) score += 10;
      if (nameLower.startsWith(lowerQ)) score += 5;
      if (authorLower.includes(lowerQ)) score += 3;
      if (tagsLower.some(t => t.includes(lowerQ))) score += 2;
      if (descLower.includes(lowerQ)) score += 1;

      return { ...p, score };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(results);
});

// Upload with both file and preview image
router.post('/', auth, uploadFields, async (req, res) => {
  const { name, description, category, tags, price } = req.body;
  const userId = req.user.id;
  const db = await getDB();
  const user = db.data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const file = req.files?.file?.[0];
  const preview = req.files?.previewImage?.[0];

  const newPreset = {
    id: uuidv4(),
    name,
    description: description || '',
    category: category || 'General',
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    price: parseFloat(price) || 0,
    author: user.name,
    authorId: userId,
    createdAt: new Date().toISOString(),
    downloads: 0,
    avgRating: 0,
    reviews: [],
    fileUrl: file ? `/uploads/${file.filename}` : '',
    previewImage: preview ? `/uploads/previews/${preview.filename}` : '',
    status: 'approved',
  };
  db.data.presets.push(newPreset);
  await db.write();
  res.status(201).json(newPreset);
});

// Download (direct file)
router.post('/:id/download', auth, async (req, res) => {
  const db = await getDB();
  const preset = db.data.presets.find(p => p.id === req.params.id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });

  if (preset.price > 0 && preset.authorId !== req.user.id) {
    const hasPaid = db.data.orders?.some(
      o => o.presetId === preset.id && o.userId === req.user.id && o.status === 'paid'
    );
    if (!hasPaid) return res.status(403).json({ error: 'पहले इस प्रीसेट को खरीदें' });
  }

  preset.downloads = (preset.downloads || 0) + 1;
  if (!db.data.downloads) db.data.downloads = [];
  db.data.downloads.push({
    id: uuidv4(),
    userId: req.user.id,
    presetId: preset.id,
    downloadedAt: new Date().toISOString(),
  });
  await db.write();

  let filePath = null;
  if (preset.fileUrl) {
    filePath = path.join(__dirname, '..', preset.fileUrl);
  }
  if (filePath && fs.existsSync(filePath)) {
    return res.download(filePath, `${preset.name}.xmp`, (err) => {
      if (err) console.error('Download error:', err);
    });
  }
  res.setHeader('Content-Disposition', `attachment; filename="${preset.name}.xmp"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(`# Demo preset: ${preset.name}\n# Download from PresetHub`);
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  const db = await getDB();
  const index = db.data.presets.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Preset not found' });
  if (db.data.presets[index].authorId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  db.data.presets.splice(index, 1);
  await db.write();
  res.json({ success: true });
});

// Featured
router.post('/featured/download', auth, async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="featured-pack.zip"');
  res.setHeader('Content-Type', 'application/zip');
  res.send('Demo featured pack content');
});

module.exports = router;