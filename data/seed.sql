-- initial seed data

INSERT INTO users (name, enabled_at) values ('Pomax', CURRENT_TIMESTAMP);
INSERT INTO projects (name, description) VALUES ('lame', 'Superellipse testing sketch');
INSERT INTO project_access (project_id, user_id) VALUES (1, 1);
