import React from "react";
import { Link } from "react-router-dom";
import myBg from '../assets/my-bg.png';

// Teal color palette
const TEAL = {
  main: '#14b8a6', // teal-500
  light: '#99f6e4', // teal-200
  lighter: '#f0fdfa', // teal-50
  dark: '#0f766e', // teal-700
  accent: '#2dd4bf', // teal-400
  shadow: '#14b8a622',
};

const features = [
  { icon: '🧠', label: 'Personalized AI Roadmaps' },
  { icon: '🗓️', label: 'Weekly Planner' },
  { icon: '📈', label: 'Progress Analytics' },
  { icon: '📚', label: 'Resource Library' },
  { icon: '🌐', label: 'Public Roadmap Sharing' },
  { icon: '🔐', label: 'Google Login' },
];

const LandingPage = () => (
  <div className="min-vh-100 d-flex flex-column" style={{ fontFamily: 'sans-serif', background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, width: '100vw', boxSizing: 'border-box', overflowX: 'hidden' }}>
    {/* Navbar */}
    <nav className="navbar navbar-expand-lg navbar-light shadow-sm" style={{ zIndex: 10, background: TEAL.main }}>
      <div className="container-fluid">
        <Link to="/" className="navbar-brand fw-bold fs-3" style={{ color: '#fff' }}>
          MapMyRoute
        </Link>
        <div className="ms-auto d-flex gap-2">
          <Link to="/login">
            <button className="btn btn-outline-light fw-semibold" style={{ borderColor: '#fff', color: '#fff' }}>
              Login
            </button>
          </Link>
          <Link to="/signup">
            <button className="btn btn-light fw-semibold" style={{ background: '#fff', color: TEAL.main, border: 'none' }}>
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </nav>

    {/* Hero Section */}
    <section
      className="d-flex align-items-center justify-content-end text-white position-relative"
      style={{
        minHeight: '50vh',
        width: '100%',
        background: `url(${myBg}) center/cover no-repeat`,
        boxShadow: `0 2px 16px ${TEAL.shadow}`,
      }}
    >
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'rgba(20,184,166,0.55)', zIndex: 1 }}></div>
      <div className="container position-relative py-5" style={{ zIndex: 2, maxWidth: 700, marginLeft: 'auto', textAlign: 'right', marginRight: '4vw' }}>
        <h1 className="display-3 fw-bold mb-3" style={{ textShadow: `0 2px 8px ${TEAL.shadow}` }}>
          AI-Powered Personalized Skill Roadmaps
        </h1>
        <div className="lead mb-4 fw-medium" style={{ fontSize: '1.3rem' }}>
          <p>
            MapMyRoute helps you achieve your learning goals with custom weekly plans, tailored to your experience, time, and ambitions. Our AI crafts a unique roadmap just for you, so you always know what to learn next.
          </p>
          <p>
            Track your progress, explore curated resources, and join a community of learners. Whether you're a beginner or advancing your skills, MapMyRoute guides you every step of the way.
          </p>
        </div>
        <Link to="/login">
          <button className="btn btn-lg px-4 fw-bold shadow-sm" style={{ background: TEAL.lighter, color: TEAL.dark, border: 'none', borderRadius: 10 }}>
            Get Your Roadmap
          </button>
        </Link>
      </div>
    </section>

    {/* Main Content */}
    <div className="flex-grow-1">
      {/* Features Overview */}
      <section className="container rounded-4 shadow p-4 mb-4" style={{ background: TEAL.lighter, width: '100%', maxWidth: 900, margin: '0 auto', boxSizing: 'border-box' }}>
        <h2 className="text-center mb-4" style={{ color: TEAL.main }}>Features</h2>
        <div className="row g-4 justify-content-center">
          {features.map(f => (
            <div key={f.label} className="col-6 col-md-4 col-lg-3 text-center">
              <div className="fs-1 mb-2" style={{ color: TEAL.main }}>{f.icon}</div>
              <div className="fw-semibold" style={{ color: TEAL.dark }}>{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container rounded-4 shadow p-4 mb-4" style={{ background: TEAL.lighter, width: '100%', maxWidth: 900, margin: '0 auto', boxSizing: 'border-box' }}>
        <h2 className="text-center mb-3" style={{ color: TEAL.main }}>Testimonials</h2>
        <div className="row justify-content-center g-3">
          <div className="col-12 col-md-6">
            <blockquote className="blockquote rounded-3 p-3 shadow-sm text-center" style={{ background: TEAL.light }}>
              "This app changed how I learn!"<br /><span className="fw-semibold" style={{ color: TEAL.main }}>— Student</span>
            </blockquote>
          </div>
          <div className="col-12 col-md-6">
            <blockquote className="blockquote rounded-3 p-3 shadow-sm text-center" style={{ background: TEAL.light }}>
              "The AI roadmap is so helpful."<br /><span className="fw-semibold" style={{ color: TEAL.accent }}>— Developer</span>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Sample Roadmap Demo */}
      <section className="container rounded-4 shadow p-4 mb-4" style={{ background: TEAL.lighter, width: '100%', maxWidth: 900, margin: '0 auto', boxSizing: 'border-box' }}>
        <h2 className="text-center mb-3" style={{ color: TEAL.main }}>Explore a Sample Roadmap</h2>
        <div className="text-center fw-bold fs-5" style={{ color: TEAL.accent }}>
          Sample: Python for Beginners (Demo Coming Soon)
        </div>
      </section>
    </div>

    {/* Footer */}
    <footer className="text-white text-center py-3 mt-auto" style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', background: '#444' }}>
      &copy; 2025 MapMyRoute. All rights reserved.
    </footer>
  </div>
);

export default LandingPage;