import React from "react";
import { Link } from "react-router-dom";

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
  <div className="min-vh-100 bg-gradient" style={{ fontFamily: 'sans-serif', background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, width: '100vw', boxSizing: 'border-box', overflowX: 'hidden' }}>
    {/* Hero Section */}
    <section className="text-center py-5 px-3 text-white rounded-bottom-4 mb-4" style={{ background: `linear-gradient(135deg, ${TEAL.main} 0%, ${TEAL.accent} 100%)`, width: '100%', boxSizing: 'border-box' }}>
      <h1 className="display-4 fw-bold mb-3" style={{ textShadow: `0 2px 8px ${TEAL.shadow}` }}>
        AI-Powered Personalized Skill Roadmaps
      </h1>
      <p className="lead mb-4 fw-medium text-light">
        Custom weekly learning plans based on your level, time & goals.
      </p>
      <Link to="/login">
        <button className="btn btn-lg px-4 fw-bold shadow-sm" style={{ background: TEAL.lighter, color: TEAL.dark, border: 'none', borderRadius: 10 }}>
          Get Your Roadmap
        </button>
      </Link>
    </section>

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
            “This app changed how I learn!”<br /><span className="fw-semibold" style={{ color: TEAL.main }}>— Student</span>
          </blockquote>
        </div>
        <div className="col-12 col-md-6">
          <blockquote className="blockquote rounded-3 p-3 shadow-sm text-center" style={{ background: TEAL.light }}>
            “The AI roadmap is so helpful.”<br /><span className="fw-semibold" style={{ color: TEAL.accent }}>— Developer</span>
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

    {/* Footer */}
    <footer className="text-center mt-5 py-4 opacity-75" style={{ color: TEAL.dark, background: TEAL.lighter, width: '100%', boxSizing: 'border-box' }}>
      <p>About | Contact | Terms | Privacy | Socials</p>
      <p className="small mt-2">© {new Date().getFullYear()} MapMyRoute (SkillPilot)</p>
    </footer>
  </div>
);

export default LandingPage;