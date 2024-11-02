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
  email: { type: String, unique: true },
  password: String
});

const UserModel = mongoose.model('users', User);
const AdminModel = mongoose.model('admins', Admin);

module.exports = {
  UserModel,
  AdminModel
}