import sqlite3 from "better-sqlite3";
const db = sqlite3(`${import.meta.dirname}/data.sqlite3`);

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
  find(where) {
    return this.findAll(where)[0];
  }
  findAll(where) {
    const { filter, values } = composeWhere(where);
    const sql = `SELECT * FROM ${this.table} WHERE ${filter}`;
    // console.log(sql, values);
    return db.prepare(sql).all(values).filter(Boolean);
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
const Auth = new Model(`auth`);
const Project = new Model(`projects`);
const AccessLevels = new Model(`project_access_levels`);
const Access = new Model(`project_access`);
const EnvVars = new Model(`project_env_vars`);

// Good enough, let's move on with our lives:
export { User, Auth, Project, AccessLevels, Access, EnvVars };

export function getProjectListForUser(userName) {
  const record = User.findOrCreate({ name: userName });
  if (record) {
    const { id: user_id } = record;
    const projects = Access.findAll({ user_id });
    return projects.map((p) => Project.find({ id: p.project_id }));
  }
}

export function createProjectForUser(userName, projectName) {
  const p = Project.create({ name: projectName });
  const u = User.find({ name: userName });
  const a = Access.create({ project_id: p.id, user_id: u.id });
}

export function deleteProjectForUser(userName, projectId) {
  const u = User.find({ name: userName });
  const p = Project.find({ id: projectId });
  const a = Access.find({ project_id: p.id, user_id: u.id });

  if (a.access_level !== `owner`) throw new Error(`Not yours, mate`);

  const { name } = p;

  console.log(`Deleting access rules for project ${name}...`);
  const rules = Access.findAll({ project_id: p.id });
  for (const r of rules) Access.delete(r);

  console.log(`Deleting project ${name}...`);
  Project.delete(p);

  console.log(`Deletion complete.`);
  return name;
}
