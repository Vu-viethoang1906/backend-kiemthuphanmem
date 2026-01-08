const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateAny } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
module.exports = function() {
  const router = express.Router();
  router.post('/login', authController.login);
  router.post('/keycloak/decode', authController.verifyKeycloakToken);
  router.post('/logout', authenticateAny, authController.logout);
  router.post('/refresh-token', authController.refreshToken); //

  return router;
};
