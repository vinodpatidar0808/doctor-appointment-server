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
  password: { type: String, required: true },
  username: { type: String, unique: true },
}, {
  timestamps: true,
});

const Services = new Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const Dentists = new Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  gender: {
    type: String,
    required: true
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'Admin'
  }
});


const DentistModal = mongoose.model('dentists', Dentists);
const ServiceModal = mongoose.model('services', Services);
const UserModel = mongoose.model('users', User);
const AdminModel = mongoose.model('admins', Admin);

module.exports = {
  UserModel,
  AdminModel,
  ServiceModal,
  DentistModal
}