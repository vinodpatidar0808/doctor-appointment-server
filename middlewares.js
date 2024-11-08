const jwt = require('jsonwebtoken')
const { AdminModel, UserModel } = require("./db")

const adminAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization
  if (token) {
    try {
      const { email, id } = jwt.verify(token, process.env.JWT_SECRET)
      const admin = await AdminModel.findOne({ _id: id })
      if (!admin) {
        return res.status(401).send({ success: false, message: 'You are not authorized to perform this action.' })
      }
      req.user = { email, id }
      return next()
    } catch (error) {
      console.log("error: ", error)
      return res.status(401).send({ success: false, message: 'Please login to continue!' })
    }
  }
  return res.status(401).send({ success: false, message: 'Please login to continue!' })
}


const patientAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization
  if (token) {
    try {
      const { email, id } = jwt.verify(token, process.env.JWT_SECRET)
      const patient = await UserModel.findOne({ _id: id })
      if (!patient) {
        return res.status(401).send({ success: false, message: 'Please login to continue!' })
      }
      req.user = { email, id }
      return next()
    } catch (error) {
      console.log("error: ", error)
      return res.status(401).send({ success: false, message: 'Please login to continue!' })
    }
  }
  return res.status(500).send({ success: false, message: 'Something went wrong. Please try again.' })
}

module.exports = { adminAuthMiddleware, patientAuthMiddleware }