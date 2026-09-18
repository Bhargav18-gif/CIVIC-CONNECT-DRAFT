const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { analyzeComplaint, verifyCompletion } = require('./ai');

try {
  admin.initializeApp();
} catch (e) {}

const app = express();
app.use(cors());
app.use(express.json());

const DEPARTMENTS = [
  { name: 'Roads', total: 120, resolved: 80 },
  { name: 'Water', total: 90, resolved: 52 },
  { name: 'Electricity', total: 70, resolved: 40 },
  { name: 'Garbage', total: 60, resolved: 35 },
  { name: 'Drainage', total: 45, resolved: 22 },
  { name: 'Health', total: 30, resolved: 25 },
];

app.get('/departments/stats', (req, res) => {
  res.json(DEPARTMENTS);
});

app.get('/issues/department-stats', (req, res) => {
  res.json({ stats: DEPARTMENTS });
});

app.get('/issues/stats', (req, res) => {
  const total = DEPARTMENTS.reduce((s, d) => s + d.total, 0);
  const resolved = DEPARTMENTS.reduce((s, d) => s + d.resolved, 0);
  res.json({ total, resolved, byDepartment: DEPARTMENTS });
});

app.get('/issues/:id', (req, res) => {
  const { id } = req.params;
  const sample = {
    referenceId: id.toUpperCase(),
    title: 'Sample issue',
    category: 'Roads',
    createdAt: new Date().toISOString(),
    description: 'This is a mocked issue returned by the local dev API.',
    status: 'in-progress',
  };
  res.json({ issue: sample });
});

app.post('/api/submit-complaint', analyzeComplaint);
app.post('/api/verify-completion', verifyCompletion);

// Export as Firebase Function when available, otherwise run local server for testing
let functions;
try {
  functions = require('firebase-functions');
} catch (e) {
  functions = null;
}

if (functions) {
  exports.api = functions.region('us-central1').https.onRequest(app);
} else {
  const PORT = process.env.PORT || 5177;
  app.listen(PORT, () => console.log(`Local dev API running on http://localhost:${PORT}`));
}
