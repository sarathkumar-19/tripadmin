require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.token = (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET);
    // console.log("from isAuth.js ", decodedToken);
    req.user = decodedToken;
    // console.log("from isAuth.js ", req.user);  
    next(); 
  } catch (err) {
    console.error('JWT verification error:', err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    return res.status(401).json({ message: 'Invalid token' });
  }
};
