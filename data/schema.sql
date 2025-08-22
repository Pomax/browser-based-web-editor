-- make sure foreign constraints are enforced:

PRAGMA foreign_keys = ON;

-- users

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  enabled_at TEXT
);

CREATE UNIQUE INDEX user_names ON users(name);

CREATE TABLE admin_table (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- oauth links so we can look up users based on their passport object

CREATE TABLE user_logins (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  service_id TEXT NO NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX login_services ON user_logins(service, service_id);

-- user suspension

CREATE TABLE suspended_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  suspended_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  notes TEXT,
  invalidated_at TEXT DEFAULT NULL
);

CREATE INDEX suspended_user_names ON suspended_users(user_id);

-- projects

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX project_names ON projects(name);

-- project settings

CREATE TABLE project_container_settings (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  default_file TEXT,
  default_collapse TEXT,
  run_script TEXT,
  env_vars TEXT
);

CREATE UNIQUE INDEX container_ids ON project_container_settings(project_id);

-- project suspension

CREATE TABLE suspended_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  suspended_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  notes TEXT,
  invalidated_at TEXT DEFAULT NULL
);

CREATE INDEX suspended_project_names ON suspended_projects(project_id);

-- project access

CREATE TABLE project_access_levels (
  access_level INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE project_access (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE NO ACTION,
  access_level INTEGER NOT NULL DEFAULT 30 REFERENCES project_access_levels(access_level) ON DELETE NO ACTION,
  notes TEXT
);

CREATE INDEX access_users ON project_access(user_id);

-- default data

INSERT INTO project_access_levels (access_level, name) VALUES (30, 'owner');
INSERT INTO project_access_levels (access_level, name) VALUES (25, 'editor');
INSERT INTO project_access_levels (access_level, name) VALUES (20, 'member');
INSERT INTO project_access_levels (access_level, name) VALUES (10, 'viewer');
