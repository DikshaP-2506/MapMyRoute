import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

const History = () => {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const userId = auth.currentUser?.uid;
  const navigate = useNavigate();

  const fetchHistory = () => {
    if (!userId) return;
    fetch(`http://localhost:5000/api/history?user_id=${userId}`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(() => setError('Failed to fetch history'));
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line
  }, [userId]);

  const handleClearHistory = () => {
    if (!userId) return;
    fetch(`http://localhost:5000/api/history?user_id=${userId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => fetchHistory())
      .catch(() => setError('Failed to clear history'));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Your Roadmap History</h2>
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
      <button onClick={handleClearHistory} style={{ marginBottom: '1rem', padding: '8px 16px' }}>Clear History</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {history.length === 0 && <div>No history found.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {history.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '2rem', background: '#f5f5f5', padding: '1rem', borderRadius: '8px' }}>
            <strong>Type:</strong> {item.type}<br />
            <strong>Input:</strong>
            <pre style={{ background: '#eee', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>{JSON.stringify(item.input, null, 2)}</pre>
            <strong>Result:</strong>
            <pre style={{ background: '#eee', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>{JSON.stringify(item.result, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default History; 