import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  PortalAdmin, 
  PortalTeacher, 
  PortalStudent, 
  AssessmentTools, 
  RegularTools, 
  ProbasiSeba, 
  VideoTutorials, 
  AboutUs, 
  Contact, 
  Enrollment,
  getStoredData
} from './components.js';

const INITIAL_STUDENTS = [
  { id: "STU1001", name: "Anirban Das", trade: "IT Support", batch: "Batch-45", phone: "+8801712345678", email: "anirban@example.com", status: "Approved", grade: "A+", date: "2026-01-10" },
  { id: "STU1002", name: "Mst. Rahima Khatun", trade: "Graphic Design", batch: "Batch-45", phone: "+8801812345679", email: "rahima@example.com", status: "Approved", grade: "A-", date: "2026-01-12" },
  { id: "STU1003", name: "Kamal Hossain", trade: "Automotive Mechanics", batch: "Batch-44", phone: "+8801912345680", email: "kamal@example.com", status: "Completed", grade: "Competent", date: "2025-10-05" },
  { id: "STU1004", name: "Sajid Rahman", trade: "Electrical Installation", batch: "Batch-46", phone: "+8801512345681", email: "sajid@example.com", status: "Pending", grade: "N/A", date: "2026-05-15" },
  { id: "STU1005", name: "Fatema Tuz Zohra", trade: "Sewing Machine Operation", batch: "Batch-46", phone: "+8801612345682", email: "fatema@example.com", status: "Approved", grade: "N/A", date: "2026-05-16" }
];

function App() {
  const [currentTab, setCurrentTab] = useState('Home');
  const [portalRole, setPortalRole] = useState('Guest'); // Guest, Admin, Student, Teacher
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState(() => getStoredData('pttc_students', INITIAL_STUDENTS));
  
  // Custom Notice for Marquee
  const [notices] = useState(() => getStoredData('pttc_notices', [
    "Admission is open for BMET Regular (IT Support, Graphics, Welding).",
    "Pre-departure Orientation Program scheduled for expatriates on June 2nd, 2026."
  ]));

  useEffect(() => {
    // Dark mode state handling
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Lucide Icons trigger
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [currentTab, portalRole]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Dynamic Announcement Marquee */}
      <div className="bg-gradient-to-r from-teal-700 to-sky-800 text-white text-xs py-2 overflow-hidden relative">
        <div className="marquee-content whitespace-nowrap inline-block">
          {notices.map((n, i) => (
            <span key={i} className="mx-8 font-semibold">📢 {n}</span>
          ))}
        </div>
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 dark:border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentTab('Home'); setPortalRole('Guest'); }}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/20">
                PT
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base text-slate-850 dark:text-white leading-none">Paikgacha TTC</h1>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Technical Portal</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { name: 'Home', icon: 'home' },
                { name: 'Assessment Tools', icon: 'check-square' },
                { name: 'Enrollment', icon: 'user-plus' },
                { name: 'Regular Tools', icon: 'tool' },
                { name: 'Probasi Seba', icon: 'globe' },
                { name: 'Video Tutorials', icon: 'play' },
                { name: 'About Us', icon: 'info' },
                { name: 'Contact', icon: 'mail' }
              ].map(tab => (
                <button
                  key={tab.name}
                  onClick={() => { setCurrentTab(tab.name); setPortalRole('Guest'); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    currentTab === tab.name && portalRole === 'Guest'
                      ? 'bg-teal-600/10 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-400'
                  }`}
                >
                  <i data-lucide={tab.icon} className="w-3.5 h-3.5"></i>
                  {tab.name}
                </button>
              ))}
            </nav>

            {/* Portal Role & Utility Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Toggle Mode"
              >
                <i data-lucide={darkMode ? "sun" : "moon"} className="w-4 h-4"></i>
              </button>

              {/* Portal Selector Trigger */}
              <div className="relative">
                <select
                  value={portalRole}
                  onChange={(e) => {
                    setPortalRole(e.target.value);
                    if (e.target.value !== 'Guest') {
                      setCurrentTab(''); // clear general tabs
                    } else {
                      setCurrentTab('Home');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none cursor-pointer text-slate-750 dark:text-slate-200"
                >
                  <option value="Guest">Guest Mode</option>
                  <option value="Student">Student Portal</option>
                  <option value="Teacher">Teacher Portal</option>
                  <option value="Admin">Admin Portal</option>
                </select>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850"
              >
                <i data-lucide={mobileMenuOpen ? "x" : "menu"} className="w-5 h-5"></i>
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-250 dark:border-slate-800 px-4 pt-2 pb-4 space-y-1">
            {[
              { name: 'Home', icon: 'home' },
              { name: 'Assessment Tools', icon: 'check-square' },
              { name: 'Enrollment', icon: 'user-plus' },
              { name: 'Regular Tools', icon: 'tool' },
              { name: 'Probasi Seba', icon: 'globe' },
              { name: 'Video Tutorials', icon: 'play' },
              { name: 'About Us', icon: 'info' },
              { name: 'Contact', icon: 'mail' }
            ].map(tab => (
              <button
                key={tab.name}
                onClick={() => {
                  setCurrentTab(tab.name);
                  setPortalRole('Guest');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 ${
                  currentTab === tab.name && portalRole === 'Guest'
                    ? 'bg-teal-500/10 text-teal-600'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <i data-lucide={tab.icon} className="w-4 h-4"></i>
                {tab.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Render Tab Contents */}
        {portalRole === 'Guest' && (
          <>
            {currentTab === 'Home' && (
              <div className="space-y-12 animate-fadeIn">
                {/* Hero Box */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-teal-950 to-slate-900 text-white p-8 md:p-16 shadow-2xl flex flex-col justify-center text-center items-center">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl"></div>
                  
                  <span className="px-3 py-1 bg-teal-500/20 rounded-full border border-teal-500/30 text-teal-400 text-xs font-extrabold uppercase tracking-wider mb-6">
                    Skills for Global Excellence
                  </span>
                  <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
                    Paikgacha Technical Training Center
                  </h2>
                  <p className="mt-4 text-slate-300 max-w-xl text-sm md:text-base font-medium">
                    State-of-the-art vocational training, certified assessment, and expert guidance for modern industrial jobs and international opportunities.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4 justify-center">
                    <button 
                      onClick={() => setCurrentTab('Enrollment')} 
                      className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/25 transition-all transform hover:-translate-y-0.5"
                    >
                      Apply Online Now
                    </button>
                    <button 
                      onClick={() => setCurrentTab('Assessment Tools')} 
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition"
                    >
                      CBT/A self-evaluation
                    </button>
                  </div>
                </div>

                {/* Features Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="glass-panel p-6 rounded-2xl border border-teal-500/10 hover:border-teal-500/20 transition-all flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                      <i data-lucide="award"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">CBT/A Competence</h4>
                      <p className="text-sm text-slate-500 mt-1">Directly accredited self-learning and mock assessments supporting official certifications.</p>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-sky-500/10 hover:border-sky-500/20 transition-all flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                      <i data-lucide="globe"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Probasi Seba</h4>
                      <p className="text-sm text-slate-500 mt-1">Pre-departure orientation tracker and visa verification aids for overseas workers.</p>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-indigo-500/10 hover:border-indigo-500/20 transition-all flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                      <i data-lucide="book-open"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">E-Learning & Media</h4>
                      <p className="text-sm text-slate-500 mt-1">Curated video lecture libraries covering electronics, computer tech, and mechanics.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentTab === 'Assessment Tools' && <AssessmentTools />}
            {currentTab === 'Enrollment' && <Enrollment students={students} setStudents={setStudents} />}
            {currentTab === 'Regular Tools' && <RegularTools />}
            {currentTab === 'Probasi Seba' && <ProbasiSeba />}
            {currentTab === 'Video Tutorials' && <VideoTutorials />}
            {currentTab === 'About Us' && <AboutUs />}
            {currentTab === 'Contact' && <Contact />}
          </>
        )}

        {/* Portals */}
        {portalRole === 'Admin' && (
          <PortalAdmin students={students} setStudents={setStudents} />
        )}
        {portalRole === 'Teacher' && (
          <PortalTeacher students={students} setStudents={setStudents} />
        )}
        {portalRole === 'Student' && (
          <PortalStudent students={students} />
        )}

      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-200 dark:border-slate-800/80 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center text-slate-500 text-xs font-semibold">
          <div>
            &copy; 2026 Paikgacha Technical Training Center. All rights reserved.
          </div>
          <div className="mt-4 sm:mt-0 flex gap-4 justify-center">
            <span className="hover:text-teal-600 cursor-pointer">BTEB Affiliation</span>
            <span>&bull;</span>
            <span className="hover:text-teal-600 cursor-pointer">Privacy Guidelines</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
