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
              <Link to="/dashboard" className="nav-link text-white">Dashboard</Link>
              <Link to="/settings" className="nav-link text-white">Settings</Link>
              <Link to="/login" className="nav-link text-white">Login</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="container my-4 px-2" style={{maxWidth: 1200}}>
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
