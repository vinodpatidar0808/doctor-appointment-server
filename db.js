const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const User = new Schema({
  name: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  phone: String,
  password: String,
  gender: { type: String, enum: ["male", "female", "other"] },
  age: Number,
  services: { type: [String], },
  terms: { type: Boolean, default: false },
}, {
  timestamps: true,
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
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 }
});

const Dentists = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  gender: { type: String, required: true, enum: ['male', 'female', "other"] },
  age: { type: Number, required: true },
  hourlyRate: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now() },
  createdBy: { type: String, required: true, ref: 'Admin' }
});


const Appointment = new Schema({
  title: { type: String, required: true },
  userId: { type: ObjectId, ref: "users", required: true },
  userName: { type: String },
  dentistId: { type: ObjectId, ref: "dentist", required: true },
  serviceId: { type: ObjectId, ref: "services", required: true },
  serviceName: { type: String, required: true },
  dentistName: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  startTime: { type: String, required: true },
  comparisonStartDate: { type: String, required: true },
  comparisonEndDate: { type: String, required: true },
  endTime: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  // paymentStatus: { type: String, enum: ["pending", "completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

const DentistModal = mongoose.model('dentists', Dentists);
const ServiceModal = mongoose.model('services', Services);
const UserModel = mongoose.model('users', User);
const AdminModel = mongoose.model('admins', Admin);
const AppointmentModal = mongoose.model('appointments', Appointment);

module.exports = {
  UserModel,
  AdminModel,
  ServiceModal,
  DentistModal,
  AppointmentModal,
}