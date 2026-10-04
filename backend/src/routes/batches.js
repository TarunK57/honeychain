const express = require('express');
const router = express.Router();
const { batchNFTContract, handoffContract, hiveMonitorContract, signer } = require('../config/blockchain');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('../config/supabase');
const localData = require('../config/localData');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

const authenticateUser = require('../middleware/auth');

function isNetworkError(error) {
  return error instanceof TypeError || /fetch failed|ENOTFOUND|ECONN/i.test(error?.message || '');
}

// POST /batches/mint
router.post('/mint', authenticateUser, async (req, res) => {
  try {
    const { 
      batchId, beekeeperId, hiveId, harvestDate, 
      gpsLocation, floralSource, quantityKg,
      companyName,
      // Backward compatibility aliases
      medicineName, activeIngredient, dosage, manufacturer, cdscoCertificate, manufacturingDate
    } = req.body;

    const finalBeekeeperId = beekeeperId || activeIngredient || 'BEE-KVI-01';
    const finalHiveId = hiveId || dosage || 'HIVE-101';
    const finalHarvestDate = harvestDate || manufacturingDate || Math.floor(Date.now() / 1000);
    const finalGpsLocation = gpsLocation || cdscoCertificate || 'GPS-28.6139,77.2090';
    const finalFloralSource = floralSource || medicineName || 'Mustard Honey';
    const finalQuantityKg = quantityKg ? Number(quantityKg) : 50;

    const onChainBatchId = req.user.id.slice(0, 8) + '_' + batchId;

    const contractWithSigner = batchNFTContract.connect(signer);
    const tx = await contractWithSigner.mintBatch(
      onChainBatchId, 
      finalBeekeeperId, 
      finalHiveId, 
      finalHarvestDate, 
      finalGpsLocation, 
      finalFloralSource, 
      finalQuantityKg
    );

    await tx.wait();

    // Store batch ownership in Supabase
    const batchRecord = {
      batch_id: batchId,
      on_chain_id: onChainBatchId,
      admin_id: req.user.id,
      tx_hash: tx.hash,
      company_name: companyName || manufacturer || 'KVIC Collection Center'
    };
    try {
      const { error: dbError } = await supabase.from('batches').insert(batchRecord);
      if (dbError) throw dbError;
    } catch (dbError) {
      const networkError = dbError instanceof TypeError || /fetch failed|ENOTFOUND|ECONN/i.test(dbError.message || '');
      if (req.profile?.local && process.env.NODE_ENV !== 'production' && networkError) {
        localData.addBatch(batchRecord);
      } else {
        console.error('Batch history save failed:', dbError.message);
      }
    }

    res.json({ success: true, txHash: tx.hash, batchId, onChainBatchId, companyName: companyName || manufacturer || 'KVIC Collection Center' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batchId
router.get('/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const companyName = req.query.company;

    // Check if this batch has a unique on-chain ID
    let query = supabase.from('batches').select('on_chain_id, company_name');
    if (companyName) {
      query = query.eq('batch_id', batchId).eq('company_name', companyName);
    } else {
      query = query.eq('batch_id', batchId);
    }
    
    let batchRecord;
    try {
      const { data, error } = await query.single();
      if (error && isNetworkError(error)) throw error;
      batchRecord = data;
    } catch (error) {
      if (process.env.NODE_ENV === 'production' || !isNetworkError(error)) throw error;
      const localMatches = localData.getBatches().filter(record => record.batch_id === batchId);
      batchRecord = localMatches.find(record => record.company_name === companyName)
        // Locally minted IDs are often unique even when the label displays a
        // friendly collection-center name instead of the account's company name.
        || (localMatches.length === 1 ? localMatches[0] : null);
    }
    const lookupId = batchRecord?.on_chain_id || batchId;

    // Read from contracts
    const batchData = await batchNFTContract.getBatch(lookupId);
    const handoffs = await handoffContract.getHandoffs(lookupId);
    const isBreached = await hiveMonitorContract.isBreached(lookupId);

    // Convert ethers Result to a plain object
    const batch = {
      batchId: batchData.batchId,
      beekeeperId: batchData.beekeeperId || batchData[1],
      hiveId: batchData.hiveId || batchData[2],
      harvestDate: (batchData.harvestDate || batchData[3]).toString(),
      gpsLocation: batchData.gpsLocation || batchData[4],
      floralSource: batchData.floralSource || batchData[5] || 'Wildflower Honey',
      quantityKg: (batchData.quantityKg || batchData[6] || 50).toString(),
      status: batchData.status || batchData[7] || 'active',
      mintedBy: batchData.mintedBy || batchData[8],
      companyName: batchRecord?.company_name || 'KVIC Collection Center',
      // Backward compatibility aliases
      medicineName: `${batchData.floralSource || 'Pure Organic'} Honey`,
      drugName: `${batchData.floralSource || 'Pure Organic'} Honey`,
      activeIngredient: `Beekeeper ID: ${batchData.beekeeperId}`,
      dosage: `Hive ID: ${batchData.hiveId}`,
      manufacturer: batchRecord?.company_name || 'KVIC Collection Center',
      cdscoCertificate: batchData.gpsLocation,
      manufacturingDate: (batchData.harvestDate || batchData[3]).toString(),
      expiryDate: ((Number(batchData.harvestDate || batchData[3]) + 365 * 24 * 3600)).toString()
    };

    // Call Gemini API for honey purity & adulteration assessment
    let geminiSummary = "Honey purity & origin analysis unavailable at this time.";
    try {
      const { data: cached } = await supabase
        .from('scan_history')
        .select('gemini_summary')
        .eq('batch_address', batchId)
        .not('gemini_summary', 'is', null)
        .limit(1)
        .single();

      if (cached?.gemini_summary) {
        geminiSummary = cached.gemini_summary;
      } else {
        const prompt = `In exactly one sentence, describe the floral purity, expected organoleptic profile, and potential adulteration markers (e.g. C4 sugars/syrup blending) for ${batch.floralSource} harvested from hive ${batch.hiveId} by rural beekeeper ${batch.beekeeperId}.`;
        const result = await model.generateContent(prompt);
        geminiSummary = result.response.text().trim();
      }
    } catch (geminiErr) {
      console.error("Gemini API Error:", geminiErr.message);
    }

    res.json({ 
      batch, 
      handoffs: handoffs.map(h => ({
        batchId: h.batchId,
        fromEntity: h.fromEntity,
        toEntity: h.toEntity,
        fromName: h.fromName,
        toName: h.toName,
        qrToken: h.qrToken,
        timestamp: h.timestamp.toString(),
        locationLat: h.locationLat.toString(),
        locationLng: h.locationLng.toString()
      })), 
      isBreached, 
      geminiSummary 
    });
  } catch (err) {
    if (err.message?.includes('Batch not found') || 
        err.message?.includes('execution reverted')) {
      res.status(404).json({ error: 'Honey Batch not found. Please check the Batch ID and Collection Center.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /batches/:batchId/revoke
router.post('/:batchId/revoke', async (req, res) => {
  try {
    const { batchId } = req.params;

    let batchRecord;
    try {
      const { data, error } = await supabase.from('batches').select('on_chain_id').eq('batch_id', batchId).single();
      if (error && isNetworkError(error)) throw error;
      batchRecord = data;
    } catch (error) {
      if (process.env.NODE_ENV === 'production' || !isNetworkError(error)) throw error;
      batchRecord = localData.getBatches().find(record => record.batch_id === batchId) || null;
    }
    
    const lookupId = batchRecord?.on_chain_id || batchId;

    const contractWithSigner = batchNFTContract.connect(signer);
    const tx = await contractWithSigner.revokeBatch(lookupId);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /batches/:batchId
router.delete('/:batchId', authenticateUser, async (req, res) => {
  try {
    const { batchId } = req.params;
    if (req.profile?.local) {
      localData.removeBatch(batchId, req.user.id);
      return res.json({ success: true });
    }
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('batch_id', batchId)
      .eq('admin_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batchId/handoffs
router.get('/:batchId/handoffs', async (req, res) => {
  try {
    const { batchId } = req.params;
    const handoffs = await handoffContract.getHandoffs(batchId);
    res.json({ 
      handoffs: handoffs.map(h => ({
        batchId: h.batchId,
        fromEntity: h.fromEntity,
        toEntity: h.toEntity,
        fromName: h.fromName,
        toName: h.toName,
        qrToken: h.qrToken,
        timestamp: h.timestamp.toString(),
        locationLat: h.locationLat.toString(),
        locationLng: h.locationLng.toString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batchId/hive-data & /batches/:batchId/temperature
const getHiveDataHandler = async (req, res) => {
  try {
    const { batchId } = req.params;
    const readings = await hiveMonitorContract.getReadings(batchId);
    const isBreached = await hiveMonitorContract.isBreached(batchId);
    res.json({ 
      readings: readings.map(r => ({
        batchId: r.batchId,
        temperature: r.temperature.toString(),
        humidity: (r.humidity || 0).toString(),
        weightKg: (r.weightKg || 0).toString(),
        acousticHealthScore: (r.acousticHealthScore || 100).toString(),
        location: r.location,
        sensorId: r.sensorId,
        timestamp: r.timestamp.toString(),
        isAnomaly: r.isAnomaly
      })), 
      isBreached 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/:batchId/hive-data', getHiveDataHandler);
router.get('/:batchId/temperature', getHiveDataHandler);

// POST /batches/:batchId/hive-data & /batches/:batchId/temperature
const postHiveDataHandler = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { temperature = 35, humidity = 60, weightKg = 25, acousticHealthScore = 95, location, sensorId, isAnomaly } = req.body;

    const contractWithSigner = hiveMonitorContract.connect(signer);
    const tx = await contractWithSigner.logHiveData(
      batchId,
      temperature,
      humidity,
      weightKg,
      acousticHealthScore,
      location || 'Hive Location',
      sensorId || 'SENSOR-IOT-01',
      isAnomaly || false
    );

    await tx.wait();

    // If isAnomaly is true, create a record in Supabase admin_alerts table
    if (isAnomaly) {
      const { error: supabaseError } = await supabase
        .from('admin_alerts')
        .insert([
          { 
            batch_id: batchId, 
            alert_type: 'Hive Environmental Anomaly', 
            details: `Hive sensor ${sensorId} detected temp ${temperature}°C, humidity ${humidity}%, weight ${weightKg}kg, acoustic score ${acousticHealthScore}/100 at ${location}`,
            severity: 'critical'
          }
        ]);
      
      if (supabaseError) {
        console.error("Supabase Admin Alert Error:", supabaseError.message);
      }
    }

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/:batchId/hive-data', postHiveDataHandler);
router.post('/:batchId/temperature', postHiveDataHandler);

// GET /batches/search/:searchQuery
router.get('/search/:searchQuery', async (req, res) => {
  try {
    const { searchQuery } = req.params;
    let uniqueAddresses;
    try {
      const { data: scans, error } = await supabase
        .from('scan_history')
        .select('batch_address, medicine_name')
        .ilike('medicine_name', `%${searchQuery}%`);
      if (error) throw error;
      uniqueAddresses = [...new Set(scans.map(s => s.batch_address))];
    } catch (error) {
      const networkError = error instanceof TypeError || /fetch failed|ENOTFOUND|ECONN/i.test(error?.message || '');
      if (process.env.NODE_ENV === 'production' || !networkError) throw error;
      const term = searchQuery.toLowerCase();
      uniqueAddresses = [...new Set([
        ...localData.getScans().filter(scan => (scan.medicine_name || '').toLowerCase().includes(term)).map(scan => scan.batch_address),
        ...localData.getBatches().filter(batch => (batch.batch_id || '').toLowerCase().includes(term) || (batch.floral_source || '').toLowerCase().includes(term)).map(batch => batch.on_chain_id || batch.batch_id)
      ])];
    }

    const results = [];
    for (const addr of uniqueAddresses) {
      try {
        const batchData = await batchNFTContract.getBatch(addr);
        results.push({
          batchId: batchData.batchId,
          id: batchData.batchId,
          floralSource: batchData.floralSource || 'Organic Honey',
          drugName: `${batchData.floralSource || 'Organic'} Honey`,
          beekeeperId: batchData.beekeeperId,
          hiveId: batchData.hiveId,
          status: batchData.status
        });
      } catch (blockchainErr) {
        console.error(`Blockchain fetch failed for ${addr}:`, blockchainErr.message);
      }
    }

    res.json({ results, batches: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
