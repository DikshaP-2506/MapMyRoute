import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
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

const LoginPage = () => {
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // 'login' or 'register'
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError("");
    setBackendUser(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      const token = await result.user.getIdToken();
      // Send token to backend for verification
      const res = await fetch("http://localhost:8000/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      if (!res.ok) throw new Error("Backend verification failed");
      const data = await res.json();
      setBackendUser(data);
      // Redirect to dashboard after successful backend verification
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
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
      const url = mode === "login" ? "http://localhost:8000/auth/login" : "http://localhost:8000/auth/register";
      const body = mode === "login" ? { email: form.email, password: form.password } : { email: form.email, password: form.password, name: form.name };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      // Save token and redirect
      localStorage.setItem("token", data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient" style={{background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, fontFamily: 'sans-serif', width: '100vw', boxSizing: 'border-box', overflowX: 'hidden'}}>
      <div className="card shadow-lg p-4 p-md-5 text-center" style={{maxWidth: 400, width: '100%', borderRadius: 20, border: `1.5px solid ${TEAL.light}`, background: 'rgba(255,255,255,0.98)', boxSizing: 'border-box'}}>
        <h2 className="mb-4" style={{ color: TEAL.main, fontSize: 'clamp(1.2rem, 2vw, 2rem)' }}>Login to MapMyRoute</h2>
        <button className="btn d-flex align-items-center justify-content-center gap-2 w-100 mb-3 fw-bold" style={{borderRadius: 10, fontSize: '1.1rem', border: `2px solid ${TEAL.main}`, color: TEAL.main, background: '#fff'}} onClick={handleGoogleLogin}>
          <span style={{ fontSize: '1.5rem' }}>\u000000</span> Continue with Google
        </button>
        <div className="my-3" style={{ color: TEAL.dark }}>or</div>
        <form onSubmit={handleEmailAuth}>
          {mode === "register" && (
            <input
              className="form-control mb-3"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleInput}
              required
              style={{ border: `1.5px solid ${TEAL.main}`, fontSize: '1rem' }}
            />
          )}
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
            {loading ? (mode === "login" ? "Logging in..." : "Registering...") : (mode === "login" ? "Login" : "Register")}
          </button>
        </form>
        <div className="mt-3">
          {mode === "login" ? (
            <span>Don't have an account? <button className="btn btn-link p-0 fw-semibold" style={{textDecoration: 'underline', color: TEAL.main}} onClick={() => setMode('register')}>Register</button></span>
          ) : (
            <span>Already have an account? <button className="btn btn-link p-0 fw-semibold" style={{textDecoration: 'underline', color: TEAL.main}} onClick={() => setMode('login')}>Login</button></span>
          )}
        </div>
        {error && <p className="mt-3" style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;