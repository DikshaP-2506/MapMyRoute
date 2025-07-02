import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { getAuthToken } from "../utils/auth";

// Teal color palette
const TEAL = {
  main: '#11998e', // teal-500
  light: '#99f6e4', // teal-200
  lighter: '#f0fdfa', // teal-50
  dark: '#0f766e', // teal-700
  accent: '#2dd4bf', // teal-400
  shadow: '#14b8a622',
};

const LoginPage = () => {
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      localStorage.setItem("token", token);
      navigate("/dashboard");
      window.location.reload();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message);
      }
    }
  };

  const handleInput = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Login failed");
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      navigate("/dashboard");
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient" style={{background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, fontFamily: 'sans-serif', width: '100vw', boxSizing: 'border-box', overflowX: 'hidden'}}>
      <div className="card shadow-lg p-4 p-md-5 text-center" style={{maxWidth: 400, width: '100%', borderRadius: 20, border: `1.5px solid ${TEAL.light}`, background: 'rgba(255,255,255,0.98)', boxSizing: 'border-box'}}>
        <h2 className="mb-4" style={{ color: '#000', fontSize: 'clamp(1.2rem, 2vw, 2rem)' }}>Login to MapMyRoute</h2>
        <button className="btn d-flex align-items-center justify-content-center gap-2 w-100 mb-3 fw-bold" style={{borderRadius: 10, fontSize: '1.1rem', border: `2px solid ${TEAL.main}`, color: TEAL.main, background: '#fff'}} onClick={handleGoogleLogin}>
          <svg width="22" height="22" viewBox="0 0 48 48" style={{marginRight: 8}}><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.36 1.53 7.82 2.81l5.77-5.77C34.64 3.55 29.74 1.5 24 1.5 14.82 1.5 6.91 7.36 3.36 15.09l6.91 5.36C12.09 14.09 17.55 9.5 24 9.5z"/><path fill="#34A853" d="M46.14 24.5c0-1.64-.15-3.22-.43-4.74H24v9.01h12.44c-.54 2.91-2.18 5.38-4.66 7.04l7.19 5.6C43.91 37.09 46.14 31.27 46.14 24.5z"/><path fill="#FBBC05" d="M10.27 28.14A14.5 14.5 0 019.5 24c0-1.44.24-2.83.68-4.14l-6.91-5.36A23.94 23.94 0 001.5 24c0 3.77.91 7.34 2.53 10.5l6.24-6.36z"/><path fill="#EA4335" d="M24 46.5c6.48 0 11.93-2.14 15.91-5.86l-7.19-5.6c-2.01 1.35-4.59 2.16-8.72 2.16-6.45 0-11.91-4.59-13.73-10.77l-6.91 5.36C6.91 40.64 14.82 46.5 24 46.5z"/><path fill="none" d="M1.5 1.5h45v45h-45z"/></g></svg>
          Continue with Google
        </button>
        <div className="my-3" style={{ color: TEAL.dark }}>or</div>
        <form onSubmit={handleEmailAuth}>
          <input
            className="form-control mb-3"
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleInput}
            required
            style={{ border: `1.5px solid ${TEAL.main}`, fontSize: '1rem' }}
          />
          <input
            className="form-control mb-3"
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleInput}
            required
            style={{ border: `1.5px solid ${TEAL.main}`, fontSize: '1rem' }}
          />
          <button type="submit" className="btn w-100 fw-bold mb-2" style={{borderRadius: 10, background: TEAL.main, color: '#fff', border: 'none', fontSize: '1rem'}} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="mt-3">
          <span>Don't have an account? <Link to="/signup" className="btn btn-link p-0 fw-semibold" style={{textDecoration: 'underline', color: TEAL.main}}>Sign Up</Link></span>
        </div>
        {error && <p className="mt-3" style={{ color: 'red' }}>{error}</p>}
      </div>
      <footer className="text-white text-center py-3 mt-auto" style={{fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', background: '#444', width: '100vw', position: 'fixed', bottom: 0, left: 0}}>
        &copy; {new Date().getFullYear()} MapMyRoute. All rights reserved.
      </footer>
    </div>
  );
};

export default LoginPage;