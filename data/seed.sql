-- initial seed data
INSERT INTO users (id, name, enabled_at) values (1, 'Pomax', CURRENT_TIMESTAMP);
INSERT INTO admin_table (user_id) VALUES (1);
INSERT INTO projects (name, description) VALUES ('temp', 'First project');
INSERT INTO project_access (project_id, user_id) VALUES (1, 1);
INSERT INTO project_container_settings (project_id, build_script, run_script, env_vars) VALUES (1, '', 'npm install && npm start', 'EXAMPLE_VAR=example value');
