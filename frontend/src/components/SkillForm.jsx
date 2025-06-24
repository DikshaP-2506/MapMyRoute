import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import './SkillForm.css';

const SkillForm = () => {
  const [form, setForm] = useState({
    skill: '',
    level: 'Beginner',
    duration: '',
    weeklyTime: '',
    goalType: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted:', form);
  };

  return (
    <div className="skillform-bg-wrapper">
      <Navbar />
      <div className="skill-form-container">
        <form className="skill-form" onSubmit={handleSubmit}>
          <h2>Skill Development Roadmap</h2>
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
          <button type="submit" className="submit-btn">Generate Roadmap</button>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default SkillForm; 