
export interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  score: number;
  record?: string;
  stats?: Record<string, string>;
}

export interface GameSummary {
  team1: TeamInfo;
  team2: TeamInfo;
  period: number;
  clock: string;
  venue: string;
  situation?: {
    lastPlayText?: string;
    keyDrives?: any[];
  };
}

export interface AnalysisResponse {
  halftimeRecap: string;
  mainPoints: string[];
  narrationScript: string;
  swoopScript: string; // Script for Eagles mascot Swoop
  kcWolfScript: string; // Script for Chiefs mascot KC Wolf
  keysToWin: {
    team1: {
      name: string;
      keys: string[];
    };
    team2: {
      name: string;
      keys: string[];
    };
  };
  combinedStats: {
    [key: string]: {
      team1: string;
      team2: string;
    };
  };
  sources?: { title: string; uri: string }[];
}

export interface MascotImages {
  team1?: string;
  team2?: string;
}
