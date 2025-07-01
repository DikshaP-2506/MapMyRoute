import React from "react";
import { Link } from "react-router-dom";
import myBg from '../assets/my-bg.png';
import weeklyPlannerImg from '../assets/weeklyplanner.jpg';
import resources from '../assets/resources.jpg';
import aiRoadmapImg from '../assets/airoadmap.jpg';
import analyticsImg from '../assets/analytics.jpg';
import sharingImg from '../assets/sharing.jpg';
import googleLoginImg from '../assets/googlelogin.jpg';
import logo from '../assets/logo.png';

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
  {
    icon: '🧠',
    label: 'Personalized AI Roadmaps',
    desc: `Get a learning path tailored to your goals, experience, and schedule. Our AI analyzes your needs and crafts a unique roadmap just for you, so you always know what to learn next.`,
    img: aiRoadmapImg,
  },
  {
    icon: '🗓️',
    label: 'Weekly Planner',
    desc: `Stay organized with a weekly planner that breaks your roadmap into manageable tasks. Track your progress and never miss a learning milestone again.`,
    img: weeklyPlannerImg,
  },
  {
    icon: '📈',
    label: 'Progress Analytics',
    desc: `Visualize your learning journey with detailed analytics. See your strengths, identify areas for improvement, and celebrate your achievements along the way.`,
    img: analyticsImg,
  },
  {
    icon: '📚',
    label: 'Resource Library',
    desc: `Access a curated library of resources for every step of your roadmap. Find the best articles, videos, and practice problems, all in one place.`,
    img: resources,
  },
  {
    icon: '🌐',
    label: 'Public Roadmap Sharing',
    desc: `Share your progress and roadmaps with friends or the community. Inspire others and get feedback on your learning journey.`,
    img: sharingImg,
  },
  {
    icon: '🔐',
    label: 'Google Login',
    desc: `Sign up and log in securely with your Google account. Your data is safe, and you can access your roadmap from any device.`,
    img: googleLoginImg,
  },
];

const LandingPage = () => (
  <div className="min-vh-100 d-flex flex-column" style={{ fontFamily: 'sans-serif', background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, width: '100vw', boxSizing: 'border-box', overflowX: 'hidden' }}>
    {/* Navbar */}
    <nav className="navbar navbar-expand-lg navbar-light shadow-sm" style={{ zIndex: 10, background: TEAL.main, minHeight: 48, padding: '0.3rem 0' }}>
      <div className="container-fluid">
        <div className="d-flex w-100 align-items-center justify-content-between">
          <Link to="/" className="navbar-brand fw-bold fs-3" style={{ color: '#fff', fontSize: '2.5rem', letterSpacing: '1px', fontFamily: 'Libre Baskerville, serif', display: 'flex', alignItems: 'center', gap: '1.2rem', marginLeft: 0 }}>
            <img src={logo} alt="Logo" style={{ height: 80, width: 80, objectFit: 'contain', marginLeft: 12, marginRight: 8 }} />
            <span style={{ fontSize: '2.5rem', lineHeight: 1, fontWeight: 800 }}>
              MapMyRoute
            </span>
          </Link>
          <div className="d-flex gap-2">
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
      </div>
    </nav>

    {/* Hero Section */}
    <section
      className="d-flex align-items-center justify-content-end text-white position-relative"
      style={{
        minHeight: '50vh',
        width: '100%',
        background: `url(${myBg}) center 30%/cover no-repeat`,
        boxShadow: `0 2px 16px ${TEAL.shadow}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'rgba(20,184,166,0.55)', zIndex: 1 }}></div>
      <div className="container position-relative py-5" style={{ zIndex: 3, maxWidth: 700, marginLeft: 'auto', textAlign: 'right', marginRight: '4vw' }}>
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

    {/* Dashboard Button Section */}
    <div className="w-100 d-flex justify-content-center my-4">
      <Link to="/dashboard">
        <button className="btn btn-primary btn-lg px-5 py-3 fw-bold" style={{ fontSize: '1.4rem', borderRadius: 14, background: TEAL.main, border: 'none', boxShadow: `0 2px 8px ${TEAL.shadow}` }}>
          Go to Dashboard
        </button>
      </Link>
    </div>

    {/* Main Content */}
    <div className="flex-grow-1">
      {/* Features Overview */}
      <section style={{ width: '100%', background: 'none', padding: '0', margin: '0', boxSizing: 'border-box' }}>
        <h2 className="text-center" style={{
          color: TEAL.main,
          fontSize: '2.7rem',
          fontWeight: 700,
          letterSpacing: '1px',
          marginTop: '3.5rem',
          marginBottom: '2.5rem',
          fontFamily: `'Poppins', 'Montserrat', 'Playfair Display', serif`,
        }}>
          Features
        </h2>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4rem',
          width: '100%',
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 2vw',
          boxSizing: 'border-box',
        }}>
          {features.map((f, idx) => (
            <div key={f.label} style={{
              display: 'flex',
              flexDirection: idx % 2 === 0 ? 'row' : 'row-reverse',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              gap: '3vw',
              padding: '2.5rem 0',
              background: 'none',
              boxSizing: 'border-box',
              flexWrap: 'wrap',
              borderRadius: 24,
              boxShadow: '0 2px 12px rgba(20,184,166,0.06)',
            }}>
              <div style={{ flex: '0 1 420px', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 260 }}>
                <img src={f.img} alt={f.label} style={{ width: '100%', maxWidth: 380, height: 220, objectFit: 'cover', borderRadius: 18, boxShadow: `0 4px 24px ${TEAL.shadow}` }} />
              </div>
              <div style={{ flex: '1 1 420px', minWidth: 260, padding: '0 2vw' }}>
                <div style={{ fontWeight: 700, fontSize: '2rem', color: TEAL.dark, marginBottom: '1rem' }}>{f.label}</div>
                <div style={{ color: TEAL.dark, fontSize: '1.2rem', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            </div>
          ))}
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
  </div>
);

export default LandingPage;