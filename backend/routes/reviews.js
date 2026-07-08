const express = require('express');
const auth = require('../middleware/auth');
const { getDB } = require('../db/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get reviews for a preset
router.get('/:presetId', async (req, res) => {
  const db = await getDB();
  const preset = db.data.presets.find(p => p.id === req.params.presetId);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });
  res.json(preset.reviews || []);
});

// Post a review
router.post('/:presetId', auth, async (req, res) => {
  const { rating, comment } = req.body;
  const userId = req.user.id;
  const db = await getDB();
  const preset = db.data.presets.find(p => p.id === req.params.presetId);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });

  const user = db.data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const review = {
    id: uuidv4(),
    userId,
    userName: user.name,
    rating: parseInt(rating),
    comment,
    createdAt: new Date().toISOString(),
    helpful: 0,
  };
  if (!preset.reviews) preset.reviews = [];
  preset.reviews.push(review);

  const total = preset.reviews.reduce((sum, r) => sum + r.rating, 0);
  preset.avgRating = total / preset.reviews.length;
  await db.write();
  res.status(201).json(review);
});

// Mark review as helpful
router.post('/:presetId/reviews/:reviewId/helpful', auth, async (req, res) => {
  const db = await getDB();
  const preset = db.data.presets.find(p => p.id === req.params.presetId);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });
  const review = preset.reviews.find(r => r.id === req.params.reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  review.helpful += 1;
  await db.write();
  res.json({ helpful: review.helpful });
});

module.exports = router;