import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000"; // Adjust if your backend runs elsewhere

const MicroSkillChallenge = ({ userId }) => {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  // Guard: If userId is not valid, show error and do not fetch
  if (!userId || isNaN(Number(userId))) {
    return <div style={{color: 'red', fontWeight: 'bold'}}>Error: User ID is missing or invalid. Please log in again.</div>;
  }

  // Fetch personalized quiz on mount
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/quiz/personalized/${userId}`);
        setQuiz(res.data);
      } catch (err) {
        alert("Failed to fetch quiz");
      }
      setLoading(false);
    };
    fetchQuiz();
  }, [userId]);

  // Fetch quiz history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE}/quiz/history/${userId}`);
        setHistory(res.data);
      } catch (err) {
        // ignore for now
      }
    };
    fetchHistory();
  }, [userId]);

  const handleOptionChange = (qid, index) => {
    setAnswers((prev) => ({ ...prev, [qid]: index }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quiz) return;
    try {
      // Collect the IDs of the questions shown to the user
      const question_ids = quiz.questions.map((q) => q.id);
      const res = await axios.post('http://127.0.0.1:8000/quiz/attempt', {
        user_id: userId,
        quiz_id: quiz.quiz_id, // use the quiz_id from the quiz object
        answers,
        question_ids,
      });
      setResult(res.data);
    } catch (err) {
      alert(
        err.response?.data?.detail
          ? `Failed to submit quiz: ${JSON.stringify(err.response.data.detail)}`
          : `Failed to submit quiz: ${err.message}`
      );
    }
  };

  if (loading) return <div>Loading quiz...</div>;
  if (!quiz) return <div>No quiz available.</div>;

  return (
    <div className="micro-skill-challenge" style={{ maxWidth: 1100, margin: '2rem auto', background: '#f9fafb', borderRadius: 16, boxShadow: '0 2px 16px #14b8a622', padding: '2rem', border: '1px solid #e0e0e0' }}>
      <h2 style={{ textAlign: 'center', color: '#14b8a6', marginBottom: '2rem' }}>{quiz.title || "Micro Skill Challenge"}</h2>
      <form onSubmit={handleSubmit}>
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="quiz-question" style={{ marginBottom: '2rem', padding: '1.2rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #14b8a611' }}>
            <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: 12 }}>
              <span style={{ color: '#0f766e', marginRight: 8 }}>Q{idx + 1}:</span> {q.question_text}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', background: answers[q.id] === i ? '#e0f7fa' : '#f3f4f6', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', border: answers[q.id] === i ? '2px solid #14b8a6' : '1px solid #e0e0e0', fontWeight: answers[q.id] === i ? 'bold' : 'normal' }}>
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={i}
                    checked={answers[q.id] === i}
                    onChange={() => handleOptionChange(q.id, i)}
                    required
                    style={{ marginRight: 10 }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={result}
          style={{
            width: '100%',
            background: '#14b8a6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            padding: '0.75rem',
            border: 'none',
            borderRadius: 10,
            boxShadow: '0 2px 8px #14b8a622',
            cursor: result ? 'not-allowed' : 'pointer',
            marginTop: 16
          }}
        >
          Submit
        </button>
      </form>
      {result && (
        <div className="quiz-result" style={{ marginTop: 32, background: '#e0f7fa', borderRadius: 12, padding: '1.5rem', textAlign: 'center', color: '#0f766e', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 1px 6px #14b8a622' }}>
          <h3 style={{ marginBottom: 0 }}>Your Score: {result.score} / {result.total}</h3>
        </div>
      )}
      <hr style={{ margin: '2.5rem 0' }} />
      <h3 style={{ color: '#0f766e', marginBottom: 12 }}>Past Quiz Attempts</h3>
      <ul style={{ paddingLeft: 0, listStyle: 'none', color: '#555' }}>
        {history.length === 0 && <li>No past attempts yet.</li>}
        {history.map((attempt) => (
          <li key={attempt.id} style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 'bold' }}>Attempted at:</span> {new Date(attempt.attempted_at).toLocaleString()} | <span style={{ fontWeight: 'bold' }}>Score:</span> {attempt.score}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MicroSkillChallenge; 