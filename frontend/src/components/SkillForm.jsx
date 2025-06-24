import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import './SkillForm.css';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const SkillForm = () => {
  const [form, setForm] = useState({
    skill: '',
    level: 'Beginner',
    duration: '',
    weeklyTime: '',
    goalType: '',
  });
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateData, setUpdateData] = useState({
    currentWeek: '',
    completedTasks: [],
    newHoursPerWeek: '',
  });
  const [updatedRoadmap, setUpdatedRoadmap] = useState(null);
  const userId = auth.currentUser?.uid;
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRoadmap(null);
    setUpdatedRoadmap(null);
    try {
      const res = await fetch('http://localhost:5000/api/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.skill,
          currentLevel: form.level,
          durationWeeks: form.duration,
          hoursPerWeek: form.weeklyTime,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate roadmap');
      setRoadmap(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetResources = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/get-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.skill,
          difficultyLevel: form.level,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get resources');
      // Redirect to /resources with resource data
      navigate('/resources', { state: { resources: data } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update Roadmap Handlers
  const handleUpdateChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setUpdateData((prev) => {
        const updatedTasks = checked
          ? [...prev.completedTasks, value]
          : prev.completedTasks.filter((task) => task !== value);
        return { ...prev, completedTasks: updatedTasks };
      });
    } else {
      setUpdateData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateRoadmap = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUpdatedRoadmap(null);
    try {
      const totalWeeks = roadmap?.weekly_plans?.length || 12;
      const expectedTasks =
        roadmap?.weekly_plans?.[parseInt(updateData.currentWeek, 10) - 1]?.practice_tasks?.length || 0;
      const res = await fetch('http://localhost:5000/api/update-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentWeek: updateData.currentWeek,
          completedTasks: updateData.completedTasks,
          newHoursPerWeek: updateData.newHoursPerWeek,
          topic: form.skill,
          currentLevel: form.level,
          totalWeeks,
          expectedTasks,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update roadmap');
      setUpdatedRoadmap(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get tasks for the selected week
  const getCurrentWeekTasks = () => {
    if (!roadmap || !roadmap.weekly_plans || !updateData.currentWeek) return [];
    const weekIdx = parseInt(updateData.currentWeek, 10) - 1;
    return roadmap.weekly_plans[weekIdx]?.practice_tasks || [];
  };

  // Card component for roadmap weeks
  const RoadmapCard = ({ week }) => (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      minWidth: '260px',
      maxWidth: '400px',
      flex: '1 1 260px',
      textAlign: 'left',
      borderLeft: '6px solid #008B8B',
    }}>
      <h4 style={{ color: '#008B8B', marginBottom: '0.7rem' }}>Week {week.week}</h4>
      <ul style={{ paddingLeft: '1.2rem', marginBottom: 0 }}>
        <li><strong>Topics:</strong> {week.topics.join(', ')}</li>
        <li><strong>Estimated Hours:</strong> {week.estimated_hours}</li>
        <li><strong>Learning Objectives:</strong> {week.learning_objectives.join(', ')}</li>
        <li><strong>Practice Tasks:</strong> {week.practice_tasks.join(', ')}</li>
      </ul>
    </div>
  );

  return (
    <div className="skillform-bg-wrapper">
      <Navbar />
      <div className="skill-form-container">
        <form className="skill-form" onSubmit={handleSubmit}>
          <h2 style={{ color: '#008B8B', marginBottom: '1.5rem' }}>Skill Development Roadmap</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="skill">Skill or Topic</label>
              <input
                type="text"
                id="skill"
                name="skill"
                value={form.skill}
                onChange={handleChange}
                placeholder="e.g., Python, UI/UX Design"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="level">Current Level</label>
              <select
                id="level"
                name="level"
                value={form.level}
                onChange={handleChange}
                required
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="duration">Total Duration (weeks)</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={form.duration}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="weeklyTime">Weekly Time Availability (hours)</label>
              <input
                type="number"
                id="weeklyTime"
                name="weeklyTime"
                value={form.weeklyTime}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="goalType">Goal Type (optional)</label>
            <select
              id="goalType"
              name="goalType"
              value={form.goalType}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="General Learning">General Learning</option>
              <option value="Project-Based">Project-Based</option>
              <option value="Job Prep">Job Prep</option>
              <option value="Freelancing">Freelancing</option>
            </select>
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Roadmap'}
          </button>
        </form>
        {roadmap && roadmap.weekly_plans && (
          <div className="roadmap-result" style={{ marginTop: '2.5rem' }}>
            <h3 style={{ color: '#008B8B', marginBottom: '1.5rem' }}>Weekly Roadmap</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
              {roadmap.weekly_plans.map((week, idx) => (
                <RoadmapCard key={idx} week={week} />
              ))}
            </div>
            <button className="submit-btn" onClick={handleGetResources} disabled={loading} style={{ marginTop: '2rem', background: '#008B8B', color: '#fff', fontWeight: 600 }}>
              {loading ? 'Loading...' : 'Get Resources'}
            </button>
            {/* Update Roadmap Section */}
            <div className="update-roadmap-section" style={{ marginTop: '2rem', textAlign: 'left' }}>
              <h4 style={{ color: '#008B8B' }}>Update Roadmap Progress</h4>
              <form onSubmit={handleUpdateRoadmap}>
                <div className="form-group">
                  <label htmlFor="currentWeek">Current Week</label>
                  <select
                    id="currentWeek"
                    name="currentWeek"
                    value={updateData.currentWeek}
                    onChange={handleUpdateChange}
                    required
                  >
                    <option value="">Select Week</option>
                    {roadmap.weekly_plans.map((w, idx) => (
                      <option key={idx} value={w.week}>{w.week}</option>
                    ))}
                  </select>
                </div>
                {updateData.currentWeek && (
                  <div className="form-group">
                    <label>Completed Practice Tasks for Week {updateData.currentWeek}:</label>
                    {getCurrentWeekTasks().map((task, idx) => (
                      <div key={idx}>
                        <input
                          type="checkbox"
                          id={`task-${idx}`}
                          name="completedTasks"
                          value={task}
                          checked={updateData.completedTasks.includes(task)}
                          onChange={handleUpdateChange}
                        />
                        <label htmlFor={`task-${idx}`}>{task}</label>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="newHoursPerWeek">New Hours Per Week</label>
                  <input
                    type="number"
                    id="newHoursPerWeek"
                    name="newHoursPerWeek"
                    value={updateData.newHoursPerWeek}
                    onChange={handleUpdateChange}
                    min="1"
                    required
                  />
                </div>
                <button type="submit" className="submit-btn" disabled={loading} style={{ background: '#008B8B', color: '#fff', fontWeight: 600 }}>
                  {loading ? 'Updating...' : 'Update Roadmap'}
                </button>
              </form>
            </div>
          </div>
        )}
        {updatedRoadmap && (
          <div className="roadmap-result" style={{ marginTop: '2rem' }}>
            <h3 style={{ color: '#008B8B', marginBottom: '1.5rem' }}>Updated Roadmap</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
              {updatedRoadmap.weekly_plans && updatedRoadmap.weekly_plans.map((week, idx) => (
                <RoadmapCard key={idx} week={week} />
              ))}
            </div>
            {updatedRoadmap.catch_up_suggestions && updatedRoadmap.catch_up_suggestions.length > 0 && (
              <div className="catchup-section" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: '#008B8B' }}>Catch-up Suggestions</h4>
                <ul>
                  {updatedRoadmap.catch_up_suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
      </div>
      <Footer />
    </div>
  );
};

export default SkillForm; 