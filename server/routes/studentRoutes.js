import express from "express";
import Student from "../models/Student.js";

const router = express.Router();

// 1. GET ALL STUDENTS (Supports search and class filter)
// GET /api/students?search=ali&class=Grade 10
router.get("/", async (req, res) => {
  try {
    const { search, class: classFilter, status } = req.query;
    const query = {};

    if (classFilter && classFilter !== "All") {
      query.class = classFilter;
    }

    if (status && status !== "All") {
      query.status = status;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { name: regex },
        { parentName: regex },
        { phone: regex },
        ...(isNaN(Number(search)) ? [] : [{ rollNo: Number(search) }]),
      ];
    }

    const students = await Student.find(query).sort({ rollNo: 1 });
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error fetching students", error: error.message });
  }
});

// 2. GET SINGLE STUDENT BY ID
// GET /api/students/:id
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Error fetching student", error: error.message });
  }
});

// 3. CREATE NEW STUDENT (Add Admission)
// POST /api/students
router.post("/", async (req, res) => {
  try {
    const { rollNo } = req.body;

    // Check if roll number already exists
    const existing = await Student.findOne({ rollNo: Number(rollNo) });
    if (existing) {
      return res.status(400).json({ message: `Roll number ${rollNo} already belongs to ${existing.name}` });
    }

    const newStudent = new Student(req.body);
    const saved = await newStudent.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(400).json({ message: "Error adding student", error: error.message });
  }
});

// 4. UPDATE STUDENT (Profile, Fee Status, etc.)
// PUT /api/students/:id
router.put("/:id", async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating student", error: error.message });
  }
});

// 5. DELETE STUDENT
// DELETE /api/students/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student deleted successfully", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Error deleting student", error: error.message });
  }
});

// 6. SEED INITIAL STUDENTS (Helper endpoint to populate demo students if database is empty)
// POST /api/students/seed
router.post("/seed", async (req, res) => {
  try {
    const count = await Student.countDocuments();
    if (count > 0 && !req.query.force) {
      return res.json({ message: `Database already has ${count} students. Pass ?force=true to re-seed.` });
    }

    if (req.query.force) {
      await Student.deleteMany({});
    }

    // Default 24 students data
    const initialList = req.body.students || [];
    if (initialList.length === 0) {
      return res.status(400).json({ message: "No student records provided for seed" });
    }

    const inserted = await Student.insertMany(initialList);
    res.status(201).json({ message: `Successfully seeded ${inserted.length} students!`, count: inserted.length });
  } catch (error) {
    res.status(500).json({ message: "Error seeding data", error: error.message });
  }
});

export default router;

