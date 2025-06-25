import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="navbar-left">
          <h1 className="logo">MapMyRoute</h1>
        </div>
        <div className="navbar-right">
          <button className="login-btn" onClick={() => navigate('/login')}>Login</button>
          <button className="signup-btn" onClick={() => navigate('/signup')}>Sign Up</button>
        </div>
      </nav>

      <main className="main-content">
        <section className="hero">
          <div className="hero-content">
            <h2>Plan Your Journey with Confidence</h2>
            <p>
              Welcome to MapMyRoute, your ultimate companion for journey planning and route optimization. 
              Whether you're planning a road trip, daily commute, or exploring new destinations, we help 
              you find the best routes tailored to your needs.
            </p>
            <p>
              Our intelligent routing system takes into account real-time traffic, road conditions, and 
              your preferences to ensure you always have the most efficient and enjoyable journey possible.
            </p>
          </div>
        </section>

        <section className="features">
          <div className="features-content">
            <h3>Our Features</h3>
            <div className="features-grid">
              <div className="feature-card">
                <h4>🚗 Route Planning</h4>
                <p>Intelligent route optimization with real-time traffic updates and multiple route options.</p>
              </div>
              <div className="feature-card">
                <h4>📊 Progress Tracker</h4>
                <p>Track your learning progress with interactive checklists, task management, and calendar planning.</p>
              </div>
              <div className="feature-card">
                <h4>📚 Resource Management</h4>
                <p>Access curated learning resources and recommendations tailored to your skill level.</p>
              </div>
              <div className="feature-card">
                <h4>📈 Analytics</h4>
                <p>Monitor your progress with detailed analytics and performance insights.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="progress-tracker-preview">
          <div className="preview-content">
            <h3>New: Progress Tracker & Planner</h3>
            <p>
              Stay organized and motivated with our comprehensive progress tracking system. 
              Create tasks, set deadlines, and monitor your completion rates with our interactive tools.
            </p>
            <div className="preview-features">
              <div className="preview-feature">
                <span>✅</span>
                <span>Interactive checklists and task completion tracking</span>
              </div>
              <div className="preview-feature">
                <span>📅</span>
                <span>Calendar view for weekly task management</span>
              </div>
              <div className="preview-feature">
                <span>🔄</span>
                <span>Reschedule or mark incomplete tasks</span>
              </div>
              <div className="preview-feature">
                <span>📊</span>
                <span>Progress analytics and completion statistics</span>
              </div>
            </div>
            <button 
              className="cta-button"
              onClick={() => navigate('/login')}
            >
              Get Started with Progress Tracker
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>MapMyRoute</h3>
            <p>Making journey planning simple and efficient.</p>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>Email: info@mapmyroute.com</p>
            <p>Phone: (555) 123-4567</p>
          </div>
          <div className="footer-section">
            <h4>Follow Us</h4>
            <p>Twitter</p>
            <p>Facebook</p>
            <p>Instagram</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 MapMyRoute. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 