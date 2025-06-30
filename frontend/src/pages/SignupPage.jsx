import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

const TEAL = {
  main: '#14b8a6',
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
      navigate("/dashboard");
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
        <h2 className="mb-4" style={{ color: TEAL.main, fontSize: 'clamp(1.2rem, 2vw, 2rem)' }}>Sign Up for MapMyRoute</h2>
        <button className="btn d-flex align-items-center justify-content-center gap-2 w-100 mb-3 fw-bold" style={{borderRadius: 10, fontSize: '1.1rem', border: `2px solid ${TEAL.main}`, color: TEAL.main, background: '#fff'}} onClick={handleGoogleSignup} disabled={loading}>
          <span style={{ fontSize: '1.5rem' }}>G</span> Sign up with Google
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
  );
};

export default SignupPage; 