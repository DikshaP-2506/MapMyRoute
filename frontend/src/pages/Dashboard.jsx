import React, { useState, useEffect } from "react";
import { getAuthToken } from "../utils/auth";
import { Link } from "react-router-dom";
import axios from "axios";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Update COLORS palette to use darker, more muted shades
const COLORS = {
  teal: '#11706d', // darker teal
  tealDark: '#0a4745', // even darker teal
  tealLight: '#3bb8a6', // muted teal light
  tealLighter: '#e0f2f1', // muted teal lighter
  yellow: '#ffe9a7', // deeper yellow
  coral: '#e76a5a', // muted coral
  purple: '#7c5fd4', // muted purple
  gray: '#e5e7eb', // darker light gray
  shadow: '#11706d22',
};

const tabNavStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  margin: '2rem 0 1rem 0',
};

const tabBtnStyle = (active) => ({
  background: active ? COLORS.teal : COLORS.tealLight,
  color: active ? '#fff' : COLORS.teal,
  border: 'none',
  borderRadius: 8,
  padding: '0.75rem 1.5rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: active ? `0 2px 8px ${COLORS.shadow}` : 'none',
  transition: 'all 0.2s',
});

const tabs = [
  "My Skill Paths",
  "Weekly Planner",
  "Progress Analytics",
  "AI Roadmap Generator",
  "Resources Library"
];

// Simple Toast component
function Toast({ message, onClose }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      background: COLORS.teal,
      color: '#fff',
      padding: '12px 24px',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 9999,
      fontWeight: 600,
      fontSize: '1rem',
    }}>{message}</div>
  );
}

// Helper to render a goal (string or object with sub-topics)
function renderGoal(goal) {
  if (typeof goal === 'string') {
    return <span>{goal}</span>;
  }
  if (typeof goal === 'object' && goal !== null) {
    // Support both 'goal' and 'topic' keys, and 'sub_topics' or 'subtopics'
    const main = goal.goal || goal.topic || JSON.stringify(goal);
    const subs = goal.sub_topics || goal.subtopics;
    return (
      <span>
        <strong>{main}</strong>
        {Array.isArray(subs) && subs.length > 0 && (
          <ul style={{ marginTop: 4 }}>
            {subs.map((sub, idx) => <li key={idx}>{sub}</li>)}
          </ul>
        )}
      </span>
    );
  }
  return null;
}

function MySkillPathsTab() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [expandedPathId, setExpandedPathId] = useState(null);
  const [roadmapDetails, setRoadmapDetails] = useState({}); // roadmap data by path id

  const fetchPaths = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/skill-paths`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch skill paths");
      const data = await res.json();
      setPaths(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch roadmap details for a path when expanded
  const fetchRoadmapDetails = async (id) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/skill-paths/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch roadmap details");
      const data = await res.json();
      setRoadmapDetails(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      alert(err.message);
    }
  };

  // Remove the await from the button click handler to avoid race condition with setExpandedPathId
  // Always fetch roadmap details in useEffect when expandedPathId changes
  useEffect(() => { fetchPaths(); }, [refresh]);

  useEffect(() => {
    if (expandedPathId) {
      fetchRoadmapDetails(expandedPathId);
    }
    // eslint-disable-next-line
  }, [expandedPathId]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this skill path?")) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/skill-paths/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      setRefresh(r => r + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '80vw', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 className="mb-4" style={{ fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center' }}>My Skill Paths</h3>
      {loading && <div>Loading...</div>}
      {error && <div className="text-danger">{error}</div>}
      {paths.length === 0 && !loading && <div>No skill paths found.</div>}
      <ul className="list-unstyled" style={{ padding: 0 }}>
        {paths.map(path => (
          <li key={path.id} className="mb-4 p-3"
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: `0 1px 6px ${COLORS.shadow}`,
              borderBottom: `2px solid ${COLORS.tealLight}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ flex: 2 }}>
                <div className="fw-bold fs-5" style={{ color: COLORS.tealDark, fontSize: 'clamp(1.1rem, 2vw, 1.3rem)' }}>{path.title}</div>
                <div className="text-secondary mb-1" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>{path.description}</div>
                <div className="small text-muted mb-1">
                  Started on: {path.started_on ? new Date(path.started_on).toLocaleDateString() : 'N/A'}
                </div>
                <div className="small text-muted mb-1">
                  Total time: {path.total_time || 0} hrs
                </div>
              </div>
              <div className="text-center" style={{ minWidth: 120, flex: 1 }}>
                <div className="small mb-1" style={{ color: COLORS.tealDark }}>Progress</div>
                <div className="progress" style={{ height: 18, width: '100%', maxWidth: 120, margin: '0 auto', background: COLORS.tealLight }}>
                  <div className="progress-bar" role="progressbar" style={{ width: `${Math.round(path.progress)}%`, background: COLORS.teal }} aria-valuenow={Math.round(path.progress)} aria-valuemin={0} aria-valuemax={100}></div>
                </div>
                <div className="small mt-1" style={{ color: COLORS.teal }}>
                  {Math.round(path.progress)}%
                </div>
              </div>
              <div className="d-flex flex-column gap-2 ms-md-3 mt-2 mt-md-0" style={{alignItems: 'flex-end'}}>
                <button
                  onClick={() => {
                    if (expandedPathId !== path.id) {
                      setExpandedPathId(path.id);
                    } else {
                      setExpandedPathId(null);
                    }
                  }}
                  className="btn"
                  style={{ background: COLORS.teal, color: '#fff', border: 'none', minWidth: 90 }}
                >
                  {expandedPathId === path.id ? 'Hide Roadmap' : 'View Roadmap'}
                </button>
                <button
                  onClick={() => handleDelete(path.id)}
                  className="btn"
                  style={{ background: COLORS.tealDark, color: '#fff', border: 'none', minWidth: 90 }}
                >
                  Delete
                </button>
              </div>
            </div>
            {/* Roadmap details */}
            {expandedPathId === path.id && roadmapDetails[path.id] && roadmapDetails[path.id].data && Array.isArray(roadmapDetails[path.id].data.weeks) && roadmapDetails[path.id].data.weeks.length > 0 && (
              <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, boxShadow: `0 1px 6px ${COLORS.shadow}`, padding: 16 }}>
                <h5 style={{ color: COLORS.teal, marginBottom: 8 }}>Full Roadmap</h5>
                {roadmapDetails[path.id].data.weeks.map((week, idx) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <strong style={{ color: COLORS.teal }}>Week {week.week}</strong>
                    <ul style={{ paddingLeft: 18 }}>
                      {Array.isArray(week.goals) && week.goals.map((goal, i) => (
                        <li key={i}>{renderGoal(goal)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {expandedPathId === path.id && roadmapDetails[path.id] && roadmapDetails[path.id].data && (!Array.isArray(roadmapDetails[path.id].data.weeks) || roadmapDetails[path.id].data.weeks.length === 0) && (
              <div style={{ marginTop: 16, color: 'red' }}>
                No roadmap data found for this skill path.
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoadmapGeneratorTab() {
  const [form, setForm] = useState({
    topic: '',
    level: 'Beginner',
    time: '',
    duration: '',
    goal: '', // <-- Add goal field
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");
    setSaveMsg("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/roadmap/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        // Try to get error details from backend
        let msg = "Failed to generate roadmap";
        try {
          const errData = await res.json();
          if (errData && errData.detail) msg += `: ${errData.detail}`;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveMsg("");
    try {
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/skill-paths`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: result.title,
          description: result.description,
          data: result
        })
      });
      if (!res.ok) throw new Error("Failed to save skill path");
      setSaveMsg("Saved to My Skill Paths!");
      setToastMsg("Roadmap saved to skill path!");
    } catch (err) {
      setSaveMsg(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '80vw', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 style={{ color: COLORS.tealDark, fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center' }}>AI Roadmap Generator</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 700, width: '100%', margin: '0 auto' }}>
        <input name="topic" placeholder="Skill Topic (e.g. Frontend Development)" value={form.topic} onChange={handleChange} required style={{ border: `1.5px solid ${COLORS.teal}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }} />
        <select name="level" value={form.level} onChange={handleChange} style={{ border: `1.5px solid ${COLORS.teal}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }}>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <input name="time" placeholder="Time availability (hours/week)" value={form.time} onChange={handleChange} required style={{ border: `1.5px solid ${COLORS.teal}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }} />
        <input
          name="duration"
          placeholder="Duration (weeks)"
          value={form.duration}
          onChange={handleChange}
          required
          style={{ border: `1.5px solid ${COLORS.teal}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }}
        />
        {/* Outcome/Goal dropdown */}
        <select
          name="goal"
          value={form.goal}
          onChange={handleChange}
          style={{ border: `1.5px solid ${COLORS.teal}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }}
        >
          <option value="">Select Outcome (optional)</option>
          <option value="Build a portfolio">Build a portfolio</option>
          <option value="Get ready for an interview">Get ready for an interview</option>
          <option value="Freelance this skill">Freelance this skill</option>
        </select>
        <button type="submit" style={{ background: COLORS.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Roadmap'}
        </button>
      </form>
      {error && <div style={{ color: COLORS.tealDark, marginTop: '1rem' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ color: COLORS.teal, fontSize: 'clamp(1.1rem, 2vw, 1.4rem)' }}>Generated Roadmap</h4>
          <div style={{ fontWeight: 600, fontSize: '1.1em' }}><strong>{result.title}</strong></div>
          <div style={{ color: COLORS.tealDark, marginBottom: '1rem', fontSize: '1em' }}>{result.description}</div>
          {result.weeks && result.weeks.map(w => (
            <div key={w.week} style={{ marginBottom: '1rem', background: COLORS.tealLighter, borderRadius: 8, padding: 8 }}>
              <strong style={{ color: COLORS.teal }}>Week {w.week}</strong>
              <ul style={{ paddingLeft: 18 }}>
                {w.goals.map((g, i) => <li key={i}>{renderGoal(g)}</li>)}
              </ul>
            </div>
          ))}
          <button onClick={handleSave} style={{ background: COLORS.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem', fontSize: '1rem' }}>
            Save to My Skill Paths
          </button>
          {saveMsg && <div style={{ color: saveMsg.startsWith('Saved') ? COLORS.teal : 'red', marginTop: '1rem' }}>{saveMsg}</div>}
        </div>
      )}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}
    </div>
  );
}

function Section({ title, items, renderItem }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ color: COLORS.teal, borderBottom: `2px solid ${COLORS.teal}`, paddingBottom: '0.5rem' }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        {items && items.length > 0 ? items.map(renderItem) : <div style={{ color: '#888' }}>No {title.toLowerCase()} found.</div>}
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1.2rem', minWidth: '250px', maxWidth: '400px', flex: '1 1 250px' }}>
      {children}
    </div>
  );
}

function ResourcesLibraryTab() {
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const handleTopicInput = e => setSearchTopic(e.target.value);
  const handleDifficultyChange = e => setDifficulty(e.target.value);

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setResources(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/get-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic, difficultyLevel: difficulty || "Beginner" })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to fetch resources");
      setResources(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render a section for each resource type
  const renderSection = (title, items, renderItem) => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ color: COLORS.teal, borderBottom: `2px solid ${COLORS.teal}`, paddingBottom: '0.5rem' }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        {items && items.length > 0 ? items.map(renderItem) : <div style={{ color: '#888' }}>No {title.toLowerCase()} found.</div>}
      </div>
    </div>
  );

  // Helper to sort resources by rank or userRating
  const sortResources = arr =>
    arr ? [...arr].sort((a, b) => (b.rank || b.userRating || 0) - (a.rank || a.userRating || 0)) : [];

  return (
    <div style={{ maxWidth: '80vw', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 style={{ color: COLORS.tealDark, fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center' }}>Resources Library</h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <input name="topic" placeholder="Search by topic" value={searchTopic} onChange={handleTopicInput} style={{ border: `1.5px solid ${COLORS.teal}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem', minWidth: 160, flex: '1 1 160px', maxWidth: 300 }} />
        <select name="difficulty" value={difficulty} onChange={handleDifficultyChange} style={{ border: `1.5px solid ${COLORS.teal}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem', minWidth: 120 }}>
          <option value="">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
        <button onClick={handleSearch} disabled={loading || !searchTopic.trim()} style={{ padding: '0.5rem 1.2rem', borderRadius: 6, background: COLORS.teal, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '1rem', minWidth: 90 }}>Search</button>
      </div>
      {loading && <div style={{ color: COLORS.teal, fontWeight: 'bold' }}>Searching resources...</div>}
      {error && <div style={{ color: 'red', fontWeight: 'bold' }}>{error}</div>}
      {resources && (
        <>
          {renderSection(
            "Videos",
            sortResources(resources.videos || resources.video_tutorials || []),
            (v, idx) => (
              <Card key={idx}>
                <h4>{v.title}</h4>
                <p><strong>Platform:</strong> {v.platform || v.source}</p>
                <p><strong>Type:</strong> {v.is_free ? 'Free' : 'Paid'}</p>
                {v.userRating && <p><strong>User Rating:</strong> {v.userRating}</p>}
                <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal, fontWeight: 600 }}>Watch</a>
              </Card>
            )
          )}
          {renderSection(
            "Articles",
            sortResources(resources.articles || []),
            (a, idx) => (
              <Card key={idx}>
                <h4>{a.title}</h4>
                <p><strong>Source:</strong> {a.source}</p>
                {a.reading_time && <p><strong>Reading Time:</strong> {a.reading_time}</p>}
                {a.userRating && <p><strong>User Rating:</strong> {a.userRating}</p>}
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal, fontWeight: 600 }}>Read</a>
              </Card>
            )
          )}
          {renderSection(
            "Courses",
            sortResources(resources.courses || resources.online_courses || []),
            (c, idx) => (
              <Card key={idx}>
                <h4>{c.title}</h4>
                <p><strong>Platform:</strong> {c.platform}</p>
                <p><strong>Type:</strong> {c.is_free ? 'Free' : 'Paid'}</p>
                {c.userRating && <p><strong>User Rating:</strong> {c.userRating}</p>}
                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal, fontWeight: 600 }}>View Course</a>
              </Card>
            )
          )}
          {renderSection(
            "Books",
            sortResources(resources.books || []),
            (b, idx) => (
              <Card key={idx}>
                <h4>{b.title}</h4>
                <p><strong>Author:</strong> {b.author}</p>
                {b.userRating && <p><strong>User Rating:</strong> {b.userRating}</p>}
                <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal, fontWeight: 600 }}>View Book</a>
              </Card>
            )
          )}
          {renderSection(
            "Tools",
            sortResources(resources.tools || []),
            (t, idx) => (
              <Card key={idx}>
                <h4>{t.name || t.title || "Unnamed Tool"}</h4>
                {t.description && <p><strong>Description:</strong> {t.description}</p>}
                {t.type && <p><strong>Type:</strong> {t.type}</p>}
                {(t.platform || t.source) && <p><strong>Platform:</strong> {t.platform || t.source}</p>}
                {t.userRating && <p><strong>User Rating:</strong> {t.userRating}</p>}
                <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal, fontWeight: 600 }}>Visit Tool</a>
              </Card>
            )
          )}
        </>
      )}
      {resources && !loading && !error &&
        (!resources.videos?.length && !resources.video_tutorials?.length && !resources.articles?.length && !resources.courses?.length && !resources.online_courses?.length && !resources.books?.length && !resources.tools?.length) && (
          <div>No resources found.</div>
        )}
    </div>
  );
}

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function WeeklyPlannerTab({ skillPathId, refresh }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shifting, setShifting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenWeek, setRegenWeek] = useState("");
  const [regenMode, setRegenMode] = useState("");
  const [fatalError, setFatalError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!skillPathId) return;
    setLoading(true);
    setError(null);
    setFatalError(null);
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/planner?skill_path_id=${skillPathId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch planner tasks");
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
        // Debug: log all tasks and their due_date
        console.log('Loaded planner tasks:', data.map(t => ({ id: t.id, due_date: t.due_date, status: t.status, description: t.description })));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    })();
  }, [skillPathId, refresh]);

  // Defensive helpers
  const safeTasks = Array.isArray(tasks) ? tasks.filter(t => t && typeof t === 'object') : [];
  const safeWeekNumbers = Array.from(new Set(safeTasks.map(t => Number(t.week)).filter(w => !isNaN(w)))).sort((a, b) => a - b);

  // Defensive: get current week
  let currentWeek = null;
  for (const week of safeWeekNumbers) {
    const weekTasks = safeTasks.filter(t => Number(t.week) === week);
    if (weekTasks.some(t => t.status !== 'complete')) {
      currentWeek = week;
      break;
    }
  }
  if (!currentWeek && safeWeekNumbers.length > 0) currentWeek = safeWeekNumbers[0];

  // Define shiftPendingTasks here
  const shiftPendingTasks = async () => {
    if (!skillPathId || !currentWeek) {
      alert('No skill path or current week selected.');
      return;
    }
    setShifting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/planner/shift_pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          skill_path_id: skillPathId,
          week: currentWeek
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Failed to shift tasks');
      alert(data.message || `Shifted ${data.shifted} pending tasks.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setShifting(false);
    }
  };

  // Defensive: group tasks by date
  const tasksByDate = {};
  safeTasks.forEach(task => {
    if (task.due_date) {
      const dateStr = typeof task.due_date === 'string' ? task.due_date : '';
      if (dateStr) {
        if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
        tasksByDate[dateStr].push(task);
      }
    }
  });

  // Defensive: find all dates
  const allDates = safeTasks.map(t => t.due_date).filter(Boolean);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => new Date(d)))) : null;
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => new Date(d)))) : null;

  // Defensive: today's date string
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter tasks for today
  const todaysTasks = safeTasks.filter(t => t.due_date === todayStr);

  // Defensive: error message rendering
  const getErrorMessage = (err) => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    return JSON.stringify(err);
  };

  // Calendar tile content and highlight logic
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dateStr = date.toISOString().slice(0, 10);
    if (tasksByDate[dateStr]) {
      return <span style={{ display: 'block', marginTop: 2, color: COLORS.teal, fontWeight: 600, fontSize: 12 }}>●</span>;
    }
    return null;
  };

  // Calendar tile className logic for highlighting current week
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const dateStr = date.toISOString().slice(0, 10);
    if (tasksByDate[dateStr]) {
      const week = tasksByDate[dateStr][0].week;
      if (week === currentWeek) {
        return 'calendar-current-week';
      }
    }
    return '';
  };

  // Show tooltip with tasks on click
  const renderTooltip = () => {
    if (!selectedDate) return null;
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const dayTasks = tasksByDate[dateStr] || [];
    if (!dayTasks.length) return null;
    return (
      <div style={{
        position: 'fixed',
        left: '50%',
        top: '20%',
        transform: 'translate(-50%, 0)',
        background: '#fff',
        border: `1px solid ${COLORS.teal}`,
        borderRadius: 8,
        boxShadow: `0 2px 12px ${COLORS.shadow}`,
        padding: 16,
        zIndex: 1000,
        minWidth: 220
      }}>
        <div style={{ fontWeight: 600, color: COLORS.teal, marginBottom: 8 }}>Tasks for {dateStr}</div>
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {dayTasks.map(task => (
            <li key={task.id} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 500 }}>{task.description}</div>
              <div style={{ fontSize: 13, color: COLORS.tealDark }}>Status: <span style={{ color: task.status === 'complete' ? COLORS.teal : (task.due_date < todayStr ? 'red' : COLORS.tealDark) }}>{task.status === 'complete' ? 'Complete' : (task.due_date < todayStr ? 'Overdue' : task.status)}</span></div>
              {task.status !== 'complete' ? (
                <button onClick={() => handleTaskComplete(task.id)} style={{ fontSize: '0.85em', borderRadius: 6, padding: '2px 10px', background: COLORS.teal, color: '#fff', border: 'none', marginTop: 4 }}>Mark Complete</button>
              ) : (
                <button onClick={() => handleTaskComplete(task.id)} style={{ fontSize: '0.85em', borderRadius: 6, padding: '2px 10px', background: COLORS.tealLight, color: COLORS.tealDark, border: 'none', marginTop: 4 }}>Mark Pending</button>
              )}
            </li>
          ))}
        </ul>
        <button onClick={() => setSelectedDate(null)} style={{ marginTop: 10, background: COLORS.tealLight, color: COLORS.tealDark, border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
      </div>
    );
  };

  // Regenerate week for deeper/easier learning
  const regenerateWeek = async (mode, weekNum) => {
    setRegenLoading(true);
    try {
      const token = await getAuthToken();
      await fetch(`${import.meta.env.VITE_API_URL}/planner/regenerate_week`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ skill_path_id: skillPathId, week: weekNum, mode })
      });
      setToastMsg(`Tasks updated for week ${weekNum} (${mode === 'deeper' ? 'Deeper' : 'Easier'})!`);
    } catch (err) {
      alert("Failed to regenerate week: " + err.message);
    } finally {
      setRegenLoading(false);
      setRegenWeek("");
      setRegenMode("");
    }
  };

  // Mark task complete or pending
  const handleTaskComplete = async (taskId) => {
    const task = safeTasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'complete' ? 'pending' : 'complete';
    try {
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/planner/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update task status');
      if (newStatus === 'complete') {
        setShowCelebration(true);
        setToastMsg('Task marked as complete!');
        showTaskCompleteNotification && showTaskCompleteNotification();
        setTimeout(() => setShowCelebration(false), 2000);
      } else {
        setToastMsg('Task marked as pending.');
      }
    } catch (err) {
      alert('Failed to update task: ' + (err.message || err));
    }
  };

  // Defensive: try/catch for rendering
  try {
    if (fatalError) {
      return <div style={{ color: 'red', margin: '2rem 0' }}>Unexpected error: {getErrorMessage(fatalError)}</div>;
    }
    if (!skillPathId) {
      return <div style={{ color: 'red', margin: '2rem 0' }}>Please select a skill path to view your weekly plan.</div>;
    }
    if (loading) return <div>Loading weekly planner...</div>;
    if (error) return <div>Error loading planner: {getErrorMessage(error)}</div>;
    if (!safeTasks.length) return <div>No tasks found for this skill path.</div>;

    return (
      <div style={{ maxWidth: '50vw', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
        <h2 style={{ fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center', marginBottom: 8 }}>Weekly Planner</h2>
        <h3 style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)', textAlign: 'center', marginBottom: 16 }}>Roadmap Calendar</h3>
        <button onClick={shiftPendingTasks} disabled={shifting} style={{ marginBottom: 16, background: '#ffb347', color: '#333', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: 300, display: 'block', marginLeft: 'auto', marginRight: 'auto', fontSize: '1rem' }}>
          {shifting ? 'Shifting...' : 'Shift Pending Tasks'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 500, width: '100%', margin: '0 auto', marginBottom: 32 }}>
            <Calendar
              minDate={minDate}
              maxDate={maxDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              onClickDay={dateObj => {
                setSelectedDate(dateObj instanceof Date ? dateObj : null);
              }}
            />
            {/* Tooltip for selected day */}
            {renderTooltip()}
          </div>
          {/* Regenerative Learning Path controls - now centered and close to calendar */}
          <div style={{ minWidth: 180, flex: '0 0 180px', marginTop: 0, marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '100%' }}>
              <button
                onClick={() => setRegenMode("deeper")}
                disabled={regenLoading}
                style={{ background: COLORS.teal, color: '#fff', border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: "bold", cursor: "pointer", width: '100%' }}
              >
                Want to go deeper into the tasks?
              </button>
              {regenMode === "deeper" && (
                <select
                  value={regenWeek}
                  onChange={e => setRegenWeek(e.target.value)}
                  style={{ marginTop: 4, border: `1.5px solid ${COLORS.teal}`, borderRadius: 6, padding: "4px 8px", width: '100%' }}
                  disabled={regenLoading}
                >
                  <option value="">Select week</option>
                  {safeWeekNumbers.map(weekNum => (
                    <option key={weekNum} value={weekNum}>Week {weekNum}</option>
                  ))}
                </select>
              )}
              {regenMode === "deeper" && regenWeek && (
                <button
                  onClick={() => regenerateWeek("deeper", Number(regenWeek))}
                  disabled={regenLoading}
                  style={{ marginTop: 4, background: COLORS.teal, color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: "bold", cursor: "pointer", width: '100%' }}
                >
                  Apply
                </button>
              )}
            </div>
            <div style={{ width: '100%' }}>
              <button
                onClick={() => setRegenMode("easier")}
                disabled={regenLoading}
                style={{ background: COLORS.tealLight, color: COLORS.tealDark, border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: "bold", cursor: "pointer", width: '100%' }}
              >
                Struggling? Easier path
              </button>
              {regenMode === "easier" && (
                <select
                  value={regenWeek}
                  onChange={e => setRegenWeek(e.target.value)}
                  style={{ marginTop: 4, border: `1.5px solid ${COLORS.teal}`, borderRadius: 6, padding: "4px 8px", width: '100%' }}
                  disabled={regenLoading}
                >
                  <option value="">Select week</option>
                  {safeWeekNumbers.map(weekNum => (
                    <option key={weekNum} value={weekNum}>Week {weekNum}</option>
                  ))}
                </select>
              )}
              {regenMode === "easier" && regenWeek && (
                <button
                  onClick={() => regenerateWeek("easier", Number(regenWeek))}
                  disabled={regenLoading}
                  style={{ marginTop: 4, background: COLORS.teal, color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: "bold", cursor: "pointer", width: '100%' }}
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}
        {showCelebration && (
          <div style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, 0)",
            background: "#fff",
            borderRadius: "16px",
            padding: "1.5rem 2rem",
            boxShadow: "0 2px 12px #14b8a622",
            zIndex: 9999,
            fontSize: "2rem",
            color: "#14b8a6",
            fontWeight: "bold"
          }}>
            🎉 Congratulations! Task Completed! 🎉
          </div>
        )}
        {/* Today's Tasks Section */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ color: COLORS.tealDark, fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)' }}>Today's Tasks</h4>
          {todaysTasks.length === 0 ? (
            <div style={{ color: '#888', fontStyle: 'italic' }}>No tasks due today.</div>
          ) : (
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {todaysTasks.map(task => (
                <li key={task.id} style={{ marginBottom: 10, background: COLORS.tealLighter, borderRadius: 8, padding: 10, boxShadow: `0 1px 4px ${COLORS.shadow}` }}>
                  <div style={{ fontWeight: 500 }}>{task.description}</div>
                  <div style={{ fontSize: 13, color: COLORS.tealDark }}>Status: <span style={{ color: task.status === 'complete' ? COLORS.teal : (task.due_date < todayStr ? 'red' : COLORS.tealDark) }}>{task.status === 'complete' ? 'Complete' : (task.due_date < todayStr ? 'Overdue' : task.status)}</span></div>
                  {task.status !== 'complete' ? (
                    <button onClick={() => handleTaskComplete(task.id)} style={{ fontSize: '0.85em', borderRadius: 6, padding: '2px 10px', background: COLORS.teal, color: '#fff', border: 'none', marginTop: 4 }}>Mark Complete</button>
                  ) : (
                    <button onClick={() => handleTaskComplete(task.id)} style={{ fontSize: '0.85em', borderRadius: 6, padding: '2px 10px', background: COLORS.tealLight, color: COLORS.tealDark, border: 'none', marginTop: 4 }}>Mark Pending</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <style>{`
          .react-calendar__tile.calendar-current-week {
            background: ${COLORS.tealLight} !important;
            border-radius: 8px;
            box-shadow: 0 2px 8px ${COLORS.shadow};
          }
          @media (max-width: 700px) {
            .react-calendar {
              width: 100% !important;
              font-size: 0.95em;
            }
          }
          @media (max-width: 500px) {
            .react-calendar {
              font-size: 0.85em;
            }
          }
        `}</style>
      </div>
    );
  } catch (err) {
    setFatalError(err instanceof Error ? err : new Error(String(err)));
    return <div style={{ color: 'red', margin: '2rem 0' }}>Unexpected error: {getErrorMessage(err)}</div>;
  }
}

// Add specific colors for analytics
const STATUS_COLORS = {
  Completed: '#22c55e', // green
  Pending: '#f59e42',  // orange
  Deferred: '#64748b'  // gray
};

function ProgressAnalyticsTab({ skillPathId }) {
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!skillPathId) return;
    setLoading(true);
    (async () => {
      const token = await getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics?skill_path_id=${skillPathId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);

      // Fetch AI suggestions
      const res2 = await fetch(`${import.meta.env.VITE_API_URL}/analytics/suggestions?skill_path_id=${skillPathId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data2 = await res2.json();
      setSuggestions(data2.suggestions);
      setLoading(false);
    })();
  }, [skillPathId]);

  // Helper to render suggestions as a structured list
  function renderSuggestions(text) {
    if (!text) return 'No suggestions available.';
    // Try to split by newlines, dashes, or numbers
    let lines = text
      .split(/\n|\r|\u2022|\-/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !/^ai suggestions/i.test(line));
    // Remove any markdown bold (**text**) or <strong> tags
    lines = lines.map(line => line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<strong>(.*?)<\/strong>/gi, '$1'));
    if (lines.length > 0) {
      // Always show up to 3 points as a bulleted list
      const top3 = lines.slice(0, 3);
      return (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {top3.map((line, idx) => <li key={idx}>{line}</li>)}
        </ul>
      );
    }
    // Fallback: plain text
    return <span>{text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<strong>(.*?)<\/strong>/gi, '$1')}</span>;
  }

  if (loading || !stats) return <div>Loading analytics...</div>;

  const pieData = [
    { name: 'Completed', value: stats.completed },
    { name: 'Pending', value: stats.pending },
    { name: 'Deferred', value: stats.deferred }
  ];
  const barData = [
    { name: 'Time Spent (hrs)', value: stats.time_spent_hours }
  ];

  return (
    <div style={{ maxWidth: '80vw', width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 style={{ fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center', marginBottom: 16 }}>Progress Analytics</h3>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <h4 style={{ color: COLORS.tealDark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Task Status</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS.gray} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ minWidth: 260, flex: 1 }}>
          <h4 style={{ color: COLORS.tealDark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Time Spent</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS.teal} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h4 style={{ color: COLORS.tealDark, fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)' }}>AI Suggestions for Improvement</h4>
        <div style={{ background: COLORS.tealLighter, padding: 16, borderRadius: 8, fontSize: '1em' }}>
          {renderSuggestions(suggestions)}
        </div>
      </div>
    </div>
  );
}

// Add this function to check if today is a weekend
function isWeekend() {
  const today = new Date().getDay();
  return today === 0 || today === 6; // Sunday (0) or Saturday (6)
}

function showTaskCompleteNotification() {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("🎉 Task Completed!", {
        body: "Great job! Keep up the good work!",
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("🎉 Task Completed!", {
            body: "Great job! Keep up the good work!",
          });
        }
      });
    }
  }
}

const userId = 1; // TODO: Replace with actual user ID logic

function AdjustRoadmapButton() {
  const [msg, setMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleAdjust = async () => {
    const confirmed = window.confirm(
      "This will intelligently update your roadmap using AI, compressing or stretching your plan based on your progress. Are you sure you want to proceed?"
    );
    if (!confirmed) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/roadmap/ai-recalculate/${userId}`);
      setMsg(res.data.message || "Roadmap intelligently updated.");
    } catch (err) {
      setMsg("Failed to update roadmap.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: '#e0f7fa', borderRadius: 12, padding: '1.2rem', margin: '1.5rem 0', boxShadow: '0 1px 6px #14b8a622', textAlign: 'center' }}>
      <button className="btn btn-info" style={{ fontWeight: 'bold', background: '#2dd4bf', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem' }} onClick={handleAdjust} disabled={loading}>
        {loading ? 'Adjusting...' : 'Intelligently Adjust Roadmap'}
      </button>
      {msg && <div style={{ color: '#0f766e', marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [paths, setPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [pathsLoading, setPathsLoading] = useState(false);
  const [plannerRefresh, setPlannerRefresh] = useState(0);

  useEffect(() => {
    // Fetch user's skill paths for selector
    setPathsLoading(true);
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/skill-paths`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setPaths(data);
        if (data.length > 0) setSelectedPath(data[0].id);
      } catch {}
      finally { setPathsLoading(false); }
    })();
  }, []);

  // Tab content with skill path selector context
  const tabContent = [
    <MySkillPathsTab key="paths" />,
    <WeeklyPlannerTab key="planner" skillPathId={selectedPath} refresh={plannerRefresh} />,
    <ProgressAnalyticsTab key="analytics" skillPathId={selectedPath} />,
    <RoadmapGeneratorTab key="generator" />,
    <ResourcesLibraryTab key="resources" />
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'sans-serif',
        width: '100vw',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          color: COLORS.teal,
          marginTop: '2rem',
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
          fontWeight: 'bold',
        }}
      >
        Dashboard
      </h2>
      <AdjustRoadmapButton />
      {/* Skill Path Selector for Planner/Analytics */}
      {(activeTab === 1 || activeTab === 2) && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          {pathsLoading ? "Loading skill paths..." : (
            <select
              value={selectedPath}
              onChange={e => setSelectedPath(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                maxWidth: '100vw',
                fontSize: '1rem',
                background: COLORS.yellow,
                border: `1.5px solid ${COLORS.teal}`,
                color: COLORS.tealDark,
              }}
            >
              {paths.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <nav
        style={{
          ...tabNavStyle,
          flexWrap: 'wrap',
          maxWidth: '100vw',
        }}
      >
        {tabs.map((tab, idx) => (
          <button
            key={tab}
            style={{
              ...tabBtnStyle(activeTab === idx),
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
              minWidth: 120,
              width: 'auto',
              flex: '1 1 120px',
              maxWidth: 200,
              background: activeTab === idx ? COLORS.coral : COLORS.yellow,
              color: activeTab === idx ? '#fff' : COLORS.tealDark,
              border: 'none',
              boxShadow: activeTab === idx ? `0 2px 8px ${COLORS.shadow}` : 'none',
            }}
            onClick={() => {
              setActiveTab(idx);
              if (idx === 1) setPlannerRefresh(r => r + 1);
            }}
          >
            {tab}
          </button>
        ))}
      </nav>
      <section
        style={{
          maxWidth: '100%',
          width: '100vw',
          background: 'rgba(255,255,255,0.85)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(79,140,255,0.10)',
          padding: 'min(2.5rem, 5vw)',
          minHeight: '350px',
          boxSizing: 'border-box',
        }}
      >
        {tabContent[activeTab]}
      </section>
      <style>{`
        @media (max-width: 700px) {
          .react-calendar {
            width: 100% !important;
            font-size: 0.95em;
          }
          section {
            padding: 1rem !important;
            min-width: 0 !important;
          }
        }
        @media (max-width: 500px) {
          .react-calendar {
            font-size: 0.85em;
          }
          section {
            padding: 0.5rem !important;
          }
        }
      `}</style>
      <div style={{ margin: '1.5rem 0', textAlign: 'center' }}>
        <Link to="/career-insights" style={{ textDecoration: 'none' }}>
          <button
            className="btn btn-info"
            style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', background: COLORS.tealDark, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', marginRight: '1rem' }}
          >
            Career Insights
          </button>
        </Link>
        <Link to="/micro-skill-challenge" style={{ textDecoration: 'none' }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', background: '#14b8a6', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: 1 }}
          >
            Take Your Quiz Test!
          </button>
        </Link>
        <div style={{ fontSize: '0.95rem', color: '#555', marginTop: '0.5rem' }}>
          Quizzes and games are personalized based on your completed tasks.
        </div>
      </div>
    </div>
  );
};

export default Dashboard;