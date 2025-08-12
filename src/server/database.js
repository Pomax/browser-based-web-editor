import sqlite3 from "better-sqlite3";
import { existsSync, unlinkSync } from "node:fs";

// not quite a fan of this, so this solution may change in the future:

export const OWNER = 30; // full access, can delete projects
export const EDITOR = 20; // edit access, cannot delete projects, can edit project settings
export const MEMBER = 10; // edit access, cannot edit project settings

export const UNKNOWN_USER = -1;
export const NOT_ACTIVATED = -2;

// We're in ./src/server/routing, and we want ./data
const dbPath = `${import.meta.dirname}/../../data/data.sqlite3`;
const db = sqlite3(dbPath);

// we need those foreign keys...
db.pragma("foreign_keys = ON");

function composeWhere(where, suffix = []) {
  let filter = Object.entries(where)
    .map(([k, v]) => {
      if (v === null || v === undefined) {
        suffix.push(`${k} IS NULL`);
        return false;
      }
      return `${k} = ?`;
    })
    .filter(Boolean)
    .join(` AND `);
  if (suffix.length) filter += ` AND ${suffix.join(` AND `)}`;
  const values = Object.values(where).filter(Boolean);
  return { filter, values };
}

// Let's define a generic model class, because we're just making things work right now.
class Model {
  constructor(table) {
    this.table = table;
  }
  save(record, primaryKey = `id`) {
    const pval = record[primaryKey];
    delete record[primaryKey];
    const update = Object.keys(record)
      .map((k) => `${k} = ?`)
      .join(`, `);
    const values = Object.values(record);
    const sql = `UPDATE ${this.table} SET ${update} WHERE ${primaryKey} = ?`;
    // console.log(sql, values);
    db.prepare(sql).run(...values, pval);
  }
  find(where) {
    return this.findAll(where)[0];
  }
  findAll(where) {
    const { filter, values } = composeWhere(where);
    const sql = `SELECT * FROM ${this.table} WHERE ${filter}`;
    // console.log(sql, values);
    return db.prepare(sql).all(values).filter(Boolean);
  }
  all(sortKey, sortDir = `ASC`) {
    const sql = `SELECT * FROM ${this.table} ORDER BY ${sortKey} ${sortDir}`;
    return db.prepare(sql).all();
  }
  insert(colVals) {
    const keys = Object.keys(colVals);
    const values = Object.values(colVals);
    const sql = `INSERT INTO ${this.table} (${keys.join(`,`)}) VALUES (${keys.map((v) => `?`).join(`,`)})`;
    // console.log(sql, values);
    db.prepare(sql).run(...values);
  }
  findOrCreate(where = {}) {
    const row = this.find(where);
    if (row) return row;
    this.insert(where);
    return this.find(where);
  }
  create(where = {}) {
    const record = this.find(where);
    if (record) throw new Error(`record already exists`);
    this.insert(where);
    return this.find(where);
  }
  delete(where) {
    const { filter, values } = composeWhere(where);
    const sql = `DELETE FROM ${this.table} WHERE ${filter}`;
    // console.log(sql, values);
    return db.prepare(sql).run(values);
  }
}

// And then let's create some models!

const User = new Model(`users`);
const Project = new Model(`projects`);
const ProjectSettings = new Model(`project_container_settings`);
const Access = new Model(`project_access`);
const Admin = new Model(`admin_table`);
const UserSuspension = new Model(`suspended_users`);
const Login = new Model(`user_logins`);

// Good enough, let's move on with our lives:

export function processUserLogin(profile) {
  return __processUserLogin(profile);
}

let __processUserLogin = existsSync(`.finish-setup`)
  ? __processFirstTimeUserLogin
  : processUserLoginNormally;

function processUserLoginNormally(profile) {
  const { id, displayName, provider } = profile;
  const l = Login.find({ service: provider, service_id: id });
  if (l) {
    const u = User.find({ id: l.user_id });
    if (!u) {
      // This shouldn't be possible, so...
      throw new Error(`User not found`);
    }
    const a = Admin.find({ user_id: u.id });
    return { ...u, admin: a ? true : undefined };
  }

  // No login binding: new user or username conflict?
  const u = User.find({ name: displayName });
  if (!u) {
    const u = User.create({ name: displayName });
    Login.create({ user_id: u.id, service: provider, service_id: id });
    return u;
  }

  throw new Error(`User ${displayName} already exists`);
}

// One-time function that only exists for as long as .finish-setup does
function __processFirstTimeUserLogin(profile) {
  __processUserLogin = processUserLoginNormally;
  const { id, displayName, provider } = profile;
  const u = User.create({ name: displayName });
  Login.create({ user_id: u.id, service: provider, service_id: id });
  Admin.create({ user_id: u.id });
  u.enabled_at = u.created_at;
  User.save(u);
  unlinkSync(`.finish-setup`);
  return u;
}

export function enableUser(userName) {
  const u = User.find({ name: userName });
  if (!u) throw new Error(`User not found`);
  u.enabled_at = new Date().toISOString();
  User.save(u);
}

export function disableUser(userName) {
  const u = User.find({ name: userName });
  if (!u) throw new Error(`User not found`);
  u.enabled_at = null;
  User.save(u);
}

export function suspendUser(userName, reason, notes = ``) {
  if (!reason) throw new Error(`Cannot suspend without a reason`);
  const u = User.find({ name: userName });
  if (!u) throw new Error(`User not found`);
  UserSuspension.create({ user_id: u.id, reason, notes });
}

export function unsuspendUser(userName) {
  const u = User.find({ name: userName });
  if (!u) throw new Error(`User not found`);
  const s = UserSuspension.find({ user_id: u.id });
  if (!s) throw new Error(`User not suspended`);
  s.invalidated_at = new Date().toISOString();
  UserSuspension.save(s);
}

export function getProjectListForUser(userName) {
  const record = User.findOrCreate({ name: userName });
  if (record) {
    const { id: user_id } = record;
    const projects = Access.findAll({ user_id });
    return projects.map((p) => Project.find({ id: p.project_id }));
  }
}

export function createProjectForUser(userName, projectName) {
  const u = User.find({ name: userName });
  const p = Project.create({ name: projectName });
  Access.create({ project_id: p.id, user_id: u.id });
  ProjectSettings.create({ project_id: p.id });
}

export function getAccessFor(userName, projectName) {
  if (!userName) return UNKNOWN_USER;
  const u = User.find({ name: userName });
  if (!u.enabled_at) return NOT_ACTIVATED;
  const p = Project.find({ name: projectName });
  const a = Access.find({ project_id: p.id, user_id: u.id });
  return a ? a.access_level : UNKNOWN_USER;
}

export function deleteProjectForUser(userName, projectName) {
  const u = User.find({ name: userName });
  const p = Project.find({ name: projectName });
  const a = Access.find({ project_id: p.id, user_id: u.id });

  // secondary layer of protection:
  if (a.access_level < OWNER) throw new Error(`Not yours, mate`);

  const { name } = p;

  console.log(`Deleting access rules for project ${name}...`);
  const rules = Access.findAll({ project_id: p.id });
  for (const r of rules) Access.delete(r);

  console.log(`Deleting project ${name}...`);
  Project.delete(p);

  console.log(`Deletion complete.`);
  return name;
}

export function loadSettingsForProject(projectId) {
  const p = Project.find({ id: projectId });
  const s = ProjectSettings.find({ project_id: p.id });
  if (!s) return false;
  const { name, description } = p;
  const { build_script, run_script, env_vars } = s;
  return {
    name,
    description,
    build_script,
    run_script,
    env_vars,
  };
}

export function updateSettingsForProject(projectId, settings) {
  console.log(projectId, settings);

  const p = Project.find({ id: projectId });
  const s = ProjectSettings.find({ project_id: p.id });

  const { name, description } = settings;

  if (p.name !== name) {
    if (!name.trim()) throw new Error(`Invalid project name`);
    p.name = name;
  }

  p.description = description;
  Project.save(p);

  const { build_script, run_script, env_vars } = settings;

  // TODO: make this "update if changed" because each
  //       results in needing to do some Docker work...
  s.build_script = build_script;
  s.run_script = run_script;
  s.env_vars = env_vars;
  ProjectSettings.save(s, `project_id`);
}

export function getNameForProjectId(projectId) {
  const p = Project.find({ id: projectId });
  if (!p) throw new Error("Project not found");
  return p.name;
}

export function getIdForProjectName(projectName) {
  const p = Project.find({ name: projectName });
  if (!p) throw new Error("Project not found");
  return p.id;
}

export function getUserId(userName) {
  const u = User.find({ name: userName });
  if (!u) throw new Error(`User not found`);
  return u.id;
}

export function getUserAdminFlag(userName) {
  const u = User.find({ name: userName });
  if (!u) throw new Error(`User not found`);
  const a = Admin.find({ user_id: u.id });
  if (!a) return false;
  return true;
}

export function hasAccessToUserRecords(sessionUserId, lookupUserId) {
  if (sessionUserId === lookupUserId) return true;
  const u = User.find({ id: sessionUserId });
  if (!u) throw new Error(`User not found`);
  const a = Admin.find({ user_id: u.id });
  if (!a) return false;
  return true;
}

export function getUserSettings(userId) {
  const u = User.find({ id: userId });
  if (!u) throw new Error(`User not found`);
  const s = UserSuspension.find({ user_id: u.id });
  return {
    name: u.name,
    enabled: u.enabled_at ? true : undefined,
    suspended: s ? true : undefined,
  };
}

export function getAllUsers() {
  return User.all(`name`);
}

export function getAllProjects() {
  return Project.all(`name`);
}
