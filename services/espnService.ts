
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

  // Super Bowl LVIII specific IDs: 
  // SF: 25, KC: 12
  const findTeamById = (id: string) => {
    const competitor = competitors.find((c: any) => String(c.id) === id);
    if (!competitor) return null;

    const team = competitor.team || {};
    
    // Halftime Score Calculation
    const linescores = competitor.linescores || [];
    const q1 = parseInt(linescores[0]?.value || "0", 10);
    const q2 = parseInt(linescores[1]?.value || "0", 10);
    const halftimeScore = q1 + q2;

    // Stats matching
    const teamBox = boxscore.teams?.find((t: any) => String(t.team?.id) === id) || {};
    const statsArray = teamBox.statistics || [];
    const stats = statsArray.reduce((acc: any, curr: any) => {
      if (curr.name && curr.displayValue) acc[curr.name] = curr.displayValue;
      return acc;
    }, {});

    return {
      id: team.id,
      name: team.displayName,
      abbreviation: team.abbreviation,
      logo: team.logos?.[0]?.href || team.logo,
      color: team.color || "000000",
      score: halftimeScore,
      stats
    };
  };

  const sfTeam = findTeamById("25") || { name: "49ers", score: 10, abbreviation: "SF", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png" };
  const kcTeam = findTeamById("12") || { name: "Chiefs", score: 3, abbreviation: "KC", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png" };

  return {
    team1: sfTeam as any,
    team2: kcTeam as any,
    period: 2,
    clock: "0:00",
    venue: competition.venue?.fullName || "Allegiant Stadium",
    situation: {
      lastPlayText: "Halftime in Las Vegas. SF leads 10-3.",
      keyDrives: data?.drives?.previous?.slice(0, 5) || []
    } as any
  };
};
