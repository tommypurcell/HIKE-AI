
import { GameSummary, TeamInfo } from '../types';

const ESPN_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401671889';

export const fetchGameData = async (): Promise<any> => {
  try {
    const response = await fetch(ESPN_API_URL);
    if (!response.ok) throw new Error('Failed to fetch game data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching ESPN data:', error);
    throw error;
  }
};

export const parseGameSummary = (data: any): GameSummary => {
  const boxscore = data.boxscore;
  const header = data.header;
  const t1 = boxscore.teams[0];
  const t2 = boxscore.teams[1];

  const team1: TeamInfo = {
    id: t1.team.id,
    name: t1.team.displayName,
    abbreviation: t1.team.abbreviation,
    logo: t1.team.logo,
    color: t1.team.color,
    score: parseInt(header.competitions[0].competitors.find((c: any) => c.id === t1.team.id).score),
  };

  const team2: TeamInfo = {
    id: t2.team.id,
    name: t2.team.displayName,
    abbreviation: t2.team.abbreviation,
    logo: t2.team.logo,
    color: t2.team.color,
    score: parseInt(header.competitions[0].competitors.find((c: any) => c.id === t2.team.id).score),
  };

  return {
    team1,
    team2,
    period: header.competitions[0].status.period,
    clock: header.competitions[0].status.displayClock,
    venue: header.competitions[0].venue.fullName,
    situation: {
      lastPlayText: data.drives?.current?.plays?.slice(-1)[0]?.text || "No recent play data",
    }
  };
};
