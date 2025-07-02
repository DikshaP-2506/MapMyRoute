import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

const TEAL = {
  main: '#11998e',
  light: '#99f6e4',
  lighter: '#f0fdfa',
  dark: '#0f766e',
  accent: '#2dd4bf',
  shadow: '#14b8a622',
};

const SignupPage = () => {
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInput = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, form.email, form.password);
      // Register user in backend as well
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Backend registration failed");
      }
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/login");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient" style={{background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, fontFamily: 'sans-serif', width: '100vw', boxSizing: 'border-box', overflowX: 'hidden'}}>
        <div className="card shadow-lg p-4 p-md-5 text-center" style={{maxWidth: 400, width: '100%', borderRadius: 20, border: `1.5px solid ${TEAL.light}`, background: 'rgba(255,255,255,0.98)', boxSizing: 'border-box'}}>
          <h2 className="mb-4" style={{ color: '#000', fontSize: 'clamp(1.2rem, 2vw, 2rem)' }}>Sign Up for MapMyRoute</h2>
          <button className="btn d-flex align-items-center justify-content-center gap-2 w-100 mb-3 fw-bold" style={{borderRadius: 10, fontSize: '1.1rem', border: `2px solid ${TEAL.main}`, color: TEAL.main, background: '#fff'}} onClick={handleGoogleSignup} disabled={loading}>
            <svg width="22" height="22" viewBox="0 0 48 48" style={{marginRight: 8}}><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.36 1.53 7.82 2.81l5.77-5.77C34.64 3.55 29.74 1.5 24 1.5 14.82 1.5 6.91 7.36 3.36 15.09l6.91 5.36C12.09 14.09 17.55 9.5 24 9.5z"/><path fill="#34A853" d="M46.14 24.5c0-1.64-.15-3.22-.43-4.74H24v9.01h12.44c-.54 2.91-2.18 5.38-4.66 7.04l7.19 5.6C43.91 37.09 46.14 31.27 46.14 24.5z"/><path fill="#FBBC05" d="M10.27 28.14A14.5 14.5 0 019.5 24c0-1.44.24-2.83.68-4.14l-6.91-5.36A23.94 23.94 0 001.5 24c0 3.77.91 7.34 2.53 10.5l6.24-6.36z"/><path fill="#EA4335" d="M24 46.5c6.48 0 11.93-2.14 15.91-5.86l-7.19-5.6c-2.01 1.35-4.59 2.16-8.72 2.16-6.45 0-11.91-4.59-13.73-10.77l-6.91 5.36C6.91 40.64 14.82 46.5 24 46.5z"/><path fill="none" d="M1.5 1.5h45v45h-45z"/></g></svg>
            Sign up with Google
          </button>
          <div className="my-3" style={{ color: TEAL.dark }}>or</div>
          <form onSubmit={handleSignup}>
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
            <input
              className="form-control mb-3"
              name="confirm"
              type="password"
              placeholder="Confirm Password"
              value={form.confirm}
              onChange={handleInput}
              required
              style={{ border: `1.5px solid ${TEAL.main}`, fontSize: '1rem' }}
            />
            <button type="submit" className="btn w-100 fw-bold mb-2" style={{borderRadius: 10, background: TEAL.main, color: '#fff', border: 'none', fontSize: '1rem'}} disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
          <div className="mt-3">
            <span>Already have an account? <Link to="/login" className="btn btn-link p-0 fw-semibold" style={{textDecoration: 'underline', color: TEAL.main}}>Login</Link></span>
          </div>
          {error && <p className="mt-3" style={{ color: 'red' }}>{error}</p>}
        </div>
      </div>
      <footer className="text-white text-center py-3 mt-auto" style={{fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', background: '#444', width: '100vw', position: 'fixed', bottom: 0, left: 0}}>
        &copy; {new Date().getFullYear()} MapMyRoute. All rights reserved.
      </footer>
    </>
  );
};

export default SignupPage; 