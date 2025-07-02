import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { getAuthToken } from "../utils/auth";

// Teal color palette
const TEAL = {
  main: '#14b8a6', // teal-500
  light: '#99f6e4', // teal-200
  lighter: '#f0fdfa', // teal-50
  dark: '#0f766e', // teal-700
  accent: '#2dd4bf', // teal-400
  shadow: '#14b8a622',
};

// ...existing code...

const Settings = () => {
  const [user, setUser] = useState(null);
  const [paths, setPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(auth.currentUser);
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/skill-paths`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch skill paths");
        const data = await res.json();
        setPaths(data);
        if (data.length > 0) setSelectedPath(data[0].id);
      } catch {}
    })();
  }, []);

  const handleExport = async (format) => {
    setMsg("");
    if (!selectedPath) return setMsg("Select a roadmap to export.");
    try {
      const token = await getAuthToken();
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/export?skill_path_id=${selectedPath}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roadmap.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMsg("Exported!");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    setMsg("");
    try {
      const token = await getAuthToken();
      setLoading(true);
      // Delete from backend (Postgres)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/user/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed (backend)");
      // Delete from Firebase Auth
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (firebaseErr) {
          // If Firebase requires recent login, sign out instead
          if (firebaseErr.code === 'auth/requires-recent-login') {
            setMsg("Account deleted from backend. Please log in again to delete from Firebase.");
            setTimeout(() => {
              auth.signOut();
              window.location.href = "/";
            }, 2500);
            return;
          } else {
            throw firebaseErr;
          }
        }
      }
      setMsg("Account deleted from both systems. Logging out...");
      setTimeout(() => {
        auth.signOut();
        localStorage.removeItem("token");
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-gradient" style={{background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, fontFamily: 'sans-serif', width: '100vw', boxSizing: 'border-box', overflowX: 'hidden'}}>
      <div className="card shadow-lg p-4 p-md-5 my-5 mx-auto" style={{maxWidth: 520, width: '100%', borderRadius: 20, background: 'rgba(255,255,255,0.99)', boxSizing: 'border-box'}}>
        <h2 className="mb-4" style={{ color: TEAL.main, fontSize: 'clamp(1.2rem, 2vw, 2rem)' }}>Settings</h2>
        <div className="mb-4">
          <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>User Info</h4>
          <div>Name: <span style={{ color: TEAL.accent }}>{user?.displayName || '(not logged in)'}</span></div>
          <div>Email: <span style={{ color: TEAL.accent }}>{user?.email || ''}</span></div>
          <div>Google Linked: <span style={{ color: TEAL.accent }}>{user ? 'Yes' : 'No'}</span></div>
        </div>
        <div className="mb-4">
          <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Preferred Learning Time Slots</h4>
          <div className="text-muted">(placeholder for time slot selection)</div>
        </div>
        <div className="mb-4">
          <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Export Roadmap</h4>
          <div className="mb-2">
            <select className="form-select" value={selectedPath} onChange={e => setSelectedPath(e.target.value)} style={{ border: `1.5px solid ${TEAL.main}`, fontSize: '1rem' }}>
              {paths.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <button
            onClick={() => handleExport('pdf')}
            className="me-2 mb-2"
            style={{ background: TEAL.main, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', fontWeight: 'bold', fontSize: '1rem' }}
            disabled={loading}
          >
            Export as PDF
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="mb-2"
            style={{ background: TEAL.accent, color: TEAL.dark, border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', fontWeight: 'bold', fontSize: '1rem' }}
            disabled={loading}
          >
            Export as CSV
          </button>
        </div>
        <div className="mb-4">
          <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Delete Account</h4>
          <button
            onClick={handleDeleteAccount}
            style={{ background: '#ff4f4f', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', fontWeight: 'bold', fontSize: '1rem' }}
            disabled={loading}
          >
            Delete Account
          </button>
        </div>
        <div className="mb-4">
          <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Logout</h4>
          <button
            onClick={() => { auth.signOut(); localStorage.removeItem("token"); window.location.href = "/"; }}
            style={{ background: TEAL.dark, color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', fontWeight: 'bold', fontSize: '1rem' }}
            disabled={loading}
          >
            Logout
          </button>
        </div>
        {msg && <div className={`mt-4 fw-bold`} style={{ color: msg.startsWith('Exported') ? TEAL.main : msg.startsWith('Account deleted') ? TEAL.accent : 'red' }}>{msg}</div>}
      </div>
    </div>
  );
};

export default Settings;