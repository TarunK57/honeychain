const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../.local-handoffs.json');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { assignments: [] };
  }
}

function writeStore(store) {
  const temporaryPath = `${storePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, storePath);
}

function insertAssignments(assignments) {
  const store = readStore();
  const existingTokens = new Set(store.assignments.map(item => item.qr_token));
  for (const assignment of assignments) {
    if (existingTokens.has(assignment.qr_token)) throw new Error('QR token already exists.');
    store.assignments.push({ ...assignment, created_at: new Date().toISOString(), used_at: null });
  }
  writeStore(store);
}

function getAssignment(token) {
  return readStore().assignments.find(item => item.qr_token === token) || null;
}

function markUsed(token) {
  const store = readStore();
  const assignment = store.assignments.find(item => item.qr_token === token);
  if (!assignment) return false;
  assignment.is_used = true;
  assignment.used_at = new Date().toISOString();
  writeStore(store);
  return true;
}

function getAssignments(batchAddress) {
  return readStore().assignments.filter(item => item.batch_address === batchAddress);
}

module.exports = { getAssignment, getAssignments, insertAssignments, markUsed };
