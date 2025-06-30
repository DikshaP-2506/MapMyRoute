// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import RoadmapViewer from "./pages/RoadmapViewer";
import Settings from "./pages/Settings";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    // If not logged in via Firebase, check backend token and fetch user info from backend (Postgres)
    if (!user && localStorage.getItem("token")) {
      fetch("http://localhost:8000/user/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.email) {
            setUser({
              displayName: data.name || "",
              email: data.email
            });
          }
        });
    }
    return () => unsub();
  }, [user]);

  const getInitials = (name, email) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  // Use location to hide nav links on landing page
  const location = window.location.pathname;
  const hideNavLinks = location === "/";

  return (
    <Router>
      <Header user={user} getInitials={getInitials} hideNavLinks={hideNavLinks} />
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

function Header({ user, getInitials, hideNavLinks }) {
  const navigate = useNavigate();
  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-primary shadow mb-4">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand fs-3 fw-bold">MapMyRoute</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <nav className="navbar-nav ms-auto gap-lg-3 gap-2 align-items-center">
            {!hideNavLinks && (
              <>
                <Link to="/dashboard" className="nav-link text-white">Dashboard</Link>
                {/* No Settings link, avatar instead */}
              </>
            )}
            {user ? (
              <span
                onClick={() => navigate("/settings")}
                title="Settings"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "#2dd4bf",
                  color: "#0f766e",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  marginLeft: 12,
                  userSelect: "none",
                }}
              >
                {getInitials(user.displayName, user.email)}
              </span>
            ) : (
              <Link to="/login" className="nav-link text-white">Login</Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default App;
