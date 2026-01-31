
import { GameSummary, TeamInfo } from '../types';

const ESPN_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401671889';

export const fetchGameData = async (): Promise<any> => {
  try {
    const response = await fetch(ESPN_API_URL);
    if (!response.ok) {
      throw new Error(`ESPN API status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching ESPN data:', error);
    throw error;
  }
};

export const parseGameSummary = (data: any): GameSummary => {
  const header = data?.header || {};
  const competition = header?.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const boxscore = data?.boxscore || { teams: [] };

  const parseTeam = (competitor: any): TeamInfo => {
    const team = competitor.team || {};
    const teamId = String(team.id);
    
    // Halftime Score Calculation
    // In ESPN summary, linescores are in the header competitors.
    // For halftime (End of Q2), we sum indices 0 and 1.
    const linescores = competitor.linescores || [];
    let halftimeScore = 0;
    
    if (linescores.length >= 2) {
      const q1 = parseInt(linescores[0]?.value ?? linescores[0]?.displayValue ?? "0", 10);
      const q2 = parseInt(linescores[1]?.value ?? linescores[1]?.displayValue ?? "0", 10);
      halftimeScore = q1 + q2;
    } else {
      // Fallback: If linescores are missing but it's a completed game,
      // we might only see the total score. But we want halftime specifically.
      // If we can't find linescores, we default to 0 to show it's missing or use the main score if desperate.
      halftimeScore = parseInt(competitor.score || "0", 10);
    }

    // Detailed Stats from Boxscore
    const teamBox = boxscore.teams?.find((t: any) => String(t.team?.id) === teamId) || {};
    const statsArray = teamBox.statistics || [];
    const stats = statsArray.reduce((acc: any, curr: any) => {
      if (curr.name && curr.displayValue) acc[curr.name] = curr.displayValue;
      return acc;
    }, {});

    return {
      id: teamId,
      name: team.displayName || team.name || "Unknown Team",
      abbreviation: team.abbreviation || "NFL",
      logo: team.logos?.[0]?.href || team.logo || "https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png",
      color: team.color || "000000",
      score: halftimeScore,
      stats
    };
  };

  // Map competitors - usually index 1 is Away, index 0 is Home in some ESPN feeds, 
  // but we'll map them as provided.
  const team1 = competitors[0] ? parseTeam(competitors[0]) : null;
  const team2 = competitors[1] ? parseTeam(competitors[1]) : null;

  if (!team1 || !team2) {
    throw new Error("Could not parse team data from ESPN feed.");
  }

  return {
    team1,
    team2,
    period: 2,
    clock: "0:00",
    venue: competition.venue?.fullName || "Championship Venue",
    situation: {
      lastPlayText: "End of the first half.",
      keyDrives: data?.drives?.previous?.slice(0, 5) || []
    }
  };
};
