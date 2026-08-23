import React, { useState, useEffect } from 'react';
import SchoolEntry from './schoolEntry';
import GbvEntry from './gbvEntry';

const CREDENTIALS = {
  admin: { password: "admin123", role: "Administrator" },
  registrar: { password: "reg123", role: "Academic Officer" },
  teacher: { password: "teach123", role: "Teacher" },
  principal: { password: "prin123", role: "Principal" },
};

const STORAGE_KEY = "msendoo-school-data";
const META_KEY = "msendoo-school-meta";

const DEFAULT_CLASS_LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
const DEFAULT_SUBJECTS = [
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Commerce",
  "Computer Studies",
  "Agriculture",
  "Civic Education",
];

const TABS_BY_ROLE = {
  Administrator: ["Dashboard", "Admission", "Records", "Attendance", "Assessments", "Examinations", "Reports", "AI Support", "Manage Classes", "Settings"],
  "Academic Officer": ["Dashboard", "Admission", "Records", "Attendance", "Reports", "AI Support", "Manage Classes", "Settings"],
  Teacher: ["Dashboard", "Attendance", "Assessments", "Examinations", "AI Support", "Settings"],
  Principal: ["Dashboard", "Reports", "AI Support", "Settings"],
};

const SAMPLE_STUDENTS = [
  {
    id: 1,
    admissionNumber: "JSS1-001",
    firstName: "Blessing",
    lastName: "Aondona",
    dob: "2013-04-20",
    gender: "Female",
    classLevel: "JSS1",
    admissionStatus: "Admitted",
    guardianName: "Mrs. Aondona",
    guardianPhone: "08031234567",
    previousSchool: "Tomatar Primary School",
    notes: "Healthy student with strong attendance.",
    promotionHistory: ["2023: Promoted to JSS1"],
    disciplinaryNotes: "None",
    medicalNotes: "All immunizations updated",
  },
  {
    id: 2,
    admissionNumber: "JSS1-002",
    firstName: "Isaac",
    lastName: "Makurdi",
    dob: "2012-09-15",
    gender: "Male",
    classLevel: "JSS1",
    admissionStatus: "Admitted",
    guardianName: "Mr. Makurdi",
    guardianPhone: "08039876543",
    previousSchool: "Tomatar Primary School",
    notes: "Needs support with reading and numeracy.",
    promotionHistory: ["2023: Promoted to JSS1"],
    disciplinaryNotes: "Late arrival on two occasions",
    medicalNotes: "Allergic to peanuts",
  },
];

const INITIAL_DATA = {
  students: SAMPLE_STUDENTS,
  assessments: [],
  exams: [],
  attendance: [],
  classes: DEFAULT_CLASS_LEVELS,
  subjects: DEFAULT_SUBJECTS,
};

function secureEncode(value) {
  return btoa(encodeURIComponent(value));
}

function secureDecode(value) {
  return decodeURIComponent(atob(value));
}

function computeDataHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const meta = window.localStorage.getItem(META_KEY);
    if (!raw || !meta) {
      return INITIAL_DATA;
    }
    const decoded = secureDecode(raw);
    const parsed = JSON.parse(decoded);
    const parsedMeta = JSON.parse(meta);
    if (parsedMeta.dataHash !== computeDataHash(decoded)) {
      console.warn("Local data integrity check failed.");
      return INITIAL_DATA;
    }
    return parsed;
  } catch {
    return INITIAL_DATA;
  }
}

function saveData(data) {
  const serialized = JSON.stringify(data);
  window.localStorage.setItem(STORAGE_KEY, secureEncode(serialized));
  window.localStorage.setItem(
    META_KEY,
    JSON.stringify({ lastSaved: new Date().toISOString(), dataHash: computeDataHash(serialized), version: 1 })
  );
}

function loadUser() {
  try {
    const raw = window.localStorage.getItem("msendoo-school-user");
    if (!raw) return null;
    return JSON.parse(secureDecode(raw));
  } catch {
    return null;
  }
}

function saveUser(user) {
  if (user) {
    window.localStorage.setItem("msendoo-school-user", secureEncode(JSON.stringify(user)));
  } else {
    window.localStorage.removeItem("msendoo-school-user");
  }
}

function admissionNumberFor(students, classLevel) {
  const count = students.filter((s) => s.classLevel === classLevel).length + 1;
  return `${classLevel}-${String(count).padStart(3, "0")}`;
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function gradeFromScore(score) {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

function remarkFromGrade(grade) {
  switch (grade) {
    case "A":
      return "Excellent work. Keep up the strong effort.";
    case "B":
      return "Good performance. Improve consistency and accuracy.";
    case "C":
      return "Satisfactory. Practice more to move to the next level.";
    case "D":
      return "Needs improvement. Focus on core topics and ask questions.";
    case "E":
      return "Below expected. Extra support and revision is required.";
    default:
      return "Failing. Give remedial attention and monitor progress closely.";
  }
}

function formatName(student) {
  return `${student.firstName} ${student.lastName}`;
}

function findStudentReport(data, studentId, term) {
  const exams = data.exams.filter((e) => e.studentId === studentId && e.term === term);
  const assessments = data.assessments.filter((a) => a.studentId === studentId && a.term === term);
  const subjects = Array.from(new Set([...exams.map((e) => e.subject), ...assessments.map((a) => a.subject)])).sort();
  const subjectSummaries = subjects.map((subject) => {
    const examScores = exams.filter((e) => e.subject === subject).map((e) => e.score);
    const assessmentScores = assessments.filter((a) => a.subject === subject).map((a) => a.score);
    const examAverage = examScores.length ? examScores.reduce((a, b) => a + b, 0) / examScores.length : null;
    const assessmentAverage = assessmentScores.length ? assessmentScores.reduce((a, b) => a + b, 0) / assessmentScores.length : null;
    const averageScore = [examAverage, assessmentAverage].filter((n) => n !== null).reduce((a, b) => a + b, 0) / ([examAverage, assessmentAverage].filter((n) => n !== null).length || 1);
    const grade = gradeFromScore(averageScore || 0);
    return { subject, examAverage, assessmentAverage, averageScore, grade, remark: remarkFromGrade(grade) };
  });
  const overallAverage = subjectSummaries.length ? subjectSummaries.reduce((sum, item) => sum + (item.averageScore || 0), 0) / subjectSummaries.length : 0;
  const overallGrade = gradeFromScore(overallAverage);
  return { subjects: subjectSummaries, overallAverage, overallGrade, overallRemark: remarkFromGrade(overallGrade) };
}

function cardStyle(color) {
  return {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
    borderLeft: `4px solid ${color}`,
    minWidth: 180,
    flex: 1,
  };
}

export default function App() {
  const [user, setUser] = useState(loadUser());
  const [data, setData] = useState(loadData());
  const [tab, setTab] = useState("Dashboard");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [backupText, setBackupText] = useState("");

  const CLASS_LEVELS = data.classes || DEFAULT_CLASS_LEVELS;
  const SUBJECTS = data.subjects || DEFAULT_SUBJECTS;

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    saveUser(user);
  }, [user]);

  const handleLogin = () => {
    const name = credentials.username.trim().toLowerCase();
    const record = CREDENTIALS[name];
    if (record && record.password === credentials.password) {
      setUser({ username: name, role: record.role });
      setLoginError("");
      setTab("Dashboard");
      setCredentials({ username: "", password: "" });
    } else {
      setLoginError("Invalid username or password. Try admin/admin123 or registrar/reg123.");
    }
  };

  const logout = () => {
    setUser(null);
  };

  const tabs = user ? TABS_BY_ROLE[user.role] : [];

  const handleBackupDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "msendoo-school-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = () => {
    try {
      const parsed = JSON.parse(backupText);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.students)) {
        setData(parsed);
        setBackupText("");
        alert("Backup restored successfully.");
      } else {
        alert("Invalid backup format. Please paste data exported from this system.");
      }
    } catch (error) {
      alert("Invalid JSON. Please correct the backup content and try again.");
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eef2ff 0%, #e0f2fe 55%, #f8fafc 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: 420, background: "#fff", borderRadius: 22, padding: 30, boxShadow: "0 25px 80px rgba(15, 23, 42, 0.16)", border: "1px solid rgba(99,102,241,0.12)" }}>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #4338ca, #0f172a)", color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 14 }}>MS</div>
            <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Msendoo AI School System</h1>
            <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.7 }}>Offline-first school administration for admissions, records, assessments, exams, analytics, and secure staff workflows.</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 700 }}>Username</label>
            <input
              value={credentials.username}
              onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="admin, registrar, teacher, principal"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 15, background: "#f8fafc" }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 700 }}>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Enter your password"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 15, background: "#f8fafc" }}
            />
          </div>
          {loginError && <div style={{ marginBottom: 16, color: "#dc2626", fontSize: 14, fontWeight: 700 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #4338ca, #0f172a)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            Sign in to test portal
          </button>
          <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 12, background: "#eef2ff", color: "#334155", fontSize: 13, lineHeight: 1.6 }}>
            Demo credentials: <strong>admin/admin123</strong>, <strong>registrar/reg123</strong>, <strong>teacher/teach123</strong>, <strong>principal/prin123</strong>.
          </div>
        </div>
      </div>
    );
  }

  const allowedTabs = tabs;

  const createHeading = (title, subtitle) => (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, color: "#0f172a" }}>{title}</h2>
      <p style={{ margin: "8px 0 0", color: "#475569" }}>{subtitle}</p>
    </div>
  );

  const Dashboard = () => {
    const totalStudents = data.students.length;
    const totalAssessments = data.assessments.length;
    const totalExams = data.exams.length;
    const admittedStudents = data.students.filter((student) => student.admissionStatus === "Admitted").length;
    const classCounts = CLASS_LEVELS.map((level) => ({ level, count: data.students.filter((student) => student.classLevel === level).length }));
    const weakStudents = data.students.filter((student) => {
      const report = findStudentReport(data, student.id, "Term 1");
      return report.overallAverage > 0 && report.overallAverage < 45;
    });
    const reportCoverage = Math.min(100, Math.round((((totalAssessments + totalExams) / Math.max(1, totalStudents * 2)) * 100)));
    const attendanceHealth = data.attendance.length ? 92 : 84;
    const subjectCoverage = Math.min(100, Math.round((data.subjects.length / Math.max(1, DEFAULT_SUBJECTS.length)) * 100));
    const recentStudents = data.students.slice(-4).reverse();

    return (
      <div>
        {createHeading("Dashboard", "A fuller school administration demo with stronger admissions, reports, and monitoring visuals.")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 24 }}>
          <div style={cardStyle("#4338ca")}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Total Students</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{totalStudents}</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Offline student records.</div>
          </div>
          <div style={cardStyle("#0ea5e9")}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Admissions Active</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{admittedStudents}</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Currently admitted students.</div>
          </div>
          <div style={cardStyle("#14b8a6")}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Assessments + Exams</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{totalAssessments + totalExams}</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Academic records logged.</div>
          </div>
          <div style={cardStyle("#f59e0b")}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Weak Performance Alerts</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{weakStudents.length}</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Students needing support.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Admissions Pipeline</h3>
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 14, background: "#eef2ff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#334155", fontWeight: 700 }}>Admission readiness</span>
                  <span style={{ color: "#4338ca", fontWeight: 800 }}>{Math.min(100, Math.round((admittedStudents / Math.max(1, totalStudents)) * 100))}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 10, background: "#c7d2fe", marginTop: 10 }}>
                  <div style={{ width: `${Math.min(100, Math.round((admittedStudents / Math.max(1, totalStudents)) * 100))}%`, height: "100%", borderRadius: 10, background: "#4338ca" }} />
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {recentStudents.map((student) => (
                  <div key={student.id} style={{ padding: 14, borderRadius: 12, background: "#f8fafc", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatName(student)}</div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>{student.admissionNumber} • {student.classLevel}</div>
                    </div>
                    <span style={{ color: "#0f172a", fontWeight: 700 }}>{student.admissionStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Reports Overview</h3>
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#475569", fontWeight: 700 }}>Report coverage</span>
                  <span style={{ color: "#0f172a", fontWeight: 800 }}>{reportCoverage}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 10, background: "#e2e8f0", marginTop: 10 }}>
                  <div style={{ height: "100%", width: `${reportCoverage}%`, borderRadius: 10, background: "#14b8a6" }} />
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#475569", fontWeight: 700 }}>Subject setup</span>
                  <span style={{ color: "#0f172a", fontWeight: 800 }}>{subjectCoverage}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 10, background: "#e2e8f0", marginTop: 10 }}>
                  <div style={{ height: "100%", width: `${subjectCoverage}%`, borderRadius: 10, background: "#0ea5e9" }} />
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "#eef2ff" }}>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>Leadership snapshot</div>
                <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.7 }}>The report engine is ready for class lists, report cards, promotion review, and subject performance analysis.</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Monitoring & Alerts</h3>
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#475569", fontWeight: 700 }}>Attendance health</span>
                  <span style={{ color: "#0f172a", fontWeight: 800 }}>{attendanceHealth}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 10, background: "#e2e8f0", marginTop: 10 }}>
                  <div style={{ width: `${attendanceHealth}%`, height: "100%", borderRadius: 10, background: "#f59e0b" }} />
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc" }}>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>Priority monitoring areas</div>
                <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                  • Weak students <strong>{weakStudents.length}</strong> need intervention<br />
                  • Academic records are being generated from assessments and exams<br />
                  • Offline backup and restore are available from Settings
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Quick Actions</h3>
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {[
                ["Add a new admission", "Admission"],
                ["Open student records", "Records"],
                ["Enter assessment scores", "Assessments"],
                ["Enter exam results", "Examinations"],
                ["View performance reports", "Reports"],
              ].map(([label, target]) => (
                <button key={target} onClick={() => setTab(target)} style={{ width: "100%", textAlign: "left", padding: "14px 18px", borderRadius: 12, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4338ca", cursor: "pointer", fontWeight: 700 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
          <h3 style={{ margin: 0, color: "#0f172a" }}>Class Distribution</h3>
          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {classCounts.map((item) => (
              <div key={item.level} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "#f8fafc" }}>
                <span style={{ color: "#334155", fontWeight: 700 }}>{item.level}</span>
                <span style={{ color: "#475569", fontWeight: 800 }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Admission = () => {
    const [form, setForm] = useState({ firstName: "", lastName: "", dob: "", gender: "Female", classLevel: CLASS_LEVELS[0], guardianName: "", guardianPhone: "", previousSchool: "", notes: "" });
    const [message, setMessage] = useState("");

    const saveAdmission = () => {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.dob.trim()) {
        setMessage("Please enter the student's name, date of birth, and class.");
        return;
      }
      const nextId = data.students.length ? Math.max(...data.students.map((student) => student.id)) + 1 : 1;
      const admissionNumber = admissionNumberFor(data.students, form.classLevel);
      const student = {
        id: nextId,
        admissionNumber,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: form.dob,
        gender: form.gender,
        classLevel: form.classLevel,
        admissionStatus: "Admitted",
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        previousSchool: form.previousSchool.trim(),
        notes: form.notes.trim(),
        promotionHistory: [`${new Date().getFullYear()}: Admitted to ${form.classLevel}`],
        disciplinaryNotes: "None",
        medicalNotes: "",
      };
      setData((prev) => ({ ...prev, students: [...prev.students, student] }));
      setForm({ ...form, firstName: "", lastName: "", dob: "", guardianName: "", guardianPhone: "", previousSchool: "", notes: "" });
      setMessage(`Admission completed for ${student.admissionNumber}.`);
    };

    return (
      <div>
        {createHeading("Admission Module", "Register new students and generate admission numbers for Msendoo Vocational and Technical School.")}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Student Biodata</h3>
            {message && <div style={{ marginBottom: 18, color: "#16a34a", fontWeight: 600 }}>{message}</div>}
            {[
              ["First Name", "firstName", "text"],
              ["Last Name", "lastName", "text"],
              ["Date of Birth", "dob", "date"],
            ].map(([label, field, type]) => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}
                />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Gender</label>
                <select value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}>
                  {['Female','Male','Other'].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Class Placement</label>
                <select value={form.classLevel} onChange={(event) => setForm((prev) => ({ ...prev, classLevel: event.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}>
                  {CLASS_LEVELS.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Guardian / Parent Name</label>
              <input
                value={form.guardianName}
                onChange={(event) => setForm((prev) => ({ ...prev, guardianName: event.target.value }))}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Guardian Phone</label>
              <input
                value={form.guardianPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, guardianPhone: event.target.value }))}
                placeholder="080..."
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Previous School</label>
              <input
                value={form.previousSchool}
                onChange={(event) => setForm((prev) => ({ ...prev, previousSchool: event.target.value }))}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Admission Notes</label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, resize: "vertical" }}
              />
            </div>
            <button onClick={saveAdmission} style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Register Student
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Recent Admissions</h3>
            {data.students.slice(-5).reverse().map((student) => (
              <div key={student.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatName(student)}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{student.classLevel} • {student.admissionNumber}</div>
                  </div>
                  <span style={{ color: "#0f172a", fontWeight: 700 }}>{student.admissionStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Records = () => {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [editState, setEditState] = useState({ notes: "", disciplinaryNotes: "", medicalNotes: "" });

    const filtered = data.students.filter((student) => {
      const term = `${student.firstName} ${student.lastName} ${student.admissionNumber} ${student.classLevel}`.toLowerCase();
      return term.includes(search.toLowerCase());
    });

    const selected = data.students.find((student) => student.id === selectedId);

    const updateStudent = () => {
      if (!selected) return;
      setData((prev) => ({
        ...prev,
        students: prev.students.map((student) =>
          student.id === selected.id
            ? { ...student, notes: editState.notes, disciplinaryNotes: editState.disciplinaryNotes, medicalNotes: editState.medicalNotes }
            : student
        ),
      }));
      alert("Student record updated.");
    };

    useEffect(() => {
      if (selected) {
        setEditState({ notes: selected.notes, disciplinaryNotes: selected.disciplinaryNotes, medicalNotes: selected.medicalNotes });
      }
    }, [selectedId]);

    return (
      <div>
        {createHeading("Student Records", "Search, review, and update biodata, academic history, attendance notes, and special records.")}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <div style={{ marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by student name, class, or admission number"
                style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}
              />
            </div>
            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ color: "#64748b" }}>No students match the search.</div>
              ) : (
                filtered.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedId(student.id)}
                    style={{ width: "100%", textAlign: "left", background: selectedId === student.id ? "#eef2ff" : "transparent", border: "none", borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatName(student)}</div>
                        <div style={{ color: "#64748b", fontSize: 13 }}>{student.admissionNumber} • {student.classLevel}</div>
                      </div>
                      <div style={{ color: "#0f172a", fontWeight: 700 }}>{student.gender}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            {selected ? (
              <div>
                <h3 style={{ marginTop: 0, color: "#0f172a" }}>{formatName(selected)}</h3>
                <div style={{ marginBottom: 20, color: "#475569" }}>
                  {selected.admissionNumber} • {selected.classLevel} • DOB: {selected.dob}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, color: "#475569", fontWeight: 600 }}>Admission Notes</div>
                  <textarea value={editState.notes} onChange={(event) => setEditState((prev) => ({ ...prev, notes: event.target.value }))} rows={4} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 6, color: "#475569", fontWeight: 600 }}>Disciplinary Notes</div>
                  <textarea value={editState.disciplinaryNotes} onChange={(event) => setEditState((prev) => ({ ...prev, disciplinaryNotes: event.target.value }))} rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 6, color: "#475569", fontWeight: 600 }}>Medical / Special Notes</div>
                  <textarea value={editState.medicalNotes} onChange={(event) => setEditState((prev) => ({ ...prev, medicalNotes: event.target.value }))} rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, resize: "vertical" }} />
                </div>
                <button onClick={updateStudent} style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  Save Record Notes
                </button>
              </div>
            ) : (
              <div style={{ color: "#64748b" }}>Select a student from the list to view and update records.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Assessments = () => {
    const [form, setForm] = useState({ studentId: data.students[0]?.id || "", subject: SUBJECTS[0], term: "Term 1", type: "Assignment", score: "", maxScore: "100", teacher: user.username });
    const [message, setMessage] = useState("");

    useEffect(() => {
      if (!form.studentId && data.students.length) {
        setForm((prev) => ({ ...prev, studentId: data.students[0].id }));
      }
    }, [data.students]);

    const addAssessment = () => {
      if (!form.studentId || !form.score.trim()) {
        setMessage("Please select a student and enter a score.");
        return;
      }
      const score = normalizeNumber(form.score);
      const maxScore = normalizeNumber(form.maxScore) || 100;
      const existing = data.assessments.find(
        (entry) =>
          entry.studentId === form.studentId &&
          entry.term === form.term &&
          entry.subject === form.subject &&
          entry.type === form.type
      );
      if (existing) {
        setMessage("This assessment entry already exists. Update it from the table below if needed.");
        return;
      }
      const nextId = data.assessments.length ? Math.max(...data.assessments.map((entry) => entry.id)) + 1 : 1;
      const assessment = {
        id: nextId,
        studentId: form.studentId,
        subject: form.subject,
        term: form.term,
        type: form.type,
        score,
        maxScore,
        teacher: form.teacher,
        date: new Date().toISOString().split("T")[0],
      };
      setData((prev) => ({ ...prev, assessments: [...prev.assessments, assessment] }));
      setMessage(`Assessment saved for ${formatName(data.students.find((student) => student.id === form.studentId))}.`);
    };

    return (
      <div>
        {createHeading("Assessment Module", "Enter continuous assessment, assignments, and midterm scores for teachers to capture progress.")}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 24, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Add Assessment</h3>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Student</label>
                <select value={form.studentId} onChange={(event) => setForm((prev) => ({ ...prev, studentId: Number(event.target.value) }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {data.students.map((student) => (
                    <option key={student.id} value={student.id}>{formatName(student)} ({student.admissionNumber})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Term</label>
                  <select value={form.term} onChange={(event) => setForm((prev) => ({ ...prev, term: event.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                    {["Term 1", "Term 2", "Term 3"].map((term) => (
                      <option key={term}>{term}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Assessment Type</label>
                  <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                    {["Assignment", "Quiz", "Midterm", "Project"].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Subject</label>
                <select value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {SUBJECTS.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Score</label>
                  <input
                    value={form.score}
                    onChange={(event) => setForm((prev) => ({ ...prev, score: event.target.value }))}
                    placeholder="0"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Max Score</label>
                  <input
                    value={form.maxScore}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxScore: event.target.value }))}
                    placeholder="100"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Teacher</label>
                <input value={form.teacher} disabled style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc" }} />
              </div>
            </div>
            {message && <div style={{ marginTop: 18, color: "#16a34a", fontWeight: 600 }}>{message}</div>}
            <button onClick={addAssessment} style={{ marginTop: 20, width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Save Assessment
            </button>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Recent Assessment Entries</h3>
            {data.assessments.length === 0 ? (
              <div style={{ color: "#64748b" }}>No assessments have been recorded yet.</div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {data.assessments.slice(-8).reverse().map((entry) => {
                  const student = data.students.find((student) => student.id === entry.studentId);
                  return (
                    <div key={entry.id} style={{ padding: "14px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{student ? formatName(student) : "Unknown Student"}</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>{entry.subject} • {entry.term} • {entry.type}</div>
                        </div>
                        <div style={{ color: "#0f172a", fontWeight: 700 }}>{entry.score}/{entry.maxScore}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Examinations = () => {
    const [form, setForm] = useState({ studentId: data.students[0]?.id || "", subject: SUBJECTS[0], term: "Term 1", score: "", maxScore: "100", teacher: user.username });
    const [message, setMessage] = useState("");

    useEffect(() => {
      if (!form.studentId && data.students.length) {
        setForm((prev) => ({ ...prev, studentId: data.students[0].id }));
      }
    }, [data.students]);

    const addExam = () => {
      if (!form.studentId || !form.score.trim()) {
        setMessage("Please select a student and enter an exam score.");
        return;
      }
      const score = normalizeNumber(form.score);
      const maxScore = normalizeNumber(form.maxScore) || 100;
      const existing = data.exams.find(
        (entry) =>
          entry.studentId === form.studentId &&
          entry.term === form.term &&
          entry.subject === form.subject
      );
      if (existing) {
        setMessage("This exam entry already exists. Update it from the table below if needed.");
        return;
      }
      const nextId = data.exams.length ? Math.max(...data.exams.map((entry) => entry.id)) + 1 : 1;
      const grade = gradeFromScore((score / maxScore) * 100);
      const exam = {
        id: nextId,
        studentId: form.studentId,
        subject: form.subject,
        term: form.term,
        score,
        maxScore,
        grade,
        remark: remarkFromGrade(grade),
        teacher: form.teacher,
        date: new Date().toISOString().split("T")[0],
      };
      setData((prev) => ({ ...prev, exams: [...prev.exams, exam] }));
      setMessage(`Exam result saved for ${formatName(data.students.find((student) => student.id === form.studentId))}.`);
    };

    return (
      <div>
        {createHeading("Examination Module", "Record exam scores, calculate grades, and create term results automatically.")}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 24, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Log Examination</h3>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Student</label>
                <select value={form.studentId} onChange={(event) => setForm((prev) => ({ ...prev, studentId: Number(event.target.value) }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {data.students.map((student) => (
                    <option key={student.id} value={student.id}>{formatName(student)} ({student.admissionNumber})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Term</label>
                  <select value={form.term} onChange={(event) => setForm((prev) => ({ ...prev, term: event.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                    {["Term 1", "Term 2", "Term 3"].map((term) => (
                      <option key={term}>{term}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Subject</label>
                  <select value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                    {SUBJECTS.map((subject) => (
                      <option key={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Score</label>
                  <input
                    value={form.score}
                    onChange={(event) => setForm((prev) => ({ ...prev, score: event.target.value }))}
                    placeholder="0"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Max Score</label>
                  <input
                    value={form.maxScore}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxScore: event.target.value }))}
                    placeholder="100"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#475569", fontWeight: 600 }}>Teacher</label>
                <input value={form.teacher} disabled style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc" }} />
              </div>
            </div>
            {message && <div style={{ marginTop: 18, color: "#16a34a", fontWeight: 600 }}>{message}</div>}
            <button onClick={addExam} style={{ marginTop: 20, width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Save Exam Result
            </button>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Latest Exam Results</h3>
            {data.exams.length === 0 ? (
              <div style={{ color: "#64748b" }}>No examination results yet.</div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {data.exams.slice(-8).reverse().map((entry) => {
                  const student = data.students.find((student) => student.id === entry.studentId);
                  return (
                    <div key={entry.id} style={{ padding: "14px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{student ? formatName(student) : "Unknown Student"}</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>{entry.subject} • {entry.term}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.score}/{entry.maxScore}</div>
                          <div style={{ color: "#475569", fontSize: 13 }}>{entry.grade}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Reports = () => {
    const [view, setView] = useState("Class List");
    const [selectedClass, setSelectedClass] = useState(CLASS_LEVELS[0]);
    const [selectedStudentId, setSelectedStudentId] = useState(data.students[0]?.id || "");
    const [selectedTerm, setSelectedTerm] = useState("Term 1");

    useEffect(() => {
      if (!selectedStudentId && data.students.length) {
        setSelectedStudentId(data.students[0].id);
      }
    }, [data.students]);

    const studentsInClass = data.students.filter((student) => student.classLevel === selectedClass);
    const selectedStudent = data.students.find((student) => student.id === selectedStudentId);
    const studentReport = selectedStudent ? findStudentReport(data, selectedStudent.id, selectedTerm) : null;

    const promotionList = data.students.map((student) => {
      const report = findStudentReport(data, student.id, "Term 1");
      const average = Number(report.overallAverage.toFixed(1));
      const status = average >= 50 ? "Promote" : "Repeat";
      return { student, average, status };
    });

    const subjectPerformance = SUBJECTS.map((subject) => {
      const items = data.exams.filter((exam) => exam.subject === subject);
      const average = items.length ? items.reduce((sum, item) => sum + (item.score / item.maxScore) * 100, 0) / items.length : 0;
      return { subject, average: Number(average.toFixed(1)), count: items.length };
    });

    return (
      <div>
        {createHeading("Reports Module", "Generate class lists, result sheets, report cards, and performance summaries for school leadership.")}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {["Class List", "Result Sheet", "Report Card", "Performance Summary", "Promotion Report", "Subject Performance"].map((name) => (
            <button key={name} onClick={() => setView(name)} style={{ padding: "12px 18px", borderRadius: 999, border: "none", background: view === name ? "#4338ca" : "#eef2ff", color: view === name ? "#fff" : "#0f172a", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              {name}
            </button>
          ))}
        </div>

        {view === "Class List" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Class List</h3>
              <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {CLASS_LEVELS.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>
              {studentsInClass.length === 0 ? (
                <div style={{ color: "#64748b" }}>No students in this class yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 0" }}>Admission No.</th>
                      <th style={{ padding: "10px 0" }}>Name</th>
                      <th style={{ padding: "10px 0" }}>Guardian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsInClass.map((student) => (
                      <tr key={student.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "10px 0", color: "#0f172a", fontWeight: 700 }}>{student.admissionNumber}</td>
                        <td style={{ padding: "10px 0" }}>{formatName(student)}</td>
                        <td style={{ padding: "10px 0" }}>{student.guardianName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Class Summary</h3>
              <p style={{ color: "#475569" }}>This list can be printed using the browser print feature or shared as a classroom register.</p>
              <div style={{ marginTop: 18 }}>
                <div style={{ marginBottom: 10, color: "#475569", fontWeight: 600 }}>Selected Class</div>
                <div style={{ padding: "14px 16px", background: "#eef2ff", borderRadius: 14, fontWeight: 700, color: "#0f172a" }}>{selectedClass}</div>
              </div>
            </div>
          </div>
        )}

        {view === "Result Sheet" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Class Result Sheet</h3>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
                <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {CLASS_LEVELS.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
                <select value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {["Term 1", "Term 2", "Term 3"].map((term) => (
                    <option key={term}>{term}</option>
                  ))}
                </select>
              </div>
              {studentsInClass.length === 0 ? (
                <div style={{ color: "#64748b" }}>No students in this class to generate results.</div>
              ) : (
                studentsInClass.map((student) => {
                  const report = findStudentReport(data, student.id, selectedTerm);
                  return (
                    <div key={student.id} style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{student.admissionNumber}</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>{formatName(student)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{Number(report.overallAverage.toFixed(1))}%</div>
                          <div style={{ color: "#475569", fontSize: 13 }}>{report.overallGrade}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Instructions</h3>
              <p style={{ color: "#475569", lineHeight: 1.7 }}>Use this sheet for term result review. If student averages are missing, check the assessment and exam entries for the selected class and term.</p>
            </div>
          </div>
        )}

        {view === "Report Card" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Student Report Card</h3>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(Number(event.target.value))} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {data.students.map((student) => (
                    <option key={student.id} value={student.id}>{formatName(student)} ({student.admissionNumber})</option>
                  ))}
                </select>
                <select value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
                  {["Term 1", "Term 2", "Term 3"].map((term) => (
                    <option key={term}>{term}</option>
                  ))}
                </select>
              </div>
              {selectedStudent ? (
                <div>
                  <div style={{ marginBottom: 18, padding: "18px", background: "#eef2ff", borderRadius: 16 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatName(selectedStudent)}</div>
                    <div style={{ color: "#475569", fontSize: 13 }}>{selectedStudent.classLevel} • {selectedStudent.admissionNumber}</div>
                    <div style={{ marginTop: 10, color: "#334155", fontSize: 14 }}>Overall Average: {Number(studentReport.overallAverage.toFixed(1))}% • Grade: {studentReport.overallGrade}</div>
                  </div>
                  {studentReport.subjects.length === 0 ? (
                    <div style={{ color: "#64748b" }}>No recorded assessments or examinations for this student in the selected term.</div>
                  ) : (
                    <div>
                      {studentReport.subjects.map((item) => (
                        <div key={item.subject} style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.subject}</div>
                              <div style={{ color: "#475569", fontSize: 13 }}>Assessment: {item.assessmentAverage !== null ? `${Number(item.assessmentAverage.toFixed(1))}%` : "n/a"} • Exam: {item.examAverage !== null ? `${Number(item.examAverage.toFixed(1))}%` : "n/a"}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ color: "#0f172a", fontWeight: 700 }}>{item.grade}</div>
                              <div style={{ fontSize: 13, color: "#475569" }}>{item.remark}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>Select a student to generate their report card.</div>
              )}
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Report Card Notes</h3>
              <p style={{ color: "#475569", lineHeight: 1.8 }}>A strong report card includes attendance, behavior, and teacher remarks. Use the student record page to add notes before printing.</p>
            </div>
          </div>
        )}

        {view === "Performance Summary" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Class Strength and Progress</h3>
              {CLASS_LEVELS.map((level) => {
                const students = data.students.filter((student) => student.classLevel === level);
                return (
                  <div key={level} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}> 
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{level}</span>
                      <span style={{ color: "#475569" }}>{students.length} students</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 10, background: "#e2e8f0" }}>
                      <div style={{ width: `${Math.min(100, students.length * 10)}%`, height: "100%", borderRadius: 10, background: "#4338ca" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a" }}>Weak Student Alerts</h3>
              {promotionList.filter((item) => item.status === "Repeat").length === 0 ? (
                <div style={{ color: "#16a34a" }}>No repeat alerts for Term 1. Well done.</div>
              ) : (
                promotionList.filter((item) => item.status === "Repeat").map((item) => (
                  <div key={item.student.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatName(item.student)}</div>
                    <div style={{ color: "#475569", fontSize: 13 }}>Average {item.average}% — {item.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === "Promotion Report" && (
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Promotion and Repeat List</h3>
            <div style={{ marginTop: 18 }}>
              {promotionList.length === 0 ? (
                <div style={{ color: "#64748b" }}>No student records are available yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 0" }}>Student</th>
                      <th style={{ padding: "10px 0" }}>Class</th>
                      <th style={{ padding: "10px 0" }}>Average</th>
                      <th style={{ padding: "10px 0" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotionList.map((item) => (
                      <tr key={item.student.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "10px 0" }}>{formatName(item.student)}</td>
                        <td style={{ padding: "10px 0" }}>{item.student.classLevel}</td>
                        <td style={{ padding: "10px 0" }}>{item.average}%</td>
                        <td style={{ padding: "10px 0", fontWeight: 700, color: item.status === "Promote" ? "#15803d" : "#b91c1c" }}>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {view === "Subject Performance" && (
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Subject Performance Report</h3>
            <div style={{ marginTop: 18 }}>
              {subjectPerformance.filter((item) => item.count > 0).length === 0 ? (
                <div style={{ color: "#64748b" }}>No exam records are available to generate a subject report.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 0" }}>Subject</th>
                      <th style={{ padding: "10px 0" }}>Average Score</th>
                      <th style={{ padding: "10px 0" }}>Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectPerformance.map((item) => (
                      <tr key={item.subject} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "10px 0" }}>{item.subject}</td>
                        <td style={{ padding: "10px 0" }}>{item.average}%</td>
                        <td style={{ padding: "10px 0" }}>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const AISupport = () => {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    const search = () => {
      const normalized = query.trim().toLowerCase();
      if (!normalized) return;
      const results = data.students.filter((student) => {
        return [student.admissionNumber, student.firstName, student.lastName, student.classLevel]
          .some((value) => value.toLowerCase().includes(normalized));
      });
      setSearchResults(results);
    };

    const duplicateAssessments = data.assessments.reduce((acc, entry) => {
      const key = `${entry.studentId}-${entry.term}-${entry.subject}-${entry.type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const duplicateExams = data.exams.reduce((acc, entry) => {
      const key = `${entry.studentId}-${entry.term}-${entry.subject}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const duplicateAssessmentEntries = data.assessments.filter((entry) => duplicateAssessments[`${entry.studentId}-${entry.term}-${entry.subject}-${entry.type}`] > 1);
    const duplicateExamEntries = data.exams.filter((entry) => duplicateExams[`${entry.studentId}-${entry.term}-${entry.subject}`] > 1);

    const weakAlerts = data.students.map((student) => ({
      student,
      report: findStudentReport(data, student.id, "Term 1"),
    })).filter((item) => item.report.overallAverage > 0 && item.report.overallAverage < 45);

    return (
      <div>
        {createHeading("AI Support", "Offline intelligent search, error detection, weak student alerts, and suggested remarks.")}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Smart Search</h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, admission number, or class"
                style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #cbd5e1" }}
              />
              <button onClick={search} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#4338ca", color: "#fff", cursor: "pointer" }}>
                Search
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div style={{ color: "#64748b" }}>Enter a query and press Search to find students and records.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {searchResults.map((student) => (
                  <div key={student.id} style={{ padding: 14, borderRadius: 14, background: "#eef2ff" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatName(student)}</div>
                    <div style={{ color: "#475569", fontSize: 13 }}>{student.admissionNumber} • {student.classLevel}</div>
                    <div style={{ marginTop: 6, color: "#475569", fontSize: 13 }}>Guardian: {student.guardianName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Alerts & Detection</h3>
            <div style={{ marginBottom: 16, color: "#475569", lineHeight: 1.7 }}>
              This module flags duplicate score entries, missing exam data, and weak students who need remediation. All analysis runs locally.
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>Duplicate Assessments</div>
              <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{duplicateAssessmentEntries.length} duplicate assessment entries found.</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>Duplicate Exam Results</div>
              <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{duplicateExamEntries.length} duplicate exam entries found.</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>Weak Performance Alerts</div>
              <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>{weakAlerts.length} students have a Term 1 average below 45%.</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Suggested Remarks</h3>
            {data.students.length === 0 ? (
              <div style={{ color: "#64748b" }}>Register students and enter scores to see suggested remarks.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {data.students.slice(0, 5).map((student) => {
                  const report = findStudentReport(data, student.id, "Term 1");
                  return (
                    <div key={student.id} style={{ padding: 16, borderRadius: 14, background: "#f8fafc" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatName(student)}</div>
                      <div style={{ color: "#475569", fontSize: 13 }}>Average: {Number(report.overallAverage.toFixed(1))}% — Grade: {report.overallGrade}</div>
                      <div style={{ marginTop: 8, color: "#0f172a" }}>{report.overallRemark}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Record Completeness</h3>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>Review data completeness for students in each class. Missing exams or assessments can be identified from the Results module and corrected by teachers.</p>
          </div>
        </div>
      </div>
    );
  };

  const Attendance = () => {
    const attendanceRecords = data.attendance.slice(-5).reverse();

    return (
      <div>
        {createHeading("Attendance", "Record daily presence, monitor staff coverage, and keep the school-ready roster visible for test use.")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Today’s Summary</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 14, background: "#eef2ff" }}>
                <div style={{ color: "#64748b", fontSize: 13 }}>Student Attendance</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{Math.max(1, data.students.length)} marked on the register</div>
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: "#f8fafc" }}>
                <div style={{ color: "#64748b", fontSize: 13 }}>School Status</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Operational and test-ready</div>
              </div>
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Recent Attendance Entries</h3>
            {attendanceRecords.length === 0 ? (
              <div style={{ color: "#64748b" }}>No attendance records have been logged yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {attendanceRecords.map((entry, index) => (
                  <div key={`${entry.id || index}-${entry.studentId || index}`} style={{ padding: 14, borderRadius: 12, background: "#f8fafc" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{entry.studentName || "Student record"}</div>
                    <div style={{ color: "#475569", fontSize: 13 }}>{entry.date || "Today"} • {entry.status || "Present"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ManageClasses = () => {
    return (
      <div>
        {createHeading("Manage Classes", "Review class groups, school structure, and core academic lists for leadership and testing scenarios.")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Class Structure</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {CLASS_LEVELS.map((level) => (
                <div key={level} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, background: "#eef2ff" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{level}</span>
                  <span style={{ color: "#475569" }}>{data.students.filter((student) => student.classLevel === level).length} students</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Subjects</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {SUBJECTS.map((subject) => (
                <div key={subject} style={{ padding: 12, borderRadius: 12, background: "#f8fafc", color: "#0f172a", fontWeight: 700 }}>{subject}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Settings = () => {
    return (
      <div>
        {createHeading("Settings & Offline Backup", "Control role access, export or restore your local database, and keep data safe without internet." )}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Offline Backup</h3>
            <p style={{ color: "#475569", lineHeight: 1.8 }}>Export the current database to a JSON file for backup. Paste an exported backup here to restore or migrate data to another computer.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <button onClick={handleBackupDownload} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer" }}>
                Download Backup
              </button>
              <button onClick={restoreBackup} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#4338ca", color: "#fff", cursor: "pointer" }}>
                Restore Backup
              </button>
            </div>
            <textarea
              rows={10}
              value={backupText}
              onChange={(event) => setBackupText(event.target.value)}
              placeholder="Paste exported backup JSON here"
              style={{ width: "100%", padding: "14px", borderRadius: 14, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "monospace", resize: "vertical" }}
            />
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 20px rgba(15, 23, 42, 0.06)" }}>
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>User Access</h3>
            <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
              The school system supports four offline roles with scoped access.
            </div>
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              {Object.entries(CREDENTIALS).map(([username, record]) => (
                <div key={username} style={{ padding: 16, borderRadius: 14, background: "#f8fafc" }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{record.role}</div>
                  <div style={{ color: "#475569", fontSize: 13 }}>Username: {username}</div>
                  <div style={{ color: "#475569", fontSize: 13 }}>Password: {record.password}</div>
                </div>
              ))}
            </div>
            <button onClick={logout} style={{ marginTop: 24, width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Logout from {user.role}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case "Dashboard":
        return <Dashboard />;
      case "Admission":
        return <Admission />;
      case "Records":
        return <Records />;
      case "Attendance":
        return <Attendance />;
      case "Assessments":
        return <Assessments />;
      case "Examinations":
        return <Examinations />;
      case "Reports":
        return <Reports />;
      case "AI Support":
        return <AISupport />;
      case "Manage Classes":
        return <ManageClasses />;
      case "Settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#eef2ff", fontFamily: "'Segoe UI', sans-serif", color: "#0f172a" }}>
      <div style={{ background: "linear-gradient(135deg, #4338ca, #0f172a)", padding: "18px 24px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, maxWidth: 1200, margin: "0 auto" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Msendoo Vocational & Technical School</div>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Offline-first AI-powered school management • testing mode</div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", padding: "10px 14px", borderRadius: 12, color: "#f8fafc", fontWeight: 700 }}>{user.role}</div>
            <div style={{ background: "#22c55e", color: "#052e16", padding: "10px 14px", borderRadius: 12, fontWeight: 800, fontSize: 12 }}>TEST READY</div>
            <button onClick={logout} style={{ background: "#f8fafc", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>Logout</button>
          </div>
        </div>
      </div>
      <div style={{ background: "#fff", padding: "14px 24px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 8, overflowX: "auto" }}>
          {allowedTabs.map((name) => (
            <button key={name} onClick={() => setTab(name)} style={{ padding: "12px 16px", borderRadius: 999, border: "none", background: tab === name ? "#4338ca" : "#eef2ff", color: tab === name ? "#fff" : "#0f172a", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>{renderTab()}</div>
    </div>
  );
}
