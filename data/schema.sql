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

-- user suspension

CREATE TABLE suspended_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT REFERENCES users(name) ON DELETE NO ACTION,
  suspended_at TEXT,
  reason TEXT,
  notes TEXT
);

CREATE UNIQUE INDEX suspended_user_names ON suspended_users(name);

-- projects

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  bootstrap TEXT,
  run TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX project_names ON projects(name);

-- project suspension

CREATE TABLE suspended_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT REFERENCES projects(name) ON DELETE NO ACTION,
  suspended_at TEXT,
  reason TEXT,
  notes TEXT
);

CREATE UNIQUE INDEX suspended_project_names ON suspended_projects(name);

-- project access

CREATE TABLE project_access_levels (
  name TEXT PRIMARY KEY NOT NULL,
  access_level INTEGER NOT NULL
);

CREATE TABLE project_access (
  project_id INTEGER REFERENCES projects(id) ON DELETE NO ACTION,
  user_id INTEGER REFERENCES users(id) ON DELETE NO ACTION,
  access_level TEXT DEFAULT 'owner' REFERENCES project_access_levels(name) ON DELETE NO ACTION,
  notes TEXT
);

CREATE INDEX access_users ON project_access(user_id);

-- project environment variables

CREATE TABLE project_env_vars (
  project_id INTEGER REFERENCES projects(id) ON DELETE NO ACTION,
  key TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX env_vars ON project_env_vars(project_id);

-- default data

INSERT INTO project_access_levels (name, access_level) VALUES ('owner', 30);
INSERT INTO project_access_levels (name, access_level) VALUES ('member', 20);

-- initial seed data

INSERT INTO users (name, enabled_at) values ('Pomax', CURRENT_TIMESTAMP);
INSERT INTO projects (name, description) VALUES ('lame', 'superellipse testing sketch');
INSERT INTO project_access (project_id, user_id) VALUES (1, 1);
