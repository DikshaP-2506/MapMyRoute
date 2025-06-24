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