const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');
const authenticateUser = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const localData = require('../config/localData');
const localAuth = require('../config/localAuth');
const localHandoffs = require('../config/localHandoffs');

async function restoreLocalMintHistory(user, profile, batchNFTContract) {
  const filter = batchNFTContract.filters.BatchMinted();
  const events = await batchNFTContract.queryFilter(filter, 0, 'latest');
  const userPrefix = `${user.id.slice(0, 8)}_`;
  for (const event of events) {
    const onChainId = event.args.batchId;
    if (!onChainId.startsWith(userPrefix)) continue;
    localData.addBatch({
      batch_id: onChainId.slice(userPrefix.length),
      on_chain_id: onChainId,
      admin_id: user.id,
      tx_hash: event.transactionHash,
      company_name: profile.company_name || 'KVIC Collection Center'
    });
  }
  return localData.getBatches(user.id);
}

router.use(authenticateUser);
router.use(adminOnly);

router.get('/alerts', async (req, res) => {
  try {
    if (req.profile?.local) return res.json({ alerts: localData.getAlerts() });
    const { data, error } = await supabase.from('admin_alerts').select('*').order('detected_at', { ascending: false });
    if (error) throw error;
    res.json({ alerts: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    if (req.profile?.local) {
      localData.resolveAlert(req.params.id);
      return res.json({ success: true });
    }
    const { error } = await supabase.from('admin_alerts').update({ is_resolved: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/batches', async (req, res) => {
  try {
    const { batchNFTContract } = require('../config/blockchain');
    let ownedBatches;
    if (req.profile?.local) {
      ownedBatches = localData.getBatches(req.user.id);
      // Rebuild local history from the local chain after earlier mints that
      // happened before the file-backed development store was added.
      try {
        ownedBatches = await restoreLocalMintHistory(req.user, req.profile, batchNFTContract);
      } catch (chainError) {
        console.warn('Could not restore local batch history from chain:', chainError.message);
      }
    } else {
      const { data, error: dbError } = await supabase.from('batches').select('batch_id, on_chain_id, tx_hash, created_at').eq('admin_id', req.user.id);
      if (dbError) throw dbError;
      ownedBatches = data;
    }
    if (!ownedBatches || ownedBatches.length === 0) return res.json({ batches: [] });
    const batches = await Promise.all(ownedBatches.map(async (record) => {
      try {
        const lookupId = record.on_chain_id || record.batch_id;
        const b = await batchNFTContract.getBatch(lookupId);
        let scanCount;
        let qrData;
        if (req.profile?.local) {
          scanCount = localData.getScans({ batchIds: [record.batch_id] }).length;
          qrData = localHandoffs.getAssignments(record.batch_id);
        } else {
          ({ count: scanCount } = await supabase.from('scan_history').select('*', { count: 'exact', head: true }).eq('batch_address', record.batch_id));
          ({ data: qrData } = await supabase.from('driver_qr_assignments').select('handoff_stage, qr_token, is_used, created_at').eq('batch_address', record.batch_id));
        }
        return {
          batchId: record.batch_id,
          onChainId: lookupId,
          beekeeperId: b.beekeeperId || b[1] || 'BEE-KVI-01',
          hiveId: b.hiveId || b[2] || 'HIVE-101',
          harvestDate: (b.harvestDate || b[3] || Math.floor(Date.now() / 1000)).toString(),
          gpsLocation: b.gpsLocation || b[4] || 'GPS-Location',
          floralSource: b.floralSource || b[5] || 'Organic Honey',
          quantityKg: (b.quantityKg || b[6] || 50).toString(),
          status: b.status || b[7] || 'active',
          isRevoked: b.status === 'revoked',
          scanCount: scanCount || 0,
          supplyChainQRs: qrData || [],
          txHash: record.tx_hash,
          mintedAt: record.created_at,
          // Compatibility fields
          drugName: `${b.floralSource || 'Organic'} Honey`,
          activeIngredient: `Beekeeper: ${b.beekeeperId}`,
          dosage: `Hive: ${b.hiveId}`,
          manufacturer: b.companyName || 'KVIC Collection Center',
          cdscoCertificate: b.gpsLocation,
          manufacturingDate: (b.harvestDate || b[3] || Math.floor(Date.now() / 1000)).toString(),
          expiryDate: ((Number(b.harvestDate || b[3] || Math.floor(Date.now() / 1000)) + 365 * 24 * 3600)).toString()
        };
      } catch (err) { return null; }
    }));
    res.json({ batches: batches.filter(b => b !== null) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    if (req.profile?.local) {
      const profiles = localAuth.listProfiles();
      let batches = localData.getBatches(req.user.id);
      try {
        const { batchNFTContract } = require('../config/blockchain');
        batches = await restoreLocalMintHistory(req.user, req.profile, batchNFTContract);
      } catch (chainError) {
        console.warn('Could not restore local dashboard stats from chain:', chainError.message);
      }
      return res.json({
        scans: localData.getScans().length,
        users: profiles.length,
        alerts: localData.getAlerts().length,
        reports: localData.getReports().length,
        batches: batches.length
      });
    }
    const getCount = async (table) => {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) return 0;
        return count || 0;
      } catch (e) { return 0; }
    };
    const stats = {
      scans: await getCount('scan_history'),
      users: await getCount('profiles'),
      alerts: await getCount('admin_alerts'),
      reports: await getCount('adr_reports')
    };
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/companies', async (req, res) => {
  try {
    if (req.profile?.local) {
      const grouped = {};
      localAuth.listProfiles().filter(profile => profile.role === 'admin' && profile.company_name).forEach(profile => {
        grouped[profile.company_name] = grouped[profile.company_name] || { company_name: profile.company_name, admin_count: 0 };
        grouped[profile.company_name].admin_count += 1;
      });
      return res.json({ companies: Object.values(grouped) });
    }
    const { data, error } = await supabaseAdmin.from('profiles').select('company_name, email, created_at').eq('role', 'admin').not('company_name', 'is', null);
    if (error) throw error;
    const companies = {};
    data.forEach(p => {
      if (!companies[p.company_name]) companies[p.company_name] = { company_name: p.company_name, admin_count: 0 };
      companies[p.company_name].admin_count++;
    });
    res.json({ companies: Object.values(companies) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/global-stats', async (req, res) => {
  try {
    if (req.profile?.local) {
      const profiles = localAuth.listProfiles();
      return res.json({
        totalScans: localData.getScans().length,
        totalAdmins: profiles.filter(profile => profile.role === 'admin').length,
        totalBatches: localData.getBatches().length,
        totalAlerts: localData.getAlerts().length,
        networkIntegrity: 'Local development data'
      });
    }
    const [{ count: totalScans }, { count: totalAdmins }, { count: totalBatches }, { count: totalAlerts }] = await Promise.all([
      supabase.from('scan_history').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('batches').select('*', { count: 'exact', head: true }),
      supabase.from('admin_alerts').select('*', { count: 'exact', head: true })
    ]);
    res.json({ totalScans: totalScans || 0, totalAdmins: totalAdmins || 0, totalBatches: totalBatches || 0, totalAlerts: totalAlerts || 0, networkIntegrity: '99.9%' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/all-admins', async (req, res) => {
  try {
    if (req.profile?.local) {
      return res.json({ admins: localAuth.listProfiles().filter(profile => profile.role === 'admin') });
    }
    const { data, error } = await supabaseAdmin.from('profiles').select('id, email, full_name, company_name, role, created_at').eq('role', 'admin').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ admins: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/delete-account/:userId', async (req, res) => {
  try {
    if (req.profile?.local) {
      localAuth.deleteUser(req.params.userId);
      localData.removeUserRecords(req.params.userId);
      return res.json({ success: true });
    }
    await supabase.from('profiles').delete().eq('id', req.params.userId);
    await supabase.auth.admin.deleteUser(req.params.userId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/scans', async (req, res) => {
  try {
    if (req.profile?.local) return res.json({ scans: localData.getScans() });
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .order('scanned_at', { ascending: false });
    if (error) throw error;
    res.json({ scans: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/activity', async (req, res) => {
  try {
    if (req.profile?.local) {
      let ownedBatches = localData.getBatches(req.user.id);
      try {
        const { batchNFTContract } = require('../config/blockchain');
        ownedBatches = await restoreLocalMintHistory(req.user, req.profile, batchNFTContract);
      } catch (chainError) {
        console.warn('Could not restore local activity history from chain:', chainError.message);
      }
      const batchIds = ownedBatches.map(batch => batch.batch_id);
      const scans = localData.getScans({ batchIds });
      const handoffs = batchIds.flatMap(id => localHandoffs.getAssignments(id)).filter(handoff => handoff.is_used);
      const alerts = localData.getAlerts(batchIds);
      const reports = localData.getReports();
      const activity = [
        ...ownedBatches.map(batch => ({
          id: `mint-${batch.batch_id}`,
          type: 'BATCH_MINTED',
          message: `Honey Batch ${batch.batch_id} minted on local blockchain`,
          timestamp: batch.created_at,
          batchId: batch.batch_id
        })),
        ...scans.map(scan => ({
          id: `scan-${scan.id}`,
          type: 'HONEY_VERIFIED',
          message: `Honey ${scan.medicine_name || scan.batch_address} verified. Result: ${scan.result}`,
          timestamp: scan.scanned_at,
          batchId: scan.batch_address,
          result: scan.result
        })),
        ...handoffs.map(handoff => ({
          id: `handoff-${handoff.qr_token}`,
          type: 'HANDOFF_LOGGED',
          message: `Supply chain handoff logged for stage: ${handoff.handoff_stage} of batch ${handoff.batch_address}`,
          timestamp: handoff.used_at || handoff.created_at,
          batchId: handoff.batch_address,
          stage: handoff.handoff_stage
        })),
        ...alerts.map(alert => ({
          id: `alert-${alert.id}`,
          type: 'ALERT_TRIGGERED',
          message: `Hive anomaly alert (${alert.alert_type}): ${alert.details}`,
          timestamp: alert.detected_at,
          batchId: alert.batch_id,
          severity: alert.severity
        })),
        ...reports.map(report => ({
          id: `report-${report.id}`,
          type: 'ADR_REPORTED',
          message: `Yield anomaly reported for batch ${report.batch_address}: ${report.reaction_description}`,
          timestamp: report.created_at,
          batchId: report.batch_address,
          severity: report.severity
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return res.json({ activity: activity.slice(0, 30) });
    }
    const { data: ownedBatches, error: dbError } = await supabase
      .from('batches')
      .select('batch_id, company_name, created_at')
      .eq('admin_id', req.user.id);
      
    if (dbError) throw dbError;
    if (!ownedBatches || ownedBatches.length === 0) {
      return res.json({ activity: [] });
    }

    const batchIds = ownedBatches.map(b => b.batch_id);

    const [scansRes, handoffsRes, alertsRes] = await Promise.all([
      supabase.from('scan_history').select('*').in('batch_address', batchIds),
      supabase.from('driver_qr_assignments').select('*').in('batch_address', batchIds).eq('is_used', true),
      supabase.from('admin_alerts').select('*').in('batch_id', batchIds)
    ]);

    const activity = [];

    ownedBatches.forEach(b => {
      activity.push({
        id: `mint-${b.batch_id}`,
        type: 'BATCH_MINTED',
        message: `Honey Batch ${b.batch_id} minted on Polygon Amoy blockchain`,
        timestamp: b.created_at,
        batchId: b.batch_id
      });
    });

    if (scansRes.data) {
      scansRes.data.forEach(s => {
        activity.push({
          id: `scan-${s.id}`,
          type: 'HONEY_VERIFIED',
          message: `Honey ${s.medicine_name || s.batch_address} verified. Result: ${s.result}`,
          timestamp: s.scanned_at,
          batchId: s.batch_address,
          result: s.result
        });
      });
    }

    if (handoffsRes.data) {
      handoffsRes.data.forEach(h => {
        activity.push({
          id: `handoff-${h.qr_token}`,
          type: 'HANDOFF_LOGGED',
          message: `Supply chain handoff logged for stage: ${h.handoff_stage} of batch ${h.batch_address}`,
          timestamp: h.used_at || h.created_at,
          batchId: h.batch_address,
          stage: h.handoff_stage
        });
      });
    }

    if (alertsRes.data) {
      alertsRes.data.forEach(a => {
        activity.push({
          id: `alert-${a.id}`,
          type: 'ALERT_TRIGGERED',
          message: `Hive Anomaly Alert (${a.alert_type}): ${a.details}`,
          timestamp: a.detected_at,
          batchId: a.batch_id,
          severity: a.severity
        });
      });
    }

    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ activity: activity.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
