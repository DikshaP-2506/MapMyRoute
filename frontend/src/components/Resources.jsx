import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SkillForm.css';

const Section = ({ title, items, renderItem }) => (
  <div style={{ marginBottom: '2rem' }}>
    <h3 style={{ color: '#008B8B', borderBottom: '2px solid #008B8B', paddingBottom: '0.5rem' }}>{title}</h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
      {items && items.length > 0 ? items.map(renderItem) : <div style={{ color: '#888' }}>No {title.toLowerCase()} found.</div>}
    </div>
  </div>
);

const Card = ({ children }) => (
  <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1.2rem', minWidth: '250px', maxWidth: '350px', flex: '1 1 250px' }}>
    {children}
  </div>
);

const Resources = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resources = location.state?.resources;

  if (!resources) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>No resources to display.</h2>
        <button onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>Back</button>
      </div>
    );
  }

  return (
    <div className="skillform-bg-wrapper" style={{ minHeight: '100vh', padding: '2rem' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem', padding: '8px 18px', background: '#008B8B', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Back to Roadmap</button>
      <h2 style={{ color: '#008B8B', marginBottom: '2rem' }}>Recommended Resources</h2>
      <Section
        title="Video Tutorials"
        items={resources.video_tutorials}
        renderItem={(v, idx) => (
          <Card key={idx}>
            <h4>{v.title}</h4>
            <p><strong>Platform:</strong> {v.platform}</p>
            <p><strong>Difficulty:</strong> {v.difficulty}</p>
            <p><strong>Type:</strong> {v.is_free ? 'Free' : 'Paid'}</p>
            <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#008B8B', fontWeight: 600 }}>View Tutorial</a>
          </Card>
        )}
      />
      <Section
        title="Online Courses"
        items={resources.online_courses}
        renderItem={(c, idx) => (
          <Card key={idx}>
            <h4>{c.title}</h4>
            <p><strong>Platform:</strong> {c.platform}</p>
            <p><strong>Difficulty:</strong> {c.difficulty}</p>
            <p><strong>Price:</strong> {c.price}</p>
            <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: '#008B8B', fontWeight: 600 }}>View Course</a>
          </Card>
        )}
      />
      <Section
        title="Articles"
        items={resources.articles}
        renderItem={(a, idx) => (
          <Card key={idx}>
            <h4>{a.title}</h4>
            <p><strong>Source:</strong> {a.source}</p>
            <p><strong>Reading Time:</strong> {a.reading_time}</p>
            <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: '#008B8B', fontWeight: 600 }}>Read Article</a>
          </Card>
        )}
      />
      <Section
        title="Tools"
        items={resources.tools}
        renderItem={(t, idx) => (
          <Card key={idx}>
            <h4>{t.name}</h4>
            <p>{t.description}</p>
            <p><strong>Type:</strong> {t.type}</p>
            <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: '#008B8B', fontWeight: 600 }}>Visit Tool</a>
          </Card>
        )}
      />
    </div>
  );
};

export default Resources; 