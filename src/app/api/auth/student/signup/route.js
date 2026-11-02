import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Student from "@/models/Student";
import { hashPassword, generateToken } from "@/lib/auth";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { name, phone, email, studentId, password } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Student full name is required." },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    if (!password || String(password).trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 4 characters long." },
        { status: 400 }
      );
    }

    // Check if student with this phone already exists
    const existingStudent = await Student.findOne({ phone: cleanPhone });
    if (existingStudent) {
      return NextResponse.json(
        {
          success: false,
          error: "A student account with this mobile number already exists. Please Log In."
        },
        { status: 409 }
      );
    }

    // Create student
    const passwordHash = hashPassword(password);
    const newStudent = await Student.create({
      name: name.trim(),
      phone: cleanPhone,
      email: (email || "").trim().toLowerCase(),
      studentId: (studentId || "").trim(),
      passwordHash
    });

    // Generate JWT token
    const token = generateToken({
      id: newStudent._id.toString(),
      name: newStudent.name,
      phone: newStudent.phone,
      email: newStudent.email || "",
      studentId: newStudent.studentId || "",
      role: "student"
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Student account created successfully!",
        token,
        student: {
          _id: newStudent._id,
          name: newStudent.name,
          phone: newStudent.phone,
          email: newStudent.email,
          studentId: newStudent.studentId
        }
      },
      { status: 201 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set("canteenGo_studentToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Student Sign Up Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create student account." },
      { status: 500 }
    );
  }
}

