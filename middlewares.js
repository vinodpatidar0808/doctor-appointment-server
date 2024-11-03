const jwt = require('jsonwebtoken')



const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization
  if (token) {
    try {
      const { email, id } = jwt.verify(token, process.env.JWT_SECRET)
      req.user = { email, id }
      return next()

    } catch (error) {
      return res.status(401).send({ success: false, message: 'Please login to continue!' })
    }
  }
  return res.status(401).send({ success: false, message: 'Please login to continue!' })
}

module.exports = { authMiddleware }