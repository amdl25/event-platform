import jwt from 'jsonwebtoken';
import { Account } from '../models/relationships.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Token lipsa.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Account.findByPk(decoded.sub, {
      attributes: ['id', 'email', 'role']
    });

    if (!user) {
      return res.status(401).json({ message: 'Utilizator invalid.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalid sau expirat.' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Nu ai permisiunea necesara.' });
  }

  return next();
};
