// const jwt = require('jsonwebtoken');
// const jwksClient = require('jwks-rsa');
// require('dotenv').config();

// /**
//  * Keycloak JWKS client
//  * Thay URL bằng realm của bạn
//  */
// const keycloakClient = jwksClient({
//   jwksUri: process.env.KEYCLOAK_JWKS_URI
// });

// /**
//  * Lấy public key từ JWKS của Keycloak
//  */
// function getKey(header, callback) {
//   keycloakClient.getSigningKey(header.kid, function(err, key) {
//     if (err) return callback(err);
//     const signingKey = key.getPublicKey();
//     callback(null, signingKey);
//   });
// }

// /**
//  * Middleware xác thực Keycloak JWT
//  */
// const authenticateKeycloak = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({
//       success: false,
//       message: 'Token không hợp lệ hoặc không cung cấp'
//     });
//   }

//   const token = authHeader.split(' ')[1];

//   jwt.verify(token, getKey, {}, (err, decoded) => {
//     if (err) {
//       //       return res.status(401).json({
//         success: false,
//         message: 'Token không hợp lệ hoặc hết hạn'
//       });
//     }

//     // Gắn thông tin user Keycloak vào request
//     req.user = {
//       id: decoded.sub,
//       email: decoded.email,
//       username: decoded.preferred_username,
//       roles: decoded.realm_access?.roles || []
//     };

//     })`);
//     next();
//   });
// };

// /**
//  * Authorization middleware cho Keycloak roles
//  * @param {...string} allowedRoles
//  */
// const authorizeKeycloak = (...allowedRoles) => {
//   return (req, res, next) => {
//     if (!req.user || !req.user.roles) {
//       return res.status(401).json({ success: false, message: 'Chưa xác thực' });
//     }

//     const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

//     if (!hasRole) {
//       return res.status(403).json({
//         success: false,
//         message: `Bạn cần quyền ${allowedRoles.join(', ')} để truy cập`
//       });
//     }

//     next();
//   };
// };

// module.exports = {
//   authenticateKeycloak,
//   authorizeKeycloak
// };
