// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import RoadmapViewer from "./pages/RoadmapViewer";
import Settings from "./pages/Settings";
function App() {
  // Hide Dashboard/Settings links on landing page
  const hideNavLinks = window.location.pathname === "/";
  return (
    <Router>
      <header className="navbar navbar-expand-lg navbar-dark bg-primary shadow mb-4">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand fs-3 fw-bold">MapMyRoute</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <nav className="navbar-nav ms-auto gap-lg-3 gap-2">
              <Link to="/login" className="nav-link text-white">Login</Link>
            </nav>
          </div>
        </div>
      </header>
      <main
        style={{
          maxWidth: '100vw',
          width: '100vw',
          //margin: '2rem auto',
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(79,140,255,0.10)',
          //padding: 'min(2.5rem, 5vw)',
          minHeight: '350px',
          boxSizing: 'border-box',
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/roadmap/:id" element={<RoadmapViewer />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <footer className="bg-primary text-white text-center py-3 mt-auto" style={{fontSize: 'clamp(0.9rem, 2vw, 1.1rem)'}}>
        &copy; {new Date().getFullYear()} MapMyRoute. All rights reserved.
      </footer>
    </Router>
  );
}

export default App;
