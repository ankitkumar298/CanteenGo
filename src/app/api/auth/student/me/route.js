import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Student from "@/models/Student";
import { verifyToken, hashPassword, generateToken } from "@/lib/auth";

function extractStudentToken(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const authCookie = request.cookies.get("canteenGo_studentToken");
  return authCookie?.value || null;
}

export async function GET(request) {
  try {
    const token = extractStudentToken(request);

    if (!token) {
      return NextResponse.json(
        { authenticated: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken || !decodedToken.id) {
      return NextResponse.json(
        { authenticated: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const student = await Student.findById(decodedToken.id).select("-passwordHash");
    if (!student) {
      return NextResponse.json(
        { authenticated: false, message: "Student account not found" },
        { status: 404 }
      );
    }

    // Automatically lift temporary COD block once the 7-day cooldown expires
    const isBlockExpired =
      student.codStatus === "temporarily_blocked" &&
      student.codBlockedUntil &&
      new Date() > new Date(student.codBlockedUntil);

    if (isBlockExpired) {
      student.codStatus = "active";
      student.noShowCount = 0;
      student.codBlockedUntil = null;
      await student.save();
    }

    return NextResponse.json({
      authenticated: true,
      student: {
        _id: student._id,
        name: student.name,
        phone: student.phone,
        email: student.email || "",
        studentId: student.studentId || "",
        noShowCount: student.noShowCount || 0,
        codStatus: student.codStatus || "active",
        codBlockedUntil: student.codBlockedUntil || null
      }
    });
  } catch (error) {
    console.error("Student Auth Verify Error:", error);
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await connectToDatabase();

    const requestBody = await request.json();
    const { name, phone, email, studentId, password, studentDbId } = requestBody;

    const token = extractStudentToken(request);
    const decodedToken = token ? verifyToken(token) : null;
    let student = null;

    if (decodedToken && decodedToken.id) {
      student = await Student.findById(decodedToken.id);
    }

    // Fallback lookup when session token is missing or refreshed from localStorage
    if (!student && studentDbId) {
      student = await Student.findById(studentDbId);
    }
    if (!student && phone) {
      const normalizedPhone = String(phone).replace(/\D/g, "");
      student = await Student.findOne({ phone: normalizedPhone });
    }

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student account not found in database. Please sign in again." },
        { status: 404 }
      );
    }

    if (name && typeof name === "string" && name.trim()) {
      student.name = name.trim();
    }

    if (phone) {
      const normalizedPhone = String(phone).replace(/\D/g, "");
      if (normalizedPhone.length !== 10) {
        return NextResponse.json(
          { success: false, error: "Mobile number must be exactly 10 digits." },
          { status: 400 }
        );
      }
      if (normalizedPhone !== student.phone) {
        const duplicateStudent = await Student.findOne({
          phone: normalizedPhone,
          _id: { $ne: student._id }
        });
        if (duplicateStudent) {
          return NextResponse.json(
            { success: false, error: "This mobile number is already registered to another account." },
            { status: 409 }
          );
        }
        student.phone = normalizedPhone;
      }
    }

    if (typeof email === "string") {
      student.email = email.trim().toLowerCase();
    }

    if (typeof studentId === "string") {
      student.studentId = studentId.trim();
    }

    if (password && typeof password === "string" && password.trim()) {
      const trimmedPassword = password.trim();
      if (trimmedPassword.length < 4) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 4 characters long." },
          { status: 400 }
        );
      }
      student.passwordHash = hashPassword(trimmedPassword);
    }

    await student.save();

    const refreshedToken = generateToken({
      id: student._id.toString(),
      name: student.name,
      phone: student.phone,
      email: student.email || "",
      studentId: student.studentId || "",
      role: "student"
    });

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully!",
      student: {
        _id: student._id.toString(),
        name: student.name,
        phone: student.phone,
        email: student.email || "",
        studentId: student.studentId || ""
      },
      token: refreshedToken
    });

    response.cookies.set({
      name: "canteenGo_studentToken",
      value: refreshedToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Student Profile PUT Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile in database." },
      { status: 500 }
    );
  }
}

