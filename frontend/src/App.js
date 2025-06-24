import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import SkillForm from './components/SkillForm';
import History from './components/History';
import Resources from './components/Resources';
import { auth } from './firebase';

function Sidebar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);

  // Listen for auth state changes
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  if (!user) return null;

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100vh',
      width: '180px',
      background: '#008B8B',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '60px',
      zIndex: 1001
    }}>
      <button
        style={{
          margin: '10px 0',
          padding: '10px 20px',
          background: '#fff',
          color: '#008B8B',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/history')}
      >
        View History
      </button>
    </div>
  );
}

function App() {
  const [backendMsg, setBackendMsg] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/hello')
      .then(res => res.json())
      .then(data => setBackendMsg(data.message))
      .catch(err => setBackendMsg('Error connecting to backend'));
  }, []);

  return (
    <Router>
      <div className="App">
        <Sidebar />
        <div className="main-content">
          <div style={{ background: '#e0e0e0', padding: '10px', marginBottom: '10px' }}>
            Backend says: {backendMsg}
          </div>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/skill-form" element={<SkillForm />} />
            <Route path="/history" element={<History />} />
            <Route path="/resources" element={<Resources />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
