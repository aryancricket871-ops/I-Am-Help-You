CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','super_distributor','distributor','provider','customer')),
  password_hash TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  referred_by INTEGER REFERENCES users(id),
  referral_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role, created_at);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts ON login_attempts(username, at);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER, action TEXT NOT NULL, target TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'wrench',
  sort_order INTEGER DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES
 ('इलेक्ट्रीशियन','zap',1),('प्लंबर','droplets',2),('AC रिपेयर','wind',3),('घर की सफ़ाई','sparkles',4),
 ('बढ़ई','hammer',5),('पेंटर','paintbrush',6),('ब्यूटी व सैलून','scissors',7),('कीट नियंत्रण','bug',8),
 ('मोबाइल रिपेयर','smartphone',9),('उपकरण मरम्मत','settings',10),('ट्यूटर','graduation-cap',11),('ड्राइवर','car',12);

-- ===== Step 2: services, provider profiles =====
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(category_id, name)
);
CREATE INDEX IF NOT EXISTS idx_services_cat ON services(category_id);

CREATE TABLE IF NOT EXISTS provider_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id),
  shop_name TEXT,
  about TEXT,
  address TEXT,
  whatsapp TEXT,
  approval TEXT NOT NULL DEFAULT 'pending' CHECK (approval IN ('pending','approved','rejected')),
  premium_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pp_cat ON provider_profiles(category_id, approval);
