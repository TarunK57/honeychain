const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');
const { batchNFTContract } = require('../config/blockchain');
const localData = require('../config/localData');

function isNetworkError(error) {
  return error instanceof TypeError || /fetch failed|ENOTFOUND|ECONN/i.test(error?.message || '');
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /scans
router.post('/', async (req, res) => {
  try {
    const { batchId, locationLat, locationLng, userId } = req.body;
    
    let result = 'authentic';
    let medicineName = 'Organic Honey Batch';
    let geminiSummary = '';

    try {
      const batch = await batchNFTContract.getBatch(batchId);
      medicineName = `${batch.floralSource || 'Organic'} Honey (Hive: ${batch.hiveId || 'N/A'})`;
      
      if (batch.status === 'revoked') {
        result = 'revoked';
      }
    } catch (err) {
      // If batch not found on blockchain
      result = 'flagged';
    }

    const scan = {
      user_id: userId || null,
      batch_address: batchId,
      location_lat: locationLat,
      location_lng: locationLng,
      result,
      medicine_name: medicineName,
      gemini_summary: geminiSummary
    };
    let scanId;
    try {
      const { data, error } = await supabase.from('scan_history').insert([scan]).select().single();
      if (error) throw error;
      scanId = data.id;
    } catch (error) {
      if (process.env.NODE_ENV === 'production' || !isNetworkError(error)) throw error;
      scanId = localData.addScan(scan).id;
    }

    res.json({ success: true, scanId, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /scans/history
router.get('/history', authenticateUser, async (req, res) => {
  try {
    if (req.profile?.local) return res.json({ scans: localData.getScans({ userId: req.userId }) });
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', req.userId)
      .order('scanned_at', { ascending: false });

    if (error) throw error;
    res.json({ scans: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /scans/duplicate-check/:batchId
router.get('/duplicate-check/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    let scans;
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('batch_address', batchId)
        .gt('scanned_at', oneHourAgo);
      if (error) throw error;
      scans = data;
    } catch (error) {
      if (process.env.NODE_ENV === 'production' || !isNetworkError(error)) throw error;
      scans = localData.getScans({ batchIds: [batchId] }).filter(scan => scan.scanned_at > oneHourAgo);
    }

    if (scans && scans.length > 1) {
      for (let i = 0; i < scans.length; i++) {
        for (let j = i + 1; j < scans.length; j++) {
          if (scans[i].location_lat && scans[j].location_lat) {
            const dist = getDistance(
              scans[i].location_lat, scans[i].location_lng,
              scans[j].location_lat, scans[j].location_lng
            );
            
            if (dist > 200) {
              const alertRow = {
                alert_type: 'duplicate_scan',
                batch_id: batchId,
                details: `Geographical anomaly: Duplicate scans for honey batch ${batchId} detected ${Math.round(dist)}km apart within 60 mins.`,
                severity: 'high'
              };
              let alert;
              try {
                const { data, error: alertError } = await supabase.from('admin_alerts').insert([alertRow]).select().single();
                if (alertError) throw alertError;
                alert = data;
              } catch (error) {
                if (process.env.NODE_ENV === 'production' || !isNetworkError(error)) throw error;
                alert = localData.addAlert(alertRow);
              }
              return res.json({ isDuplicate: true, alert });
            }
          }
        }
      }
    }

    res.json({ isDuplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
