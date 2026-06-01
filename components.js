import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// -------------------------------------------------------------
// LOCAL STORAGE & INITIAL MOCK DATA
// -------------------------------------------------------------
const INITIAL_STUDENTS = [
  { id: "STU1001", name: "Anirban Das", trade: "IT Support", batch: "Batch-45", phone: "+8801712345678", email: "anirban@example.com", status: "Approved", grade: "A+", date: "2026-01-10" },
  { id: "STU1002", name: "Mst. Rahima Khatun", trade: "Graphic Design", batch: "Batch-45", phone: "+8801812345679", email: "rahima@example.com", status: "Approved", grade: "A-", date: "2026-01-12" },
  { id: "STU1003", name: "Kamal Hossain", trade: "Automotive Mechanics", batch: "Batch-44", phone: "+8801912345680", email: "kamal@example.com", status: "Completed", grade: "Competent", date: "2025-10-05" },
  { id: "STU1004", name: "Sajid Rahman", trade: "Electrical Installation", batch: "Batch-46", phone: "+8801512345681", email: "sajid@example.com", status: "Pending", grade: "N/A", date: "2026-05-15" },
  { id: "STU1005", name: "Fatema Tuz Zohra", trade: "Sewing Machine Operation", batch: "Batch-46", phone: "+8801612345682", email: "fatema@example.com", status: "Approved", grade: "N/A", date: "2026-05-16" }
];

const INITIAL_TEACHERS = [
  { id: "TCH2001", name: "Engr. Mahmudul Hasan", trade: "IT Support", email: "mahmud@pttc.edu", phone: "+8801700000101" },
  { id: "TCH2002", name: "Shahnaz Parveen", trade: "Sewing Machine Operation", email: "shahnaz@pttc.edu", phone: "+8801700000102" },
  { id: "TCH2003", name: "M. A. Mannan", trade: "Automotive Mechanics", email: "mannan@pttc.edu", phone: "+8801700000103" }
];

// Helper to load/save mock data
export const getStoredData = (key, fallback) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(data);
};

export const saveStoredData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// -------------------------------------------------------------
// CORE FEATURES COMPONENT
// -------------------------------------------------------------
export function PortalAdmin({ students, setStudents, firebaseConfig }) {
  const [teachers, setTeachers] = useState(() => getStoredData('pttc_teachers', INITIAL_TEACHERS));
  const [filterTrade, setFilterTrade] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newNotice, setNewNotice] = useState('');
  const [notices, setNotices] = useState(() => getStoredData('pttc_notices', [
    "Admission is open for BMET Regular (IT Support, Graphics, Welding).",
    "Pre-departure Orientation Program scheduled for expatriates on June 2nd, 2026."
  ]));

  // Stats
  const totalStudents = students.length;
  const pendingApps = students.filter(s => s.status === 'Pending').length;
  const approvedStudents = students.filter(s => s.status === 'Approved').length;

  const handleStatusChange = (id, nextStatus) => {
    const updated = students.map(s => s.id === id ? { ...s, status: nextStatus } : s);
    setStudents(updated);
    saveStoredData('pttc_students', updated);
  };

  const handleAddNotice = (e) => {
    e.preventDefault();
    if (!newNotice.trim()) return;
    const updated = [newNotice, ...notices];
    setNotices(updated);
    saveStoredData('pttc_notices', updated);
    setNewNotice('');
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newStudent = {
      id: `STU${Date.now().toString().slice(-4)}`,
      name: formData.get('name'),
      trade: formData.get('trade'),
      batch: formData.get('batch'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      status: "Pending",
      grade: "N/A",
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newStudent, ...students];
    setStudents(updated);
    saveStoredData('pttc_students', updated);
    e.target.reset();
  };

  // Export functions
  const exportToExcel = () => {
    const dataToExport = filteredStudents.map(({ id, name, trade, batch, phone, email, status, grade, date }) => ({
      "Student ID": id,
      "Name": name,
      "Trade/Course": trade,
      "Batch": batch,
      "Phone": phone,
      "Email": email,
      "Status": status,
      "CBT Grade": grade,
      "Enrollment Date": date
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PTTC Students");
    XLSX.writeFile(workbook, "PTTC_Students_Report.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont("Helvetica");
    doc.setFontSize(18);
    doc.text("Paikgacha Technical Training Center (PTTC)", 14, 20);
    doc.setFontSize(12);
    doc.text("Student Enrollment & Assessment Report", 14, 28);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 34);
    doc.line(14, 38, 196, 38);

    let y = 45;
    filteredStudents.forEach((s, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.text(`${index + 1}. ${s.name} (${s.id})`, 14, y);
      doc.setFont("Helvetica", "normal");
      doc.text(`Trade: ${s.trade} | Batch: ${s.batch} | Status: ${s.status}`, 14, y + 5);
      doc.text(`Contact: ${s.phone} | Email: ${s.email}`, 14, y + 10);
      doc.line(14, y + 13, 196, y + 13);
      y += 18;
    });

    doc.save("PTTC_Students_Report.pdf");
  };

  const filteredStudents = students.filter(s => {
    const matchTrade = filterTrade === 'All' || s.trade === filterTrade;
    const matchStatus = filterStatus === 'All' || s.status === filterStatus;
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.trade.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTrade && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Admin Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-teal-500/20">
          <div className="text-slate-400 text-sm font-semibold">TOTAL ENROLLMENTS</div>
          <div className="text-4xl font-extrabold text-teal-600 dark:text-teal-400 mt-2">{totalStudents}</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/20">
          <div className="text-slate-400 text-sm font-semibold">PENDING APPROVALS</div>
          <div className="text-4xl font-extrabold text-amber-500 mt-2">{pendingApps}</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20">
          <div className="text-slate-400 text-sm font-semibold">APPROVED STUDENTS</div>
          <div className="text-4xl font-extrabold text-emerald-500 mt-2">{approvedStudents}</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-blue-500/20">
          <div className="text-slate-400 text-sm font-semibold">TOTAL INSTRUCTORS</div>
          <div className="text-4xl font-extrabold text-blue-500 mt-2">{teachers.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notice & Fast Management Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Announcement Creator */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <i data-lucide="megaphone" className="text-teal-500"></i> Publish Announcement
            </h3>
            <form onSubmit={handleAddNotice} className="space-y-4">
              <textarea 
                value={newNotice}
                onChange={(e) => setNewNotice(e.target.value)}
                placeholder="Type new notice for marquee board..."
                rows="3"
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-teal-500/20">
                Publish Live
              </button>
            </form>
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
              {notices.map((n, i) => (
                <div key={i} className="text-xs bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  {n}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add Student */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">Add Student Record</h3>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <input name="name" type="text" placeholder="Full Name" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm" />
              <select name="trade" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
                <option value="IT Support">IT Support & IoT</option>
                <option value="Graphic Design">Graphic Design & UI/UX</option>
                <option value="Automotive Mechanics">Automotive Mechanics</option>
                <option value="Electrical Installation">Electrical Installation</option>
                <option value="Sewing Machine Operation">Sewing Machine Operation</option>
              </select>
              <input name="batch" type="text" placeholder="Batch Number (e.g. Batch-45)" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm" />
              <input name="phone" type="text" placeholder="Phone Number" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm" />
              <input name="email" type="email" placeholder="Email Address" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm" />
              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-sm">
                Register Student
              </button>
            </form>
          </div>
        </div>

        {/* Students Table Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold">Students Registry</h3>
                <p className="text-xs text-slate-500">Manage and export all student accounts</p>
              </div>

              {/* Exports */}
              <div className="flex items-center gap-2">
                <button onClick={exportToExcel} className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 font-bold shadow transition-all">
                  <i data-lucide="file-spreadsheet" className="w-4 h-4"></i> Excel
                </button>
                <button onClick={exportToPDF} className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-2 font-bold shadow transition-all">
                  <i data-lucide="file-text" className="w-4 h-4"></i> PDF
                </button>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input 
                type="text" 
                placeholder="Search name, ID, or trade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <select 
                value={filterTrade} 
                onChange={(e) => setFilterTrade(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="All">All Trades</option>
                <option value="IT Support">IT Support</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Automotive Mechanics">Automotive</option>
                <option value="Electrical Installation">Electrical</option>
                <option value="Sewing Machine Operation">Sewing Machine</option>
              </select>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Data Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-xs uppercase">
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Trade</th>
                    <th className="pb-3">Batch</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredStudents.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</div>
                        <div className="text-xs text-slate-400">{s.id} | {s.phone}</div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">{s.trade}</td>
                      <td className="py-3 text-xs font-mono">{s.batch}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          s.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' :
                          s.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <select 
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                          className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                        >
                          <option value="Pending">Set Pending</option>
                          <option value="Approved">Approve</option>
                          <option value="Completed">Set Competent</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">No student records found matching the filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TEACHERS PORTAL
// -------------------------------------------------------------
export function PortalTeacher({ students, setStudents }) {
  const [selectedBatch, setSelectedBatch] = useState('Batch-45');
  const [gradingStudent, setGradingStudent] = useState(null);
  const [gradeValue, setGradeValue] = useState('Competent');

  const batchStudents = students.filter(s => s.batch === selectedBatch);

  const handleGradeSubmit = (e) => {
    e.preventDefault();
    if (!gradingStudent) return;
    const updated = students.map(s => s.id === gradingStudent.id ? { ...s, grade: gradeValue } : s);
    setStudents(updated);
    saveStoredData('pttc_students', updated);
    setGradingStudent(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2">
          <i data-lucide="award"></i> Teacher Assessment Dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-1">Review batch registries and assess competency values.</p>

        <div className="mt-6 flex items-center gap-4">
          <label className="text-sm font-semibold">Select Batch Folder:</label>
          <select 
            value={selectedBatch} 
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium"
          >
            <option value="Batch-44">Batch 44</option>
            <option value="Batch-45">Batch 45</option>
            <option value="Batch-46">Batch 46</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h3 className="font-bold mb-4">Competency Student Roll</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {batchStudents.map(student => (
              <div key={student.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{student.name}</div>
                  <div className="text-xs text-slate-400">{student.trade} | ID: {student.id}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    student.grade === 'Competent' || student.grade === 'A+' || student.grade === 'A-' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    Grade: {student.grade}
                  </span>
                  <button 
                    onClick={() => { setGradingStudent(student); setGradeValue(student.grade); }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    Grade Competency
                  </button>
                </div>
              </div>
            ))}
            {batchStudents.length === 0 && (
              <div className="text-center py-8 text-slate-400">No active students in {selectedBatch}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          {gradingStudent ? (
            <div className="glass-panel p-6 rounded-2xl border border-teal-500/25 animate-fadeIn">
              <h3 className="font-bold text-lg mb-4">Update Assessment</h3>
              <p className="text-sm mb-2 text-slate-500">Student: <strong className="text-slate-800 dark:text-slate-200">{gradingStudent.name}</strong></p>
              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Competency Mark</label>
                  <select 
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border"
                  >
                    <option value="Competent">Competent (C)</option>
                    <option value="Not Yet Competent">Not Yet Competent (NYC)</option>
                    <option value="A+">A+ (90%+)</option>
                    <option value="A-">A- (80%+)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700">Save</button>
                  <button type="button" onClick={() => setGradingStudent(null)} className="px-4 py-2 bg-slate-250 text-slate-700 rounded-xl">Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl text-center py-12 text-slate-400">
              Select a student to edit CBT/A competency parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STUDENT PORTAL
// -------------------------------------------------------------
export function PortalStudent({ students }) {
  const [searchId, setSearchId] = useState('STU1001');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const found = students.find(s => s.id === searchId);
    setProfile(found || null);
  }, [searchId, students]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Student Profile Registry</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter Student ID (e.g. STU1001)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border"
          />
        </div>
      </div>

      {profile ? (
        <div className="glass-panel p-6 rounded-2xl border border-teal-500/20 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl"></div>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-teal-500 to-sky-600 text-white flex items-center justify-center font-bold text-3xl">
              {profile.name[0]}
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-xs text-teal-600 font-bold uppercase tracking-wider">{profile.trade}</div>
              <h3 className="text-2xl font-bold">{profile.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4 text-slate-600 dark:text-slate-400">
                <div><strong>Student ID:</strong> {profile.id}</div>
                <div><strong>Batch:</strong> {profile.batch}</div>
                <div><strong>Email:</strong> {profile.email}</div>
                <div><strong>Phone:</strong> {profile.phone}</div>
                <div><strong>Enrollment Date:</strong> {profile.date}</div>
                <div><strong>CBT Assessment:</strong> <span className="font-bold text-teal-600">{profile.grade}</span></div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  profile.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                  profile.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  Portal Status: {profile.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl text-center py-12 text-slate-400">
          No profile found matching ID: {searchId}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// OTHER FEATURES & SUBPAGES
// -------------------------------------------------------------

// 1. Assessment Tools Section
export function AssessmentTools() {
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);

  const questions = [
    { id: 1, q: "Which tool is commonly used to debug website style errors?", options: ["Visual Studio", "Chrome DevTools", "MS Word", "Photoshop"], ans: "Chrome DevTools" },
    { id: 2, q: "What does CBT/A stand for in Technical Training?", options: ["Computer Based Testing Agency", "Competency Based Training & Assessment", "Centralized Board of Training Administration"], ans: "Competency Based Training & Assessment" },
    { id: 3, q: "Which element is crucial for mobile responsive websites?", options: ["High density flash loops", "Viewport meta tag", "Fixed widths in pixels"], ans: "Viewport meta tag" }
  ];

  const handleOptionChange = (qId, option) => {
    setAnswers({ ...answers, [qId]: option });
  };

  const calculateScore = () => {
    let matches = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.ans) matches++;
    });
    setScore(matches);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      <div className="lg:col-span-1 glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-xl font-bold text-teal-600">NSDA and CBTA Standards</h3>
        <p className="text-sm text-slate-500">
          NSDA and BTEB Competency Standards focus on hands-on capabilities. Assessors look for proof of Competence (C) in real-world simulations.
        </p>
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-400">
          <p><strong>Step 1:</strong> Prepare Portfolio of Evidence.</p>
          <p><strong>Step 2:</strong> Undergo Self-Assessment Checklist.</p>
          <p><strong>Step 3:</strong> Perform practical demo in front of certified Assessor.</p>
        </div>
      </div>

      <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4">Competency Self-Practice Quiz</h3>
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <div className="font-semibold text-slate-850 dark:text-slate-200">{idx+1}. {q.q}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map(opt => (
                  <label key={opt} className={`px-4 py-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                    answers[q.id] === opt ? 'border-teal-500 bg-teal-50/20' : 'border-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  }`}>
                    <input 
                      type="radio" 
                      name={`q-${q.id}`} 
                      value={opt} 
                      checked={answers[q.id] === opt} 
                      onChange={() => handleOptionChange(q.id, opt)} 
                      className="text-teal-600 focus:ring-teal-500" 
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={calculateScore} className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-lg">
            Submit Assessment Test
          </button>

          {score !== null && (
            <div className="mt-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
              <div className="text-lg">Assessment Score: <strong className="text-teal-600 text-2xl">{score} / {questions.length}</strong></div>
              <div className="text-xs text-slate-400 mt-1">{score === questions.length ? "Competent in Theory!" : "Review material to achieve competence."}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 2. Regular Tools Section
export function RegularTools() {
  const [activeSubTool, setActiveSubTool] = useState('Age');

  // Age Calculator State
  const [dob, setDob] = useState('');
  const [ageResult, setAgeResult] = useState(null);

  // CGPA Calculator State
  const [semesters, setSemesters] = useState(['', '', '']);
  const [cgpaResult, setCgpaResult] = useState(null);

  // BMI Calculator State
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bmiResult, setBmiResult] = useState(null);

  const calculateAge = () => {
    if (!dob) return;
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
    const months = ageDate.getUTCMonth();
    const days = ageDate.getUTCDate() - 1;
    setAgeResult({ years, months, days });
  };

  const calculateCGPA = () => {
    const validGPAs = semesters.map(val => parseFloat(val)).filter(n => !isNaN(n));
    if (!validGPAs.length) return;
    const sum = validGPAs.reduce((acc, curr) => acc + curr, 0);
    setCgpaResult((sum / validGPAs.length).toFixed(2));
  };

  const calculateBMI = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // convert cm to meters
    if (isNaN(w) || isNaN(h) || h === 0) return;
    const bmi = w / (h * h);
    let label = "Normal";
    if (bmi < 18.5) label = "Underweight";
    else if (bmi >= 25) label = "Overweight";
    setBmiResult({ bmi: bmi.toFixed(1), label });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fadeIn">
      {/* Selector Menu */}
      <div className="lg:col-span-1 glass-panel p-4 rounded-2xl space-y-2">
        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Tools Library</h3>
        {['Age', 'CGPA', 'BMI'].map(tool => (
          <button 
            key={tool}
            onClick={() => setActiveSubTool(tool)}
            className={`w-full text-left px-4 py-3 rounded-xl transition font-medium ${
              activeSubTool === tool ? 'bg-teal-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tool} Calculator
          </button>
        ))}
      </div>

      {/* Tool panel */}
      <div className="lg:col-span-3 glass-panel p-6 rounded-2xl">
        {activeSubTool === 'Age' && (
          <div className="space-y-4">
            <h4 className="font-bold text-xl">Age Calculator</h4>
            <p className="text-sm text-slate-400">Calculate your exact age for admission requirements.</p>
            <input 
              type="date" 
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full max-w-sm px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            />
            <div>
              <button onClick={calculateAge} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">
                Calculate
              </button>
            </div>
            {ageResult && (
              <div className="p-4 bg-teal-500/10 rounded-xl text-lg font-bold text-teal-600">
                Age: {ageResult.years} Years, {ageResult.months} Months, {ageResult.days} Days
              </div>
            )}
          </div>
        )}

        {activeSubTool === 'CGPA' && (
          <div className="space-y-4">
            <h4 className="font-bold text-xl">CGPA Average Calculator</h4>
            <div className="space-y-2">
              {semesters.map((val, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-sm font-medium w-24">Semester {idx+1}:</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="GPA"
                    value={val}
                    onChange={(e) => {
                      const copy = [...semesters];
                      copy[idx] = e.target.value;
                      setSemesters(copy);
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border max-w-xs"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={calculateCGPA} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">
                Calculate CGPA
              </button>
              <button onClick={() => setSemesters([...semesters, ''])} className="px-4 py-2 bg-slate-100 dark:bg-slate-850 rounded-xl text-sm border">
                + Add Semester
              </button>
            </div>
            {cgpaResult && (
              <div className="p-4 bg-teal-500/10 rounded-xl text-lg font-bold text-teal-600">
                Average CGPA: {cgpaResult}
              </div>
            )}
          </div>
        )}

        {activeSubTool === 'BMI' && (
          <div className="space-y-4">
            <h4 className="font-bold text-xl">BMI & Wellness Calculator</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold block mb-1">Weight (kg)</label>
                <input 
                  type="number"
                  placeholder="e.g. 70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Height (cm)</label>
                <input 
                  type="number"
                  placeholder="e.g. 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border"
                />
              </div>
            </div>
            <button onClick={calculateBMI} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">
              Calculate BMI
            </button>
            {bmiResult && (
              <div className="p-4 bg-teal-500/10 rounded-xl">
                <div className="text-lg font-bold text-teal-600">BMI: {bmiResult.bmi}</div>
                <div className="text-sm font-medium">Category: {bmiResult.label}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Probasi Seba Section
export function ProbasiSeba() {
  const [visaCountry, setVisaCountry] = useState('Saudi Arabia');
  const [visaNum, setVisaNum] = useState('');
  const [visaStatus, setVisaStatus] = useState(null);

  const checkVisa = (e) => {
    e.preventDefault();
    if (!visaNum) return;
    const countries = {
      'Saudi Arabia': ['SA123', 'SA987'],
      'UAE': ['AE456'],
      'Qatar': ['QA789']
    };
    const list = countries[visaCountry] || [];
    if (list.includes(visaNum)) {
      setVisaStatus({ valid: true, msg: "Visa is VALID. Pre-departure Orientation clearance approved." });
    } else {
      setVisaStatus({ valid: false, msg: "Visa record NOT found or processing. Please contact Paikgacha TTC office." });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-xl font-bold text-teal-600 flex items-center gap-2">
          <i data-lucide="plane"></i> Expatriate Pre-Departure Portal
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Paikgacha TTC provides mandatory Pre-Departure Orientation (PDO) training for outbound migrant workers. Register and verify orientation certificates here.
        </p>
        <div className="space-y-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
            <h4 className="font-bold text-xs">Required Documents for PDO:</h4>
            <ul className="list-disc pl-4 text-xs mt-2 text-slate-600 dark:text-slate-400 space-y-1">
              <li>Passport Copy (valid for 6 months)</li>
              <li>Valid Job Visa Copy</li>
              <li>BMET Registration Confirmation</li>
              <li>1 Passport Size Photo</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-lg">BMET Visa Clearance Tracker</h3>
        <form onSubmit={checkVisa} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">Destination</label>
              <select 
                value={visaCountry} 
                onChange={(e) => setVisaCountry(e.target.value)}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl"
              >
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="UAE">UAE</option>
                <option value="Qatar">Qatar</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Visa Reference Number</label>
              <input 
                type="text" 
                placeholder="e.g. SA123" 
                value={visaNum}
                onChange={(e) => setVisaNum(e.target.value)}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
              />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition">
            Check Status
          </button>
        </form>

        {visaStatus && (
          <div className={`p-4 rounded-xl border ${
            visaStatus.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-400'
          }`}>
            <div className="font-semibold text-sm">{visaStatus.msg}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. Video Tutorials Section
export function VideoTutorials() {
  const videos = [
    { title: "Viva exam Driving License।। Traffic Sign", trade: "Automotive Mechanics", url: "https://www.youtube.com/embed/j-Uix4W3sDY?list=PLe-_6Kx3kbJYZShCQ6rISA5D4oWzsOxM-" },
    { title: "What is IP Address? | Networking Basic Class - 01 | IT Support Level-3 (Bangla)", trade: "IT Support", url: "https://www.youtube.com/embed/TELxFICZNsQ" },
    { title: "BTEB CBT/A Exam Prep Guidelines", trade: "All Trades", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-bold">E-Learning & Video Tutorials</h2>
        <p className="text-sm text-slate-500">Access quality instructional recordings prepared by our certified instructors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {videos.map((vid, idx) => (
          <div key={idx} className="glass-panel overflow-hidden rounded-2xl flex flex-col justify-between">
            <div className="aspect-video bg-slate-900">
              <iframe 
                src={vid.url}
                title={vid.title}
                className="w-full h-full"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-4 space-y-2">
              <span className="text-xs px-2 py-1 bg-teal-500/10 text-teal-600 rounded font-bold">{vid.trade}</span>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">{vid.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Contact Section
export function Contact() {
  const [formSent, setFormSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSent(true);
    e.target.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-xl font-bold">Contact Campus</h3>
        <p className="text-sm text-slate-500">
          Our friendly administration desk is available 9:00 AM - 5:00 PM (Saturday - Thursday).
        </p>
        <div className="space-y-3 text-sm text-slate-650 dark:text-slate-400">
          <p><strong>Address:</strong> Shivbati Bridge Road, Paikgacha-9280, Khulna</p>
          <p><strong>Phone:</strong> +8801712404653</p>
          <p><strong>Email:</strong> anirban.pttc@gmail.com</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="font-bold text-lg mb-4">Send a Direct Message</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Full Name" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl" />
          <input type="email" placeholder="Email" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl" />
          <textarea placeholder="Your Message..." required rows="4" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"></textarea>
          <button type="submit" className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition">
            Send Message
          </button>
        </form>
        {formSent && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-center rounded-xl mt-4 font-bold text-sm">
            Message sent successfully!
          </div>
        )}
      </div>
    </div>
  );
}

// 6. About Us Section
export function AboutUs() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="glass-panel p-8 rounded-3xl text-center space-y-4">
        <h2 className="text-3xl font-extrabold text-teal-600">Paikgacha Technical Training Center (PTTC)</h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Paikgacha TTC has been a leading technological learning provider in Bangladesh, providing CBT/A trainings and orientation programs to thousands of candidates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-bold text-lg text-slate-850 dark:text-slate-200 mb-2">Our Vision</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            To develop skilled technical workers who will meet standard national and international market specifications, contributing significantly to national productivity.
          </p>
        </div>
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-bold text-lg text-slate-850 dark:text-slate-200 mb-2">Key Training Trades</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            - IT Support & Systems<br />
            - Graphic Design & Web Creation<br />
            - Automotive Repair & Mechanics<br />
            - Electrical House Wiring<br />
            - Industrial Sewing Machine Operation
          </p>
        </div>
      </div>
    </div>
  );
}

// 7. Enrollment Registration Section
export function Enrollment({ students, setStudents }) {
  const [appId, setAppId] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = `STU${Date.now().toString().slice(-4)}`;
    const student = {
      id,
      name: fd.get('name'),
      trade: fd.get('trade'),
      batch: "Batch-46",
      phone: fd.get('phone'),
      email: fd.get('email'),
      status: "Pending",
      grade: "N/A",
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [student, ...students];
    setStudents(updated);
    saveStoredData('pttc_students', updated);
    setSuccessMsg(id);
    e.target.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4">Online Admission Application Form</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">Full Name</label>
              <input type="text" name="name" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Select Course Trade</label>
              <select name="trade" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl">
                <option value="IT Support">IT Support & System Administration</option>
                <option value="Graphic Design">Graphic Design & UI Layouts</option>
                <option value="Automotive Mechanics">Automotive System Mechanics</option>
                <option value="Electrical Installation">Electrical House Wiring</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Phone Number</label>
              <input type="text" name="phone" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Email Address</label>
              <input type="email" name="email" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl" />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition">
            Submit Application
          </button>
        </form>

        {successMsg && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-xl mt-4">
            <div className="font-bold">Application Submitted Successfully!</div>
            <div className="text-xs mt-1">Please write down your Application ID for status tracking: <strong>{successMsg}</strong></div>
          </div>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-lg">Query Application Status</h3>
        <input 
          type="text" 
          placeholder="Application ID (e.g. STU1004)"
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
        />
        {appId && (
          <div className="p-4 bg-slate-100 dark:bg-slate-850 rounded-xl">
            {students.find(s => s.id === appId) ? (
              <div>
                <div className="text-sm font-semibold">Name: {students.find(s => s.id === appId).name}</div>
                <div className="text-xs text-slate-500 mt-1">Trade: {students.find(s => s.id === appId).trade}</div>
                <div className="mt-2 text-xs font-bold">
                  Status: 
                  <span className={`ml-2 px-2 py-0.5 rounded ${
                    students.find(s => s.id === appId).status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {students.find(s => s.id === appId).status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-rose-500 font-semibold">No record found with ID {appId}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
