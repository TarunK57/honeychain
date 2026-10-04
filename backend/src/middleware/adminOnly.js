const supabase = require('../config/supabase');
const adminOnly = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    let profile = req.profile;
    if (!profile) {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.userId)
        .single();
      if (error) return res.status(403).json({ error: 'Admin access required' });
      profile = data;
    }
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(403).json({ error: "Forbidden" });
  }
};
module.exports = adminOnly;
