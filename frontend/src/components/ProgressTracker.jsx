import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './ProgressTracker.css';

const ProgressTracker = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('list'); // 'list', 'calendar', 'progress'
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [progressData, setProgressData] = useState({});

  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, filterStatus, filterCategory]);

  const fetchTasks = async () => {
    try {
      let url = `http://localhost:5000/api/tasks/${user.uid}`;
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
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
        const updatedTask = await response.json();
        setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.uid }),
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== taskId));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const updateProgress = async (taskId, completionPercentage, notes = '') => {
    try {
      const response = await fetch('http://localhost:5000/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          task_id: taskId,
          completion_percentage: completionPercentage,
          notes
        }),
      });

      if (response.ok) {
        // Update local state to reflect progress
        setProgressData(prev => ({
          ...prev,
          [taskId]: completionPercentage
        }));
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44ff44';
      default: return '#cccccc';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#44ff44';
      case 'in_progress': return '#4488ff';
      case 'overdue': return '#ff4444';
      default: return '#cccccc';
    }
  };

  const renderTaskList = () => (
    <div className="task-list">
      <div className="filters">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
        <input
          type="text"
          placeholder="Filter by category"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        />
      </div>
      
      {tasks.map(task => (
        <div key={task.id} className="task-item">
          {editingTask === task.id ? (
            <TaskEditForm
              task={task}
              onSave={(updates) => updateTask(task.id, updates)}
              onCancel={() => setEditingTask(null)}
            />
          ) : (
            <div className="task-content">
              <div className="task-header">
                <h4>{task.title}</h4>
                <div className="task-actions">
                  <button onClick={() => setEditingTask(task.id)}>Edit</button>
                  <button onClick={() => deleteTask(task.id)} className="btn-danger">Delete</button>
                </div>
              </div>
              <p>{task.description}</p>
              <div className="task-meta">
                <span style={{backgroundColor: getPriorityColor(task.priority)}}>
                  {task.priority}
                </span>
                <span style={{backgroundColor: getStatusColor(task.status)}}>
                  {task.status}
                </span>
                {task.category && <span>{task.category}</span>}
                {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                <span>{task.estimated_hours}h</span>
              </div>
              <div className="task-progress">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressData[task.id] || 0}
                  onChange={(e) => updateProgress(task.id, parseInt(e.target.value))}
                />
                <span>{progressData[task.id] || 0}%</span>
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, {status: e.target.value})}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
                <input
                  type="date"
                  value={task.due_date ? task.due_date.slice(0, 10) : ''}
                  onChange={e => updateTask(task.id, { due_date: e.target.value })}
                  style={{ marginLeft: '10px' }}
                  title="Reschedule task"
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCalendarView = () => {
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
    
    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    const getTasksForDay = (day) => {
      if (!day) return [];
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      return tasks.filter(task => 
        task.due_date && new Date(task.due_date).toDateString() === date.toDateString()
      );
    };

    return (
      <div className="calendar-view">
        <div className="calendar-header">
          <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}>
            ←
          </button>
          <h3>{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}>
            →
          </button>
        </div>
        
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          
          {calendarDays.map((day, index) => (
            <div key={index} className={`calendar-day ${!day ? 'empty' : ''}`}>
              {day && (
                <>
                  <div className="day-number">{day}</div>
                  <div className="day-tasks">
                    {getTasksForDay(day).map(task => (
                      <div
                        key={task.id}
                        className="calendar-task"
                        style={{backgroundColor: getPriorityColor(task.priority)}}
                        title={task.title}
                      >
                        {task.title.substring(0, 15)}...
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProgressView = () => {
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
      <div className="progress-view">
        <div className="progress-summary">
          <h3>Progress Summary</h3>
          <div className="progress-stats">
            <div className="stat">
              <h4>{totalTasks}</h4>
              <p>Total Tasks</p>
            </div>
            <div className="stat">
              <h4>{completedTasks}</h4>
              <p>Completed</p>
            </div>
            <div className="stat">
              <h4>{completionRate.toFixed(1)}%</h4>
              <p>Completion Rate</p>
            </div>
          </div>
        </div>
        
        <div className="progress-chart">
          <h4>Task Status Distribution</h4>
          <div className="status-bars">
            {['pending', 'in_progress', 'completed', 'overdue'].map(status => {
              const count = tasks.filter(task => task.status === status).length;
              const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              return (
                <div key={status} className="status-bar">
                  <div className="status-label">{status.replace('_', ' ')}</div>
                  <div className="status-progress">
                    <div 
                      className="status-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: getStatusColor(status)
                      }}
                    ></div>
                  </div>
                  <div className="status-count">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="progress-tracker">
      <div className="tracker-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2>Progress Tracker & Planner</h2>
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
        <div className="view-tabs">
          <button 
            className={view === 'list' ? 'active' : ''} 
            onClick={() => setView('list')}
          >
            Task List
          </button>
          <button 
            className={view === 'calendar' ? 'active' : ''} 
            onClick={() => setView('calendar')}
          >
            Calendar
          </button>
          <button 
            className={view === 'progress' ? 'active' : ''} 
            onClick={() => setView('progress')}
          >
            Progress
          </button>
        </div>
      </div>

      <div className="tracker-content">
        {view === 'list' && renderTaskList()}
        {view === 'calendar' && renderCalendarView()}
        {view === 'progress' && renderProgressView()}
      </div>
    </div>
  );
};

const TaskEditForm = ({ task, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    due_date: task.due_date || '',
    priority: task.priority,
    category: task.category || '',
    estimated_hours: task.estimated_hours
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="task-edit-form">
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        required
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />
      <div className="form-row">
        <input
          type="date"
          value={formData.due_date}
          onChange={(e) => setFormData({...formData, due_date: e.target.value})}
        />
        <select
          value={formData.priority}
          onChange={(e) => setFormData({...formData, priority: e.target.value})}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="form-row">
        <input
          type="text"
          placeholder="Category"
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
        />
        <input
          type="number"
          value={formData.estimated_hours}
          onChange={(e) => setFormData({...formData, estimated_hours: parseInt(e.target.value) || 1})}
          min="1"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
};

export default ProgressTracker; 