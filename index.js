const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose');
const { db, AdminModel } = require("./db");
require('dotenv').config()


const app = express();
const port = 3000;

app.use(express.json())

// connect to database
async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}
main().catch(err => console.log(err));


var whitelist = ['http://localhost:5173']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}
app.use(cors(corsOptions))
console.log("database: ", db)

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body
  
  // TODO: validate username and password
  if (!username || !password) {
    return res.status(400).send({ success: false })
  }

  //  get admin from admins collection and verify password using jwt
  
})

app.listen(port, () => {

  console.log("server running on port ", port)
})