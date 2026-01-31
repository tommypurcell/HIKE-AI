
export interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  score: number;
  record?: string;
}

export interface GameSummary {
  team1: TeamInfo;
  team2: TeamInfo;
  period: number;
  clock: string;
  venue: string;
  situation?: {
    lastPlayText?: string;
    downDistanceText?: string;
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
}

export interface MascotImages {
  team1?: string;
  team2?: string;
}
