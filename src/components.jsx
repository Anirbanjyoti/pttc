import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { HIND_SILIGURI_BASE64 } from './fontBase64';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { 
  Award, 
  Megaphone, 
  FileSpreadsheet, 
  FileText, 
  CheckSquare, 
  Globe, 
  Play, 
  Info, 
  Mail, 
  Plane, 
  Search, 
  Edit2, 
  Trash2,
  UserPlus,
  ArrowLeft,
  Sliders,
  X,
  CheckCircle
} from 'lucide-react';

// Helper to load/save notices and teachers locally (as they do not require MongoDB per scope)
export const getStoredData = (key, fallback) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  const parsed = JSON.parse(data);
  if (key === 'pttc_notices') {
    const migrated = parsed.map(n =>
      n.replace("Admission is open for CBT Batch-46 (IT Support, Graphics, Welding).", "Admission is open for BMET Regular (IT Support, Graphics, Welding).")
    );
    if (JSON.stringify(migrated) !== data) {
      localStorage.setItem(key, JSON.stringify(migrated));
    }
    return migrated;
  }
  return parsed;
};

export const saveStoredData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const INITIAL_TEACHERS = [
  { id: "TCH2001", name: "Engr. Mahmudul Hasan", trade: "IT Support", email: "mahmud@pttc.edu", phone: "+8801700000101" },
  { id: "TCH2002", name: "Shahnaz Parveen", trade: "Sewing Machine Operation", email: "shahnaz@pttc.edu", phone: "+8801700000102" },
  { id: "TCH2003", name: "M. A. Mannan", trade: "Automotive Mechanics", email: "mannan@pttc.edu", phone: "+8801700000103" }
];

// -------------------------------------------------------------
// ADMIN PORTAL
// -------------------------------------------------------------
export function PortalAdmin({ students }) {
  const [adminUser, setAdminUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | students | teachers
  const [teachers, setTeachers] = useState(() => getStoredData('pttc_teachers', INITIAL_TEACHERS));
  const [filterTrade, setFilterTrade] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newNotice, setNewNotice] = useState('');
  const [notices, setNotices] = useState(() => getStoredData('pttc_notices', [
    "Admission is open for BMET Regular (IT Support, Graphics, Welding).",
    "Pre-departure Orientation Program scheduled for expatriates on June 2nd, 2026."
  ]));

  // Edit states
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Monitor Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });
    return unsubscribe;
  }, []);

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid administrator credentials.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!resetEmail) {
      setError('Please enter your admin email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('Password reset link sent! Please check your email inbox/spam folder.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send password reset email.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  // CRUD Student Handlers (API / MongoDB integration)
  const handleStatusChange = async (id, nextStatus) => {
    try {
      await updateDoc(doc(db, 'students', id), { status: nextStatus });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (confirm("Are you sure you want to delete this student record?")) {
      try {
        await deleteDoc(doc(db, 'students', id));
      } catch (err) {
        console.error('Error deleting student:', err);
      }
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    try {
      await updateDoc(doc(db, 'students', editingStudent.id), data);
      setEditingStudent(null);
    } catch (err) {
      console.error('Error updating student details:', err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const maxNum = students.reduce((max, s) => {
      const parts = s.id?.split('-');
      if (parts && parts.length === 2) {
        const num = parseInt(parts[1], 10);
        return !isNaN(num) && num > max ? num : max;
      }
      return max;
    }, 0);
    const tradeCode = (formData.get('trade') || 'IT').substring(0, 2).toUpperCase();
    const id = `STU${tradeCode}-${String(maxNum + 1).padStart(4, '0')}`;
    try {
      await setDoc(doc(db, 'students', id), {
        id,
        name: formData.get('name'),
        trade: formData.get('trade'),
        batch: formData.get('batch'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        status: "Pending",
        grade: "N/A",
        date: new Date().toISOString().split('T')[0]
      });
      e.target.reset();
    } catch (err) {
      console.error('Error registering student:', err);
    }
  };

  // CRUD Teacher Handlers (remain local storage)
  const handleAddTeacher = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newTeacher = {
      id: `TCH${Date.now().toString().slice(-4)}`,
      name: fd.get('name'),
      trade: fd.get('trade'),
      email: fd.get('email'),
      phone: fd.get('phone')
    };
    const updated = [newTeacher, ...teachers];
    setTeachers(updated);
    saveStoredData('pttc_teachers', updated);
    e.target.reset();
  };

  const handleDeleteTeacher = (id) => {
    if (confirm("Are you sure you want to delete this teacher profile?")) {
      const updated = teachers.filter(t => t.id !== id);
      setTeachers(updated);
      saveStoredData('pttc_teachers', updated);
    }
  };

  const handleUpdateTeacher = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = teachers.map(t => t.id === editingTeacher.id ? {
      ...t,
      name: fd.get('name'),
      trade: fd.get('trade'),
      email: fd.get('email'),
      phone: fd.get('phone')
    } : t);
    setTeachers(updated);
    saveStoredData('pttc_teachers', updated);
    setEditingTeacher(null);
  };

  const handleAddNotice = (e) => {
    e.preventDefault();
    if (!newNotice.trim()) return;
    const updated = [newNotice, ...notices];
    setNotices(updated);
    saveStoredData('pttc_notices', updated);
    setNewNotice('');
  };

  const exportToExcel = () => {
    const dataToExport = filteredStudents.map((s) => ({
      "Student ID": s.id,
      "Name (English)": s.name || s.nameEnglishBlock || "",
      "Name (Bangla)": s.nameBangla || "",
      "Father's Name (English)": s.fatherNameEnglish || "",
      "Father's Name (Bangla)": s.fatherNameBangla || "",
      "Mother's Name (English)": s.motherNameEnglish || "",
      "Mother's Name (Bangla)": s.motherNameBangla || "",
      "DOB": s.dob || "",
      "Gender": s.gender || "",
      "Religion": s.religion || "",
      "Nationality": s.nationality || "",
      "Blood Group": s.bloodGroup || "",
      "NID/BR": s.nidBr || "",
      "Phone No": s.phoneNo || "",
      "Guardian Phone No": s.guardianPhoneNo || "",
      
      // Permanent Address
      "No.3. Permanent Address": [
        s.permHoldingNo ? `Holding No: ${s.permHoldingNo}` : '',
        s.permVillCity ? `Village/City: ${s.permVillCity}` : '',
        s.permPost ? `Post Office: ${s.permPost}` : '',
        s.permThana ? `Thana: ${s.permThana}` : '',
        s.permDistrict ? `District: ${s.permDistrict}` : ''
      ].filter(Boolean).join(', ') || "",

      // Present Address
      "No.4. Present Address": [
        s.presHoldingNo ? `Holding No: ${s.presHoldingNo}` : '',
        s.presVillCity ? `Village/City: ${s.presVillCity}` : '',
        s.presPost ? `Post Office: ${s.presPost}` : '',
        s.presThana ? `Thana: ${s.presThana}` : '',
        s.presDistrict ? `District: ${s.presDistrict}` : ''
      ].filter(Boolean).join(', ') || "",

      // Education
      "Exam Name": s.eduExamName || "",
      "Division/Class": s.eduDivision || "",
      "GPA/Marks": s.eduGpa || "",
      "Passing Year": s.eduPassingYear || "",
      "Board/University": s.eduBoardUniv || "",

      // Experience
      "Exp. Organization": s.expName || "",
      "Exp. Designation": s.expDesignation || "",
      "Exp. Responsibilities": s.expResponsibility || "",
      "Exp. Duration": s.expTimePeriod || "",

      "Trade/Course": s.trade || "",
      "Batch": s.batch || "",
      "Status": s.status || "",
      "CBT Grade": s.grade || "",
      "Enrollment Date": s.date || ""
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PTTC Students");
    XLSX.writeFile(workbook, "PTTC_Students_Report.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.addFileToVFS('HindSiliguri.ttf', HIND_SILIGURI_BASE64);
    doc.addFont('HindSiliguri.ttf', 'HindSiliguri', 'normal');
    doc.setFont("HindSiliguri", "normal");
    doc.setFontSize(16);
    doc.text("Paikgacha Technical Training Center (PTTC)", 14, 20);
    doc.setFontSize(11);
    doc.text("Student Detailed Enrollment Report", 14, 27);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 33);
    doc.line(14, 36, 196, 36);

    let y = 43;
    filteredStudents.forEach((s, index) => {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.setFont("HindSiliguri", "normal");
      doc.text(`${index + 1}. ${s.name || s.nameEnglishBlock || 'N/A'} (${s.id})`, 14, y);
      
      doc.setFont("HindSiliguri", "normal");
      doc.setFontSize(8.5);
      
      doc.text(`Trade: ${s.trade} | Batch: ${s.batch} | Date: ${s.date} | Status: ${s.status}`, 14, y + 4.5);
      doc.text(`Bangla Name: ${s.nameBangla || 'N/A'} | NID/BR: ${s.nidBr || 'N/A'} | DOB: ${s.dob || 'N/A'} | Blood: ${s.bloodGroup || 'N/A'}`, 14, y + 8.5);
      doc.text(`Father's Name: ${s.fatherNameEnglish || 'N/A'} | Mother's Name: ${s.motherNameEnglish || 'N/A'}`, 14, y + 12.5);
      doc.text(`Phone: ${s.phoneNo || 'N/A'} | Guardian Phone: ${s.guardianPhoneNo || 'N/A'}`, 14, y + 16.5);

      doc.setFont("HindSiliguri", "normal");
      doc.text(`No.3. Permanent Address:`, 14, y + 21.5);
      doc.text(`No.4. Present Address:`, 105, y + 21.5);
      
      doc.setFont("HindSiliguri", "normal");
      doc.text(`Holding: ${s.permHoldingNo || 'N/A'}, ${s.permVillCity || 'N/A'}, Post: ${s.permPost || 'N/A'}, Thana: ${s.permThana || 'N/A'}, Dist: ${s.permDistrict || 'N/A'}`, 14, y + 25.5, { maxWidth: 85 });
      doc.text(`Holding: ${s.presHoldingNo || 'N/A'}, ${s.presVillCity || 'N/A'}, Post: ${s.presPost || 'N/A'}, Thana: ${s.presThana || 'N/A'}, Dist: ${s.presDistrict || 'N/A'}`, 105, y + 25.5, { maxWidth: 85 });

      doc.text(`Education: ${s.eduExamName || 'N/A'} - GPA: ${s.eduGpa || 'N/A'} (${s.eduPassingYear || 'N/A'} - ${s.eduBoardUniv || 'N/A'})`, 14, y + 35.5);
      if (s.expName) {
        doc.text(`Experience: ${s.expName} - ${s.expDesignation} (${s.expTimePeriod})`, 14, y + 39.5);
        doc.line(14, y + 43, 196, y + 43);
        y += 48;
      } else {
        doc.line(14, y + 39, 196, y + 39);
        y += 44;
      }
    });

    doc.save("PTTC_Detailed_Students_Report.pdf");
  };

  const filteredStudents = students.filter(s => {
    const matchTrade = filterTrade === 'All' || s.trade === filterTrade;
    const matchStatus = filterStatus === 'All' || s.status === filterStatus;
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.trade.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTrade && matchStatus && matchSearch;
  });

  // RENDER AUTHENTICATION GATES
  if (!adminUser) {
    return (
      <div className="max-w-md mx-auto my-12 animate-fadeIn">
        <div className="glass-panel p-8 rounded-3xl border border-teal-500/20 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-6">
            <span className="text-xs px-2.5 py-1 bg-teal-500/10 text-teal-700 rounded-full font-bold uppercase">Secured Administrator Portal</span>
            <h3 className="text-2xl font-extrabold mt-3 text-slate-800 dark:text-slate-100">Paikgacha TTC Admin</h3>
          </div>

          {error && <div className="p-3 mb-4 text-xs font-semibold text-rose-600 bg-rose-500/10 rounded-xl border border-rose-500/15">{error}</div>}
          {success && <div className="p-3 mb-4 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-xl border border-emerald-500/15">{success}</div>}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Admin Email</label>
                <input type="email" placeholder="admin@pttc.edu" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition shadow">
                Authenticate Administrator
              </button>
              <p className="text-xs text-center text-slate-500 mt-4">
                Forgot your password?{' '}
                <button type="button" onClick={() => { setAuthMode('reset'); setError(''); }} className="text-teal-600 font-bold hover:underline">Reset Here</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Admin Email Address</label>
                <input type="email" placeholder="admin@pttc.edu" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition shadow">
                Send Password Reset Link
              </button>
              <p className="text-xs text-center text-slate-500 mt-4">
                Remember your password?{' '}
                <button type="button" onClick={() => { setAuthMode('login'); setError(''); }} className="text-teal-600 font-bold hover:underline">Sign In</button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // RENDER LOGGED IN ADMIN PANEL
  const totalStudents = students.length;
  const pendingApps = students.filter(s => s.status === 'Pending').length;
  const approvedStudents = students.filter(s => s.status === 'Approved').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Admin Header with Profile Details */}
      <div className="glass-panel p-4 px-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-500/10">
        <div>
          <span className="text-xs text-teal-600 font-bold tracking-wider uppercase">Active Firebase Session</span>
          <h2 className="text-lg font-bold text-slate-850 dark:text-slate-150">Welcome, Admin ({adminUser.email})</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 gap-4">
        <button onClick={() => setActiveTab('dashboard')} className={`pb-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'dashboard' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'}`}>Dashboard & Notices</button>
        <button onClick={() => setActiveTab('students')} className={`pb-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'students' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'}`}>Students Registry ({totalStudents})</button>
        <button onClick={() => setActiveTab('teachers')} className={`pb-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'teachers' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500'}`}>Teachers Directory ({teachers.length})</button>
      </div>

      {/* DASHBOARD TAB VIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
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
            <div className="lg:col-span-1 space-y-6">
              {/* Notice Manager */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-teal-500" /> Publish Announcement
                </h3>
                <form onSubmit={handleAddNotice} className="space-y-4">
                  <textarea 
                    value={newNotice}
                    onChange={(e) => setNewNotice(e.target.value)}
                    placeholder="Type new notice for marquee board..."
                    rows="3"
                    className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-slate-800 dark:text-white text-sm"
                  />
                  <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition">
                    Publish Live notice
                  </button>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
              <h3 className="font-bold text-lg mb-4">Notice Archive</h3>
              <div className="space-y-3">
                {notices.map((n, i) => (
                  <div key={i} className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl border text-sm">
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS REGISTRY TAB VIEW */}
      {activeTab === 'students' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Student registry list */}
          <div className="w-full space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold">Registry Directory</h3>
                <div className="flex items-center gap-2">
                  <button onClick={exportToExcel} className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 font-bold shadow">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                  </button>
                  <button onClick={exportToPDF} className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1 font-bold shadow">
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input type="text" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 border text-sm text-slate-850 dark:text-white">
                  <option value="All">All Trades</option>
                  <option value="IT Support">IT Support</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Automotive Mechanics">Automotive</option>
                  <option value="Electrical Installation">Electrical Installation</option>
                  <option value="Sewing Machine Operation">Sewing Machine Operation</option>
                  <option value="English Language">English Language</option>
                  <option value="Arabic Language">Arabic Language</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 border text-sm text-slate-850 dark:text-white">
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-400 text-xs">
                      <th className="pb-3">Sl No</th>
                      <th className="pb-3">Photo</th>
                      <th className="pb-3">Student Info</th>
                      <th className="pb-3">NID/BR</th>
                      <th className="pb-3">Trade</th>
                      <th className="pb-3">Batch</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3 text-xs font-bold text-slate-450">{idx + 1}</td>
                        <td className="py-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {s.photo ? (
                              <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-[10px] font-bold text-slate-400">{s.name ? s.name[0] : 'S'}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.id} | {s.phone}</div>
                        </td>
                        <td className="py-3 text-xs">{s.nidBr || 'N/A'}</td>
                        <td className="py-3 text-xs">{s.trade}</td>
                        <td className="py-3 text-xs">{s.batch}</td>
                        <td className="py-3">
                          <select 
                            value={s.status} 
                            onChange={(e) => handleStatusChange(s.id, e.target.value)}
                            className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-855 border rounded font-semibold text-slate-700 dark:text-slate-200"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => setEditingStudent(s)} className="px-2.5 py-1 text-xs bg-teal-500 hover:bg-teal-650 text-white rounded font-bold transition">Edit</button>
                          <button onClick={() => handleDeleteStudent(s.id)} className="px-2.5 py-1 text-xs bg-rose-500 hover:bg-rose-650 text-white rounded font-bold transition">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEACHERS REGISTRY TAB VIEW */}
      {activeTab === 'teachers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add teacher sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-4">Register Instructor</h3>
              <form onSubmit={handleAddTeacher} className="space-y-3">
                <input name="name" type="text" placeholder="Instructor Name" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <select name="trade" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 border text-sm text-slate-850 dark:text-white">
                  <option value="IT Support">IT Support & IoT</option>
                  <option value="Graphic Design">Graphic Design & UI/UX</option>
                  <option value="Automotive Mechanics">Automotive Mechanics</option>
                  <option value="Electrical Installation">Electrical Installation</option>
                  <option value="Sewing Machine Operation">Sewing Machine Operation</option>
                  <option value="English Language">English Language</option>
                  <option value="Arabic Language">Arabic Language</option>
                </select>
                <input name="email" type="email" placeholder="Email Address" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <input name="phone" type="text" placeholder="Phone Number" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <button type="submit" className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition">
                  Register Teacher Profile
                </button>
              </form>
            </div>
          </div>

          {/* Teacher directory list */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-xl font-bold mb-6">Faculty Registry</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-400 text-xs">
                      <th className="pb-3">Instructor Info</th>
                      <th className="pb-3">Trade/Course</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {teachers.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</div>
                          <div className="text-xs text-slate-400">{t.id} | {t.email} | {t.phone}</div>
                        </td>
                        <td className="py-3 text-xs">{t.trade}</td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => setEditingTeacher(t)} className="px-2.5 py-1 text-xs bg-teal-500 hover:bg-teal-650 text-white rounded font-bold transition">Edit</button>
                          <button onClick={() => handleDeleteTeacher(t.id)} className="px-2.5 py-1 text-xs bg-rose-500 hover:bg-rose-650 text-white rounded font-bold transition">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT OVERLAY MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 rounded-3xl border border-teal-500/20 shadow-2xl relative">
            <h3 className="text-xl font-extrabold mb-6">Edit Student Full Record</h3>
            <form onSubmit={handleUpdateStudent} className="space-y-6">

              {/* Section 1: Institutional */}
              <div className="space-y-3">
                <div className="border-l-4 border-teal-500 pl-3">
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Institutional Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Trade *</label>
                    <select name="trade" defaultValue={editingStudent.trade} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                      <option value="IT Support">IT Support & IoT</option>
                      <option value="Graphic Design">Graphic Design & UI/UX</option>
                      <option value="Automotive Mechanics">Automotive Mechanics</option>
                      <option value="Electrical Installation">Electrical Installation</option>
                      <option value="Sewing Machine Operation">Sewing Machine Operation</option>
                      <option value="English Language">English Language</option>
                      <option value="Arabic Language">Arabic Language</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Batch *</label>
                    <input name="batch" type="text" defaultValue={editingStudent.batch} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Information */}
              <div className="space-y-3">
                <div className="border-l-4 border-teal-500 pl-3">
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Personal Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Name (English) *</label>
                    <input name="name" type="text" defaultValue={editingStudent.name || editingStudent.nameEnglishBlock || ''} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm uppercase" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Name (Bangla)</label>
                    <input name="nameBangla" type="text" defaultValue={editingStudent.nameBangla || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Father's Name (English)</label>
                    <input name="fatherNameEnglish" type="text" defaultValue={editingStudent.fatherNameEnglish || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Father's Name (Bangla)</label>
                    <input name="fatherNameBangla" type="text" defaultValue={editingStudent.fatherNameBangla || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Mother's Name (English)</label>
                    <input name="motherNameEnglish" type="text" defaultValue={editingStudent.motherNameEnglish || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Mother's Name (Bangla)</label>
                    <input name="motherNameBangla" type="text" defaultValue={editingStudent.motherNameBangla || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">DOB</label>
                    <input name="dob" type="date" defaultValue={editingStudent.dob || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Gender</label>
                    <select name="gender" defaultValue={editingStudent.gender || 'Male'} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Religion</label>
                    <select name="religion" defaultValue={editingStudent.religion || 'Islam'} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                      <option value="Islam">Islam</option>
                      <option value="Hinduism">Hinduism</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Christianity">Christianity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Nationality</label>
                    <input name="nationality" type="text" defaultValue={editingStudent.nationality || 'Bangladeshi'} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Blood Group</label>
                    <select name="bloodGroup" defaultValue={editingStudent.bloodGroup || 'O+'} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">NID/BR Number</label>
                    <input name="nidBr" type="text" defaultValue={editingStudent.nidBr || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Phone No</label>
                    <input name="phoneNo" type="text" defaultValue={editingStudent.phoneNo || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Guardian Phone No</label>
                    <input name="guardianPhoneNo" type="text" defaultValue={editingStudent.guardianPhoneNo || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 3: Permanent Address */}
              <div className="space-y-3">
                <div className="border-l-4 border-teal-500 pl-3">
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Permanent Address</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Holding No</label>
                    <input name="permHoldingNo" type="text" defaultValue={editingStudent.permHoldingNo || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Village / City</label>
                    <input name="permVillCity" type="text" defaultValue={editingStudent.permVillCity || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Post Office</label>
                    <input name="permPost" type="text" defaultValue={editingStudent.permPost || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Thana</label>
                    <input name="permThana" type="text" defaultValue={editingStudent.permThana || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold block mb-1">District</label>
                    <input name="permDistrict" type="text" defaultValue={editingStudent.permDistrict || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 4: Present Address */}
              <div className="space-y-3">
                <div className="border-l-4 border-teal-500 pl-3">
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Present Address</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Holding No</label>
                    <input name="presHoldingNo" type="text" defaultValue={editingStudent.presHoldingNo || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Village / City</label>
                    <input name="presVillCity" type="text" defaultValue={editingStudent.presVillCity || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Post Office</label>
                    <input name="presPost" type="text" defaultValue={editingStudent.presPost || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Thana</label>
                    <input name="presThana" type="text" defaultValue={editingStudent.presThana || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold block mb-1">District</label>
                    <input name="presDistrict" type="text" defaultValue={editingStudent.presDistrict || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 5: Education */}
              <div className="space-y-3">
                <div className="border-l-4 border-teal-500 pl-3">
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Educational Qualification</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Exam Name</label>
                    <select name="eduExamName" defaultValue={editingStudent.eduExamName || 'SSC'} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                      <option value="SSC">SSC</option>
                      <option value="HSC">HSC</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Post Graduate">Post Graduate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Division/Class</label>
                    <select name="eduDivision" defaultValue={editingStudent.eduDivision || '1st'} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                      <option value="1st">1st Division</option>
                      <option value="2nd">2nd Division</option>
                      <option value="3rd">3rd Division</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">GPA / Marks</label>
                    <input name="eduGpa" type="text" defaultValue={editingStudent.eduGpa || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Passing Year</label>
                    <input name="eduPassingYear" type="text" defaultValue={editingStudent.eduPassingYear || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold block mb-1">Board / University</label>
                    <input name="eduBoardUniv" type="text" defaultValue={editingStudent.eduBoardUniv || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 6: Experience */}
              <div className="space-y-3">
                <div className="border-l-4 border-teal-500 pl-3">
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Professional Experience</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Organization</label>
                    <input name="expName" type="text" defaultValue={editingStudent.expName || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Designation</label>
                    <input name="expDesignation" type="text" defaultValue={editingStudent.expDesignation || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Responsibilities</label>
                    <input name="expResponsibility" type="text" defaultValue={editingStudent.expResponsibility || ''} className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Duration</label>
                    <input name="expTimePeriod" type="text" defaultValue={editingStudent.expTimePeriod || ''} placeholder="e.g. 2 years" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Section 7: Status & Grade */}
              <div className="space-y-3">
                <div className="border-l-4 border-teal-500 pl-3">
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Status & Grade</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Enrollment Status *</label>
                    <select name="status" defaultValue={editingStudent.status} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">CBT Grade *</label>
                    <input name="grade" type="text" defaultValue={editingStudent.grade} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              {/* Photo & Signature Preview */}
              {(editingStudent.photo || editingStudent.signature) && (
                <div className="space-y-3">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-850 dark:text-white text-base">Uploaded Images</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editingStudent.photo && (
                      <div>
                        <label className="text-xs font-bold block mb-1">Photo</label>
                        <img src={editingStudent.photo} alt="Student photo" className="w-24 h-24 object-cover rounded-xl border" />
                      </div>
                    )}
                    {editingStudent.signature && (
                      <div>
                        <label className="text-xs font-bold block mb-1">Signature</label>
                        <img src={editingStudent.signature} alt="Signature" className="w-32 h-12 object-contain rounded-xl border bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="submit" className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition">Save All Changes</button>
                <button type="button" onClick={() => setEditingStudent(null)} className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl transition font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEACHER OVERLAY MODAL */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-teal-500/20 shadow-2xl relative">
            <h3 className="text-xl font-extrabold mb-4">Edit Teacher Profile</h3>
            <form onSubmit={handleUpdateTeacher} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Instructor Name</label>
                <input name="name" type="text" defaultValue={editingTeacher.name} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Trade/Course</label>
                <select name="trade" defaultValue={editingTeacher.trade} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                  <option value="IT Support">IT Support & IoT</option>
                  <option value="Graphic Design">Graphic Design & UI/UX</option>
                  <option value="Automotive Mechanics">Automotive Mechanics</option>
                  <option value="Electrical Installation">Electrical Installation</option>
                  <option value="Sewing Machine Operation">Sewing Machine Operation</option>
                  <option value="English Language">English Language</option>
                  <option value="Arabic Language">Arabic Language</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Email Address</label>
                <input name="email" type="email" defaultValue={editingTeacher.email} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Phone Number</label>
                <input name="phone" type="text" defaultValue={editingTeacher.phone} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition">Save Changes</button>
                <button type="button" onClick={() => setEditingTeacher(null)} className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// TEACHERS PORTAL
// -------------------------------------------------------------
export function PortalTeacher({ students }) {
  const [teacherUser, setTeacherUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [teachers] = useState(() => getStoredData('pttc_teachers', INITIAL_TEACHERS));

  const [selectedBatch, setSelectedBatch] = useState('Batch-01');
  const [gradingStudent, setGradingStudent] = useState(null);
  const [gradeValue, setGradeValue] = useState('Competent');

  // Monitor Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTeacherUser(user);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const matched = teachers.find(t => t.email === cred.user.email);
      if (!matched) {
        await signOut(auth);
        setError(`No teacher account found for "${cred.user.email}". Contact Admin to add you to the Teachers Directory.`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid credentials.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!resetEmail) {
      setError('Please enter your teacher email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('Password reset link sent! Please check your email inbox/spam folder.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send password reset email.');
    }
  };

  // Check if logged-in user matches a teacher record
  const teacherInfo = teacherUser
    ? teachers.find(t => t.email === teacherUser.email)
    : null;

  // Filter students by this teacher's trade
  const myTrade = teacherInfo?.trade || '';
  const myStudents = myTrade
    ? students.filter(s => s.trade === myTrade)
    : [];

  // Further filter by selected batch
  const batchStudents = myStudents.filter(s => s.batch === selectedBatch);

  // Collect available batches from this teacher's students
  const availableBatches = [...new Set(myStudents.map(s => s.batch))].sort();

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!gradingStudent) return;
    try {
      await updateDoc(doc(db, 'students', gradingStudent.id), { grade: gradeValue });
      setGradingStudent(null);
    } catch (err) {
      console.error('Error updating grade:', err);
    }
  };

  // === AUTH GATE: Show login form if not authenticated ===
  if (!teacherUser || !teacherInfo) {
    return (
      <div className="max-w-md mx-auto my-12 animate-fadeIn">
        <div className="glass-panel p-8 rounded-3xl border border-teal-500/20 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-6">
            <span className="text-xs px-2.5 py-1 bg-teal-500/10 text-teal-700 rounded-full font-bold uppercase">Secured Teacher Portal</span>
            <h3 className="text-2xl font-extrabold mt-3 text-slate-800 dark:text-slate-100">PTTC Teacher Login</h3>
            <p className="text-xs text-slate-500 mt-1">Sign in with your registered teacher email</p>
          </div>

          {error && <div className="p-3 mb-4 text-xs font-semibold text-rose-600 bg-rose-500/10 rounded-xl border border-rose-500/15">{error}</div>}
          {success && <div className="p-3 mb-4 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-xl border border-emerald-500/15">{success}</div>}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Teacher Email</label>
                <input type="email" placeholder="teacher@pttc.edu" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition shadow">
                Authenticate Teacher
              </button>
              <p className="text-xs text-center text-slate-500 mt-4">
                Forgot your password?{' '}
                <button type="button" onClick={() => { setAuthMode('reset'); setError(''); setSuccess(''); }} className="text-teal-600 font-bold hover:underline">Reset Here</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Teacher Email Address</label>
                <input type="email" placeholder="teacher@pttc.edu" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition shadow">
                Send Password Reset Link
              </button>
              <p className="text-xs text-center text-slate-500 mt-4">
                Remember your password?{' '}
                <button type="button" onClick={() => { setAuthMode('login'); setError(''); setSuccess(''); }} className="text-teal-600 font-bold hover:underline">Sign In</button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // === DASHBOARD (Authenticated + Trade Found) ===
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Teacher Header */}
      <div className="glass-panel p-4 px-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-500/10">
        <div>
          <span className="text-xs text-teal-600 font-bold tracking-wider uppercase">Authenticated Session</span>
          <h2 className="text-lg font-bold text-slate-850 dark:text-slate-150">
            Welcome, {teacherInfo.name} — {teacherInfo.trade} Department
          </h2>
          <p className="text-xs text-slate-400">{myStudents.length} student(s) in your trade</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Batch Selector */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2">
          <Award className="w-6 h-6" /> Teacher Assessment Dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-1">Review batch registries and assess competency values for {myTrade}.</p>

        <div className="mt-6 flex items-center gap-4">
          <label className="text-sm font-semibold">Select Batch Folder:</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium"
          >
            {availableBatches.length > 0 ? (
              availableBatches.map(batch => (
                <option key={batch} value={batch}>{batch}</option>
              ))
            ) : (
              <option value="">No batches available</option>
            )}
          </select>
        </div>
      </div>

      {/* Student List + Grading Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h3 className="font-bold mb-4">Competency Student Roll — {myTrade}</h3>
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
              <div className="text-center py-8 text-slate-400">No students in {selectedBatch} for {myTrade}</div>
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Student Profile Registry</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter Student ID (e.g. STU1001)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {profile ? (
        <div className="glass-panel p-8 rounded-2xl border border-teal-500/20 shadow-lg relative overflow-hidden space-y-8">
          <div className="absolute right-0 top-0 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl"></div>
          
          {/* Header Info */}
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border bg-slate-200 flex items-center justify-center">
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="font-bold text-3xl text-slate-400">{profile.name[0]}</div>
                )}
              </div>
              <div className="space-y-1.5 text-center md:text-left">
                <div className="text-xs text-teal-600 font-bold uppercase tracking-wider">{profile.trade}</div>
                <h3 className="text-2xl font-extrabold uppercase">{profile.nameEnglishBlock || profile.name}</h3>
                <p className="text-sm text-slate-400 font-semibold">Student ID: {profile.id} | Batch: {profile.batch}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                profile.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                profile.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                Portal Status: {profile.status}
              </span>
              {profile.signature && (
                <div className="w-32 h-10 border bg-white dark:bg-slate-900 rounded p-1 flex items-center justify-center">
                  <img src={profile.signature} alt="Signature" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Details Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            
            {/* Section 1: Personal Details */}
            <div className="space-y-3 p-4 bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl border">
              <h4 className="font-bold text-teal-600 border-b pb-1">Personal Details</h4>
              <div className="space-y-2">
                <div><strong className="text-slate-400">Name (Bangla):</strong> {profile.nameBangla || 'N/A'}</div>
                <div><strong className="text-slate-400">Father's Name:</strong> {profile.fatherNameEnglish || 'N/A'} ({profile.fatherNameBangla || 'N/A'})</div>
                <div><strong className="text-slate-400">Mother's Name:</strong> {profile.motherNameEnglish || 'N/A'} ({profile.motherNameBangla || 'N/A'})</div>
                <div><strong className="text-slate-400">DOB:</strong> {profile.dob || 'N/A'}</div>
                <div><strong className="text-slate-400">Gender:</strong> {profile.gender || 'N/A'}</div>
                <div><strong className="text-slate-400">Religion:</strong> {profile.religion || 'N/A'}</div>
                <div><strong className="text-slate-400">Nationality:</strong> {profile.nationality || 'N/A'}</div>
                <div><strong className="text-slate-400">Blood Group:</strong> {profile.bloodGroup || 'N/A'}</div>
                <div><strong className="text-slate-400">NID / BR No:</strong> {profile.nidBr || 'N/A'}</div>
                <div><strong className="text-slate-400">Phone No:</strong> {profile.phoneNo || 'N/A'}</div>
                <div><strong className="text-slate-400">Guardian Phone No:</strong> {profile.guardianPhoneNo || 'N/A'}</div>
              </div>
            </div>

            {/* Section 2: Addresses */}
            <div className="space-y-4">
              
              {/* Permanent Address */}
              <div className="space-y-2 p-4 bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl border">
                <h4 className="font-bold text-teal-600 border-b pb-1">Permanent Address</h4>
                <div className="space-y-1">
                  <div><strong className="text-slate-400">Holding No:</strong> {profile.permHoldingNo || 'N/A'}</div>
                  <div><strong className="text-slate-400">Village/City:</strong> {profile.permVillCity || 'N/A'}</div>
                  <div><strong className="text-slate-400">Post, Thana:</strong> {profile.permPost || 'N/A'}, {profile.permThana || 'N/A'}</div>
                  <div><strong className="text-slate-400">District:</strong> {profile.permDistrict || 'N/A'}</div>
                </div>
              </div>

              {/* Present Address */}
              <div className="space-y-2 p-4 bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl border">
                <h4 className="font-bold text-teal-600 border-b pb-1">Present Address</h4>
                <div className="space-y-1">
                  <div><strong className="text-slate-400">Holding No:</strong> {profile.presHoldingNo || 'N/A'}</div>
                  <div><strong className="text-slate-400">Village/City:</strong> {profile.presVillCity || 'N/A'}</div>
                  <div><strong className="text-slate-400">Post, Thana:</strong> {profile.presPost || 'N/A'}, {profile.presThana || 'N/A'}</div>
                  <div><strong className="text-slate-400">District:</strong> {profile.presDistrict || 'N/A'}</div>
                </div>
              </div>

            </div>

            {/* Section 3: Educational Qualifications */}
            <div className="space-y-3 p-4 bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl border">
              <h4 className="font-bold text-teal-600 border-b pb-1">Education Background</h4>
              {profile.eduExamName ? (
                <div className="space-y-2">
                  <div><strong className="text-slate-400">Examination:</strong> {profile.eduExamName}</div>
                  <div><strong className="text-slate-400">Division/Class:</strong> {profile.eduDivision}</div>
                  <div><strong className="text-slate-400">GPA / Score:</strong> {profile.eduGpa}</div>
                  <div><strong className="text-slate-400">Passing Year:</strong> {profile.eduPassingYear}</div>
                  <div><strong className="text-slate-400">Board / Varsity:</strong> {profile.eduBoardUniv}</div>
                </div>
              ) : (
                <div className="text-slate-400 italic">No record found.</div>
              )}
            </div>

            {/* Section 4: Experiences */}
            <div className="space-y-3 p-4 bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl border">
              <h4 className="font-bold text-teal-600 border-b pb-1">Professional Experience</h4>
              {profile.expName ? (
                <div className="space-y-2">
                  <div><strong className="text-slate-400">Organization:</strong> {profile.expName}</div>
                  <div><strong className="text-slate-400">Designation:</strong> {profile.expDesignation}</div>
                  <div><strong className="text-slate-400">Responsibilities:</strong> {profile.expResponsibility}</div>
                  <div><strong className="text-slate-400">Duration:</strong> {profile.expTimePeriod}</div>
                </div>
              ) : (
                <div className="text-slate-400 italic">No past work experience recorded.</div>
              )}
            </div>

            {/* Registry Meta */}
            <div className="md:col-span-2 p-4 bg-teal-500/5 rounded-2xl border border-teal-500/10 flex justify-between items-center text-xs">
              <div><strong>Enrollment Date:</strong> {profile.date}</div>
              <div><strong>CBT Competency Grade:</strong> <span className="font-bold text-teal-650 dark:text-teal-400">{profile.grade}</span></div>
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
// SUBPAGES
// -------------------------------------------------------------

// 1. Assessment Tools
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

// 2. Regular Tools
export function RegularTools() {
  const [activeSubTool, setActiveSubTool] = useState('Age');

  const [dob, setDob] = useState('');
  const [ageResult, setAgeResult] = useState(null);

  const [semesters, setSemesters] = useState(['', '', '']);
  const [cgpaResult, setCgpaResult] = useState(null);

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
    const h = parseFloat(height) / 100;
    if (isNaN(w) || isNaN(h) || h === 0) return;
    const bmi = w / (h * h);
    let label = "Normal";
    if (bmi < 18.5) label = "Underweight";
    else if (bmi >= 25) label = "Overweight";
    setBmiResult({ bmi: bmi.toFixed(1), label });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fadeIn">
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
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border max-w-xs text-slate-800 dark:text-white"
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
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Height (cm)</label>
                <input 
                  type="number"
                  placeholder="e.g. 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border text-slate-800 dark:text-white"
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

// 3. Probasi Seba
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
          <Plane className="w-5 h-5 text-teal-500" /> Expatriate Pre-Departure Portal
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
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-855 border rounded-xl"
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
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-805 border rounded-xl text-slate-800 dark:text-white"
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

// 4. Video Tutorials
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
              <span className="text-xs px-2 py-1 bg-teal-500/10 text-teal-650 rounded font-bold">{vid.trade}</span>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">{vid.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Contact
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

// 6. About Us
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

// Crop helpers
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop, targetW, targetH) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', 0.95);
}

function CropModal({ imageSrc, aspect, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleConfirm = async () => {
    try {
      const cropped = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        aspect >= 1 ? 300 : 300,
        aspect >= 1 ? 300 : 80
      );
      onCropComplete(cropped);
    } catch (e) {
      console.error('Crop error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-850 dark:text-white text-lg">Crop Image</h3>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative w-full h-80 bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
          />
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-teal-600"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-sky-600 text-white text-sm font-bold hover:from-teal-700 hover:to-sky-700 transition shadow-lg"
            >
              Crop & Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Enrollment({ students }) {
  const [viewMode, setViewMode] = useState('menu'); // menu | apply | query
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    trade: 'IT Support',
    batch: 'Batch-01',
    name: '',
    nameBangla: '',
    nameEnglishBlock: '',
    fatherNameEnglish: '',
    fatherNameBangla: '',
    motherNameEnglish: '',
    motherNameBangla: '',
    dob: '',
    gender: 'Male',
    religion: 'Islam',
    nationality: 'Bangladeshi',
    bloodGroup: 'O+',
    nidBr: '',
    phoneNo: '',
    guardianPhoneNo: '',
    
    // Permanent Address
    permHoldingNo: '',
    permVillCity: '',
    permPost: '',
    permThana: '',
    permDistrict: '',

    // Same Address Flag
    sameAddress: false,

    // Present Address
    presHoldingNo: '',
    presVillCity: '',
    presPost: '',
    presThana: '',
    presDistrict: '',

    // Education
    eduExamName: 'SSC',
    eduDivision: '1st',
    eduGpa: '',
    eduPassingYear: '',
    eduBoardUniv: '',

    // Experience (Optional)
    expName: '',
    expDesignation: '',
    expResponsibility: '',
    expTimePeriod: '',

    // Appearances
    photo: '',
    signature: ''
  });

  const [appId, setAppId] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [sigError, setSigError] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropType, setCropType] = useState(null);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle inputs change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === 'checkbox' ? checked : value;
    
    // Restrict Bangla fields to Bangla Unicode characters, spaces, ZWJ (\u200D), and ZWNJ (\u200C)
    if (['nameBangla', 'fatherNameBangla', 'motherNameBangla'].includes(name) && typeof val === 'string') {
      val = val.replace(/[^ \u0980-\u09FF\u200C\u200D]/g, '');
    }
    
    // Restrict NID/BR field to numbers only
    if (name === 'nidBr' && typeof val === 'string') {
      val = val.replace(/[^0-9]/g, '');
    }
    
    // Restrict phone fields to digits, +, -
    if (['phoneNo', 'guardianPhoneNo'].includes(name) && typeof val === 'string') {
      val = val.replace(/[^0-9+\-]/g, '');
    }
    
    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      
      // If same address is checked, copy perm to pres
      if (name === 'sameAddress' && val) {
        updated.presHoldingNo = prev.permHoldingNo;
        updated.presVillCity = prev.permVillCity;
        updated.presPost = prev.permPost;
        updated.presThana = prev.permThana;
        updated.presDistrict = prev.permDistrict;
      } else if (prev.sameAddress && name.startsWith('perm')) {
        const presKey = name.replace('perm', 'pres');
        updated[presKey] = val;
      }
      
      // If user typed nameEnglishBlock, sync to name for main registry compatibility
      if (name === 'nameEnglishBlock') {
        updated.name = val;
      }
      return updated;
    });
  };

  // Handle file uploads — open crop modal
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (type === 'photo') setPhotoError('Please upload a valid image file.');
      else setSigError('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target.result);
      setCropType(type);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl) => {
    if (cropType === 'photo') {
      setPhotoError('');
      setFormData(prev => ({ ...prev, photo: croppedDataUrl }));
    } else {
      setSigError('');
      setFormData(prev => ({ ...prev, signature: croppedDataUrl }));
    }
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropType(null);
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropType(null);
  };

  const handleNext = () => {
    // Simple page validation
    if (step === 1) {
      if (!formData.trade || !formData.batch || !formData.nameEnglishBlock || !formData.nameBangla || !formData.fatherNameEnglish || !formData.motherNameEnglish || !formData.dob || !formData.phoneNo) {
        alert('Please fill out all mandatory fields in Institutional and Personal Information.');
        return;
      }
    } else if (step === 2) {
      if (!formData.permHoldingNo || !formData.permVillCity || !formData.permPost || !formData.permThana || !formData.permDistrict ||
          !formData.presHoldingNo || !formData.presVillCity || !formData.presPost || !formData.presThana || !formData.presDistrict) {
        alert('Please complete both Permanent and Present Address sections.');
        return;
      }
    } else if (step === 3) {
      if (!formData.eduExamName || !formData.eduDivision || !formData.eduGpa || !formData.eduPassingYear || !formData.eduBoardUniv) {
        alert('Please complete all Educational Qualification fields.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.photo || !formData.signature) {
      alert('Please upload both your Photo and Signature.');
      return;
    }
    
    const tradeCode = formData.trade.substring(0, 2).toUpperCase();
    const maxNum = students.reduce((max, s) => {
      const parts = s.id?.split('-');
      if (parts && parts.length === 2) {
        const num = parseInt(parts[1], 10);
        return !isNaN(num) && num > max ? num : max;
      }
      return max;
    }, 0);
    const id = `STU${tradeCode}-${String(maxNum + 1).padStart(4, '0')}`;
    try {
      await setDoc(doc(db, 'students', id), {
        ...formData,
        id,
        phone: formData.phone || formData.nidBr || id,
        email: formData.email || `${id.toLowerCase()}@pttc.edu`,
        status: "Pending",
        grade: "N/A",
        date: new Date().toISOString().split('T')[0]
      });
      alert('You have successfully submitted your info');
      setSuccessMsg(id);
      setToast({ message: `Application Submitted Successfully! Your generated Application ID is ${id}.`, type: 'success' });
      setFormData({
        trade: 'IT Support',
        batch: 'Batch-01',
        name: '',
        nameBangla: '',
        nameEnglishBlock: '',
        fatherNameEnglish: '',
        fatherNameBangla: '',
        motherNameEnglish: '',
        motherNameBangla: '',
        dob: '',
        gender: 'Male',
        religion: 'Islam',
        nationality: 'Bangladeshi',
        bloodGroup: 'O+',
        nidBr: '',
        phoneNo: '',
        guardianPhoneNo: '',
        permHoldingNo: '',
        permVillCity: '',
        permPost: '',
        permThana: '',
        permDistrict: '',
        sameAddress: false,
        presHoldingNo: '',
        presVillCity: '',
        presPost: '',
        presThana: '',
        presDistrict: '',
        eduExamName: 'SSC',
        eduDivision: '1st',
        eduGpa: '',
        eduPassingYear: '',
        eduBoardUniv: '',
        expName: '',
        expDesignation: '',
        expResponsibility: '',
        expTimePeriod: '',
        photo: '',
        signature: ''
      });
      setStep(1);
    } catch (err) {
      console.error('Error submitting application form:', err);
      alert('Failed to submit application. Please try again.');
    }
  };

  if (viewMode === 'menu') {
    return (
      <div className="max-w-4xl mx-auto space-y-10 py-8 animate-fadeIn">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="px-3 py-1 bg-teal-500/10 text-teal-655 rounded-full text-xs font-extrabold uppercase tracking-wider">
            Online Admissions 2026
          </span>
          <h2 className="text-3xl font-extrabold text-slate-850 dark:text-white">
            PTTC Enrollment Portal
          </h2>
          <p className="text-sm text-slate-500">
            Apply online for modern CBT batch folders or seamlessly track the evaluation status of your active application form.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Apply for new Student */}
          <div 
            onClick={() => setViewMode('apply')}
            className="glass-panel p-8 rounded-3xl border border-teal-500/10 hover:border-teal-500/30 transition-all duration-300 cursor-pointer text-center group relative overflow-hidden flex flex-col items-center justify-center space-y-6 hover:-translate-y-1 shadow-lg hover:shadow-xl hover:shadow-teal-500/5 bg-slate-50/50 dark:bg-slate-900/10"
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500"></div>
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold shadow shadow-teal-500/10 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
              <UserPlus className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-855 dark:text-white text-xl">Apply for New Student</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Register a new profile, specify permanent/present addresses, upload academic papers, and submit your technical CBT registration.
              </p>
            </div>
            <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400 group-hover:underline">
              Start Application &rarr;
            </span>
          </div>

          {/* Card 2: Query Admission Status */}
          <div 
            onClick={() => setViewMode('query')}
            className="glass-panel p-8 rounded-3xl border border-sky-500/10 hover:border-sky-500/30 transition-all duration-300 cursor-pointer text-center group relative overflow-hidden flex flex-col items-center justify-center space-y-6 hover:-translate-y-1 shadow-lg hover:shadow-xl hover:shadow-sky-500/5 bg-slate-50/50 dark:bg-slate-900/10"
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500"></div>
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold shadow shadow-sky-500/10 group-hover:bg-sky-600 group-hover:text-white transition-all duration-300">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-855 dark:text-white text-xl">Query Admission Status</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Enter your generated Student Application ID (e.g. STU1001) to track approval stages, grading competency, and coordinator feedback.
              </p>
            </div>
            <span className="text-xs font-extrabold text-sky-650 dark:text-sky-400 group-hover:underline">
              Track Progress &rarr;
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'apply') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fadeIn">
        <button 
          onClick={() => { setViewMode('menu'); setStep(1); }} 
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Enrollment Options
        </button>

        <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden">
          {/* Step Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs px-2.5 py-1 bg-teal-500/10 text-teal-650 rounded-full font-bold uppercase tracking-wider">
                Step {step} of 4
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {step === 1 && "Institutional & Personal Details"}
                {step === 2 && "Addresses (Permanent & Present)"}
                {step === 3 && "Education & Professional Experience"}
                {step === 4 && "Appearances & Submission Review"}
              </span>
            </div>
            
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-500 to-sky-600 h-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Wizard Pages */}
          <div className="flex-1 mb-8">
            
            {/* PAGE 1: Institutional (1) & Personal (2) */}
            {step === 1 && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* No 1. Institutional Information */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-850 dark:text-white text-base">No 1. Institutional Information</h4>
                    <p className="text-xs text-slate-400">Select course details</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold block mb-1">Trade *</label>
                      <select 
                        name="trade" 
                        value={formData.trade} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-855 border rounded-xl text-sm"
                      >
                        <option value="IT Support">IT Support Service</option>
                        <option value="Graphic Design">Computer Operation</option>
                        <option value="Automotive Mechanics">Motor Driving</option>
                        <option value="Electrical Installation">Electrical Installation and Maintenance</option>
                        <option value="Sewing Machine Operation">Sewing Machine Operation</option>
                        <option value="English Language">English Language</option>
                        <option value="Arabic Language">Arabic Language</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Batch *</label>
                      <select
                        name="batch"
                        value={formData.batch}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-855 border rounded-xl text-sm"
                      >
                        {Array.from({ length: 100 }, (_, i) => {
                          const num = String(i + 1).padStart(2, '0');
                          const val = `Batch-${num}`;
                          return (
                            <option key={val} value={val}>
                              Batch {num}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* No.2. Personal Information */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-850 dark:text-white text-base">No.2. Personal Information</h4>
                    <p className="text-xs text-slate-400">Enter applicant personal details</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold block mb-1">Name (English Block) *</label>
                      <input 
                        type="text" 
                        name="nameEnglishBlock" 
                        placeholder="E.G. Write your Name"
                        value={formData.nameEnglishBlock} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Name (Bangla) *</label>
                      <input 
                        type="text" 
                        name="nameBangla" 
                        placeholder="তোমার নাম"
                        value={formData.nameBangla} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Father's Name (English) *</label>
                      <input 
                        type="text" 
                        name="fatherNameEnglish" 
                        value={formData.fatherNameEnglish} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Father's Name (Bangla)</label>
                      <input 
                        type="text" 
                        name="fatherNameBangla" 
                        value={formData.fatherNameBangla} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Mother's Name (English) *</label>
                      <input 
                        type="text" 
                        name="motherNameEnglish" 
                        value={formData.motherNameEnglish} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Mother's Name (Bangla)</label>
                      <input 
                        type="text" 
                        name="motherNameBangla" 
                        value={formData.motherNameBangla} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Date of Birth (DOB) *</label>
                      <input 
                        type="date" 
                        name="dob" 
                        value={formData.dob} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Gender *</label>
                      <select 
                        name="gender" 
                        value={formData.gender} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-855 border rounded-xl text-sm"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Religion</label>
                      <select 
                        name="religion" 
                        value={formData.religion} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-855 border rounded-xl text-sm"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Hinduism">Hinduism</option>
                        <option value="Buddhism">Buddhism</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Nationality *</label>
                      <input 
                        type="text" 
                        name="nationality" 
                        value={formData.nationality} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Blood Group</label>
                      <select 
                        name="bloodGroup" 
                        value={formData.bloodGroup} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-855 border rounded-xl text-sm"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">NID/BR Number *</label>
                      <input 
                        type="text" 
                        name="nidBr" 
                        placeholder="National ID / Birth Registration"
                        value={formData.nidBr} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Phone No *</label>
                      <input 
                        type="text" 
                        name="phoneNo" 
                        placeholder="Enter phone number"
                        value={formData.phoneNo} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Guardian Phone No</label>
                      <input 
                        type="text" 
                        name="guardianPhoneNo" 
                        placeholder="Enter guardian phone number"
                        value={formData.guardianPhoneNo} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* PAGE 2: Permanent Address (3) & Present Address (4) */}
            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* No.3. Permanent Address */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-855 dark:text-white text-base">No.3. Permanent Address</h4>
                    <p className="text-xs text-slate-400">Specify home address records</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold block mb-1">Holding No *</label>
                      <input 
                        type="text" 
                        name="permHoldingNo" 
                        value={formData.permHoldingNo} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Village / City *</label>
                      <input 
                        type="text" 
                        name="permVillCity" 
                        value={formData.permVillCity} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Post Office *</label>
                      <input 
                        type="text" 
                        name="permPost" 
                        value={formData.permPost} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Thana *</label>
                      <input 
                        type="text" 
                        name="permThana" 
                        value={formData.permThana} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold block mb-1">District *</label>
                      <input 
                        type="text" 
                        name="permDistrict" 
                        value={formData.permDistrict} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Sync Address Checkbox */}
                <div className="flex items-center gap-2 p-3 bg-teal-500/5 border border-teal-500/10 rounded-xl">
                  <input 
                    type="checkbox" 
                    name="sameAddress" 
                    id="sameAddress" 
                    checked={formData.sameAddress} 
                    onChange={handleChange}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="sameAddress" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer selection:bg-transparent">
                    Permanent Address and Present Address are Same
                  </label>
                </div>

                {/* No.4. Present Address */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-855 dark:text-white text-base">No.4. Present Address</h4>
                    <p className="text-xs text-slate-400">Specify current living address</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold block mb-1">Holding No *</label>
                      <input 
                        type="text" 
                        name="presHoldingNo" 
                        value={formData.presHoldingNo} 
                        onChange={handleChange}
                        disabled={formData.sameAddress}
                        required 
                        className={`w-full px-4 py-2 border rounded-xl text-sm text-slate-800 dark:text-white ${
                          formData.sameAddress ? 'bg-slate-200/50 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Village / City *</label>
                      <input 
                        type="text" 
                        name="presVillCity" 
                        value={formData.presVillCity} 
                        onChange={handleChange}
                        disabled={formData.sameAddress}
                        required 
                        className={`w-full px-4 py-2 border rounded-xl text-sm text-slate-800 dark:text-white ${
                          formData.sameAddress ? 'bg-slate-200/50 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Post Office *</label>
                      <input 
                        type="text" 
                        name="presPost" 
                        value={formData.presPost} 
                        onChange={handleChange}
                        disabled={formData.sameAddress}
                        required 
                        className={`w-full px-4 py-2 border rounded-xl text-sm text-slate-800 dark:text-white ${
                          formData.sameAddress ? 'bg-slate-200/50 dark:bg-slate-900/55 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Thana *</label>
                      <input 
                        type="text" 
                        name="presThana" 
                        value={formData.presThana} 
                        onChange={handleChange}
                        disabled={formData.sameAddress}
                        required 
                        className={`w-full px-4 py-2 border rounded-xl text-sm text-slate-800 dark:text-white ${
                          formData.sameAddress ? 'bg-slate-200/50 dark:bg-slate-900/55 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold block mb-1">District *</label>
                      <input 
                        type="text" 
                        name="presDistrict" 
                        value={formData.presDistrict} 
                        onChange={handleChange}
                        disabled={formData.sameAddress}
                        required 
                        className={`w-full px-4 py-2 border rounded-xl text-sm text-slate-800 dark:text-white ${
                          formData.sameAddress ? 'bg-slate-200/50 dark:bg-slate-900/55 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* PAGE 3: Education (5) & Experience (6) */}
            {step === 3 && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* No.5. Educational Qualification */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-855 dark:text-white text-base">No.5. Educational Qualification</h4>
                    <p className="text-xs text-slate-400">Specify your academic profile</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold block mb-1">Name of Examination *</label>
                      <select 
                        name="eduExamName" 
                        value={formData.eduExamName} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-855 border rounded-xl text-sm"
                      >
                        <option value="SSC">SSC / Equivalent</option>
                        <option value="HSC">HSC / Equivalent</option>
                        <option value="Diploma">Diploma in Engineering</option>
                        <option value="Graduation">Graduation / Bachelor</option>
                        <option value="JSC">JSC / Class 8 Passed</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Division / Class / GPA Scale *</label>
                      <select 
                        name="eduDivision" 
                        value={formData.eduDivision} 
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-855 border rounded-xl text-sm"
                      >
                        <option value="1st">1st Division</option>
                        <option value="2nd">2nd Division</option>
                        <option value="3rd">3rd Division</option>
                        <option value="Grade-A">Grade A (GPA 4.00 - 5.00)</option>
                        <option value="Grade-B">Grade B (GPA 3.00 - 3.99)</option>
                        <option value="Grade-C">Grade C (GPA 2.00 - 2.99)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">GPA / Marks Obtained *</label>
                      <input 
                        type="text" 
                        name="eduGpa" 
                        placeholder="e.g. 4.85 / 80%"
                        value={formData.eduGpa} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Passing Year *</label>
                      <input 
                        type="number" 
                        name="eduPassingYear" 
                        placeholder="e.g. 2024"
                        value={formData.eduPassingYear} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold block mb-1">Board / University *</label>
                      <input 
                        type="text" 
                        name="eduBoardUniv" 
                        placeholder="e.g. Jessore Board / National University"
                        value={formData.eduBoardUniv} 
                        onChange={handleChange}
                        required 
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* No.06. Experiences (Optional) */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-855 dark:text-white text-base">No.06. Experiences (Optional)</h4>
                    <p className="text-xs text-slate-400">Add past professional or internship records</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold block mb-1">Name of Experience / Organization</label>
                      <input 
                        type="text" 
                        name="expName" 
                        placeholder="e.g. Link3 Technologies"
                        value={formData.expName} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Designation</label>
                      <input 
                        type="text" 
                        name="expDesignation" 
                        placeholder="e.g. Support Technician"
                        value={formData.expDesignation} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Responsibility</label>
                      <input 
                        type="text" 
                        name="expResponsibility" 
                        placeholder="e.g. Hardware troubleshooting, networking"
                        value={formData.expResponsibility} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Time Period</label>
                      <input 
                        type="text" 
                        name="expTimePeriod" 
                        placeholder="e.g. 1 Year (2024 - 2025)"
                        value={formData.expTimePeriod} 
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* PAGE 4: Appearances (7) & Review / Submit (8) */}
            {step === 4 && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* No.07. Appearances */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-855 dark:text-white text-base">No.07. Appearances</h4>
                    <p className="text-xs text-slate-400">Upload signature and profile picture</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Photo Field */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-855 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
                      <label className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Applicant Photo (300 * 300) *</label>
                      
                      <div className="w-36 h-36 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900 relative">
                        {formData.photo ? (
                          <img src={formData.photo} alt="Applicant Photo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-3">
                            <span className="text-[10px] font-bold text-slate-400 block">300 x 300 px</span>
                            <span className="text-[9px] text-slate-400">Only JPG, PNG</span>
                          </div>
                        )}
                      </div>
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'photo')} 
                        className="mt-3 text-xs w-full max-w-[200px]" 
                      />
                      {photoError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{photoError}</p>}
                    </div>

                    {/* Signature Field */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-855 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-col items-center">
                      <label className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Signature Upload (300 * 80) *</label>
                      
                      <div className="w-48 h-16 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900 relative">
                        {formData.signature ? (
                          <img src={formData.signature} alt="Applicant Signature" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center py-1">
                            <span className="text-[10px] font-bold text-slate-400 block">300 x 80 px</span>
                          </div>
                        )}
                      </div>
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'signature')} 
                        className="mt-3 text-xs w-full max-w-[200px]" 
                      />
                      {sigError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{sigError}</p>}
                    </div>

                  </div>
                </div>

                {/* Crop Modal */}
                {cropModalOpen && (
                  <CropModal
                    imageSrc={cropImageSrc}
                    aspect={cropType === 'photo' ? 1 : 300 / 80}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                  />
                )}

                {/* No.08. Full application Review Page */}
                <div className="space-y-4">
                  <div className="border-l-4 border-teal-500 pl-3">
                    <h4 className="font-extrabold text-slate-855 dark:text-white text-base">No.08. Full Application Review</h4>
                    <p className="text-xs text-slate-400">Verify your information before submission</p>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 text-xs max-h-96 overflow-y-auto">
                    
                    {/* Appearance Review */}
                    <div className="flex flex-col md:flex-row gap-6 items-center border-b border-slate-200 dark:border-slate-800 pb-4 justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-300 bg-slate-200">
                          {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400">No Photo</div>}
                        </div>
                        <div>
                          <h5 className="font-bold text-base text-slate-800 dark:text-slate-100 uppercase">{formData.nameEnglishBlock || "Your Name"}</h5>
                          <p className="text-slate-500 font-medium">Trade Selected: {formData.trade} ({formData.batch})</p>
                        </div>
                      </div>
                      <div className="w-32 h-10 border border-slate-350 bg-white dark:bg-slate-900 rounded flex items-center justify-center overflow-hidden">
                        {formData.signature ? <img src={formData.signature} className="w-full h-full object-contain" /> : <span className="text-slate-400">No Signature</span>}
                      </div>
                    </div>

                    {/* Personal Review */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-teal-600 border-b border-teal-500/10 pb-1">Personal Details</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4">
                        <div><strong className="text-slate-400">Name (Bangla):</strong> <span className="text-slate-800 dark:text-slate-200">{formData.nameBangla || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Father's Name (EN):</strong> <span className="text-slate-800 dark:text-slate-200">{formData.fatherNameEnglish || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Mother's Name (EN):</strong> <span className="text-slate-800 dark:text-slate-200">{formData.motherNameEnglish || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">DOB:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.dob || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Gender:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.gender}</span></div>
                        <div><strong className="text-slate-400">Religion:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.religion}</span></div>
                        <div><strong className="text-slate-400">Nationality:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.nationality}</span></div>
                        <div><strong className="text-slate-400">Blood Group:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.bloodGroup}</span></div>
                        <div><strong className="text-slate-400">NID/BR No:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.nidBr || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Permanent Address Review */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-teal-600 border-b border-teal-500/10 pb-1">Permanent Address</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                        <div><strong className="text-slate-400">Holding No:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.permHoldingNo || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Village/City:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.permVillCity || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Post Office:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.permPost || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Thana:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.permThana || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">District:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.permDistrict || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Present Address Review */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-teal-600 border-b border-teal-500/10 pb-1">Present Address</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                        <div><strong className="text-slate-400">Holding No:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.presHoldingNo || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Village/City:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.presVillCity || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Post Office:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.presPost || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">Thana:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.presThana || 'N/A'}</span></div>
                        <div><strong className="text-slate-400">District:</strong> <span className="text-slate-800 dark:text-slate-200">{formData.presDistrict || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Education & Experience Review */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-teal-600 border-b border-teal-500/10 pb-1">Academic & Job Background</h5>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div>
                          <strong className="text-slate-400 block mb-0.5">Education:</strong>
                          <div className="p-2 bg-slate-200/50 dark:bg-slate-900/50 rounded">
                            <strong>{formData.eduExamName}</strong> | {formData.eduDivision} ({formData.eduBoardUniv})<br />
                            Passing Year: {formData.eduPassingYear} | GPA: {formData.eduGpa}
                          </div>
                        </div>
                        <div>
                          <strong className="text-slate-400 block mb-0.5">Experience (Optional):</strong>
                          <div className="p-2 bg-slate-200/50 dark:bg-slate-900/50 rounded">
                            {formData.expName ? (
                              <>
                                <strong>{formData.expName}</strong> - {formData.expDesignation}<br />
                                Role: {formData.expResponsibility} | Period: {formData.expTimePeriod}
                              </>
                            ) : (
                              <span className="text-slate-400 italic">No experience record added</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Wizard Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800/80">
            {step > 1 ? (
              <button 
                type="button" 
                onClick={handleBack}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition"
              >
                Back
              </button>
            ) : (
              <div></div>
            )}

            {step < 4 ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition shadow shadow-teal-600/20"
              >
                Next Step
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-emerald-500/10"
              >
                Submit Application
              </button>
            )}
          </div>

        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-xl mt-4 max-w-4xl mx-auto animate-fadeIn">
            <div className="font-bold">Application Submitted Successfully!</div>
            <div className="text-xs mt-1">Please write down your Application ID for status tracking: <strong>{successMsg}</strong></div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[9999] animate-slideInRight max-w-sm w-full">
            <div className="glass-panel p-4 rounded-2xl border border-teal-500/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-2xl flex items-start gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Submission Successful</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 leading-snug font-semibold">{toast.message}</p>
              </div>
              <button 
                type="button"
                onClick={() => setToast(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'query') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4 animate-fadeIn">
        <button 
          onClick={() => { setViewMode('menu'); setAppId(''); }} 
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Enrollment Options
        </button>

        <div className="glass-panel p-8 rounded-3xl space-y-6 shadow-xl">
          <div>
            <h3 className="font-extrabold text-slate-850 dark:text-white text-xl">Query Admission Status</h3>
            <p className="text-xs text-slate-400 mt-1">Search for previous applications using your generated ID</p>
          </div>
          
          <input 
            type="text" 
            placeholder="Application ID (e.g. STU1004)"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border rounded-xl text-slate-850 dark:text-white text-sm"
          />
          {appId && (
            <div className="p-4 bg-slate-100 dark:bg-slate-850 rounded-xl border">
              {students.find(s => s.id === appId) ? (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <div className="font-extrabold text-base text-slate-800 dark:text-white uppercase">{students.find(s => s.id === appId).name}</div>
                      <div className="text-slate-400 font-medium">{students.find(s => s.id === appId).trade} ({students.find(s => s.id === appId).batch})</div>
                    </div>
                    {students.find(s => s.id === appId).photo && (
                      <img src={students.find(s => s.id === appId).photo} className="w-12 h-12 object-cover rounded-lg border shadow-sm" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-slate-550">
                    <div><strong>NID/BR:</strong> {students.find(s => s.id === appId).nidBr || 'N/A'}</div>
                    <div><strong>Gender:</strong> {students.find(s => s.id === appId).gender || 'N/A'}</div>
                    <div><strong>Father Name:</strong> {students.find(s => s.id === appId).fatherNameEnglish || 'N/A'}</div>
                    <div><strong>Mother Name:</strong> {students.find(s => s.id === appId).motherNameEnglish || 'N/A'}</div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="font-bold text-slate-650 dark:text-slate-350">Admission Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      students.find(s => s.id === appId).status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {students.find(s => s.id === appId).status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-rose-500 font-semibold text-center py-2">No record found with ID {appId}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
