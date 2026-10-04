const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');
const { hiveMonitorContract } = require('../config/blockchain');
const localData = require('../config/localData');

// POST /adr (Repurposed as Yield Anomaly / Fraud Flagging Endpoint)
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      batch_address,
      batch_id,
      claimed_yield,
      hive_id,
      details,
      reaction_description,
      severity,
    } = req.body;
    const userId = req.userId;

    const targetBatchAddress = batch_address || batch_id;
    const reportDetails = details || reaction_description || `Claimed yield mismatch report for batch ${targetBatchAddress}`;

    // Read IoT readings if available to check hive weight
    let isWeightInconsistent = false;
    try {
      if (targetBatchAddress) {
        const latestReading = await hiveMonitorContract.getLatestReading(targetBatchAddress);
        const iotWeight = Number(latestReading.weightKg || 0);
        const claimed = Number(claimed_yield || 0);
        
        // If claimed yield is significantly greater than recorded hive weight
        if (claimed > 0 && iotWeight > 0 && claimed > iotWeight * 2) {
          isWeightInconsistent = true;
        }
      }
    } catch (contractErr) {
      console.warn("Could not fetch IoT hive weight for comparison:", contractErr.message);
    }

    const reportSeverity = severity || (isWeightInconsistent ? 'severe' : 'moderate');

    const reportRow = {
      user_id: userId,
      batch_address: targetBatchAddress,
      medicine_name: hive_id ? `Hive ID: ${hive_id}` : 'Honey Yield Anomaly',
      reaction_description: `[Yield Anomaly Flag] ${reportDetails} ${isWeightInconsistent ? '(Claimed yield exceeds IoT hive weight)' : ''}`,
      severity: reportSeverity
    };

    if (req.profile?.local) {
      const report = localData.addReport(reportRow);
      const batchReports = localData.getReports({ batchAddress: targetBatchAddress });
      let clusterAlert = null;
      if ((batchReports.length >= 2 || isWeightInconsistent) && !localData.getAlerts().some(alert => alert.alert_type === 'yield_anomaly' && alert.batch_id === targetBatchAddress && !alert.is_resolved)) {
        clusterAlert = localData.addAlert({
          alert_type: 'yield_anomaly',
          batch_id: targetBatchAddress,
          details: `Yield anomaly for batch ${targetBatchAddress}: ${reportDetails}`,
          severity: 'critical'
        });
      }
      return res.json({ success: true, reportId: report.id, clusterAlert, isWeightInconsistent });
    }

    const { data: report, error } = await supabase
      .from('adr_reports')
      .insert([reportRow])
      .select()
      .single();

    if (error) throw error;

    // Check for cluster of reports for this batch
    const { count } = await supabase
      .from('adr_reports')
      .select('*', { count: 'exact', head: true })
      .eq('batch_address', targetBatchAddress);

    let clusterAlert = null;
    if (count >= 2 || isWeightInconsistent) {
      const { data: existingAlert } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('alert_type', 'yield_anomaly')
        .eq('batch_id', targetBatchAddress)
        .eq('is_resolved', false)
        .maybeSingle();

      if (!existingAlert) {
        const { data: alert } = await supabase
          .from('admin_alerts')
          .insert([{
            alert_type: 'yield_anomaly',
            batch_id: targetBatchAddress,
            details: `Yield Anomaly Flag: Claimed yield for batch ${targetBatchAddress} is inconsistent with IoT hive weight data (${reportDetails})`,
            severity: 'critical'
          }])
          .select()
          .single();
        clusterAlert = alert;
      }
    }

    res.json({ success: true, reportId: report.id, clusterAlert, isWeightInconsistent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /adr/batch/:batchAddress
router.get('/batch/:batchAddress', async (req, res) => {
  try {
    const { batchAddress } = req.params;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.slice(7);
      const localAuth = require('../config/localAuth');
      if (localAuth.getSessionUser(token)) return res.json({ reports: localData.getReports({ batchAddress }) });
    }
    const { data, error } = await supabase
      .from('adr_reports')
      .select('*')
      .eq('batch_address', batchAddress);
    
    if (error) throw error;
    res.json({ reports: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /adr/my-reports
router.get('/my-reports', authenticateUser, async (req, res) => {
  try {
    if (req.profile?.local) return res.json({ reports: localData.getReports({ userId: req.userId }) });
    const { data, error } = await supabase
      .from('adr_reports')
      .select('*')
      .eq('user_id', req.userId);
    
    if (error) throw error;
    res.json({ reports: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
