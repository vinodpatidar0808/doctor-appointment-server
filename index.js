const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose');
const CryptoJS = require("crypto-js");
const { db, AdminModel } = require("./db");
const jwt = require('jsonwebtoken');
require('dotenv').config()


const app = express();
const port = 3000;

app.use(express.json())

// connect to database
async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}
main().catch(err => console.log(err));


var whitelist = ['http://localhost:5173', "http://localhost:3000"]
var corsOptions = {
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

app.post('/admin/addservice', async (req, res) => {
  const { name, price } = req.body
  if (!name || !price) {
    return res.status(400).send({ success: false })
  }
  await AdminModel.create({ name, price })
  res.send({ success: true })
})

app.post('/admin/adddentist', async (req, res) => {
  const { name, phone, email, password, username, gender, hourlyRate } = req.body
  if (!name || !phone || !email || !password || !username || !hourlyRate || !gender) {
    return res.status(400).send({message:"All fields are required", success: false })
  }
  // TODO:
  // put stricter validation for email, phone etc if time permits
  // check if username already exists
  // check if email already exists
  // check if phone already exists
})

app.listen(port, () => {

  console.log("server running on port ", port)
})