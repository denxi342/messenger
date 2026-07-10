import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Explicitly force UTF-8 charset on every JSON response so Cyrillic is never misread
app.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

const server = createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

let db;

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accentColor: '#6b4cff',
  fontSize: 15,
  bubbleStyle: 'rounded',
  chatBackground: 'solid',
  notificationsEnabled: true,
  notificationVolume: 70,
  messagePreview: true,
  doNotDisturb: false,
  lastSeenVisibility: 'contacts',
  onlineStatus: true,
  readReceipts: true,
  twoFactor: false,
  loginAlerts: true,
  autoLock: 'never',
  autoDownload: 'wifi',
  cacheLimit: 512,
  cacheSize: 0,
  largeText: false,
  reduceMotion: false,
  highContrast: false,
  language: 'ru',
  spellcheck: true
};

function normalizeSettings(settings = {}) {
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function getUserSettings(userId) {
  const row = await db.get('SELECT settings_json FROM user_settings WHERE user_id = ?', [userId]);
  if (!row) return DEFAULT_SETTINGS;
  try {
    return normalizeSettings(JSON.parse(row.settings_json));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveUserSettings(userId, settings) {
  const merged = normalizeSettings(settings);
  await db.run(
    `INSERT INTO user_settings (user_id, settings_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = CURRENT_TIMESTAMP`,
    [userId, JSON.stringify(merged)]
  );
  return merged;
}

function getDeviceInfo(req) {
  const ua = req.headers['user-agent'] || 'Octave desktop';
  if (ua.includes('Electron')) return 'Windows desktop app';
  if (ua.includes('Windows')) return 'Windows browser';
  return ua.slice(0, 80);
}

async function createSession(userId, token, req) {
  await db.run(
    'INSERT INTO sessions (user_id, token, device_info, last_active) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [userId, token, getDeviceInfo(req)]
  );
}

async function initDB() {
  db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      bio TEXT DEFAULT '',
      avatar_base64 TEXT DEFAULT '',
      public_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT,
      device_info TEXT,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER,
      contact_id INTEGER,
      pinned BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id),
      FOREIGN KEY(contact_id) REFERENCES users(id),
      UNIQUE(owner_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER,
      blocked_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(blocker_id) REFERENCES users(id),
      FOREIGN KEY(blocked_id) REFERENCES users(id),
      UNIQUE(blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER,
      recipient_id INTEGER,
      text TEXT NOT NULL,
      time TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      is_e2ee BOOLEAN DEFAULT 0,
      reply_to_id INTEGER DEFAULT NULL,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(recipient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(message_id) REFERENCES messages(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(message_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      settings_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    req.token = token;
    db.run('UPDATE sessions SET last_active = CURRENT_TIMESTAMP WHERE token = ?', [token]).catch(() => {});
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- AUTH ENDPOINTS ---

app.post(['/register', '/api/register'], async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 3) {
    return res.status(400).json({ error: 'Никнейм минимум 3 символа' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Только латиница, цифры и _' });
  }
  try {
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: 'Никнейм уже занят' });
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)',
      [username, hash, username]
    );
    const token = jwt.sign({ userId: result.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
    await saveUserSettings(result.lastID, DEFAULT_SETTINGS);
    await createSession(result.lastID, token, req);
    res.json({ token, userId: result.lastID, username, displayName: username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(['/login', '/api/login'], async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(400).json({ error: 'Неверный никнейм или пароль' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Неверный никнейм или пароль' });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    await createSession(user.id, token, req);
    res.json({ token, userId: user.id, username: user.username, displayName: user.display_name || user.username });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- PROFILE ENDPOINTS ---

app.get(['/profile', '/api/profile'], auth, async (req, res) => {
  const user = await db.get(
    'SELECT id, username, display_name, bio, avatar_base64, created_at FROM users WHERE id = ?',
    [req.user.userId]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

async function broadcastProfileUpdate(userId) {
  try {
    const updatedUser = await db.get(
      'SELECT id, username, display_name, bio, avatar_base64 FROM users WHERE id = ?',
      [userId]
    );
    if (!updatedUser) return;
    const contactsOfUser = await db.all('SELECT owner_id FROM contacts WHERE contact_id = ?', [userId]);
    contactsOfUser.forEach(c => {
      io.to(`user_${c.owner_id}`).emit('contactProfileUpdated', updatedUser);
    });
  } catch (err) {
    console.error('Error broadcasting profile update:', err);
  }
}

app.patch(['/profile', '/api/profile'], auth, async (req, res) => {
  const { displayName, username, bio } = req.body;
  const nextUsername = String(username || '').trim();
  const nextDisplayName = String(displayName || '').trim();
  if (nextUsername && !/^[a-zA-Z0-9_]{3,24}$/.test(nextUsername)) {
    return res.status(400).json({ error: 'Username must be 3-24 letters, numbers, or underscores' });
  }
  if (nextUsername) {
    const existing = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [nextUsername, req.user.userId]);
    if (existing) return res.status(400).json({ error: 'Username is already taken' });
  }
  await db.run(
    'UPDATE users SET username = COALESCE(NULLIF(?, ""), username), display_name = ?, bio = ? WHERE id = ?',
    [nextUsername, nextDisplayName || nextUsername || '', String(bio || ''), req.user.userId]
  );
  await broadcastProfileUpdate(req.user.userId);
  const user = await db.get('SELECT id, username, display_name, bio, avatar_base64, created_at FROM users WHERE id = ?', [req.user.userId]);
  
  // Generate a new token and update the current session
  const newToken = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  await db.run('UPDATE sessions SET token = ? WHERE token = ?', [newToken, req.token]);
  
  res.json({ ...user, token: newToken });
});

app.post(['/profile/avatar', '/api/profile/avatar'], auth, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'No avatar provided' });
  await db.run('UPDATE users SET avatar_base64 = ? WHERE id = ?', [avatar, req.user.userId]);
  await broadcastProfileUpdate(req.user.userId);
  res.json({ success: true });
});

app.post(['/change-password', '/api/change-password'], auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Неверный текущий пароль' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.userId]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get contact profile — only if they are in my contacts
app.get(['/profile/:username', '/api/profile/:username'], auth, async (req, res) => {
  const target = await db.get('SELECT id, username, display_name, bio, avatar_base64 FROM users WHERE username = ?', [req.params.username]);
  if (!target) return res.status(404).json({ error: 'Not found' });

  const contact = await db.get(
    'SELECT id, created_at FROM contacts WHERE owner_id = ? AND contact_id = ?',
    [req.user.userId, target.id]
  );
  if (!contact) return res.status(403).json({ error: 'Not in contacts' });

  res.json({ ...target, added_at: contact.created_at });
});

// --- SETTINGS ENDPOINTS ---
app.get('/api/settings', auth, async (req, res) => {
  try {
    const settings = await getUserSettings(req.user.userId);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/settings', auth, async (req, res) => {
  try {
    const settings = await saveUserSettings(req.user.userId, req.body);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SESSIONS ENDPOINTS ---
app.get('/api/sessions', auth, async (req, res) => {
  try {
    const sessions = await db.all('SELECT id, device_info, last_active, token FROM sessions WHERE user_id = ?', [req.user.userId]);
    const mapped = sessions.map(s => ({
      id: s.id,
      device_info: s.device_info,
      last_active: s.last_active,
      is_current: s.token === req.token
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/sessions/:id', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM sessions WHERE user_id = ? AND id = ?', [req.user.userId, Number(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/sessions', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM sessions WHERE user_id = ? AND token != ?', [req.user.userId, req.token]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- BLOCKED USERS ENDPOINTS ---
app.get('/api/blocked', auth, async (req, res) => {
  try {
    const blocked = await db.all(`
      SELECT u.id, u.username, u.display_name, u.avatar_base64
      FROM blocked_users b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = ?
    `, [req.user.userId]);
    res.json(blocked);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/blocked/:userId', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [req.user.userId, Number(req.params.userId)]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- CONTACTS ENDPOINTS ---

app.get(['/search-contact', '/api/search-contact'], auth, async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json(null);

  // Try exact match first
  let user = await db.get('SELECT id, username, display_name, avatar_base64 FROM users WHERE username = ?', [username]);

  // Fallback to case-insensitive match if exact match fails
  if (!user) {
    user = await db.get('SELECT id, username, display_name, avatar_base64 FROM users WHERE LOWER(username) = LOWER(?)', [username]);
  }

  if (!user) return res.json(null);

  // Robust check to prevent adding oneself using DB user ID
  if (user.id === req.user.userId) {
    return res.status(400).json({ error: 'Нельзя добавить себя' });
  }

  res.json(user);
});


app.post(['/add-contact', '/api/add-contact'], auth, async (req, res) => {
  const { contactId } = req.body;
  try {
    await db.run('INSERT OR IGNORE INTO contacts (owner_id, contact_id) VALUES (?, ?)', [req.user.userId, contactId]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete(['/contacts/:contactId', '/api/contacts/:contactId'], auth, async (req, res) => {
  await db.run('DELETE FROM contacts WHERE owner_id = ? AND contact_id = ?', [req.user.userId, req.params.contactId]);
  res.json({ success: true });
});

app.get(['/my-contacts', '/api/my-contacts'], auth, async (req, res) => {
  try {
    const contacts = await db.all(`
      SELECT u.id, u.username, u.display_name, u.bio, u.avatar_base64, c.pinned
      FROM contacts c
      JOIN users u ON c.contact_id = u.id
      WHERE c.owner_id = ?
      ORDER BY c.pinned DESC, c.created_at ASC
    `, [req.user.userId]);

    // Attach last message for each contact
    for (const contact of contacts) {
      const lastMsg = await db.get(`
        SELECT text, time, sender_id FROM messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ORDER BY id DESC LIMIT 1
      `, [req.user.userId, contact.id, contact.id, req.user.userId]);
      if (lastMsg) {
        contact.last_message_text = lastMsg.text;
        contact.last_message_time = lastMsg.time;
        contact.last_message_sender_id = lastMsg.sender_id;
      }
    }

    // Sort: contacts with messages first (most recent), then contacts without
    contacts.sort((a, b) => {
      if (a.last_message_time && !b.last_message_time) return -1;
      if (!a.last_message_time && b.last_message_time) return 1;
      return 0;
    });

    res.json(contacts);
  } catch (err) {
    console.error('my-contacts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Block user
app.post(['/block/:userId', '/api/block/:userId'], auth, async (req, res) => {
  const blockedId = Number(req.params.userId);
  await db.run('INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)', [req.user.userId, blockedId]);
  await db.run('DELETE FROM contacts WHERE owner_id = ? AND contact_id = ?', [req.user.userId, blockedId]);
  res.json({ success: true });
});

// --- WEBSOCKET LOGIC ---

const onlineUsers = new Map(); // socket.id -> userId

function broadcastOnlineStatus() {
  io.emit('onlineUsers', Array.from(new Set(onlineUsers.values())));
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.userId;
  onlineUsers.set(socket.id, userId);
  socket.join(`user_${userId}`);
  broadcastOnlineStatus();

  // Typing indicator
  socket.on('typing', ({ recipientId, isTyping }) => {
    socket.to(`user_${Number(recipientId)}`).emit('typing', { userId, isTyping });
  });

  // Load message history with replies and reactions
  socket.on('getPrivateHistory', async (rawContactId) => {
    const contactId = Number(rawContactId);
    const messages = await db.all(`
      SELECT m.*, u.username as senderName,
        rm.text as reply_text, rm.sender_id as reply_sender_id
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      WHERE (m.sender_id = ? AND m.recipient_id = ?)
         OR (m.sender_id = ? AND m.recipient_id = ?)
      ORDER BY m.id ASC
    `, [userId, contactId, contactId, userId]);

    // Load reactions for all messages
    const msgIds = messages.map(m => m.id);
    if (msgIds.length > 0) {
      const placeholders = msgIds.map(() => '?').join(',');
      const allReactions = await db.all(
        `SELECT r.message_id, r.emoji, r.user_id, u.username FROM reactions r JOIN users u ON r.user_id = u.id WHERE r.message_id IN (${placeholders})`,
        msgIds
      );
      const reactionMap = {};
      allReactions.forEach(r => {
        if (!reactionMap[r.message_id]) reactionMap[r.message_id] = [];
        reactionMap[r.message_id].push(r);
      });
      messages.forEach(m => { m.reactions = reactionMap[m.id] || []; });
    } else {
      messages.forEach(m => { m.reactions = []; });
    }

    socket.emit('privateHistory', { contactId, messages });
  });

  // Send message with optional reply
  socket.on('sendPrivateMessage', async (msgData) => {
    const recipientId = Number(msgData.recipientId);
    const { text, time, isE2ee = false, replyToId = null } = msgData;
    if (!recipientId || !text) return;

    const result = await db.run(
      'INSERT INTO messages (sender_id, recipient_id, text, time, is_e2ee, reply_to_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, recipientId, text, time, isE2ee ? 1 : 0, replyToId]
    );

    const savedMsg = {
      id: result.lastID,
      sender_id: userId,
      recipient_id: recipientId,
      text, time,
      is_e2ee: isE2ee,
      reply_to_id: replyToId,
      senderName: socket.user.username,
      reactions: []
    };

    if (replyToId) {
      const original = await db.get('SELECT text, sender_id FROM messages WHERE id = ?', [replyToId]);
      if (original) {
        savedMsg.reply_text = original.text;
        savedMsg.reply_sender_id = original.sender_id;
      }
    }

    console.log(`[MSG] ${socket.user.username} -> user_${recipientId}: "${text}"`);
    socket.to(`user_${recipientId}`).emit('newPrivateMessage', savedMsg);
    socket.emit('newPrivateMessage', savedMsg);
  });

  // Reactions
  socket.on('addReaction', async ({ messageId, emoji }) => {
    try {
      await db.run('INSERT OR IGNORE INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)', [messageId, userId, emoji]);
      const reactions = await db.all(
        'SELECT r.emoji, r.user_id, u.username FROM reactions r JOIN users u ON r.user_id = u.id WHERE r.message_id = ?',
        [messageId]
      );
      const msg = await db.get('SELECT sender_id, recipient_id FROM messages WHERE id = ?', [messageId]);
      if (msg) {
        io.to(`user_${msg.sender_id}`).to(`user_${msg.recipient_id}`).emit('reactionsUpdated', { messageId, reactions });
      }
    } catch (err) { console.error('addReaction error:', err); }
  });

  socket.on('removeReaction', async ({ messageId, emoji }) => {
    try {
      await db.run('DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [messageId, userId, emoji]);
      const reactions = await db.all(
        'SELECT r.emoji, r.user_id, u.username FROM reactions r JOIN users u ON r.user_id = u.id WHERE r.message_id = ?',
        [messageId]
      );
      const msg = await db.get('SELECT sender_id, recipient_id FROM messages WHERE id = ?', [messageId]);
      if (msg) {
        io.to(`user_${msg.sender_id}`).to(`user_${msg.recipient_id}`).emit('reactionsUpdated', { messageId, reactions });
      }
    } catch (err) { console.error('removeReaction error:', err); }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    broadcastOnlineStatus();
  });
});

// --- HEALTH CHECK (public, no auth) — used by self-ping and external monitors ---
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// --- CATCH-ALL: ensure every unmatched route returns JSON, never HTML ---
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Express error handler — also returns JSON so the frontend never receives HTML
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

initDB().then(() => {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);

    // --- KEEP-ALIVE SELF-PING ---
    // Render free tier spins down after 15 min of inactivity.
    // We ping our own /health every 10 minutes so the dyno never sleeps.
    // Only runs when the RENDER environment variable is set (i.e. on Render, not locally).
    if (process.env.RENDER) {
      const SELF_URL = process.env.RENDER_EXTERNAL_URL
        ? `${process.env.RENDER_EXTERNAL_URL}/health`
        : `http://localhost:${PORT}/health`;

      const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

      setInterval(() => {
        fetch(SELF_URL)
          .then(r => console.log(`[keep-alive] ping OK — ${r.status}`))
          .catch(err => console.warn('[keep-alive] ping failed:', err.message));
      }, PING_INTERVAL_MS);

      console.log(`[keep-alive] Self-ping active → ${SELF_URL} every 10 min`);
    }
  });
}).catch(() => process.exit(1));


