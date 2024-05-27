const jwt = require('jsonwebtoken');

class AuthMiddleware {
  static verificarToken(req, res, next) {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: 'Token de autorización no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Token de autorización inválido' });
      }
      
      // Agrega el ID del usuario al objeto de solicitud (req) para que esté disponible en el siguiente middleware o en el controlador
      req.usuarioId = decoded.usuarioId;
      next();
    });
  }
}

module.exports = AuthMiddleware;
