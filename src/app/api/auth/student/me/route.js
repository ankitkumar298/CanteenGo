import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Student from "@/models/Student";
import { verifyToken } from "@/lib/auth";

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
        email: student.email,
        studentId: student.studentId
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

