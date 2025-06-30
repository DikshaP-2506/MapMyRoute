import React, { useState, useEffect } from "react";
import { getAuthToken } from "../utils/auth";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Teal color palette
const TEAL = {
  main: '#14b8a6', // teal-500
  light: '#99f6e4', // teal-200
  lighter: '#f0fdfa', // teal-50
  dark: '#0f766e', // teal-700
  accent: '#2dd4bf', // teal-400
  shadow: '#14b8a622',
};

const tabNavStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  margin: '2rem 0 1rem 0',
};

const tabBtnStyle = (active) => ({
  background: active ? TEAL.main : TEAL.light,
  color: active ? '#fff' : TEAL.main,
  border: 'none',
  borderRadius: 8,
  padding: '0.75rem 1.5rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: active ? `0 2px 8px ${TEAL.shadow}` : 'none',
  transition: 'all 0.2s',
});

const tabs = [
  "My Skill Paths",
  "Weekly Planner",
  "Progress Analytics",
  "AI Roadmap Generator",
  "Resources Library"
];

// ...existing code...

function MySkillPathsTab() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [expandedPathId, setExpandedPathId] = useState(null);

  const fetchPaths = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAuthToken();
      const res = await fetch("http://localhost:8000/skill-paths", {
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

  useEffect(() => { fetchPaths(); }, [refresh]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this skill path?")) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`http://localhost:8000/skill-paths/${id}`, {
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
    <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 className="mb-4" style={{ fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center' }}>My Skill Paths</h3>
      {loading && <div>Loading...</div>}
      {error && <div className="text-danger">{error}</div>}
      {paths.length === 0 && !loading && <div>No skill paths found.</div>}
      <ul className="list-unstyled" style={{ padding: 0 }}>
        {paths.map(path => (
          <li key={path.id} className="mb-4 p-3"
            style={{
              background: TEAL.lighter,
              borderRadius: 12,
              boxShadow: `0 1px 6px ${TEAL.shadow}`,
              borderBottom: `2px solid ${TEAL.light}`,
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
                <div className="fw-bold fs-5" style={{ color: TEAL.dark, fontSize: 'clamp(1.1rem, 2vw, 1.3rem)' }}>{path.title}</div>
                <div className="text-secondary mb-1" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>{path.description}</div>
                <div className="small text-muted mb-1">
                  Started on: {path.started_on ? new Date(path.started_on).toLocaleDateString() : 'N/A'}
                </div>
                <div className="small text-muted mb-1">
                  Total time: {path.total_time || 0} hrs
                </div>
              </div>
              <div className="text-center" style={{ minWidth: 120, flex: 1 }}>
                <div className="small mb-1" style={{ color: TEAL.dark }}>Progress</div>
                <div className="progress" style={{ height: 18, width: '100%', maxWidth: 120, margin: '0 auto', background: TEAL.light }}>
                  <div className="progress-bar" role="progressbar" style={{ width: `${Math.round(path.progress)}%`, background: TEAL.main }} aria-valuenow={Math.round(path.progress)} aria-valuemin={0} aria-valuemax={100}></div>
                </div>
                <div className="small mt-1" style={{ color: TEAL.main }}>
                  {Math.round(path.progress)}%
                </div>
              </div>
              <div className="d-flex flex-column gap-2 ms-md-3 mt-2 mt-md-0" style={{alignItems: 'flex-end'}}>
                <button
                  onClick={() => setExpandedPathId(expandedPathId === path.id ? null : path.id)}
                  className="btn"
                  style={{ background: TEAL.main, color: '#fff', border: 'none', minWidth: 90 }}
                >
                  {expandedPathId === path.id ? 'Hide Roadmap' : 'View Roadmap'}
                </button>
                <button
                  onClick={() => handleDelete(path.id)}
                  className="btn"
                  style={{ background: TEAL.dark, color: '#fff', border: 'none', minWidth: 90 }}
                >
                  Delete
                </button>
              </div>
            </div>
            {/* Roadmap details */}
            {expandedPathId === path.id && path.data && path.data.weeks && (
              <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, boxShadow: `0 1px 6px ${TEAL.shadow}`, padding: 16 }}>
                <h5 style={{ color: TEAL.accent, marginBottom: 8 }}>Full Roadmap</h5>
                {path.data.weeks.map((week, idx) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <strong style={{ color: TEAL.main }}>Week {week.week}</strong>
                    <ul style={{ paddingLeft: 18 }}>
                      {week.goals.map((goal, i) => <li key={i}>{goal}</li>)}
                    </ul>
                  </div>
                ))}
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
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

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
      const res = await fetch("http://localhost:8000/roadmap/generate", {
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
      const res = await fetch("http://localhost:8000/skill-paths", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: result.title,
          description: result.description,
          data: { weeks: result.weeks }
        })
      });
      if (!res.ok) throw new Error("Failed to save skill path");
      setSaveMsg("Saved to My Skill Paths!");
      // Optionally: trigger planner refresh if needed
    } catch (err) {
      setSaveMsg(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 500, width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 style={{ color: TEAL.dark, fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center' }}>AI Roadmap Generator</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400, width: '100%', margin: '0 auto' }}>
        <input name="topic" placeholder="Skill Topic (e.g. Frontend Development)" value={form.topic} onChange={handleChange} required style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }} />
        <select name="level" value={form.level} onChange={handleChange} style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }}>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <input name="time" placeholder="Time availability (hours/week)" value={form.time} onChange={handleChange} required style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }} />
        <input name="duration" placeholder="Duration (weeks)" value={form.duration} onChange={handleChange} required style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem' }} />
        <button type="submit" style={{ background: TEAL.main, color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Roadmap'}
        </button>
      </form>
      {error && <div style={{ color: TEAL.dark, marginTop: '1rem' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ color: TEAL.main, fontSize: 'clamp(1.1rem, 2vw, 1.4rem)' }}>Generated Roadmap</h4>
          <div style={{ fontWeight: 600, fontSize: '1.1em' }}><strong>{result.title}</strong></div>
          <div style={{ color: TEAL.dark, marginBottom: '1rem', fontSize: '1em' }}>{result.description}</div>
          {result.weeks && result.weeks.map(w => (
            <div key={w.week} style={{ marginBottom: '1rem', background: TEAL.lighter, borderRadius: 8, padding: 8 }}>
              <strong style={{ color: TEAL.main }}>Week {w.week}</strong>
              <ul style={{ paddingLeft: 18 }}>
                {w.goals.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          ))}
          <button onClick={handleSave} style={{ background: TEAL.accent, color: TEAL.dark, border: 'none', borderRadius: 8, padding: '0.75rem 2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem', fontSize: '1rem' }}>
            Save to My Skill Paths
          </button>
          {saveMsg && <div style={{ color: saveMsg.startsWith('Saved') ? TEAL.main : 'red', marginTop: '1rem' }}>{saveMsg}</div>}
        </div>
      )}
    </div>
  );
}

function ResourcesLibraryTab() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ type: '', difficulty: '', platform: '', topic: '' });
  const [searchTopic, setSearchTopic] = useState('');

  const fetchResources = async (topic) => {
    setLoading(true);
    setError("");
    try {
      let url = "http://localhost:8000/resources";
      if (topic) url += `?topic=${encodeURIComponent(topic)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch resources");
      const data = await res.json();
      setResources(data.resources);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = e => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleTopicInput = e => {
    setSearchTopic(e.target.value);
  };

  const handleSearch = () => {
    setFilters(f => ({ ...f, topic: searchTopic }));
    fetchResources(searchTopic);
  };

  const filtered = resources.filter(r =>
    (!filters.type || r.type === filters.type) &&
    (!filters.difficulty || r.difficulty === filters.difficulty) &&
    (!filters.platform || r.platform === filters.platform)
  );

  return (
    <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 style={{ color: TEAL.dark, fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center' }}>Resources Library</h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <input name="topic" placeholder="Search by topic" value={searchTopic} onChange={handleTopicInput} style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem', minWidth: 160, flex: '1 1 160px', maxWidth: 220 }} />
        <button onClick={handleSearch} disabled={loading || !searchTopic.trim()} style={{ padding: '0.5rem 1.2rem', borderRadius: 6, background: TEAL.main, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '1rem', minWidth: 90 }}>Search</button>
        <select name="type" value={filters.type} onChange={handleFilterChange} style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem', minWidth: 120 }}>
          <option value="">All Types</option>
          <option value="Free">Free</option>
          <option value="Paid">Paid</option>
        </select>
        <select name="difficulty" value={filters.difficulty} onChange={handleFilterChange} style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem', minWidth: 120 }}>
          <option value="">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
        </select>
        <select name="platform" value={filters.platform} onChange={handleFilterChange} style={{ border: `1.5px solid ${TEAL.main}`, borderRadius: 8, padding: '0.5rem', fontSize: '1rem', minWidth: 120 }}>
          <option value="">All Platforms</option>
          <option value="Web">Web</option>
          <option value="YouTube">YouTube</option>
        </select>
      </div>
      {loading && <div style={{ color: TEAL.main, fontWeight: 'bold' }}>Searching resources...</div>}
      {error && <div style={{ color: 'red', fontWeight: 'bold' }}>{error}</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {filtered.map((r, i) => (
          <li key={i} style={{ marginBottom: '1.5rem', borderBottom: `1px solid ${TEAL.light}`, paddingBottom: '1rem', background: TEAL.lighter, borderRadius: 8, boxSizing: 'border-box', paddingLeft: 12, paddingRight: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 'clamp(1rem, 2vw, 1.1rem)', color: TEAL.dark }}>{r.title}</div>
            <div style={{ color: TEAL.main, marginBottom: '0.5rem', wordBreak: 'break-all' }}>{r.url}</div>
            <div style={{ fontSize: '0.98em' }}>Type: {r.type} | Difficulty: {r.difficulty} | Platform: {r.platform}</div>
            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: TEAL.main, textDecoration: 'underline', fontSize: '0.98em' }}>Visit</a>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && !loading && <div>No resources found.</div>}
    </div>
  );
}

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function WeeklyPlannerTab({ skillPathId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [shifting, setShifting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!skillPathId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`http://localhost:8000/planner?skill_path_id=${skillPathId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setTasks(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [skillPathId, refresh]);

  // Helper: get today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper: get the latest due_date in all tasks
  const getLatestDueDate = () => {
    let maxDate = null;
    tasks.forEach(task => {
      if (task.due_date) {
        const d = new Date(task.due_date);
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });
    return maxDate;
  };

  // Shift all pending tasks in the current week to the next available days (batch backend)
  const shiftPendingTasks = async () => {
    // Find all tasks in the current week
    const weekTasks = tasks.filter(t => t.week === currentWeek);
    if (weekTasks.length === 0) {
      alert('No tasks found for the current week.');
      return;
    }
    // If all tasks in the current week are complete, do not shift
    if (weekTasks.every(t => t.status === 'complete')) {
      alert('All tasks in the current week are complete. No pending tasks to shift.');
      return;
    }
    setShifting(true);
    const token = await getAuthToken();
    try {
      const res = await fetch('http://localhost:8000/planner/shift_pending', {
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
      if (!res.ok) throw new Error(data.detail || 'Failed to shift tasks');
      alert(data.message || `Shifted ${data.shifted} pending tasks.`);
      setRefresh(r => r + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setShifting(false);
    }
  };

  const markStatus = async (taskId, status) => {
    const token = await getAuthToken();
    await fetch(`http://localhost:8000/planner/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    setTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status } : t));
    setTimeout(() => setRefresh(r => r + 1), 300);
  };

  // Group tasks by date (YYYY-MM-DD)
  const tasksByDate = {};
  tasks.forEach(task => {
    if (task.due_date) {
      if (!tasksByDate[task.due_date]) tasksByDate[task.due_date] = [];
      tasksByDate[task.due_date].push(task);
    }
  });

  // Find all weeks in the roadmap
  const weekNumbers = Array.from(new Set(tasks.map(t => t.week))).sort((a, b) => Number(a) - Number(b));
  // Find the first week with incomplete tasks, or the first week if all are complete
  let currentWeek = null;
  for (const week of weekNumbers) {
    const weekTasks = tasks.filter(t => t.week === week);
    if (weekTasks.some(t => t.status !== 'complete')) {
      currentWeek = week;
      break;
    }
  }
  if (!currentWeek && weekNumbers.length > 0) currentWeek = weekNumbers[0];

  // Find all dates in the roadmap
  const allDates = tasks.map(t => t.due_date).filter(Boolean);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => new Date(d)))) : null;
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => new Date(d)))) : null;

  // Calendar tile content and highlight logic
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dateStr = date.toISOString().slice(0, 10);
    if (tasksByDate[dateStr]) {
      return <span style={{ display: 'block', marginTop: 2, color: TEAL.main, fontWeight: 600, fontSize: 12 }}>●</span>;
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const dateStr = date.toISOString().slice(0, 10);
    // Highlight current week
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
        border: `1px solid ${TEAL.main}`,
        borderRadius: 8,
        boxShadow: `0 2px 12px ${TEAL.shadow}`,
        padding: 16,
        zIndex: 1000,
        minWidth: 220
      }}>
        <div style={{ fontWeight: 600, color: TEAL.main, marginBottom: 8 }}>Tasks for {dateStr}</div>
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {dayTasks.map(task => (
            <li key={task.id} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 500 }}>{task.description}</div>
              <div style={{ fontSize: 13, color: TEAL.dark }}>Status: <span style={{ color: task.status === 'complete' ? TEAL.main : (task.due_date < todayStr ? 'red' : TEAL.dark) }}>{task.status === 'complete' ? 'Complete' : (task.due_date < todayStr ? 'Overdue' : task.status)}</span></div>
              {task.status !== 'complete' ? (
                <button onClick={() => markStatus(task.id, 'complete')} style={{ fontSize: '0.85em', borderRadius: 6, padding: '2px 10px', background: TEAL.main, color: '#fff', border: 'none', marginTop: 4 }}>Mark Complete</button>
              ) : (
                <button onClick={() => markStatus(task.id, 'pending')} style={{ fontSize: '0.85em', borderRadius: 6, padding: '2px 10px', background: TEAL.light, color: TEAL.dark, border: 'none', marginTop: 4 }}>Mark Pending</button>
              )}
            </li>
          ))}
        </ul>
        <button onClick={() => setSelectedDate(null)} style={{ marginTop: 10, background: TEAL.light, color: TEAL.dark, border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
      </div>
    );
  };

  if (!skillPathId) {
    return <div style={{ color: 'red', margin: '2rem 0' }}>Please select a skill path to view your weekly plan.</div>;
  }
  if (loading) return <div>Loading weekly planner...</div>;
  if (error) return <div>Error loading planner: {error.message}</div>;
  if (!tasks.length) return <div>No tasks found for this skill path.</div>;

  return (
    <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h2 style={{ fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center', marginBottom: 8 }}>Weekly Planner</h2>
      <h3 style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)', textAlign: 'center', marginBottom: 16 }}>Roadmap Calendar</h3>
      <button onClick={shiftPendingTasks} disabled={shifting} style={{ marginBottom: 16, background: '#ffb347', color: '#333', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: 260, display: 'block', marginLeft: 'auto', marginRight: 'auto', fontSize: '1rem' }}>
        {shifting ? 'Shifting...' : 'Shift Pending Tasks'}
      </button>
      <div style={{ maxWidth: 600, width: '100%', margin: '0 auto', marginBottom: 32 }}>
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
      <style>{`
        .react-calendar__tile.calendar-current-week {
          background: ${TEAL.light} !important;
          border-radius: 8px;
          box-shadow: 0 2px 8px ${TEAL.shadow};
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
}

function ProgressAnalyticsTab({ skillPathId }) {
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!skillPathId) return;
    setLoading(true);
    (async () => {
      const token = await getAuthToken();
      const res = await fetch(`http://localhost:8000/analytics?skill_path_id=${skillPathId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);

      // Fetch AI suggestions
      const res2 = await fetch(`http://localhost:8000/analytics/suggestions?skill_path_id=${skillPathId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data2 = await res2.json();
      setSuggestions(data2.suggestions);
      setLoading(false);
    })();
  }, [skillPathId]);

  if (loading || !stats) return <div>Loading analytics...</div>;

  const pieData = [
    { name: 'Completed', value: stats.completed },
    { name: 'Pending', value: stats.pending },
    { name: 'Deferred', value: stats.deferred }
  ];
  const COLORS = [TEAL.main, TEAL.accent, '#ff4f4f'];
  const barData = [
    { name: 'Time Spent (hrs)', value: stats.time_spent_hours }
  ];

  return (
    <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', boxSizing: 'border-box', padding: '1rem' }}>
      <h3 style={{ fontSize: 'clamp(1.2rem, 2vw, 2rem)', textAlign: 'center', marginBottom: 16 }}>Progress Analytics</h3>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Task Status</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ minWidth: 260, flex: 1 }}>
          <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)' }}>Time Spent</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={TEAL.main} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h4 style={{ color: TEAL.dark, fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)' }}>AI Suggestions for Improvement</h4>
        <div style={{ background: TEAL.lighter, padding: 16, borderRadius: 8, fontSize: '1em' }}>
          {suggestions ? suggestions : 'No suggestions available.'}
        </div>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [paths, setPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [pathsLoading, setPathsLoading] = useState(false);

  useEffect(() => {
    // Fetch user's skill paths for selector
    setPathsLoading(true);
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch("http://localhost:8000/skill-paths", {
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
    <WeeklyPlannerTab key="planner" skillPathId={selectedPath} />,
    <ProgressAnalyticsTab key="analytics" skillPathId={selectedPath} />,
    <RoadmapGeneratorTab key="generator" />,
    <ResourcesLibraryTab key="resources" />
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`,
        fontFamily: 'sans-serif',
        width: '100vw',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          color: TEAL.main,
          marginTop: '2rem',
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
        }}
      >
        Dashboard
      </h2>
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
            }}
            onClick={() => setActiveTab(idx)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <section
        style={{
          maxWidth: '100%',
          width: '100vw',
          //margin: '2rem auto',
          background: '#fff',
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
      {/* <WeeklyPlanner userToken={userToken} /> */}
    </div>
  );
};

export default Dashboard;