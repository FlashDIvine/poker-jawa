export type Suit = 'S' | 'C' | 'D' | 'H';

export interface Card {
  id: string; // e.g. "3S", "10H", "2D"
  rank: number; // 3..15 (3=3 ... 13=K, 14=A, 15=2)
  suit: Suit;
  suitValue: number; // S=1, C=2, D=3, H=4
  rankLabel: string; // '3', '4', ..., '10', 'J', 'Q', 'K', 'As', '2'
  suitSymbol: string; // '♠', '♣', '♦', '♥'
  suitName: string; // 'Waru', 'Keriting', 'Wajik', 'Hati'
  color: 'black' | 'red';
  isPoker: boolean; // rank === 15
  isAce: boolean; // rank === 14
  isThreeSpades: boolean; // rank === 3 && suit === 'S'
}

export type ComboType = 
  | 'SINGLE'
  | 'PAIR'
  | 'TRIS'
  | 'BONG_FOUR'
  | 'BONG_SF'
  | 'FULL_HOUSE';

export interface HandCombo {
  type: ComboType;
  cards: Card[];
  mainRank: number; // primary comparison rank
  highestSuitValue: number; // secondary comparison suit
  description: string;
}

export interface PlayedTrick {
  playerId: string;
  playerName: string;
  combo: HandCombo;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  hand: Card[];
  cardCount: number;
  passed: boolean;
  connected: boolean;
  isHost: boolean;
  seatIndex: number; // 0, 1, 2, 3
  score: number;
}

export type GameStatus = 'waiting' | 'dealing' | 'playing' | 'round_over' | 'game_over';

export interface GameResult {
  playerId: string;
  playerName: string;
  avatar: string;
  isBot: boolean;
  rank: number; // 1, 2, 3, 4
  remainingCards: number;
  scoreDelta: number;
  isWinner: boolean;
}

export interface GameState {
  roomId: string;
  roomName: string;
  status: GameStatus;
  players: Player[];
  currentTurnPlayerId: string | null;
  turnTimeRemaining: number;
  turnTimerMax: number;
  lastPlay: PlayedTrick | null;
  trickHistory: PlayedTrick[];
  roundNumber: number;
  consecutivePasses: number;
  isFirstTurnOfGame: boolean;
  leadPlayerId: string | null;
  winnerId: string | null;
  results: GameResult[] | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isSystem: boolean;
  timestamp: number;
}

export interface RoomListItem {
  roomId: string;
  roomName: string;
  playerCount: number;
  status: GameStatus;
  hasPassword?: boolean;
}
