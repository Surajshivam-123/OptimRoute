import express from 'express';
import cors from 'cors';
import { findTwoHopRoutes, findDirectRoute, allStation } from './pathfinder.js';

const app = express();
const PORT = 5000;

// Allow requests from the Next.js dev server and production frontend
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET'],
}));
app.use(express.json());
app.get('/api/stations', allStation);
app.get('/api/routes/find', findTwoHopRoutes);
app.get('/api/routes/direct', findDirectRoute);

app.listen(PORT, () => {
  console.log(`🚀 OptimRoute Server Started`);
});
