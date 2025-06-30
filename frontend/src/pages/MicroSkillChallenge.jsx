import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000"; // Adjust if your backend runs elsewhere

const MicroSkillChallenge = ({ userId }) => {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

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

  const handleOptionChange = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quiz) return;
    try {
      const res = await axios.post(`${API_BASE}/quiz/attempt`, {
        user_id: userId,
        quiz_id: quiz.id,
        answers,
      });
      setResult(res.data);
    } catch (err) {
      alert("Failed to submit quiz");
    }
  };

  if (loading) return <div>Loading quiz...</div>;
  if (!quiz) return <div>No quiz available.</div>;

  return (
    <div className="micro-skill-challenge">
      <h2>{quiz.title || "Micro Skill Challenge"}</h2>
      <form onSubmit={handleSubmit}>
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="quiz-question">
            <p>
              <b>Q{idx + 1}:</b> {q.question_text}
            </p>
            {q.options.map((opt, i) => (
              <label key={i} style={{ display: "block" }}>
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => handleOptionChange(q.id, opt)}
                  required
                />
                {opt}
              </label>
            ))}
          </div>
        ))}
        <button type="submit" disabled={result}>
          Submit
        </button>
      </form>
      {result && (
        <div className="quiz-result">
          <h3>Your Score: {result.score} / {result.total}</h3>
        </div>
      )}

      <hr />
      <h3>Past Quiz Attempts</h3>
      <ul>
        {history.map((attempt) => (
          <li key={attempt.id}>
            Attempted at: {new Date(attempt.attempted_at).toLocaleString()} | Score: {attempt.score}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MicroSkillChallenge; 