import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">MapMyRoute</h1>
      </div>
      <div className="navbar-right">
        <button className="home-btn" onClick={() => navigate('/')}>Home</button>
        <button className="login-btn" onClick={() => navigate('/login')}>Login</button>
        <button className="signup-btn" onClick={() => navigate('/signup')}>Sign Up</button>
      </div>
    </nav>
  );
};

export default Navbar; 