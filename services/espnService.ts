
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
    
    // Halftime Score Calculation (Sum of Q1 + Q2)
    const linescores = competitor.linescores || [];
    const q1 = parseInt(linescores[0]?.value || "0", 10);
    const q2 = parseInt(linescores[1]?.value || "0", 10);
    const halftimeScore = q1 + q2;

    // Detailed Stats from Boxscore
    const teamBox = boxscore.teams?.find((t: any) => String(t.team?.id) === teamId) || {};
    const statsArray = teamBox.statistics || [];
    const stats = statsArray.reduce((acc: any, curr: any) => {
      if (curr.name && curr.displayValue) acc[curr.name] = curr.displayValue;
      return acc;
    }, {});

    return {
      id: teamId,
      name: team.displayName || "Unknown Team",
      abbreviation: team.abbreviation || "NFL",
      logo: team.logos?.[0]?.href || team.logo || "https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png",
      color: team.color || "000000",
      score: halftimeScore,
      stats
    };
  };

  // Dynamically take the two teams provided in the feed
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
      lastPlayText: "End of the first half. Analysis pending.",
      keyDrives: data?.drives?.previous?.slice(0, 5) || []
    }
  };
};
