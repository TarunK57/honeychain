const express = require('express');
const router = express.Router();
const { handoffContract, signer } = require('../config/blockchain');
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const localHandoffs = require('../config/localHandoffs');

function isNetworkError(error) {
  return error instanceof TypeError || /fetch failed|ENOTFOUND|ECONN/i.test(error?.message || '');
}

// POST /handoffs/log
router.post('/log', async (req, res) => {
  try {
    const { 
      batchId, fromEntity, toEntity, fromName, toName, 
      qrToken, locationLat, locationLng 
    } = req.body;

    let assignment;
    let assignmentIsLocal = false;
    try {
      const { data, error } = await supabase
        .from('driver_qr_assignments')
        .select('*')
        .eq('qr_token', qrToken)
        .single();
      if (error && isNetworkError(error)) throw error;
      assignment = data;
    } catch (error) {
      if (process.env.NODE_ENV === 'production' || !isNetworkError(error)) throw error;
      assignment = localHandoffs.getAssignment(qrToken);
      assignmentIsLocal = true;
    }

    if (!assignment) {
      return res.status(400).json({ error: "Invalid QR token" });
    }

    if (assignment.is_used) {
      return res.status(400).json({ error: "QR token already used" });
    }

    // Call logHandoff on handoffContract with signer
    const contractWithSigner = handoffContract.connect(signer);
    const tx = await contractWithSigner.logHandoff(
      batchId,
      fromEntity,
      toEntity,
      fromName,
      toName,
      qrToken,
      Math.floor(locationLat || 0),
      Math.floor(locationLng || 0)
    );

    await tx.wait();

    // Mark the qrToken as used in Supabase
    if (assignmentIsLocal) {
      localHandoffs.markUsed(qrToken);
    } else {
      const { error: updateError } = await supabase
        .from('driver_qr_assignments')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('qr_token', qrToken);
      if (updateError) console.error("Supabase Update Error:", updateError.message);
    }

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /handoffs/generate-qr
router.post('/generate-qr', async (req, res) => {
  try {
    const { batchAddress, count = 5, stages = [], extraLabels = [] } = req.body || {};
    if (!batchAddress || !Number.isInteger(Number(count)) || Number(count) < 1 || Number(count) > 10) {
      return res.status(400).json({ error: 'A batch address and a token count from 1 to 10 are required.' });
    }
    const defaultHoneyChainStages = ['beekeeper', 'collection_center', 'processor', 'distributor', 'retailer'];
    const selectedStages = stages.length > 0 ? stages : defaultHoneyChainStages;

    const richTokens = [];
    const assignments = [];
    for (let i = 0; i < Number(count); i++) {
      const qrToken = uuidv4();
      let label;
      
      if (i < selectedStages.length) {
        label = selectedStages[i];
      } else {
        const extraIdx = i - selectedStages.length;
        label = extraLabels[extraIdx] || `Handoff Stage ${extraIdx + 1}`;
      }
      
      richTokens.push({
        token: qrToken,
        stage: label,
        batchAddress: batchAddress,
        label: label,
        qrValue: "HONEYCHAIN_HANDOFF::batch=" + batchAddress + "::stage=" + label + "::token=" + qrToken + "::index=" + i + "::total=" + Number(count)
      });
      
      assignments.push({
        batch_address: batchAddress,
        qr_token: qrToken,
        handoff_stage: label,
        is_used: false
      });
    }

    let storage = 'supabase';
    try {
      const { error: insertError } = await supabase
        .from('driver_qr_assignments')
        .insert(assignments);
      if (insertError) throw insertError;
    } catch (error) {
      if (process.env.NODE_ENV === 'production' || !isNetworkError(error)) throw error;
      localHandoffs.insertAssignments(assignments);
      storage = 'local';
    }

    res.json({ success: true, tokens: richTokens, storage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
