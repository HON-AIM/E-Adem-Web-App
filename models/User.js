const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    default: "Not Provided",
    trim: true,
  },
  activeLoanAmount: { type: Number, default: 0 },
  accountNumber: { type: String, default: () => Math.floor(2000000000 + Math.random() * 9000000000).toString() }, // 10-digit NUBAN style
  accountBalance: { type: Number, default: 0.00 },
  profilePicture: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  nin: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allows null/undefined values to not conflict
  },
  isNinVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// Hash password before saving
// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
