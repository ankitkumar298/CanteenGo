import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Student name is required"],
    trim: true
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ""
  },
  studentId: {
    type: String,
    trim: true,
    default: "" // Roll Number / College ID
  },
  passwordHash: {
    type: String,
    required: [true, "Password hash is required"]
  },
  // Anti-Abuse Trust Score & COD Eligibility System
  noShowCount: {
    type: Number,
    default: 0,
    min: 0
  },
  codStatus: {
    type: String,
    enum: ["active", "warning", "temporarily_blocked", "prepaid_only"],
    default: "active"
  },
  codBlockedUntil: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

if (mongoose.models && mongoose.models.Student) {
  delete mongoose.models.Student;
}

export default mongoose.model("Student", studentSchema);
