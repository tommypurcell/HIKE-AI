// HIKE - Halftime Insights and Key Evaluations Server
// Express server for NFL game analysis

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGameData, parseGameSummary } from './services/espn.js';
import { generateAnalysis } from './services/gemini.js';

// Load environment variables
dotenv.config();

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

/**
 * API endpoint to fetch current game data
 * GET /api/game-data
 */
app.get('/api/game-data', async (req, res) => {
    try {
        const rawData = await fetchGameData();
        const summary = parseGameSummary(rawData);
        res.json({
            success: true,
            data: {
                raw: rawData,
                summary: summary
            }
        });
    } catch (error) {
        console.error('Error fetching game data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game data'
        });
    }
});

/**
 * API endpoint to generate AI analysis
 * POST /api/analyze
 * Body: { gameData: Object }
 */
app.post('/api/analyze', async (req, res) => {
    try {
        const { gameData } = req.body;

        if (!gameData) {
            return res.status(400).json({
                success: false,
                error: 'Game data is required'
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: 'API key not configured'
            });
        }

        const analysis = await generateAnalysis(gameData, apiKey);
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error generating analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate analysis'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏈 HIKE Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});
