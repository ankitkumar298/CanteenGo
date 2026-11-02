import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Student from "@/models/Student";
import { verifyPassword, generateToken } from "@/lib/auth";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { identifier, password } = body; // identifier can be mobile number or email

    if (!identifier || !String(identifier).trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter your Mobile Number or Email." },
        { status: 400 }
      );
    }

    if (!password || !String(password).trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter your password." },
        { status: 400 }
      );
    }

    const cleanInput = String(identifier).trim();
    const cleanPhone = cleanInput.replace(/\D/g, "");

    // Search by 10-digit phone first or by email
    let student = null;
    if (cleanPhone.length >= 10) {
      student = await Student.findOne({ phone: cleanPhone });
    }

    if (!student) {
      student = await Student.findOne({ email: cleanInput.toLowerCase() });
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "No student account found with this number or email. Please Sign Up first."
        },
        { status: 404 }
      );
    }

    // Verify Password
    const isValid = verifyPassword(password, student.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password. Please verify and try again." },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      id: student._id.toString(),
      name: student.name,
      phone: student.phone,
      email: student.email || "",
      studentId: student.studentId || "",
      role: "student"
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful!",
      token,
      student: {
        _id: student._id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        studentId: student.studentId
      }
    });

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
    console.error("Student Login Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log in." },
      { status: 500 }
    );
  }
}

