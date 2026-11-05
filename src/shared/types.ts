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
  | 'FULL_HOUSE'
  // Poker Jawa combinations
  | 'STRAIGHT'
  | 'FLUSH'
  | 'SPLIT'
  | 'STRAIGHT_FLUSH'
  | 'ROYAL_FLUSH'
  | 'BROTHER'
  | 'BROTHER_PANJANG'
  | 'COLOR_TRIS';

export interface HandCombo {
  type: ComboType;
  cards: Card[];
  mainRank: number; // primary comparison rank
  highestSuitValue: number; // secondary comparison suit
  suit?: Suit; // primary suit for Flush, Straight Flush, Royal Flush, Color Tris
  description: string;
  level?: number; // for 5-card Paket hierarchy (1=Straight, 2=Colour, 3=Full House, 4=Split, 5=Flush/SF, 6=Royal Flush)
}

export interface GameRules {
  preset: 'default_remi' | 'poker_jawa' | 'custom';
  presetName?: string;
  
  // Combinations
  allowStraight: boolean;       // Straight (5 kartu berurutan beda kembang)
  allowFlush: boolean;          // Colour (5 kartu sekembang tidak berurutan)
  allowFullHouse: boolean;      // Full House (3 + 2)
  allowSplit: boolean;          // Split (3-card Straight Flush + 1 Pair)
  allowStraightFlush5: boolean; // Flush / Straight Flush 5 kartu sekembang berurutan
  allowRoyalFlush: boolean;     // Royal Straight Flush (10-J-Q-K-As sekembang)
  allowBrother: boolean;        // Brother (2 pair berurutan, 4 kartu)
  allowBrotherPanjang: boolean; // Brother Panjang (3 pair berurutan, 6 kartu)
  allowColorTris: boolean;      // Color Tris (3 kartu straight flush, 3 kartu)
  allowBongFour: boolean;       // Bong Four of a Kind (4 kartu kembar)
  allowBongSF4: boolean;        // Bong 4-card Straight Flush
  
  // Mechanics & special rules
  allowCompareSuitsOnSameRank: boolean; // Boleh tabrak angka sama dengan adu kembang (Sekop > Hati > Keriting > Wajik)
  allowPaketHierarchy: boolean;         // Di paket 5 kartu: RSF > SF > Split > FH > Colour > Straight
  pairAbsoluteRule: boolean;            // Aturan Mutlak Pair: Pair HANYA boleh dilawan sesama Pair
  bombCanCutPoker: boolean;             // Bom (4-of-a-kind, Flush, RSF, Bong) potong kartu 2 ("Poker")
  cutAceWithTrisOrFH: boolean;          // Patah As dengan Tris atau Full House (aturan default Remi)
  cutTwoWithTrisOrFH: boolean;          // Patah 2 dengan Tris atau Full House (aturan default Remi)
  openingCard: '3S' | '3D' | 'any_3';   // Kartu pembuka: 3 Waru (3♠) / 3 Wajik (3♦) / bebas angka 3
  deckCount: 1;                         // Strictly 1 dek (52 kartu) selalu
  discardThrees?: boolean;              // Di awal game semua angka 3 dibuang dan pemegang 3 Waru (3♠) jalan duluan
  allowHints?: boolean;                 // Izinkan tombol saran kombinasi (Hint)
}

export const DEFAULT_RULES: GameRules = {
  preset: 'default_remi',
  allowStraight: false,
  allowFlush: false,
  allowFullHouse: true,
  allowSplit: false,
  allowStraightFlush5: false,
  allowRoyalFlush: false,
  allowBrother: false,
  allowBrotherPanjang: false,
  allowColorTris: false,
  allowBongFour: true,
  allowBongSF4: true,
  allowCompareSuitsOnSameRank: false,
  allowPaketHierarchy: false,
  pairAbsoluteRule: true,
  bombCanCutPoker: true,
  cutAceWithTrisOrFH: true,
  cutTwoWithTrisOrFH: true,
  openingCard: '3S',
  deckCount: 1,
  discardThrees: true,
  allowHints: true
};

export const POKER_JAWA_RULES: GameRules = {
  preset: 'poker_jawa',
  allowStraight: true,
  allowFlush: true,
  allowFullHouse: true,
  allowSplit: true,
  allowStraightFlush5: true,
  allowRoyalFlush: true,
  allowBrother: true,
  allowBrotherPanjang: true,
  allowColorTris: true,
  allowBongFour: true,
  allowBongSF4: true,
  allowCompareSuitsOnSameRank: true,
  allowPaketHierarchy: true,
  pairAbsoluteRule: false,
  bombCanCutPoker: true,
  cutAceWithTrisOrFH: false,
  cutTwoWithTrisOrFH: false,
  openingCard: '3D',
  deckCount: 1,
  discardThrees: false,
  allowHints: true
};

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
  finishRank?: number | null; // 1 (Juara 1), 2 (Juara 2), dst
  isAutoPlay?: boolean; // True jika giliran diambil alih oleh bot karena AFK / tidak menyentuh kartu
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
  caughtHoldingPoker?: boolean; // True jika masih memegang kartu poker (angka 2) di akhir game
  pokerCardsCount?: number;     // Jumlah kartu poker yang masih dipegang
}

export interface GameState {
  roomId: string;
  roomName: string;
  status: GameStatus;
  players: Player[];
  maxPlayers: number;
  fillWithBots: boolean;
  rules: GameRules;
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
  finishers?: string[]; // Urutan ID pemain yang sudah habis kartunya (Juara 1, 2, dst)
  results: GameResult[] | null;
  hasPokerBooing?: boolean;     // True jika ada pemain yang disoraki huuu karena memegang kartu poker di akhir game
  pokerLoserNames?: string[];   // Nama pemain-pemain yang disoraki huuu
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
  maxPlayers: number;
  status: GameStatus;
  fillWithBots?: boolean;
  hasPassword?: boolean;
  rules?: GameRules;
}
