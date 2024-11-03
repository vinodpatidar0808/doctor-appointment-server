const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const User = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

const Admin = new Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: {type: String, required: true},
  username: {type: String, unique: true},
}, {
  timestamps: true,
});

// const Services  = new Schema({
//   name: String,
//   price: Number
// });


// const ServiceModal = mongoose.model('services', Services);
const UserModel = mongoose.model('users', User);
const AdminModel = mongoose.model('admins', Admin);

module.exports = {
  UserModel,
  AdminModel
}