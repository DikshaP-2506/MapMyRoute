import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

const CareerInsights = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Insights data
  const [jobPostings, setJobPostings] = useState([]);
  const [skillRelevance, setSkillRelevance] = useState(null);
  const [salaryBenchmark, setSalaryBenchmark] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  // User skills job matching
  const [userSkills, setUserSkills] = useState({ acquired: [], in_progress: [] });
  const [userSkillJobs, setUserSkillJobs] = useState({ acquired: {}, in_progress: {} });
  const [userSkillLoading, setUserSkillLoading] = useState(false);
  const [userSkillError, setUserSkillError] = useState("");

  // TODO: Replace with actual user ID logic
  const userId = 1;

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const catRes = await axios.get(`${API_BASE}/api/job-categories`);
        setCategories(catRes.data);
      } catch (err) {
        setError("Failed to fetch job categories.");
      }
      setLoading(false);
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const fetchUserSkillsAndJobs = async () => {
      setUserSkillLoading(true);
      setUserSkillError("");
      try {
        const skillsRes = await axios.get(`${API_BASE}/api/user-skills/${userId}`);
        setUserSkills(skillsRes.data);
        // For each skill, fetch job postings
        const fetchJobs = async (skill) => {
          const res = await axios.get(`${API_BASE}/api/job-postings`, {
            params: { skill, location: "India", results: 5 }
          });
          return res.data.postings || [];
        };
        const acquiredJobs = {};
        for (const skill of skillsRes.data.acquired) {
          acquiredJobs[skill] = await fetchJobs(skill);
        }
        const inProgressJobs = {};
        for (const skill of skillsRes.data.in_progress) {
          inProgressJobs[skill] = await fetchJobs(skill);
        }
        setUserSkillJobs({ acquired: acquiredJobs, in_progress: inProgressJobs });
      } catch (err) {
        setUserSkillError("Failed to fetch your skills or job matches.");
      }
      setUserSkillLoading(false);
    };
    fetchUserSkillsAndJobs();
  }, [userId]);

  const handleCategoryChange = (e) => setSelectedCategory(e.target.value);
  const handleJobTitleChange = (e) => setJobTitle(e.target.value);

  const handleShowInsights = async (e) => {
    e.preventDefault();
    setInsightsError("");
    setInsightsLoading(true);
    setJobPostings([]);
    setSkillRelevance(null);
    setSalaryBenchmark(null);
    try {
      // Use jobTitle for salary benchmarking if provided, else use selectedCategory
      const skill = selectedCategory;
      const location = "India"; // Default location
      const salaryRole = jobTitle.trim() !== "" ? jobTitle : selectedCategory;
      // Fetch job postings
      const jobsRes = await axios.get(`${API_BASE}/api/job-postings`, {
        params: { skill, location, results: 10 }
      });
      setJobPostings(jobsRes.data.postings || []);
      // Fetch skill relevance (for now, just this skill)
      const skillRelRes = await axios.get(`${API_BASE}/api/skill-relevance`, {
        params: { skills: skill, location }
      });
      setSkillRelevance(skillRelRes.data.relevance || null);
      // Fetch salary benchmark
      const salaryRes = await axios.get(`${API_BASE}/api/salary-benchmark`, {
        params: { role: salaryRole, location }
      });
      setSalaryBenchmark(salaryRes.data || null);
    } catch (err) {
      setInsightsError("Failed to fetch career insights. Please try again.");
    }
    setInsightsLoading(false);
  };

  return (
    <div style={{
      maxWidth: '85vw',
      width: "100%",
      margin: "0 auto",
      padding: "10.0rem 2rem",
      background: "#f0fdfa",
      borderRadius: 18,
      boxShadow: "0 2px 12px #14b8a622"
    }}>
      <h2 style={{ color: '#2dd4bf', textAlign: 'center', marginBottom: '2rem' }}>Career Insights</h2>
      <form onSubmit={handleShowInsights} style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div>
          <label style={{ fontWeight: 'bold', color: '#0f766e' }}>Category: </label>
          <select value={selectedCategory} onChange={handleCategoryChange} style={{ padding: '0.5rem', borderRadius: 6, minWidth: 180 }} required>
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.tag} value={cat.tag}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontWeight: 'bold', color: '#0f766e' }}>Job Title: </label>
          <input
            type="text"
            value={jobTitle}
            onChange={handleJobTitleChange}
            placeholder="e.g. Software Engineer"
            style={{ padding: '0.5rem', borderRadius: 6, minWidth: 180 }}
          />
        </div>
        <button type="submit" className="btn btn-info" style={{ fontWeight: 'bold', background: '#2dd4bf', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem' }}>
          Show Insights
        </button>
      </form>
      {loading && <div>Loading options...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {insightsLoading && <div>Loading insights...</div>}
      {insightsError && <div style={{ color: 'red' }}>{insightsError}</div>}
      <section style={{ marginBottom: '2rem' }}>
        <h4>Skill-to-Job Mapping</h4>
        <div style={{ color: '#888' }}>
          {/* Placeholder: In future, map user's skills to jobs. For now, show selected category as skill. */}
          {selectedCategory && (
            <span>Showing jobs and insights for skill/category: <b>{selectedCategory}</b> in <b>India</b></span>
          )}
        </div>
      </section>
      <section style={{ marginBottom: '2rem', background: '#e0f7fa', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 6px #14b8a622' }}>
        <h4 style={{ color: '#0f766e' }}>Jobs Matching Your Skills</h4>
        {userSkillLoading && <div>Loading your skills and job matches...</div>}
        {userSkillError && <div style={{ color: 'red' }}>{userSkillError}</div>}
        {!userSkillLoading && !userSkillError && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <b>Acquired Skills:</b> {userSkills.acquired.length > 0 ? userSkills.acquired.join(", ") : <span style={{ color: '#888' }}>None</span>}
            </div>
            {userSkills.acquired.map((skill) => (
              <div key={skill} style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontWeight: 'bold', color: '#2dd4bf' }}>{skill}</div>
                {userSkillJobs.acquired[skill] && userSkillJobs.acquired[skill].length > 0 ? (
                  <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                    {userSkillJobs.acquired[skill].map((job, idx) => (
                      <li key={job.id || idx} style={{ background: '#fff', borderRadius: 8, padding: '1rem', marginBottom: '0.7rem', boxShadow: '0 1px 6px #14b8a622' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f766e' }}>{job.title}</div>
                        <div style={{ color: '#555' }}>{job.company?.display_name} | {job.location?.display_name}</div>
                        <div style={{ color: '#888', fontSize: '0.95rem' }}>{job.description?.slice(0, 100)}...</div>
                        {job.redirect_url && (
                          <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2dd4bf', fontWeight: 'bold' }}>View Job</a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#888' }}>[No jobs found for this skill]</div>
                )}
              </div>
            ))}
            <div style={{ marginBottom: '1rem', marginTop: '2rem' }}>
              <b>In-Progress Skills:</b> {userSkills.in_progress.length > 0 ? userSkills.in_progress.join(", ") : <span style={{ color: '#888' }}>None</span>}
            </div>
            {userSkills.in_progress.map((skill) => (
              <div key={skill} style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontWeight: 'bold', color: '#ffa726' }}>{skill}</div>
                {userSkillJobs.in_progress[skill] && userSkillJobs.in_progress[skill].length > 0 ? (
                  <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                    {userSkillJobs.in_progress[skill].map((job, idx) => (
                      <li key={job.id || idx} style={{ background: '#fff', borderRadius: 8, padding: '1rem', marginBottom: '0.7rem', boxShadow: '0 1px 6px #14b8a622' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f766e' }}>{job.title}</div>
                        <div style={{ color: '#555' }}>{job.company?.display_name} | {job.location?.display_name}</div>
                        <div style={{ color: '#888', fontSize: '0.95rem' }}>{job.description?.slice(0, 100)}...</div>
                        {job.redirect_url && (
                          <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2dd4bf', fontWeight: 'bold' }}>View Job</a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#888' }}>[No jobs found for this skill]</div>
                )}
              </div>
            ))}
          </>
        )}
      </section>
      <section style={{ marginBottom: '2rem' }}>
        <h4>Live Job Postings</h4>
        {jobPostings.length > 0 ? (
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {jobPostings.map((job, idx) => (
              <li key={job.id || idx} style={{ marginBottom: '1.2rem', background: '#fff', borderRadius: 8, padding: '1rem', boxShadow: '0 1px 6px #14b8a622' }}>
                <div style={{ fontWeight: 'bold', color: '#0f766e', fontSize: '1.1rem' }}>{job.title}</div>
                <div style={{ color: '#555' }}>{job.company?.display_name} | {job.location?.display_name}</div>
                <div style={{ color: '#888', fontSize: '0.95rem' }}>{job.description?.slice(0, 120)}...</div>
                {job.redirect_url && (
                  <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2dd4bf', fontWeight: 'bold' }}>View Job</a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: '#888' }}>[Live job postings for your skills in India will appear here]</div>
        )}
      </section>
      <section style={{ marginBottom: '2rem' }}>
        <h4>Skill Relevance Score</h4>
        {skillRelevance ? (
          <div style={{ color: '#0f766e', fontWeight: 'bold' }}>
            Demand Score for <b>{selectedCategory}</b>: {skillRelevance[selectedCategory]}
          </div>
        ) : (
          <div style={{ color: '#888' }}>[Skill demand/relevance scores will appear here]</div>
        )}
      </section>
    </div>
  );
};

export default CareerInsights; 