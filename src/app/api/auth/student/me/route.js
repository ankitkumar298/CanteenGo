import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Student from "@/models/Student";
import { verifyToken, hashPassword, generateToken } from "@/lib/auth";

export async function GET(request) {
  try {
    // Check Authorization header or Cookie
    const authHeader = request.headers.get("authorization");
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      const cookie = request.cookies.get("canteenGo_studentToken");
      token = cookie?.value;
    }

    if (!token) {
      return NextResponse.json(
        { authenticated: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { authenticated: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const student = await Student.findById(decoded.id).select("-passwordHash");
    if (!student) {
      return NextResponse.json(
        { authenticated: false, message: "Student account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      student: {
        _id: student._id,
        name: student.name,
        phone: student.phone,
        email: student.email || "",
        studentId: student.studentId || ""
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

    const body = await request.json();
    const { name, phone, email, studentId, password, studentDbId } = body;

    // Check Authorization header or Cookie
    const authHeader = request.headers.get("authorization");
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      const cookie = request.cookies.get("canteenGo_studentToken");
      token = cookie?.value;
    }

    let decoded = token ? verifyToken(token) : null;
    let student = null;

    if (decoded && decoded.id) {
      student = await Student.findById(decoded.id);
    }

    // Fallback: If token expired or localStorage session, locate by studentDbId or phone
    if (!student && studentDbId) {
      student = await Student.findById(studentDbId);
    }
    if (!student && phone) {
      const cleanPhone = String(phone).replace(/\D/g, "");
      student = await Student.findOne({ phone: cleanPhone });
    }

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student account not found in database. Please sign in again." },
        { status: 404 }
      );
    }

    // 1. Update Name
    if (name && typeof name === "string" && name.trim()) {
      student.name = name.trim();
    }

    // 2. Update Phone (check uniqueness if changed)
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        return NextResponse.json(
          { success: false, error: "Mobile number must be exactly 10 digits." },
          { status: 400 }
        );
      }
      if (cleanPhone !== student.phone) {
        const existing = await Student.findOne({ phone: cleanPhone, _id: { $ne: student._id } });
        if (existing) {
          return NextResponse.json(
            { success: false, error: "This mobile number is already registered to another account." },
            { status: 409 }
          );
        }
        student.phone = cleanPhone;
      }
    }

    // 3. Update Email
    if (typeof email === "string") {
      student.email = email.trim().toLowerCase();
    }

    // 4. Update Student / Roll ID
    if (typeof studentId === "string") {
      student.studentId = studentId.trim();
    }

    // 5. Update Password if provided
    if (password && typeof password === "string" && password.trim()) {
      const cleanPassword = password.trim();
      if (cleanPassword.length < 4) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 4 characters long." },
          { status: 400 }
        );
      }
      student.passwordHash = hashPassword(cleanPassword);
    }

    // Directly save to MongoDB via Mongoose
    await student.save();

    // Generate refreshed JWT token
    const newToken = generateToken({
      id: student._id.toString(),
      name: student.name,
      phone: student.phone,
      email: student.email || "",
      studentId: student.studentId || "",
      role: "student"
    });

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully in MongoDB database!",
      student: {
        _id: student._id.toString(),
        name: student.name,
        phone: student.phone,
        email: student.email || "",
        studentId: student.studentId || ""
      },
      token: newToken
    });

    response.cookies.set({
      name: "canteenGo_studentToken",
      value: newToken,
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

