const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const db = await getDB();
  const existing = db.data.users.find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    email,
    password: hashed,
    name,
    role: 'user',
    createdAt: new Date().toISOString(),
    verified: false,
    bio: '',
    avatar: '',
    wishlist: [],
  };
  db.data.users.push(newUser);
  await db.write();

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email, role: newUser.role }
  });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDB();
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email, role: user.role }
  });
});

module.exports = router;