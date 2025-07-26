PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  suspended TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  service_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE NO ACTION
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  description TEXT,
  run_script TEXT NOT NULL
);

CREATE TABLE project_access_levels (
  name TEXT PRIMARY KEY NOT NULL,
  access_level INTEGER NOT NULL
);

INSERT INTO project_access_levels (name, access_level) VALUES ('owner', 30);
INSERT INTO project_access_levels (name, access_level) VALUES ('member', 20);

CREATE TABLE process_access (
  project_id INTEGER,
  user_id INTEGER,
  access_level INTEGER,
  notes TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE NO ACTION,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,
  FOREIGN KEY (access_level) REFERENCES project_access_levels(name) ON DELETE NO ACTION
);

CREATE TABLE project_env_vars (
  project_id INTEGER,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE NO ACTION
);
