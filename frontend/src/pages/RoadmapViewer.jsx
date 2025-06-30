import React from "react";

// Teal color palette
const TEAL = {
  main: '#14b8a6', // teal-500
  light: '#99f6e4', // teal-200
  lighter: '#f0fdfa', // teal-50
  dark: '#0f766e', // teal-700
  accent: '#2dd4bf', // teal-400
  shadow: '#14b8a622',
};

const roadmap = {
  title: "Python for Beginners",
  description: "A 4-week roadmap to get started with Python programming.",
  weeks: [
    {
      week: 1,
      goals: [
        "Introduction to Python & setup",
        "Basic syntax, variables, and data types",
        "Simple input/output"
      ]
    },
    {
      week: 2,
      goals: [
        "Control flow: if, for, while",
        "Functions and modules",
        "Practice: basic programs"
      ]
    },
    {
      week: 3,
      goals: [
        "Lists, tuples, and dictionaries",
        "File handling",
        "Error handling"
      ]
    },
    {
      week: 4,
      goals: [
        "Object-oriented programming basics",
        "Mini project: Build a CLI app",
        "Next steps & resources"
      ]
    }
  ]
};


const RoadmapViewer = () => (
  <div className="min-vh-100 bg-gradient" style={{background: `linear-gradient(135deg, ${TEAL.lighter} 0%, ${TEAL.light} 100%)`, fontFamily: 'sans-serif', width: '100vw', boxSizing: 'border-box', overflowX: 'hidden'}}>
    <div className="card shadow-lg p-4 p-md-5 my-5 mx-auto" style={{maxWidth: 650, width: '100%', borderRadius: 20, background: 'rgba(255,255,255,0.99)', boxSizing: 'border-box'}}>
      <h2 className="mb-2" style={{ color: TEAL.main }}>{roadmap.title}</h2>
      <p className="mb-4" style={{ color: TEAL.dark }}>{roadmap.description}</p>
      <div>
        {roadmap.weeks.map(week => (
          <div key={week.week} className="mb-4">
            <h4 className="mb-2" style={{ color: TEAL.accent }}>Week {week.week}</h4>
            <ul className="ps-4">
              {week.goals.map((goal, idx) => (
                <li key={idx}>{goal}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-center mt-4">
        <button className="btn btn-lg px-4 fw-bold shadow-sm" style={{ background: TEAL.main, color: '#fff', border: 'none', borderRadius: 10 }}>Log in to personalize this roadmap</button>
      </div>
    </div>
  </div>
);

export default RoadmapViewer;