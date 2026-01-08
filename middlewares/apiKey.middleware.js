const ApiKey = require("../models/apiKey.model");

module.exports = async function (req, res, next) {
  const clientKey = req.headers["x-api-key"];

  if (!clientKey)
    return res.status(401).json({ success: false, message: "Missing API Key" });

  const validKey = await ApiKey.findOne({ key: clientKey, revoked: false });

  if (!validKey)
    return res.status(403).json({ success: false, message: "Invalid API Key" });

  next();
};
