import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardStats, setDashboardStats] = useState({});
  const [skillPlans, setSkillPlans] = useState([]);
  const [activeTimeTracking, setActiveTimeTracking] = useState(null);
  const [view, setView] = useState('overview'); // 'overview', 'skill-plans', 'time-tracking'
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [newSkillPlan, setNewSkillPlan] = useState({
    skill_name: '',
    description: '',
    current_level: 'beginner',
    target_level: 'intermediate',
    total_hours_planned: 0,
    target_completion_date: ''
  });
  const [progressData, setProgressData] = useState({
    hours_spent: 0,
    topics_covered: '',
    notes: '',
    completion_percentage: 0
  });

  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
      fetchSkillPlans();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/dashboard/${user.uid}`);
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchSkillPlans = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/skill-plans/${user.uid}`);
      const data = await response.json();
      setSkillPlans(data);
    } catch (error) {
      console.error('Error fetching skill plans:', error);
    }
  };

  const createSkillPlan = async (e) => {
    e.preventDefault();
    if (!newSkillPlan.skill_name.trim()) return;

    try {
      const response = await fetch('http://localhost:5000/api/skill-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newSkillPlan,
          user_id: user.uid
        }),
      });

      if (response.ok) {
        const plan = await response.json();
        setSkillPlans([plan, ...skillPlans]);
        setNewSkillPlan({
          skill_name: '',
          description: '',
          current_level: 'beginner',
          target_level: 'intermediate',
          total_hours_planned: 0,
          target_completion_date: ''
        });
        setShowCreatePlan(false);
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error creating skill plan:', error);
    }
  };

  const updateSkillPlan = async (planId, updates) => {
    try {
      const response = await fetch(`http://localhost:5000/api/skill-plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          user_id: user.uid
        }),
      });

      if (response.ok) {
        const updatedPlan = await response.json();
        setSkillPlans(skillPlans.map(plan => plan.id === planId ? updatedPlan : plan));
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error updating skill plan:', error);
    }
  };

  const deleteSkillPlan = async (planId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/skill-plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.uid }),
      });

      if (response.ok) {
        setSkillPlans(skillPlans.filter(plan => plan.id !== planId));
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error deleting skill plan:', error);
    }
  };

  const addProgressEntry = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      const response = await fetch('http://localhost:5000/api/progress-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          skill_plan_id: selectedPlan.id,
          hours_spent: progressData.hours_spent,
          topics_covered: progressData.topics_covered.split(',').map(t => t.trim()),
          notes: progressData.notes,
          completion_percentage: progressData.completion_percentage
        }),
      });

      if (response.ok) {
        setProgressData({
          hours_spent: 0,
          topics_covered: '',
          notes: '',
          completion_percentage: 0
        });
        setShowProgressForm(false);
        setSelectedPlan(null);
        fetchSkillPlans();
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error adding progress entry:', error);
    }
  };

  const startTimeTracking = async (planId, activityType = 'study') => {
    try {
      const response = await fetch('http://localhost:5000/api/time-tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          skill_plan_id: planId,
          activity_type: activityType
        }),
      });

      if (response.ok) {
        const tracking = await response.json();
        setActiveTimeTracking(tracking);
      }
    } catch (error) {
      console.error('Error starting time tracking:', error);
    }
  };

  const endTimeTracking = async () => {
    if (!activeTimeTracking) return;

    try {
      const response = await fetch(`http://localhost:5000/api/time-tracking/${activeTimeTracking.id}/end`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid
        }),
      });

      if (response.ok) {
        setActiveTimeTracking(null);
        fetchSkillPlans();
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error ending time tracking:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#44ff44';
      case 'completed': return '#4488ff';
      case 'paused': return '#ffaa00';
      case 'abandoned': return '#ff4444';
      default: return '#cccccc';
    }
  };

  const renderOverview = () => (
    <div className="dashboard-overview">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{dashboardStats.total_plans || 0}</h3>
          <p>Total Skill Plans</p>
        </div>
        <div className="stat-card">
          <h3>{dashboardStats.active_plans || 0}</h3>
          <p>Active Plans</p>
        </div>
        <div className="stat-card">
          <h3>{dashboardStats.completed_plans || 0}</h3>
          <p>Completed Plans</p>
        </div>
        <div className="stat-card">
          <h3>{dashboardStats.total_hours_spent || 0}</h3>
          <p>Total Hours Spent</p>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        {dashboardStats.recent_progress && dashboardStats.recent_progress.length > 0 ? (
          <div className="activity-list">
            {dashboardStats.recent_progress.map((progress, index) => (
              <div key={index} className="activity-item">
                <div className="activity-info">
                  <span className="activity-date">{new Date(progress.date).toLocaleDateString()}</span>
                  <span className="activity-hours">{progress.hours_spent}h spent</span>
                </div>
                <div className="activity-progress">
                  <span>{progress.completion_percentage}% complete</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No recent activity</p>
        )}
      </div>

      {activeTimeTracking && (
        <div className="active-tracking">
          <h3>Active Time Tracking</h3>
          <div className="tracking-info">
            <p>Session started: {new Date(activeTimeTracking.session_start).toLocaleTimeString()}</p>
            <p>Activity: {activeTimeTracking.activity_type}</p>
            <button onClick={endTimeTracking} className="btn-stop">
              Stop Tracking
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSkillPlans = () => (
    <div className="skill-plans">
      <div className="plans-header">
        <h3>Skill Plans</h3>
        <button onClick={() => setShowCreatePlan(true)} className="btn-primary">
          Create New Plan
        </button>
      </div>

      {showCreatePlan && (
        <div className="create-plan-form">
          <h4>Create New Skill Plan</h4>
          <form onSubmit={createSkillPlan}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Skill Name"
                value={newSkillPlan.skill_name}
                onChange={(e) => setNewSkillPlan({...newSkillPlan, skill_name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Description"
                value={newSkillPlan.description}
                onChange={(e) => setNewSkillPlan({...newSkillPlan, description: e.target.value})}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <select
                  value={newSkillPlan.current_level}
                  onChange={(e) => setNewSkillPlan({...newSkillPlan, current_level: e.target.value})}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div className="form-group">
                <select
                  value={newSkillPlan.target_level}
                  onChange={(e) => setNewSkillPlan({...newSkillPlan, target_level: e.target.value})}
                >
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Planned Hours"
                  value={newSkillPlan.total_hours_planned}
                  onChange={(e) => setNewSkillPlan({...newSkillPlan, total_hours_planned: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              <div className="form-group">
                <input
                  type="date"
                  value={newSkillPlan.target_completion_date}
                  onChange={(e) => setNewSkillPlan({...newSkillPlan, target_completion_date: e.target.value})}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Create Plan</button>
              <button type="button" onClick={() => setShowCreatePlan(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="plans-list">
        {skillPlans.map(plan => (
          <div key={plan.id} className="plan-card">
            <div className="plan-header">
              <h4>{plan.skill_name}</h4>
              <span 
                className="status-badge"
                style={{backgroundColor: getStatusColor(plan.status)}}
              >
                {plan.status}
              </span>
            </div>
            <p>{plan.description}</p>
            <div className="plan-progress">
              <div className="progress-info">
                <span>Level: {plan.current_level} → {plan.target_level}</span>
                <span>Hours: {plan.total_hours_spent}/{plan.total_hours_planned}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{width: `${plan.total_hours_planned > 0 ? (plan.total_hours_spent / plan.total_hours_planned) * 100 : 0}%`}}
                ></div>
              </div>
            </div>
            <div className="plan-actions">
              <button 
                onClick={() => {
                  setSelectedPlan(plan);
                  setShowProgressForm(true);
                }}
                className="btn-secondary"
              >
                Add Progress
              </button>
              <button 
                onClick={() => startTimeTracking(plan.id)}
                className="btn-primary"
                disabled={activeTimeTracking}
              >
                Start Tracking
              </button>
              <select
                value={plan.status}
                onChange={(e) => updateSkillPlan(plan.id, {status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="abandoned">Abandoned</option>
              </select>
              <button 
                onClick={() => deleteSkillPlan(plan.id)}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showProgressForm && selectedPlan && (
        <div className="progress-form-modal">
          <div className="progress-form">
            <h4>Add Progress for {selectedPlan.skill_name}</h4>
            <form onSubmit={addProgressEntry}>
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Hours Spent"
                  value={progressData.hours_spent}
                  onChange={(e) => setProgressData({...progressData, hours_spent: parseFloat(e.target.value) || 0})}
                  step="0.5"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Topics Covered (comma-separated)"
                  value={progressData.topics_covered}
                  onChange={(e) => setProgressData({...progressData, topics_covered: e.target.value})}
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder="Notes"
                  value={progressData.notes}
                  onChange={(e) => setProgressData({...progressData, notes: e.target.value})}
                />
              </div>
              <div className="form-group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressData.completion_percentage}
                  onChange={(e) => setProgressData({...progressData, completion_percentage: parseInt(e.target.value)})}
                />
                <span>{progressData.completion_percentage}% Complete</span>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Add Progress</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowProgressForm(false);
                    setSelectedPlan(null);
                  }} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2>User Dashboard</h2>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              padding: '10px 20px', 
              background: '#008B8B', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Home Page
          </button>
        </div>
        <div className="dashboard-tabs">
          <button 
            className={view === 'overview' ? 'active' : ''} 
            onClick={() => setView('overview')}
          >
            Overview
          </button>
          <button 
            className={view === 'skill-plans' ? 'active' : ''} 
            onClick={() => setView('skill-plans')}
          >
            Skill Plans
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {view === 'overview' && renderOverview()}
        {view === 'skill-plans' && renderSkillPlans()}
      </div>
    </div>
  );
};

export default Dashboard; 