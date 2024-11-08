const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose');
const CryptoJS = require("crypto-js");
const { AdminModel, ServiceModal, DentistModal, UserModel, AppointmentModal } = require("./db");
const jwt = require('jsonwebtoken');
const { adminAuthMiddleware, patientAuthMiddleware } = require("./middlewares");
const { mobileRegex, emailRegex } = require("./helper");
require('dotenv').config()


const app = express();
const port = 3000;

app.use(express.json())

// connect to database
async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}
main().catch(err => console.log(err));


const whitelist = ['http://localhost:5173', "http://localhost:3000"]
const corsOptions = {
  origin: function (origin, callback) {
    // TODO: remove this before deploying
    callback(null, true)
    return
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}
app.use(cors(corsOptions))


// admin endpoints
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).send({ message: "", success: false })
  }

  const verifyAdmin = await AdminModel.findOne({ $or: [{ username: username }, { email: username }] })

  if (!verifyAdmin) {
    return res.status(401).send({ message: "Invalid username or password", success: false })
  }

  const decryptedPassword = CryptoJS.AES.decrypt(verifyAdmin.password, process.env.CRYPTO_SECRET).toString(CryptoJS.enc.Utf8)

  if (password !== decryptedPassword) {
    return res.status(401).send({ message: "Invalid username or password", success: false })
  }

  const token = jwt.sign({
    email: verifyAdmin.email,
    id: verifyAdmin._id
  }, process.env.JWT_SECRET, { expiresIn: 60 * 60 });

  res.status(200).send({ message: "Login successful", success: true, token })
})

app.post('/admin/addservice', adminAuthMiddleware, async (req, res) => {
  const { name, price } = req.body
  if (!name || !price) {
    return res.status(400).send({ success: false, message: "Both Service name and price are required." })
  }

  try {
    const service = await ServiceModal.create({ name, price })
    return res.status(200).send({ success: true, message: "Service added successfully!" })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong! Please try again." })
  }
})

app.post('/admin/adddentist', adminAuthMiddleware, async (req, res) => {
  const { name, phone, email, password, username, gender, hourlyRate } = req.body

  if (!name || !phone || !email || !password || !username || !hourlyRate || !gender || password.length < 6 || !mobileRegex.test(phone) || !emailRegex.test(email)) {
    return res.status(400).send({ message: "Some fields are missing or invalid", success: false })
  }

  const encryptedPassword = CryptoJS.AES.encrypt(password, process.env.CRYPTO_SECRET).toString()

  if (await DentistModal.findOne({ $or: [{ username: username }, { email: email }] })) {
    // TODO: identify correct status code for this kind of request and replace
    return res.status(500).send({ message: "Username or email already exists", success: false })
  }
  try {
    const dentist = await DentistModal.create({ name, phone, email, password: encryptedPassword, username, gender, hourlyRate, createdBy: req.user.email })
    return res.status(200).send({ message: "Dentist added successfully", success: true })
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: "Something went wrong! Please try again.", success: false })
  }
})


// patient endpoints
app.post('/patient/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).send({ message: "", success: false })
  }

  const verifyUser = await UserModel.findOne({ $or: [{ username: username }, { email: username }] })

  if (!verifyUser) {
    return res.status(401).send({ message: "Invalid username or password", success: false })
  }

  const decryptedPassword = CryptoJS.AES.decrypt(verifyUser.password, process.env.CRYPTO_SECRET).toString(CryptoJS.enc.Utf8)

  if (password !== decryptedPassword) {
    return res.status(401).send({ message: "Invalid username or password", success: false })
  }

  const token = jwt.sign({
    email: verifyUser.email,
    id: verifyUser._id
  }, process.env.JWT_SECRET, { expiresIn: 60 * 60 });

  res.status(200).send({ message: "Login successful", success: true, token })
})

app.post('/patient/signup', async (req, res) => {
  const { name, phone, email, password, username, gender, age, services, terms } = req.body
  if (!name || !phone || !email || !password || !username || !gender || !age || !terms || password.length < 6 || !mobileRegex.test(phone) || !emailRegex.test(email) || username.length < 3) {
    return res.status(400).send({ message: "Some fields are missing or invalid", success: false })
  }

  if (await UserModel.findOne({ $or: [{ username: username }, { email: email }] })) {
    // TODO: identify correct status code for this kind of request and replace
    return res.status(500).send({ message: "Username or email already exists", success: false })
  }

  if (await DentistModal.findOne({ $or: [{ username: username }, { email: email }] })) {
    return res.status(500).send({ message: "You are already registered as a dentist.", success: false })
  }

  const encryptedPassword = CryptoJS.AES.encrypt(password, process.env.CRYPTO_SECRET).toString()
  try {
    const user = await UserModel.create({ name, phone, email, password: encryptedPassword, username, gender, age, services, terms })
    return res.status(200).send({ message: "Sign up successful", success: true })
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: "Something went wrong! Please try again.", success: false })
  }
})


app.get('/dentists', patientAuthMiddleware, async (req, res) => {
  try {
    const dentists = await DentistModal.find().select('_id name hourlyRate ')
    return res.status(200).send({ success: true, dentists })

  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong! Please try again." })
  }
})

app.get('/services', patientAuthMiddleware, async (req, res) => {
  try {
    const services = await ServiceModal.find()
    return res.status(200).send({ success: true, services })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong! Please try again." })
  }
})

app.post('/patient/createappointment', patientAuthMiddleware, async (req, res) => {

  // TODO: add validation
  const { dentist, service, startDate, endDate, startTime, endTime, description } = req.body
  if (!dentist || !service || !startDate || !endDate || !startTime || !endTime) {
    return res.status(400).send({ success: false, message: "Missing some of the required fields." })
  }
  // TODO: modify this for dentist name and service service name
  try {
    const newAppointment = await AppointmentModal.create({ dentist, service, date, time, description, patient: req.user.id })
    return res.status(200).send({ success: true, message: "Appointment created successfully", appointment: newAppointment })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong. Please try again" })
  }
})

// get all the appointments of a patient
app.get('/patient/appointments/:id', patientAuthMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    const appointments = await AppointmentModal.find({ userId: id })
    // TODO: filter the information and send only what is needed. 
    return res.status(200).send({ success: true, appointments })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong. Please try again" })
  }
})

// get all the appointments of a dentist
app.get('/dentist/appointments/:id', patientAuthMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    const appointments = await AppointmentModal.find({ dentistId: id })
    // TODO: filter the information and send only what is needed. 
    return res.status(200).send({ success: true, appointments })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong. Please try again" })
  }
})


app.listen(port, () => {

  console.log("server running on port ", port)
})