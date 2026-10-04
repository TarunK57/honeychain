const supabase = require('../config/supabase');
const localAuth = require('../config/localAuth');

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  const token = authHeader.split(' ')[1];
  const localSession = localAuth.getSessionUser(token);
  if (localSession) {
    req.user = localSession.user;
    req.profile = localSession.profile;
    req.userId = localSession.user.id;
    return next();
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = authenticateUser;
