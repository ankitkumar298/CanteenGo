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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

if (mongoose.models && mongoose.models.Student) {
  delete mongoose.models.Student;
}

export default mongoose.model("Student", studentSchema);

