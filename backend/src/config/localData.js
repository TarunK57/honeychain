// Persistent development data for when the Supabase project is unavailable.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../.local-data.json');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { batches: [], scans: [], alerts: [], reports: [] };
  }
}

function writeStore(store) {
  const temporaryPath = `${storePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, storePath);
}

function addBatch(batch) {
  const store = readStore();
  const duplicate = store.batches.some(item => item.batch_id === batch.batch_id && item.admin_id === batch.admin_id);
  if (duplicate) return store.batches.find(item => item.batch_id === batch.batch_id && item.admin_id === batch.admin_id);
  const record = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...batch };
  store.batches.push(record);
  writeStore(store);
  return record;
}

function getBatches(adminId) {
  const batches = readStore().batches;
  return (adminId ? batches.filter(batch => batch.admin_id === adminId) : batches)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function removeBatch(batchId, adminId) {
  const store = readStore();
  store.batches = store.batches.filter(batch => !(batch.batch_id === batchId && batch.admin_id === adminId));
  writeStore(store);
}

function addScan(scan) {
  const store = readStore();
  const record = { id: crypto.randomUUID(), scanned_at: new Date().toISOString(), ...scan };
  store.scans.push(record);
  writeStore(store);
  return record;
}

function getScans({ userId, batchIds } = {}) {
  let scans = readStore().scans;
  if (userId) scans = scans.filter(scan => scan.user_id === userId);
  if (batchIds) scans = scans.filter(scan => batchIds.includes(scan.batch_address));
  return scans.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
}

function addAlert(alert) {
  const store = readStore();
  const record = {
    id: crypto.randomUUID(),
    detected_at: new Date().toISOString(),
    is_resolved: false,
    ...alert
  };
  store.alerts.push(record);
  writeStore(store);
  return record;
}

function getAlerts(batchIds) {
  let alerts = readStore().alerts;
  if (batchIds) alerts = alerts.filter(alert => batchIds.includes(alert.batch_id));
  return alerts.sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at));
}

function resolveAlert(id) {
  const store = readStore();
  const alert = store.alerts.find(item => item.id === id);
  if (!alert) return false;
  alert.is_resolved = true;
  writeStore(store);
  return true;
}

function addReport(report) {
  const store = readStore();
  const record = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...report };
  store.reports.push(record);
  writeStore(store);
  return record;
}

function getReports({ userId, batchAddress } = {}) {
  let reports = readStore().reports;
  if (userId) reports = reports.filter(report => report.user_id === userId);
  if (batchAddress) reports = reports.filter(report => report.batch_address === batchAddress);
  return reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function removeUserRecords(userId) {
  const store = readStore();
  const userBatches = store.batches.filter(batch => batch.admin_id === userId).map(batch => batch.batch_id);
  store.batches = store.batches.filter(batch => batch.admin_id !== userId);
  store.scans = store.scans.filter(scan => scan.user_id !== userId);
  store.reports = store.reports.filter(report => report.user_id !== userId);
  store.alerts = store.alerts.filter(alert => !userBatches.includes(alert.batch_id));
  writeStore(store);
}

module.exports = { addAlert, addBatch, addReport, addScan, getAlerts, getBatches, getReports, getScans, removeBatch, removeUserRecords, resolveAlert };
