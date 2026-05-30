import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from './firebase';
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
  Trash2 
} from 'lucide-react';

// Helper to load/save notices and teachers locally (as they do not require MongoDB per scope)
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

const INITIAL_TEACHERS = [
  { id: "TCH2001", name: "Engr. Mahmudul Hasan", trade: "IT Support", email: "mahmud@pttc.edu", phone: "+8801700000101" },
  { id: "TCH2002", name: "Shahnaz Parveen", trade: "Sewing Machine Operation", email: "shahnaz@pttc.edu", phone: "+8801700000102" },
  { id: "TCH2003", name: "M. A. Mannan", trade: "Automotive Mechanics", email: "mannan@pttc.edu", phone: "+8801700000103" }
];

// -------------------------------------------------------------
// ADMIN PORTAL
// -------------------------------------------------------------
export function PortalAdmin({ students, refreshStudents }) {
  const [adminUser, setAdminUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | students | teachers
  const [teachers, setTeachers] = useState(() => getStoredData('pttc_teachers', INITIAL_TEACHERS));
  const [filterTrade, setFilterTrade] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newNotice, setNewNotice] = useState('');
  const [notices, setNotices] = useState(() => getStoredData('pttc_notices', [
    "Admission is open for CBT Batch-46 (IT Support, Graphics, Welding).",
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!regEmail || !regPassword) {
      setError('Please fill in email and password.');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      setSuccess('Administrator registered and logged in successfully!');
      setAuthMode('login');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Administrator registration failed.');
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
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        refreshStudents();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (confirm("Are you sure you want to delete this student record?")) {
      try {
        const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
        if (res.ok) {
          refreshStudents();
        }
      } catch (err) {
        console.error('Error deleting student:', err);
      }
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          trade: fd.get('trade'),
          batch: fd.get('batch'),
          phone: fd.get('phone'),
          email: fd.get('email'),
          status: fd.get('status'),
          grade: fd.get('grade')
        })
      });
      if (res.ok) {
        refreshStudents();
        setEditingStudent(null);
      }
    } catch (err) {
      console.error('Error updating student details:', err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          trade: formData.get('trade'),
          batch: formData.get('batch'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          status: "Pending",
          grade: "N/A"
        })
      });
      if (res.ok) {
        refreshStudents();
        e.target.reset();
      }
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
                New Administrator?{' '}
                <button type="button" onClick={() => { setAuthMode('register'); setError(''); }} className="text-teal-600 font-bold hover:underline">Register Account</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Admin Email Address</label>
                <input type="email" placeholder="officer@pttc.edu" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1 text-slate-650 dark:text-slate-300">Account Password</label>
                <input type="password" placeholder="Create robust password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm border dark:border-slate-700" />
              </div>
              <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition shadow">
                Confirm Admin Registration
              </button>
              <p className="text-xs text-center text-slate-500 mt-4">
                Already registered?{' '}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Register student sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-4">Register Student</h3>
              <form onSubmit={handleAddStudent} className="space-y-3">
                <input name="name" type="text" placeholder="Full Name" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <select name="trade" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 border text-sm text-slate-850 dark:text-white">
                  <option value="IT Support">IT Support & IoT</option>
                  <option value="Graphic Design">Graphic Design & UI/UX</option>
                  <option value="Automotive Mechanics">Automotive Mechanics</option>
                  <option value="Electrical Installation">Electrical Installation</option>
                  <option value="Sewing Machine Operation">Sewing Machine Operation</option>
                </select>
                <input name="batch" type="text" placeholder="Batch Number" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <input name="phone" type="text" placeholder="Phone Number" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <input name="email" type="email" placeholder="Email Address" required className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-sm text-slate-850 dark:text-white" />
                <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition">
                  Register Student Record
                </button>
              </form>
            </div>
          </div>

          {/* Student registry list */}
          <div className="lg:col-span-2 space-y-6">
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
                      <th className="pb-3">Student Info</th>
                      <th className="pb-3">Trade</th>
                      <th className="pb-3">Batch</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {filteredStudents.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.id} | {s.phone}</div>
                        </td>
                        <td className="py-3 text-xs">{s.trade}</td>
                        <td className="py-3 text-xs">{s.batch}</td>
                        <td className="py-3">
                          <select 
                            value={s.status} 
                            onChange={(e) => handleStatusChange(s.id, e.target.value)}
                            className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-850 border rounded font-semibold text-slate-700 dark:text-slate-200"
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
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-teal-500/20 shadow-2xl relative">
            <h3 className="text-xl font-extrabold mb-4">Edit Student Information</h3>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">Full Name</label>
                <input name="name" type="text" defaultValue={editingStudent.name} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Trade</label>
                <select name="trade" defaultValue={editingStudent.trade} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                  <option value="IT Support">IT Support & IoT</option>
                  <option value="Graphic Design">Graphic Design & UI/UX</option>
                  <option value="Automotive Mechanics">Automotive Mechanics</option>
                  <option value="Electrical Installation">Electrical Installation</option>
                  <option value="Sewing Machine Operation">Sewing Machine Operation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Batch</label>
                  <input name="batch" type="text" defaultValue={editingStudent.batch} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">CBT Grade</label>
                  <input name="grade" type="text" defaultValue={editingStudent.grade} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Phone Number</label>
                <input name="phone" type="text" defaultValue={editingStudent.phone} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Email Address</label>
                <input name="email" type="email" defaultValue={editingStudent.email} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Enrollment Status</label>
                <select name="status" defaultValue={editingStudent.status} required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-850 border rounded-xl text-sm">
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition">Save Changes</button>
                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl transition">Cancel</button>
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
export function PortalTeacher({ students, refreshStudents }) {
  const [selectedBatch, setSelectedBatch] = useState('Batch-45');
  const [gradingStudent, setGradingStudent] = useState(null);
  const [gradeValue, setGradeValue] = useState('Competent');

  const batchStudents = students.filter(s => s.batch === selectedBatch);

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!gradingStudent) return;
    try {
      const res = await fetch(`/api/students/${gradingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: gradeValue })
      });
      if (res.ok) {
        refreshStudents();
        setGradingStudent(null);
      }
    } catch (err) {
      console.error('Error updating grade:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2">
          <Award className="w-6 h-6" /> Teacher Assessment Dashboard
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
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-slate-800 dark:text-white"
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
        <h3 className="text-xl font-bold text-teal-600">CBT/A Standards</h3>
        <p className="text-sm text-slate-500">
          Bangladesh Technical Education Board (BTEB) Competency Standards focus on hands-on capabilities. Assessors look for proof of Competence (C) in real-world simulations.
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
    { title: "Automotive System Overhaul", trade: "Automotive Mechanics", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
    { title: "Responsive Web Layout Basics", trade: "IT Support", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
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
          <p><strong>Address:</strong> Shalgaria, Paikgacha-6600, Bangladesh</p>
          <p><strong>Phone:</strong> +88-0731-66352</p>
          <p><strong>Email:</strong> principal.pttc@gmail.com</p>
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

// 7. Enrollment Registration Section
export function Enrollment({ students, refreshStudents }) {
  const [appId, setAppId] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = `STU${Date.now().toString().slice(-4)}`;
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: fd.get('name'),
          trade: fd.get('trade'),
          batch: "Batch-46",
          phone: fd.get('phone'),
          email: fd.get('email'),
          status: "Pending",
          grade: "N/A"
        })
      });
      if (res.ok) {
        setSuccessMsg(id);
        refreshStudents();
        e.target.reset();
      }
    } catch (err) {
      console.error('Error submitting application form:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4">Online Admission Application Form</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">Full Name</label>
              <input type="text" name="name" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Select Course Trade</label>
              <select name="trade" className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-855 border rounded-xl">
                <option value="IT Support">IT Support & System Administration</option>
                <option value="Graphic Design">Graphic Design & UI Layouts</option>
                <option value="Automotive Mechanics">Automotive System Mechanics</option>
                <option value="Electrical Installation">Electrical House Wiring</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Phone Number</label>
              <input type="text" name="phone" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Email Address</label>
              <input type="email" name="email" required className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-slate-800 dark:text-white" />
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
          className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-slate-850 dark:text-white"
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
