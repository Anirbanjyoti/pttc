import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pttc';

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    seedInitialData();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Student Schema definition
const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  trade: { type: String, required: true },
  batch: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  grade: { type: String, default: 'N/A' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
});

const Student = mongoose.model('Student', studentSchema);

// Initial Mock data for seeding
const INITIAL_STUDENTS = [
  { id: "STU1001", name: "Anirban Das", trade: "IT Support", batch: "Batch-45", phone: "+8801712345678", email: "anirban@example.com", status: "Approved", grade: "A+", date: "2026-01-10" },
  { id: "STU1002", name: "Mst. Rahima Khatun", trade: "Graphic Design", batch: "Batch-45", phone: "+8801812345679", email: "rahima@example.com", status: "Approved", grade: "A-", date: "2026-01-12" },
  { id: "STU1003", name: "Kamal Hossain", trade: "Automotive Mechanics", batch: "Batch-44", phone: "+8801912345680", email: "kamal@example.com", status: "Completed", grade: "Competent", date: "2025-10-05" },
  { id: "STU1004", name: "Sajid Rahman", trade: "Electrical Installation", batch: "Batch-46", phone: "+8801512345681", email: "sajid@example.com", status: "Pending", grade: "N/A", date: "2026-05-15" },
  { id: "STU1005", name: "Fatema Tuz Zohra", trade: "Sewing Machine Operation", batch: "Batch-46", phone: "+8801612345682", email: "fatema@example.com", status: "Approved", grade: "N/A", date: "2026-05-16" }
];

async function seedInitialData() {
  try {
    const count = await Student.countDocuments();
    if (count === 0) {
      await Student.insertMany(INITIAL_STUDENTS);
      console.log('Seeded database with initial student records.');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}

// REST API Endpoints

// 1. Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ date: -1, _id: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving students.' });
  }
});

// 2. Get student by ID (for enrollment tracking status & student profile)
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.id });
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving student record.' });
  }
});

// 3. Create a new student (Register/Enrollment form)
app.post('/api/students', async (req, res) => {
  try {
    const { name, trade, batch, phone, email, status, grade, id } = req.body;
    
    // Generate simple sequential or unique ID if none provided
    let finalId = id;
    if (!finalId) {
      finalId = `STU${Date.now().toString().slice(-4)}`;
    }
    
    // Check if ID already exists
    const existing = await Student.findOne({ id: finalId });
    if (existing) {
      finalId = `STU${(Date.now() + 1).toString().slice(-4)}`;
    }

    const newStudent = new Student({
      id: finalId,
      name,
      trade,
      batch: batch || 'Batch-46',
      phone,
      email,
      status: status || 'Pending',
      grade: grade || 'N/A'
    });

    const saved = await newStudent.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({ error: 'Failed to create student. Please verify input data.' });
  }
});

// 4. Update student record (Admin status/grades/details changes)
app.put('/api/students/:id', async (req, res) => {
  try {
    const updated = await Student.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({ error: 'Failed to update student record.' });
  }
});

// 5. Delete student record
app.delete('/api/students/:id', async (req, res) => {
  try {
    const result = await Student.findOneAndDelete({ id: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    res.json({ message: 'Student record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student record.' });
  }
});

// Listen on designated port
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
