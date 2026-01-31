
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
  narrationScript: string;
  thought?: string; // Captured reasoning from Gemini
}

export interface MascotImages {
  team1?: string;
  team2?: string;
}
