// ESPN Service - Fetches and parses NFL game data from ESPN API

const ESPN_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401671889';

/**
 * Fetches game data from ESPN API
 * @returns {Promise<Object>} Raw game data from ESPN
 */
export async function fetchGameData() {
    try {
        console.log('Fetching from:', ESPN_API_URL);
        const response = await fetch(ESPN_API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            mode: 'cors',
        });
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`Failed to fetch game data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Data received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching ESPN data:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error: Could not reach ESPN API. This might be a CORS issue.');
        }
        throw error;
    }
}

/**
 * Parses raw ESPN data into a structured game summary
 * @param {Object} data - Raw ESPN game data
 * @returns {Object} Structured game summary with team info
 */
export function parseGameSummary(data) {
    const boxscore = data.boxscore;
    const header = data.header;
    const t1 = boxscore.teams[0];
    const t2 = boxscore.teams[1];

    const team1 = {
        id: t1.team.id,
        name: t1.team.displayName,
        abbreviation: t1.team.abbreviation,
        logo: t1.team.logo,
        color: t1.team.color,
        score: parseInt(header.competitions[0].competitors.find(c => c.id === t1.team.id).score),
    };

    const team2 = {
        id: t2.team.id,
        name: t2.team.displayName,
        abbreviation: t2.team.abbreviation,
        logo: t2.team.logo,
        color: t2.team.color,
        score: parseInt(header.competitions[0].competitors.find(c => c.id === t2.team.id).score),
    };

    return {
        team1,
        team2,
        period: header.competitions[0].status.period,
        clock: header.competitions[0].status.displayClock,
        venue: header.competitions[0].venue?.fullName || data.gameInfo?.venue?.fullName || "Venue TBD",
        situation: {
            lastPlayText: data.drives?.current?.plays?.slice(-1)[0]?.text || "No recent play data",
        }
    };
}

