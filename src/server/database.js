import sqlite3 from "better-sqlite3";
import { existsSync, unlinkSync, rmSync } from "node:fs";
import { stopContainer } from "../docker/docker-helpers.js";
import { CONTENT_DIR } from "./helpers.js";

const DEBUG_SQL = false;

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
  const values = Object.values(where).filter(
    (v) => !(v === undefined || v === null)
  );
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
    if (DEBUG_SQL) console.log(`UPDATE`, sql, values);
    db.prepare(sql).run(...values, pval);
  }
  find(where) {
    return this.findAll(where)[0];
  }
  findAll(where) {
    const { filter, values } = composeWhere(where);
    const sql = `SELECT * FROM ${this.table} WHERE ${filter}`;
    if (DEBUG_SQL) console.log(`FIND`, sql, values);
    return db.prepare(sql).all(values).filter(Boolean);
  }
  all(sortKey, sortDir = `ASC`) {
    let sql = `SELECT * FROM ${this.table}`;
    if (sortKey) {
      sql = `${sql} ORDER BY ${sortKey} ${sortDir}`;
    }
    return db.prepare(sql).all();
  }
  insert(colVals) {
    const keys = Object.keys(colVals);
    const values = Object.values(colVals);
    const sql = `INSERT INTO ${this.table} (${keys.join(`,`)}) VALUES (${keys.map((v) => `?`).join(`,`)})`;
    if (DEBUG_SQL) console.log(`INSERT`, sql, values);
    db.prepare(sql).run(...values);
  }
  findOrCreate(where = {}) {
    const row = this.find(where);
    if (row) return row;
    this.insert(where);
    return this.find(where);
  }
  create(where = {}) {
    if (DEBUG_SQL) console.log(`CREATE with`, where);
    const record = this.find(where);
    if (record) throw new Error(`record already exists`);
    this.insert(where);
    return this.find(where);
  }
  delete(where) {
    const { filter, values } = composeWhere(where);
    const sql = `DELETE FROM ${this.table} WHERE ${filter}`;
    if (DEBUG_SQL) console.log(`DELETE`, sql, values);
    return db.prepare(sql).run(values);
  }
}

// And then let's create some models!

const User = new Model(`users`);
const Project = new Model(`projects`);
const StarterProject = new Model(`starter_projects`);
const Remix = new Model(`remix`);
const ProjectSettings = new Model(`project_container_settings`);
const Access = new Model(`project_access`);
const Admin = new Model(`admin_table`);
const UserSuspension = new Model(`suspended_users`);
const ProjectSuspension = new Model(`suspended_projects`);
const Login = new Model(`user_logins`);

// Good enough, let's move on with our lives:

export function processUserLogin(userObject) {
  return __processUserLogin(userObject);
}

let __processUserLogin = existsSync(`.finish-setup`)
  ? __processFirstTimeUserLogin
  : processUserLoginNormally;

function processUserLoginNormally(userObject) {
  const { userName, service, service_id } = userObject;
  const l = Login.find({ service, service_id });
  if (l) {
    const u = User.find({ id: l.user_id });
    if (!u) {
      // This shouldn't be possible, so...
      throw new Error(`User not found`);
    }
    const s = getUserSuspensions(u.id);
    if (s.length) {
      throw new Error(
        `This user account has been suspended (${s.map((s) => `"${s.reason}"`).join(`, `)})`
      );
    }
    const a = Admin.find({ user_id: u.id });
    return { ...u, admin: a ? true : undefined };
  }

  // No login binding: new user or username conflict?
  const u = User.find({ name: userName });
  if (!u) {
    const u = User.create({ name: userName });
    Login.create({ user_id: u.id, service, service_id });
    return u;
  }

  throw new Error(`User ${userName} already exists`);
}

// One-time function that only exists for as long as .finish-setup does
function __processFirstTimeUserLogin(userObject) {
  __processUserLogin = processUserLoginNormally;
  const { userName, service, service_id } = userObject;
  const u = User.create({ name: userName });
  Login.create({ user_id: u.id, service, service_id });
  Admin.create({ user_id: u.id });
  u.enabled_at = u.created_at;
  User.save(u);
  unlinkSync(`.finish-setup`);
  return u;
}

export function getUser(userNameOrId) {
  let u;
  if (typeof userNameOrId === `number`) {
    u = User.find({ id: userNameOrId });
  } else {
    u = User.find({ name: userNameOrId });
  }
  if (!u) throw new Error(`User not found`);
  return u;
}

export function enableUser(userNameOrId) {
  const u = getUser(userNameOrId);
  u.enabled_at = new Date().toISOString();
  User.save(u);
  return u;
}

export function disableUser(userNameOrId) {
  const u = getUser(userNameOrId);
  u.enabled_at = null;
  User.save(u);
  return u;
}

export function deleteUser(userId) {
  const u = getUser(userId);
  console.log(`deleting user ${u.name} with id ${u.id}`);
  const access = Access.findAll({ user_id: u.id });
  Access.delete({ user_id: u.id });
  access.forEach(({ project_id }) => {
    const p = Project.find({ id: project_id });
    if (p && Access.findAll({ project_id }).length === 0) {
      Project.delete(p);
      const projectDir = join(CONTENT_DIR, p.name);
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
  User.delete(u);
  // ON DELETE CASCADE should have taken care of everything else...
}

export function suspendUser(userNameOrId, reason, notes = ``) {
  if (!reason) throw new Error(`Cannot suspend user without a reason`);
  const u = getUser(userNameOrId);
  try {
    UserSuspension.create({ user_id: u.id, reason, notes });
    const projects = getOwnedProjectsForUser(u.id);
    projects.forEach((p) => stopContainer(p.name));
  } catch (e) {
    console.error(e);
    console.log(u, reason, notes);
  }
}

export function getUserSuspensions(userNameOrId, includeOld = false) {
  let user_id = userNameOrId;
  if (typeof userNameOrId !== `number`) {
    const u = User.find({ name: userNameOrId });
    user_id = u.id;
  }
  const s = UserSuspension.findAll({ user_id });
  if (includeOld) return s;
  return s.filter((s) => !s.invalidated_at);
}

export function unsuspendUser(suspensionId) {
  const s = UserSuspension.find({ id: suspensionId });
  if (!s) throw new Error(`Suspension not found`);
  s.invalidated_at = new Date().toISOString();
  UserSuspension.save(s);
}

export function getProjectListForUser(userNameOrId) {
  const u = getUser(userNameOrId);
  const projects = Access.findAll({ user_id: u.id });
  return projects.map((p) => Project.find({ id: p.project_id }));
}

export function getStarterProjects() {
  // Would a JOIN be faster? Probably. Are we running at a
  // scale where that matters? Hopefully never =)
  return StarterProject.all().map((s) => Project.find({ id: s.project_id }));
}

export function getOwnedProjectsForUser(userNameOrId) {
  const u = getUser(userNameOrId);
  const access = Access.findAll({ user_id: u.id });
  return access
    .filter((a) => a.access_level === OWNER)
    .map((a) => getProject(a.project_id));
}

export function createProjectForUser(userName, projectName) {
  const u = User.find({ name: userName });
  const p = Project.create({ name: projectName });
  Access.create({ project_id: p.id, user_id: u.id });
  ProjectSettings.create({ project_id: p.id });
  return { user: u, project: p };
}

export function recordProjectRemix(originalId, projectId) {
  Remix.create({ original_id: originalId, project_id: projectId });
}

export function copyProjectSettings(originalId, projectId) {
  // Copy over the project description
  let source = getProject(originalId);
  let target = getProject(projectId);
  target.description = source.description;
  Project.save(target);
  // And create a new project settings entry
  source = ProjectSettings.find({ project_id: originalId });
  target = ProjectSettings.find({ project_id: projectId });
  target.run_script = source.run_script;
  target.default_file = source.default_file;
  target.default_collapse = source.default_collapse;
  ProjectSettings.save(target, `project_id`);
  return target;
}

export function getAccessFor(userName, projectName) {
  if (!userName) return UNKNOWN_USER;
  const u = User.find({ name: userName });
  if (!u.enabled_at) return NOT_ACTIVATED;
  const p = Project.find({ name: projectName });
  const a = Access.find({ project_id: p.id, user_id: u.id });
  return a ? a.access_level : UNKNOWN_USER;
}

export function deleteProjectForUser(userName, projectName, adminCall) {
  const u = User.find({ name: userName });
  const p = Project.find({ name: projectName });
  const a = Access.find({ project_id: p.id, user_id: u.id });

  // secondary layer of protection:
  if (a.access_level < OWNER && !adminCall) throw new Error(`Not yours, mate`);

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
  const { project_id, ...settings } = s;
  return {
    name,
    description,
    ...settings,
  };
}

export function updateSettingsForProject(projectId, settings) {
  const { name, description, ...containerSettings } = settings;

  const p = Project.find({ id: projectId });
  if (p.name !== name) {
    if (!name.trim()) throw new Error(`Invalid project name`);
    p.name = name;
  }
  p.description = description;
  Project.save(p);

  const s = ProjectSettings.find({ project_id: projectId });
  Object.entries(containerSettings).forEach(([key, value]) => {
    s[key] = value;
  });
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
  const userList = {};

  const users = User.all(`name`);
  users.forEach((u) => {
    if (!u) return;
    u.suspensions = [];
    userList[u.id] = u;
  });

  const admins = Admin.all();
  admins.forEach((a) => {
    if (!a) return;
    userList[a.user_id].admin = true;
  });

  const suspensions = UserSuspension.all(`user_id`);
  suspensions.forEach((s) => {
    if (!s) return;
    userList[s.user_id].suspensions.push(s);
    if (!s.invalidated_at) {
      userList[s.user_id].activeSuspensions = true;
    }
  });

  return Object.values(userList);
}

export function getAllProjects(omitStarters = true) {
  const projectList = {};

  const projects = Project.all(`name`);
  projects.forEach((p) => {
    if (!p) return;
    if (omitStarters && isStarterProject(p.id)) return;
    p.suspensions = [];
    projectList[p.id] = p;
  });

  const suspensions = ProjectSuspension.all(`project_id`);
  suspensions.forEach((s) => {
    if (!s) return;
    projectList[s.project_id].suspensions.push(s);
    if (!s.invalidated_at) {
      projectList[s.project_id].activeSuspensions = true;
    }
  });

  return Object.values(projectList);
}

export function getProject(projectNameOrId) {
  let p;
  if (typeof projectNameOrId === `number`) {
    p = Project.find({ id: projectNameOrId });
  } else {
    p = Project.find({ name: projectNameOrId });
  }
  if (!p) throw new Error(`Project not found`);
  return p;
}

export function isStarterProject(id) {
  return !!StarterProject.find({ project_id: id });
}

export function deleteProject(projectId) {
  const p = getProject(projectId);
  console.log(`deleting project ${p.name} with id ${p.id}`);
  Access.delete({ project_id: p.id });
  Project.delete(p);
  // ON DELETE CASCADE should have taken care of everything else...
}

export function suspendProject(projectNameOrId, reason, notes = ``) {
  if (!reason) throw new Error(`Cannot suspend project without a reason`);
  const p = getProject(projectNameOrId);
  try {
    stopContainer(p.name);
    ProjectSuspension.create({ project_id: p.id, reason, notes });
  } catch (e) {
    console.error(e);
    console.log(u, reason, notes);
  }
}

export function getProjectSuspensions(projectNameOrId, includeOld = false) {
  let project_id = projectNameOrId;
  if (typeof projectNameOrId !== `number`) {
    const p = Project.find({ name: projectNameOrId });
    project_id = p.id;
  }
  const s = ProjectSuspension.findAll({ project_id });
  if (includeOld) return s;
  return s.filter((s) => !s.invalidated_at);
}

export function projectSuspendedThroughOwner(projectNameOrId) {
  const p = getProject(projectNameOrId);
  const access = Access.findAll({ project_id: p.id });
  return access.some((a) => {
    if (a.access_level < OWNER) return false;
    const u = getUser(a.user_id);
    const s = getUserSuspensions(u.id);
    if (s.length) return true;
    return false;
  });
}

export function unsuspendProject(suspensionId) {
  const s = ProjectSuspension.find({ id: suspensionId });
  if (!s) throw new Error(`Suspension not found`);
  s.invalidated_at = new Date().toISOString();
  ProjectSuspension.save(s);
}
