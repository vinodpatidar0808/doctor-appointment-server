const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose');
const CryptoJS = require("crypto-js");
const { AdminModel, ServiceModal, DentistModal, UserModel, AppointmentModal } = require("./db");
const jwt = require('jsonwebtoken');
const { adminAuthMiddleware, patientAuthMiddleware, dentistAuthMiddleware } = require("./middlewares");
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

app.get('/admin/todays-appointments', adminAuthMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0].split('-').reverse().join('/')
    const appointments = await AppointmentModal.find({ startDate: today }).select('_id startDate userName dentistName serviceName')
    return res.status(200).send({ success: true, appointments })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Failed to fetch appointments for today. Please try again." })
  }
})

app.get('/admin/reports', adminAuthMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query
  if (!startDate || !endDate) {
    return res.status(400).send({ success: false, message: "Start date and end date are required." })
  }
  try {
    // TODO: try to do this with aggregation at a later stage
    const appointments = await AppointmentModal.find({ $and: [{ comparisonStartDate: { $gte: startDate } }, { comparisonEndDate: { $lte: endDate } }] }).sort({ createdAt: -1 }).select('_id dentistId dentistName startDate createdAt')
    // it stores the first appearance of each dentist and their indexOf
    const reports = []
    const dentistIndex = {}
    appointments.forEach((appointment) => {
      if (dentistIndex[appointment.dentistId] >= 0) {
        reports[dentistIndex[appointment.dentistId]].totalBookings++
      } else {
        dentistIndex[appointment.dentistId] = reports.length
        reports.push({ _id: appointment._id, dentistId: appointment.dentistId, dentistName: appointment.dentistName, startDate: appointment.startDate, totalBookings: 1 })
      }
    })

    return res.status(200).send({ success: true, reports })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Failed to fetch reports. Please try again." })
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

  res.status(200).send({ message: "Login successful", success: true, token, user: { name: verifyUser.name, email: verifyUser.email, _id: verifyUser._id, username: verifyUser.username } })
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

    const token = jwt.sign({
      email: user.email,
      id: user._id
    }, process.env.JWT_SECRET, { expiresIn: 60 * 60 });

    return res.status(200).send({ message: "Sign up successful", success: true, token, user: { name: user.name, email: user.email, _id: user._id, username: user.username } })
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
  const { title, userId, userName, dentistId, dentistName, serviceId, serviceName, startDate, endDate, startTime, endTime, amount } = req.body
  if (!userId || !userName || !dentistId || !serviceId || !startDate || !endDate || !startTime || !endTime || !amount || isNaN(+amount)) {
    return res.status(400).send({ success: false, message: "Missing some of the required fields." })
  }
  if (!title.trim()) {
    title = serviceName + " with " + dentistName
  }


  const appointmentObj = {
    title,
    userId,
    userName,
    dentistId,
    dentistName,
    serviceId,
    serviceName,
    startDate,
    endDate,
    startTime,
    endTime,
    amount: +amount,
    comparisonStartDate: startDate.split('/').reverse().join('/'),
    comparisonEndDate: endDate.split('/').reverse().join('/'),
  }

  try {
    const slotAlreadyBooked = await AppointmentModal.findOne({ startDate, endDate, startTime, endTime, dentistId })
    if (slotAlreadyBooked) {
      return res.status(400).send({ success: false, message: "This slot is already booked, by some other patient. Please select different slot." })
    }
    const newAppointment = await AppointmentModal.create(appointmentObj)
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
    return res.status(200).send({ success: true, appointments })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong. Please try again" })
  }
})

// dentist endpoints 

app.post('/dentist/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).send({ success: false, message: "Missing some of the required fields." })
  }

  const verifyDentist = await DentistModal.findOne({ $or: [{ username: username }, { email: username }] })
  if (!verifyDentist) {
    return res.status(400).send({ success: false, message: "Invalid email or password" })
  }
  const decryptedPassword = CryptoJS.AES.decrypt(verifyDentist.password, process.env.CRYPTO_SECRET).toString(CryptoJS.enc.Utf8)

  if (password !== decryptedPassword) {
    return res.status(400).send({ success: false, message: "Invalid email or password" })
  }

  const token = jwt.sign({ email: verifyDentist.email, id: verifyDentist._id }, process.env.JWT_SECRET, { expiresIn: 60 * 60 });
  return res.status(200).send({ success: true, message: "Login successful", token, user: { name: verifyDentist.name, email: verifyDentist.email, _id: verifyDentist._id, username: verifyDentist.username } })
})

// get all the appointments of a dentist
// TODO: try to modify this to get appointst between specific dates or appointments of a specific month
app.get('/dentist/appointments/:id', dentistAuthMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    const appointments = await AppointmentModal.find({ dentistId: id }).select('_id title startDate endDate startTime endTime serviceName userName amount status')
    return res.status(200).send({ success: true, appointments })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong. Please try again" })
  }
})

// update the status of an appointment
app.put('/dentist/updateappointment/:id', dentistAuthMiddleware, async (req, res) => {
  const { id } = req.params
  const { status, dentistId } = req.body
  try {
    const updatedAppointment = await AppointmentModal.findOneAndUpdate({ $and: [{ dentistId: dentistId }, { _id: id }] }, { status }, { new: true })
    return res.status(200).send({ success: true, message: "Appointment status updated successfully" })
  } catch (error) {
    return res.status(500).send({ success: false, message: "Something went wrong. Please try again" })
  }
})



app.listen(port, () => {
  console.log("server running on port ", port)
})