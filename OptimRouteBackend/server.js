import express from 'express';
import cors from 'cors';
import { findTwoHopRoutes, findDirectRoute } from './pathfinder.js';
import { runQuery } from './auradb.js';

const app = express();
const PORT = 5000;

// Allow requests from the Next.js dev server and production frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET'],
}));
app.use(express.json());

// Return stations from Neo4j.
// Optional ?q=<term> filters by name or code prefix (case-insensitive).
app.get('/api/stations', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toUpperCase();
    const cypher = q
      ? `MATCH (s:Station)
         WHERE toUpper(s.name) CONTAINS $q OR toUpper(s.code) CONTAINS $q
         RETURN s.code AS code, s.name AS name
         ORDER BY s.name
         LIMIT 20`
      : `MATCH (s:Station) RETURN s.code AS code, s.name AS name ORDER BY s.name`;

    const records = await runQuery(cypher, q ? { q } : {});
    const stations = records.map(r => ({
      id:   r.get('code').toLowerCase(),
      code: r.get('code'),
      name: r.get('name'),
      city: r.get('name'),
    }));
    res.json({ success: true, stations });
  } catch (err) {
    console.error('Failed to fetch stations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/routes/find', findTwoHopRoutes);
app.get('/api/routes/direct', findDirectRoute);

app.listen(PORT, () => {
  console.log(`🚀 OptimRoute Server running on http://127.0.0.1:${PORT}`);
});
