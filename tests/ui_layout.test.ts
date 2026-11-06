import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatBox } from '../src/client/src/components/ChatBox.js';
import { ActionPanel } from '../src/client/src/components/ActionPanel.js';
import { PlayerSeat } from '../src/client/src/components/PlayerSeat.js';
import { CenterTable } from '../src/client/src/components/CenterTable.js';
import { BooingBanner } from '../src/client/src/components/BooingBanner.js';
import { BongExplosionBanner } from '../src/client/src/components/BongExplosionBanner.js';
import { GameOverModal } from '../src/client/src/components/GameOverModal.js';
import { PlayingCard } from '../src/client/src/components/PlayingCard.js';
import { Card, GameState, Player, POKER_JAWA_RULES, GameResult } from '../src/shared/types.js';

const sharedMockGameState: GameState = {
  roomId: 'TEST_RM',
  roomName: 'Meja Uji Coba',
  status: 'playing',
  players: [
    { id: 'me', name: 'Me', avatar: '🐱', isBot: false, cardCount: 5, hand: [{ id: 'c1', rank: 4, suit: 'S', rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', suitValue: 1, color: 'black', isPoker: false, isAce: false, isThreeSpades: false }], connected: true, isHost: true, seatIndex: 0, score: 0, isAutoPlay: false, passed: false },
    { id: 'opp1', name: 'TopPlayer', avatar: '🦁', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 1, score: 0, isAutoPlay: false, passed: false },
    { id: 'opp2', name: 'LeftPlayer', avatar: '🐼', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 2, score: 0, isAutoPlay: false, passed: false },
    { id: 'opp3', name: 'RightPlayer', avatar: '🦊', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 3, score: 0, isAutoPlay: false, passed: false }
  ],
  currentTurnPlayerId: 'me',
  turnTimerMax: 15,
  turnTimeRemaining: 15,
  lastPlay: null,
  trickHistory: [],
  roundNumber: 1,
  isFirstTurnOfGame: false,
  leadPlayerId: null,
  winnerId: null,
  results: null,
  consecutivePasses: 0,
  finishers: [],
  fillWithBots: true,
  maxPlayers: 4,
  rules: {
    ...POKER_JAWA_RULES,
    deckCount: 1,
    allowHints: true
  }
};

describe('UI Layout & Non-Overlapping Elements', () => {
  describe('ChatBox.tsx (Task Item 4)', () => {
    it('does NOT render overlapping floating buttons on mobile viewports', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChatBox, {
          messages: [],
          onSendMessage: () => {},
          isOpen: false,
          onToggleOpen: () => {}
        })
      );

      // Must NOT be fixed bottom-3 on mobile (which covered action buttons / hand cards)
      expect(html).not.toContain('fixed bottom-3 right-3');
      // Must NOT be fixed top-11 right-2 on mobile (which covered opponent seats / header)
      expect(html).not.toContain('fixed top-11 right-2');
    });

    it('renders a dedicated close button (X), quick emotes, and backdrop when open', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChatBox, {
          messages: [{ id: '1', senderId: 'u1', senderName: 'Alice', text: 'Hi', timestamp: Date.now(), isSystem: false }],
          onSendMessage: () => {},
          isOpen: true,
          onToggleOpen: () => {}
        })
      );

      expect(html).toContain('Tutup Chat');
      expect(html).toContain('Obrolan Meja (1)');
      expect(html).toContain('Banting! 💥');
      expect(html).toContain('animate-slide-up');
      expect(html).toContain('landscape:w-80');
      expect(html).toContain('landscape:max-h-[70vh]');
      expect(html).toContain('landscape:h-32');
      // 16px text-base on mobile prevents iOS Safari forced viewport zooming
      expect(html).toContain('text-base sm:text-xs');
      // Respects mobile device safe-area-inset-bottom
      expect(html).toContain('pb-[max(0.625rem,env(safe-area-inset-bottom,0px))]');
    });

    it('produces 0 DOM footprint when closed with default showFloatingTrigger=false (clean table)', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChatBox, {
          messages: [],
          onSendMessage: () => {},
          isOpen: false,
          onToggleOpen: () => {}
        })
      );
      expect(html).toBe('');
    });

    it('renders desktop-only trigger when showFloatingTrigger=true', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChatBox, {
          messages: [{ id: '1', senderId: 'u1', senderName: 'Alice', text: 'Hi', timestamp: Date.now(), isSystem: false }],
          onSendMessage: () => {},
          isOpen: false,
          onToggleOpen: () => {},
          showFloatingTrigger: true
        })
      );
      expect(html).toContain('hidden sm:flex');
      expect(html).toContain('Obrolan (1)');
      expect(html).not.toContain('fixed top-11 right-2');
    });
  });

  describe('ActionPanel.tsx & Hand Cards (Task Item 3)', () => {
    const sampleHand: Card[] = [
      { id: 'c1', suit: 'S', rank: 3, rankLabel: '3', suitSymbol: '♠', suitName: 'Waru', suitValue: 1, color: 'black', isThreeSpades: true, isPoker: false, isAce: false },
      { id: 'c2', suit: 'H', rank: 4, rankLabel: '4', suitSymbol: '♥', suitName: 'Hati', suitValue: 4, color: 'red', isThreeSpades: false, isPoker: false, isAce: false },
      { id: 'c3', suit: 'D', rank: 5, rankLabel: '5', suitSymbol: '♦', suitName: 'Wajik', suitValue: 3, color: 'red', isThreeSpades: false, isPoker: false, isAce: false }
    ];

    it('isolates hand cards stacking context and provides top headroom for selected card translation', () => {
      const html = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: sampleHand,
          selectedCardIds: ['c1'],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: true,
          lastPlay: null,
          isFirstTurnOfGame: false
        })
      );

      // Must have headroom (pt-6 or pt-7) so translateY(-22px) does not clip
      expect(html).toContain('pt-6');
      // Must have isolate to prevent card z-index leak onto siblings
      expect(html).toContain('isolate');
      // Hand container must have lower z-index than action bar
      expect(html).toContain('z-10');
    });

    it('gives the action buttons a dedicated row with higher z-index and shrink-0', () => {
      const html = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: sampleHand,
          selectedCardIds: [],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: false,
          lastPlay: null,
          isFirstTurnOfGame: false
        })
      );

      // Dedicated bar with z-30, shrink-0, backdrop-blur, safe area inset and border
      expect(html).toContain('z-30 max-w-4xl shrink-0');
      expect(html).toContain('border-t border-slate-700/60');
      expect(html).toContain('pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]');
      // Buttons must be present
      expect(html).toContain('Lewat');
      expect(html).toContain('Keluarkan');
      // Compact mobile labels to prevent horizontal overflow on 360px screens
      expect(html).toContain('hidden xs:inline');
      expect(html).toContain('max-w-[80px] xs:max-w-[140px]');
    });

    it('adapts negative card overlap dynamically for large hands (>8 cards) so cards fit on mobile', () => {
      const largeHand: Card[] = Array.from({ length: 12 }).map((_, i) => ({
        id: `c_${i}`,
        suit: 'S',
        rank: 4 + (i % 8),
        rankLabel: `${4 + (i % 8)}`,
        suitSymbol: '♠',
        suitName: 'Waru',
        suitValue: 1,
        color: 'black',
        isThreeSpades: false,
        isPoker: false,
        isAce: false
      }));

      const html = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: largeHand,
          selectedCardIds: [],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: true,
          lastPlay: null,
          isFirstTurnOfGame: false
        })
      );

      // Must use adaptive tighter overlap for >8 cards
      expect(html).toContain('-space-x-5 xs:-space-x-4 sm:-space-x-4');
    });

    it('hides duplicate full-width AFK banner on mobile to save vertical breathing room', () => {
      const html = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: sampleHand,
          selectedCardIds: [],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: false,
          lastPlay: null,
          isFirstTurnOfGame: false,
          player: {
            id: 'me',
            name: 'Me',
            avatar: '🐱',
            isBot: false,
            cardCount: 3,
            hand: sampleHand,
            connected: true,
            isHost: true,
            seatIndex: 0,
            score: 0,
            isAutoPlay: true,
            passed: false
          }
        })
      );

      // In ActionPanel, duplicate AFK banner is desktop-only (hidden sm:flex)
      expect(html).toContain('hidden sm:flex w-full max-w-xl');
    });
  });

  describe('PlayerSeat.tsx (Task Items 1 & 2)', () => {
    const mockPlayer: Player = {
      id: 'p1',
      name: 'SuperLongPlayerName',
      avatar: '🐶',
      isBot: false,
      cardCount: 5,
      hand: [],
      passed: false,
      connected: true,
      isHost: false,
      seatIndex: 1,
      score: 10
    };

    it('applies compact bounds for side seats (left & right) to avoid felt table / screen border overlap', () => {
      const htmlLeft = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: mockPlayer,
          isCurrentTurn: false,
          position: 'left'
        })
      );

      // Side seat width container should be compact (max-w-[48px] xs:max-w-[58px])
      expect(htmlLeft).toContain('max-w-[48px]');
      expect(htmlLeft).toContain('truncate');

      const htmlRight = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: mockPlayer,
          isCurrentTurn: false,
          position: 'right'
        })
      );
      expect(htmlRight).toContain('max-w-[48px]');
    });

    it('renders wider bounds for top seat while keeping safe spacing', () => {
      const htmlTop = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: mockPlayer,
          isCurrentTurn: true,
          position: 'top'
        })
      );

      expect(htmlTop).toContain('max-w-[65px]');
    });

    it('omits cluttering ON badge for active opponents but displays it for self', () => {
      const opponentHtml = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: mockPlayer,
          isCurrentTurn: false,
          position: 'left',
          isGamePlaying: true,
          isSelf: false
        })
      );
      // Opponents should not have "Pemain Aktif (Manual)" ON pill
      expect(opponentHtml).not.toContain('title="Pemain Aktif (Manual)"');

      const selfHtml = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: mockPlayer,
          isCurrentTurn: false,
          position: 'bottom',
          isGamePlaying: true,
          isSelf: true
        })
      );
      // Self should have the manual ON status indicator
      expect(selfHtml).toContain('title="Pemain Aktif (Manual)"');
    });
  });

  describe('CenterTable.tsx (Task Item 2)', () => {
    it('uses responsive tighter spacing for played cards to fit inside felt table', () => {
      const playedTrick = {
        combo: {
          type: 'FULL_HOUSE' as any,
          cards: [
            { id: '1', rank: 10, suit: 'S', rankLabel: '10', suitSymbol: '♠', suitName: 'Waru', suitValue: 1, color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
            { id: '2', rank: 10, suit: 'H', rankLabel: '10', suitSymbol: '♥', suitName: 'Hati', suitValue: 4, color: 'red', isPoker: false, isAce: false, isThreeSpades: false },
            { id: '3', rank: 10, suit: 'D', rankLabel: '10', suitSymbol: '♦', suitName: 'Wajik', suitValue: 3, color: 'red', isPoker: false, isAce: false, isThreeSpades: false },
            { id: '4', rank: 7, suit: 'C', rankLabel: '7', suitSymbol: '♣', suitName: 'Keriting', suitValue: 2, color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
            { id: '5', rank: 7, suit: 'D', rankLabel: '7', suitSymbol: '♦', suitName: 'Wajik', suitValue: 3, color: 'red', isPoker: false, isAce: false, isThreeSpades: false }
          ] as Card[],
          mainRank: 10,
          highestSuitValue: 4,
          description: 'Full House 10'
        },
        playerId: 'p2',
        playerName: 'Opponent',
        timestamp: 123456
      };

      const html = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: playedTrick,
          isFirstTurnOfGame: false,
          playedFrom: 'left'
        })
      );

      // Check responsive card overlap
      expect(html).toContain('-space-x-5 xs:-space-x-4 sm:-space-x-6');
      expect(html).toContain('Full House 10');
      expect(html).toContain('truncate');
    });

    it('uses flexible min-w bounds for dealing and empty table to prevent mobile overflow', () => {
      const htmlDealing = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: false,
          isDealing: true
        })
      );
      expect(htmlDealing).toContain('min-w-[170px] xs:min-w-[200px] sm:min-w-[240px]');
      expect(htmlDealing).toContain('max-w-full');

      const htmlEmpty = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: false,
          isDealing: false
        })
      );
      expect(htmlEmpty).toContain('min-w-[170px] xs:min-w-[200px] sm:min-w-[240px]');
    });

    it('renders animated 4 rank-3 cards when isDiscardingThrees is true at round start', () => {
      const htmlDiscarding = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          leadPlayerName: 'Juara 3'
        })
      );

      // Verify all 4 suit symbols are rendered
      expect(htmlDiscarding).toContain('♠');
      expect(htmlDiscarding).toContain('♣');
      expect(htmlDiscarding).toContain('♦');
      expect(htmlDiscarding).toContain('♥');

      // Verify animations are applied
      expect(htmlDiscarding).toContain('animate-discard-3-s');
      expect(htmlDiscarding).toContain('animate-discard-3-c');
      expect(htmlDiscarding).toContain('animate-discard-3-d');
      expect(htmlDiscarding).toContain('animate-discard-3-h');
      expect(htmlDiscarding).toContain('animate-discard-flame');

      // Verify descriptive Indonesian badge & text
      expect(htmlDiscarding).toContain('Pembuangan 4 Kartu Angka 3');
      expect(htmlDiscarding).toContain('Juara 3');
    });

    it('renders opening discard pile preview on clean table before first move is made', () => {
      const htmlOpening = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: false,
          leadPlayerName: 'StarterPlayer'
        })
      );

      expect(htmlOpening).toContain('Langkah Pembuka Permainan');
      expect(htmlOpening).toContain('StarterPlayer');
      expect(htmlOpening).toContain('Semua angka 3 telah dibuang!');
      // Verify preview cards with all 4 suits are present
      expect(htmlOpening).toContain('♠');
      expect(htmlOpening).toContain('♣');
      expect(htmlOpening).toContain('♦');
      expect(htmlOpening).toContain('♥');
    });
  });

  describe('BooingBanner.tsx (Task Item 5)', () => {
    it('separates outer fixed centering from inner animation to prevent transform overrides', () => {
      const html = renderToStaticMarkup(
        React.createElement(BooingBanner, {
          loserNames: ['LoserBot'],
          isSelfLoser: false,
          onDismiss: () => {}
        })
      );

      // Outer wrapper has left-1/2 -translate-x-1/2 z-45 without animate-boo-banner
      expect(html).toContain('fixed top-10 sm:top-16 left-1/2 -translate-x-1/2 z-45');
      // Inner div has animate-boo-banner
      expect(html).toContain('animate-boo-banner');
      expect(html).toContain('HUUUUUU!');
    });
  });

  describe('PokerTable.tsx Header & Spacing (Task Items 1, 2, 5)', () => {
    const mockGameState: GameState = {
      roomId: 'TEST_RM',
      roomName: 'Meja Uji Coba',
      status: 'playing',
      players: [
        { id: 'me', name: 'Me', avatar: '🐱', isBot: false, cardCount: 5, hand: [{ id: 'c1', rank: 4, suit: 'S', rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', suitValue: 1, color: 'black', isPoker: false, isAce: false, isThreeSpades: false }], connected: true, isHost: true, seatIndex: 0, score: 0, isAutoPlay: false, passed: false },
        { id: 'opp1', name: 'TopPlayer', avatar: '🦁', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 1, score: 0, isAutoPlay: false, passed: false },
        { id: 'opp2', name: 'LeftPlayer', avatar: '🐼', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 2, score: 0, isAutoPlay: false, passed: false },
        { id: 'opp3', name: 'RightPlayer', avatar: '🦊', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 3, score: 0, isAutoPlay: false, passed: false }
      ],
      currentTurnPlayerId: 'me',
      turnTimerMax: 15,
      turnTimeRemaining: 15,
      lastPlay: null,
      trickHistory: [],
      roundNumber: 1,
      isFirstTurnOfGame: false,
      leadPlayerId: null,
      winnerId: null,
      results: null,
      consecutivePasses: 0,
      finishers: [],
      fillWithBots: true,
      maxPlayers: 4,
      rules: {
        ...POKER_JAWA_RULES,
        deckCount: 1,
        allowHints: true
      }
    };

    it('renders header with shrink-0 and top seats with safe clearance pt-1.5 sm:pt-2.5', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const html = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: mockGameState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {}
        })
      );

      // Header must have shrink-0 and safe-area top inset
      expect(html).toContain('shrink-0 z-20');
      expect(html).toContain('pt-[max(0.375rem,env(safe-area-inset-top,0px))]');
      // Root container must have safe-area bottom inset
      expect(html).toContain('pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]');
      // Room name has expanded bounds to prevent premature mobile truncation
      expect(html).toContain('max-w-[95px] xs:max-w-[140px]');
      // Top seats must have safe clearance pt-2.5 sm:pt-3.5
      expect(html).toContain('pt-2.5 sm:pt-3.5');
      // Center felt table container must have min-w-0
      expect(html).toContain('min-w-0 max-w-full');
      // Header does not clutter mobile screen with redundant in-game hint toggle
      expect(html).not.toContain('Bantuan Saran: Aktif');
      // Center table eliminates redundant dark nested tray for spacious felt look
      expect(html).not.toContain('bg-slate-950/40 border border-amber-500/30');
    });

    it('renders a non-bouncing AFK toast pill safely below top seats and clear of chat button', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const afkState: GameState = {
        ...mockGameState,
        players: mockGameState.players.map(p => p.id === 'me' ? { ...p, isAutoPlay: true } : p)
      };

      const html = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: afkState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {}
        })
      );

      // Must NOT have animate-bounce which breaks transform centering and covers header
      expect(html).not.toContain('animate-bounce cursor-pointer active:scale-98');
      expect(html).toContain('fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-35');
      expect(html).toContain('Mode Bot Aktif (AFK)');
    });

    it('suppresses BooingBanner when isGameOverModalOpen is true to prevent button occlusion', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const gameOverState: GameState = {
        ...mockGameState,
        status: 'game_over',
        hasPokerBooing: true,
        pokerLoserNames: ['LeftPlayer']
      };

      const htmlWithModalOpen = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: gameOverState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {},
          isGameOverModalOpen: true
        })
      );

      // BooingBanner should be hidden so it does not occlude GameOverModal's action buttons
      expect(htmlWithModalOpen).not.toContain('Soraki Huuuuuu Lagi!');
    });

    it('integrates the Chat button cleanly into the top header without overlapping seats or controls', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const html = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: mockGameState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {},
          onToggleChat: () => {},
          isChatOpen: false,
          unreadChatCount: 2
        })
      );

      // Must have chat button in header
      expect(html).toContain('title="Obrolan Meja"');
      expect(html).toContain('Obrolan');
      expect(html).toContain('>2<');
    });

    it('handles 2-player and 6-player layouts without breaking layout bounds', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      // 2 players: 1 opponent at top
      const twoPlayerState: GameState = {
        ...mockGameState,
        players: [mockGameState.players[0], mockGameState.players[1]]
      };
      const html2P = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: twoPlayerState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {}
        })
      );
      expect(html2P).toContain('TopPlayer');
      expect(html2P).toContain('pt-2.5 sm:pt-3.5');

      // 6 players: isCompact = true
      const sixPlayerState: GameState = {
        ...mockGameState,
        players: [
          ...mockGameState.players,
          { id: 'p5', name: 'Bot5', avatar: '🐱', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 4, score: 0, isAutoPlay: false, passed: false },
          { id: 'p6', name: 'Bot6', avatar: '🐭', isBot: true, cardCount: 6, hand: [], connected: true, isHost: false, seatIndex: 5, score: 0, isAutoPlay: false, passed: false }
        ]
      };
      const html6P = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: sixPlayerState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {}
        })
      );
      expect(html6P).toContain('w-11 xs:w-13 sm:w-20');
    });
  });

  describe('GameOverModal.tsx (Task: Prevent Trophy Clipping & Clean Modal Layout)', () => {
    const mockResults: GameResult[] = [
      {
        playerId: 'p1',
        playerName: 'Juara Utama',
        avatar: '👑',
        isBot: false,
        rank: 1,
        remainingCards: 0,
        scoreDelta: 30,
        isWinner: true,
        caughtHoldingPoker: false
      },
      {
        playerId: 'p2',
        playerName: 'Pemain Dua',
        avatar: '🦊',
        isBot: true,
        rank: 2,
        remainingCards: 3,
        scoreDelta: 10,
        isWinner: false,
        caughtHoldingPoker: false
      },
      {
        playerId: 'p3',
        playerName: 'Pemain Kena Poker',
        avatar: '🤖',
        isBot: true,
        rank: 3,
        remainingCards: 1,
        scoreDelta: -2,
        isWinner: false,
        caughtHoldingPoker: true,
        pokerCardsCount: 1
      }
    ];

    it('does NOT apply negative margin on the trophy badge to prevent top edge clipping', () => {
      const html = renderToStaticMarkup(
        React.createElement(GameOverModal, {
          results: mockResults,
          winnerId: 'p1',
          isHost: true,
          onPlayAgain: () => {},
          onLeaveRoom: () => {}
        })
      );

      // Must NOT use -mt-10 or -mt-14 which causes the trophy circle to be cut in half by overflow-y-auto
      expect(html).not.toContain('-mt-10');
      expect(html).not.toContain('-mt-14');

      // Outer backdrop should have overflow-y-auto so dialog never overflows screen
      expect(html).toContain('fixed inset-0 z-50 flex items-center justify-center');
      expect(html).toContain('overflow-y-auto');

      // Trophy and modal elements are present
      expect(html).toContain('Permainan Berakhir!');
      expect(html).toContain('Juara Utama');
      expect(html).toContain('Main Lagi');
      expect(html).toContain('Lobi');
    });

    it('renders Booing Banner inside modal when players were caught holding poker cards', () => {
      const html = renderToStaticMarkup(
        React.createElement(GameOverModal, {
          results: mockResults,
          winnerId: 'p1',
          isHost: false,
          onPlayAgain: () => {},
          onLeaveRoom: () => {}
        })
      );

      expect(html).toContain('HUUUUUU! KENA BOOING!');
      expect(html).toContain('Pemain Kena Poker');
      expect(html).toContain('Kartu Poker (2)');
      expect(html).toContain('Soraki Huuuuuu Lagi!');
    });

    it('renders accurate winner subtitle when winner won due to instant loss while still holding cards', () => {
      const instantWinResults: GameResult[] = [
        {
          playerId: 'p1',
          playerName: 'Juara Tanpa Habis Kartu',
          avatar: '👑',
          isBot: false,
          rank: 1,
          remainingCards: 5,
          scoreDelta: 30,
          isWinner: true,
          caughtHoldingPoker: false
        },
        {
          playerId: 'p2',
          playerName: 'Pemain Kena Poker',
          avatar: '🤖',
          isBot: true,
          rank: 2,
          remainingCards: 1,
          scoreDelta: -2,
          isWinner: false,
          caughtHoldingPoker: true
        }
      ];

      const html = renderToStaticMarkup(
        React.createElement(GameOverModal, {
          results: instantWinResults,
          winnerId: 'p1',
          isHost: true,
          onPlayAgain: () => {},
          onLeaveRoom: () => {}
        })
      );

      // Must NOT say "berhasil menghabiskan seluruh kartu" because winner still has 5 cards
      expect(html).not.toContain('berhasil menghabiskan seluruh kartu');
      // Should say "keluar sebagai pemenang pertandingan"
      expect(html).toContain('keluar sebagai pemenang pertandingan!');
      expect(html).toContain('Juara Tanpa Habis Kartu');
    });

    it('returns null when results is null', () => {
      const html = renderToStaticMarkup(
        React.createElement(GameOverModal, {
          results: null,
          winnerId: null,
          isHost: false,
          onPlayAgain: () => {},
          onLeaveRoom: () => {}
        })
      );

      expect(html).toBe('');
    });
  });

  describe('ActionPanel.tsx Poker Instant Loss Warning', () => {
    it('displays warning badge and red button style when a player selects card 2 to empty hand', () => {
      const pokerCard = {
        id: '2S',
        rank: 15,
        suit: 'S' as const,
        suitValue: 1,
        rankLabel: '2',
        suitSymbol: '♠',
        suitName: 'Waru',
        color: 'black' as const,
        isPoker: true,
        isAce: false,
        isThreeSpades: false
      };

      const html = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: [pokerCard],
          selectedCardIds: ['2S'],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: true,
          lastPlay: null,
          isFirstTurnOfGame: false,
          rules: { holdingPokerAsLastCardLoses: true } as any
        })
      );

      expect(html).toContain('Keluarkan (⚠️ Kalah Instan!)');
      expect(html).toContain('from-red-600 to-rose-700');
    });
  });

  describe('CenterTable.tsx Intro vs Active Play Priority', () => {
    it('immediately renders played trick even if isDiscardingThrees flag is still active', () => {
      const mockTrick = {
        cards: [{ id: '8S', rank: 8, suit: 'S' as const, suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black' as const, isPoker: false, isAce: false, isThreeSpades: false }],
        playerId: 'p1',
        playerName: 'FastStarter',
        combo: { type: 'SINGLE' as const, mainRank: 8, highestSuitValue: 1, description: 'Satuan 8♠', cards: [{ id: '8S', rank: 8, suit: 'S' as const, suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black' as const, isPoker: false, isAce: false, isThreeSpades: false }] },
        timestamp: Date.now()
      };

      const html = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: mockTrick,
          isFirstTurnOfGame: false,
          isDiscardingThrees: true,
          leadPlayerName: 'FastStarter'
        })
      );

      // Should show the played trick cards and FastStarter name, NOT the discard 3 banner
      expect(html).toContain('FastStarter');
      expect(html).toContain('Satuan 8♠');
      expect(html).not.toContain('Pembuangan 4 Kartu Angka 3');
    });
  });

  describe('PokerTable.tsx Non-Gepeng Casino Table Dimensions', () => {
    it('provides generous vertical height for authentic oval card table without squishing on landscape', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const html = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: sharedMockGameState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {}
        })
      );

      // Must have spacious vertical height classes
      expect(html).toContain('min-h-[130px] xs:min-h-[150px] sm:min-h-[220px] md:min-h-[280px]');
      expect(html).toContain('max-h-[220px] xs:max-h-[260px] sm:max-h-[360px] md:max-h-[420px]');
      // Must NOT contain landscape squishing caps that break desktop viewports
      expect(html).not.toContain('landscape:max-h-[135px]');
      expect(html).not.toContain('landscape:min-h-[75px]');
      // Rounded casino border curvature
      expect(html).toContain('rounded-[18px] sm:rounded-[34px] md:rounded-[46px]');
    });
  });

  describe('Sequential Discard 3 Animation Flow', () => {
    const mockThreeS = { id: '3S', rank: 3, suit: 'S' as const, suitValue: 1, rankLabel: '3', suitSymbol: '♠', suitName: 'Waru', color: 'black' as const, isPoker: false, isAce: false, isThreeSpades: true };
    const mockThreeC = { id: '3C', rank: 3, suit: 'C' as const, suitValue: 2, rankLabel: '3', suitSymbol: '♣', suitName: 'Keriting', color: 'black' as const, isPoker: false, isAce: false, isThreeSpades: false };

    it('displays collection message and no center cards at discardStep 0', () => {
      const html = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          discardStep: 0,
          leadPlayerName: 'Juara 3'
        })
      );

      expect(html).toContain('Mengumpulkan kartu angka 3 dari pemain...');
      expect(html).toContain('Pemeriksaan Kartu Angka 3');
      expect(html).not.toContain('animate-discard-3-s');
    });

    it('renders cards accumulating sequentially from step 1 through step 4', () => {
      // Step 1: 1 card
      const htmlStep1 = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          discardStep: 1,
          leadPlayerName: 'Juara 3'
        })
      );
      expect(htmlStep1).toContain('1 dari 4 Kartu 3 Dibuang');
      expect(htmlStep1).toContain('animate-discard-3-c');
      expect(htmlStep1).not.toContain('animate-discard-3-s');

      // Step 2: 2 cards
      const htmlStep2 = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          discardStep: 2,
          leadPlayerName: 'Juara 3'
        })
      );
      expect(htmlStep2).toContain('2 dari 4 Kartu 3 Dibuang');
      expect(htmlStep2).toContain('animate-discard-3-c');
      expect(htmlStep2).toContain('animate-discard-3-d');
      expect(htmlStep2).not.toContain('animate-discard-3-s');

      // Step 3: 3 cards
      const htmlStep3 = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          discardStep: 3,
          leadPlayerName: 'Juara 3'
        })
      );
      expect(htmlStep3).toContain('3 dari 4 Kartu 3 Dibuang');
      expect(htmlStep3).toContain('animate-discard-3-h');
      expect(htmlStep3).not.toContain('animate-discard-3-s');

      // Step 4: all 4 cards complete
      const htmlStep4 = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          discardStep: 4,
          leadPlayerName: 'Juara 3'
        })
      );
      expect(htmlStep4).toContain('Pembuangan 4 Kartu Angka 3');
      expect(htmlStep4).toContain('animate-discard-3-s');
      expect(htmlStep4).toContain('animate-discard-flame');
      expect(htmlStep4).toContain('Juara 3');
    });

    it('renders held rank-3 card at PlayerSeat and applies directional departure animation', async () => {
      const { PlayerSeat } = await import('../src/client/src/components/PlayerSeat.js');

      // Holding phase (step 0)
      const htmlHolding = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: sharedMockGameState.players[1],
          isCurrentTurn: false,
          position: 'top',
          heldThreeCard: mockThreeC,
          isDiscardingThree: false,
          hasDiscardedThree: false
        })
      );
      expect(htmlHolding).toContain('animate-badge-pop');
      expect(htmlHolding).toContain('♣');

      // Discarding departure phase from top seat
      const htmlDiscardingTop = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: sharedMockGameState.players[1],
          isCurrentTurn: false,
          position: 'top',
          heldThreeCard: mockThreeC,
          isDiscardingThree: true,
          hasDiscardedThree: false
        })
      );
      expect(htmlDiscardingTop).toContain('animate-seat-discard-top');

      // Left seat departure
      const htmlDiscardingLeft = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: sharedMockGameState.players[2],
          isCurrentTurn: false,
          position: 'left',
          heldThreeCard: mockThreeC,
          isDiscardingThree: true,
          hasDiscardedThree: false
        })
      );
      expect(htmlDiscardingLeft).toContain('animate-seat-discard-left');

      // Right seat departure with 3♠ highlight
      const htmlDiscardingRight = renderToStaticMarkup(
        React.createElement(PlayerSeat, {
          player: sharedMockGameState.players[3],
          isCurrentTurn: false,
          position: 'right',
          heldThreeCard: mockThreeS,
          isDiscardingThree: true,
          hasDiscardedThree: false
        })
      );
      expect(htmlDiscardingRight).toContain('animate-seat-discard-right');
      expect(htmlDiscardingRight).toContain('ring-2 ring-amber-400');
    });

    it('verifies CSS definitions for seat discard animations in index.css', async () => {
      const fs = await import('fs');
      const css = fs.readFileSync('src/client/src/index.css', 'utf-8');

      expect(css).toContain('@keyframes seatDiscardTop');
      expect(css).toContain('@keyframes seatDiscardBottom');
      expect(css).toContain('@keyframes seatDiscardLeft');
      expect(css).toContain('@keyframes seatDiscardRight');
      expect(css).toContain('.animate-seat-discard-top');
      expect(css).toContain('.animate-seat-discard-bottom');
      expect(css).toContain('.animate-seat-discard-left');
      expect(css).toContain('.animate-seat-discard-right');
    });

    it('verifies non-gepeng oval table styles and directional arrival animations in index.css', async () => {
      const fs = await import('fs');
      const css = fs.readFileSync('src/client/src/index.css', 'utf-8');

      // Table width constraints to keep authentic oval casino aspect ratio (approx 2.1:1 - 2.3:1)
      expect(css).toContain('max-width: min(50vw, 360px) !important;');
      expect(css).toContain('min-height: 145px !important;');
      expect(css).toContain('max-height: 185px !important;');
      expect(css).toContain('border-radius: 76px !important;');
      expect(css).toContain('border-radius: 72px !important;');

      // Directional arrival animations
      expect(css).toContain('.animate-discard-from-top');
      expect(css).toContain('.animate-discard-from-bottom');
      expect(css).toContain('.animate-discard-from-left');
      expect(css).toContain('.animate-discard-from-right');
    });

    it('renders custom discardItems with directional seat arrival classes and player announcements', async () => {
      const customItems = [
        { card: mockThreeC, playerName: 'Pemain Kiri', fromPosition: 'left' as const, order: 0 },
        { card: { ...mockThreeC, id: '3D', suit: 'D' as const, rankLabel: '3', suitSymbol: '♦', color: 'red' as const }, playerName: 'Pemain Atas', fromPosition: 'top' as const, order: 1 },
        { card: { ...mockThreeC, id: '3H', suit: 'H' as const, rankLabel: '3', suitSymbol: '♥', color: 'red' as const }, playerName: 'Pemain Kanan', fromPosition: 'right' as const, order: 2 },
        { card: mockThreeS, playerName: 'Pemain Bawah', fromPosition: 'bottom' as const, order: 3 }
      ];

      // Step 1: Card 1 from left
      const htmlStep1 = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          discardStep: 1,
          discardItems: customItems,
          leadPlayerName: 'Pemain Bawah'
        })
      );
      expect(htmlStep1).toContain('animate-discard-from-left');
      expect(htmlStep1).toContain('Pemain Kiri');
      expect(htmlStep1).toContain('membuang');

      // Step 4: Card 4 from bottom with 3♠ lead announcement
      const htmlStep4 = renderToStaticMarkup(
        React.createElement(CenterTable, {
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDealing: false,
          isDiscardingThrees: true,
          discardStep: 4,
          discardItems: customItems,
          leadPlayerName: 'Pemain Bawah'
        })
      );
      expect(htmlStep4).toContain('animate-discard-from-bottom');
      expect(htmlStep4).toContain('Pemain Bawah');
      expect(htmlStep4).toContain('memegang');
      expect(htmlStep4).toContain('3♠');
    });

    it('renders ActionPanel myHeldThree card spotlight and disables play button during discard intro', async () => {
      const { ActionPanel } = await import('../src/client/src/components/ActionPanel.js');
      const htmlActionPanel = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: [{ id: '4S', rank: 4, suit: 'S', suitValue: 1, rankLabel: '4', suitSymbol: '♠', suitName: 'Waru', color: 'black', isPoker: false, isAce: false, isThreeSpades: false }],
          selectedCardIds: ['4S'],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: true,
          lastPlay: null,
          isFirstTurnOfGame: true,
          isDiscardingThrees: true,
          myHeldThree: {
            card: mockThreeS,
            isDiscarding: false,
            hasDiscarded: false
          }
        })
      );

      // Must render rank 3 spotlight for self
      expect(htmlActionPanel).toContain('Anda Memegang 3♠');
      expect(htmlActionPanel).toContain('Membuang Kartu 3...');
      expect(htmlActionPanel).toContain('disabled');
    });

    it('PlayingCard renders compact font size for size="xs" without overflowing', () => {
      const htmlXs = renderToStaticMarkup(
        React.createElement(PlayingCard, {
          card: mockThreeS,
          size: 'xs',
          disabled: true
        })
      );
      expect(htmlXs).toContain('text-xs');
      expect(htmlXs).not.toContain('text-3xl');
    });
  });

  describe('Mobile Ergonomics, Safe Area & Touch Target Hardening', () => {
    it('verifies index.html has viewport-fit=cover and dynamic 100dvh overscroll-y-none', async () => {
      const fs = await import('fs');
      const htmlContent = fs.readFileSync('src/client/index.html', 'utf-8');
      expect(htmlContent).toContain('viewport-fit=cover');
      expect(htmlContent).toContain('h-[100dvh]');
      expect(htmlContent).toContain('overscroll-y-none');
    });

    it('verifies index.css contains dynamic 100dvh, overscroll-behavior-y none, and safe-area variables', async () => {
      const fs = await import('fs');
      const cssContent = fs.readFileSync('src/client/src/index.css', 'utf-8');
      expect(cssContent).toContain('height: 100dvh;');
      expect(cssContent).toContain('overscroll-behavior-y: none;');
      expect(cssContent).toContain('--sat: env(safe-area-inset-top, 0px);');
      expect(cssContent).toContain('--sab: env(safe-area-inset-bottom, 0px);');
      expect(cssContent).toContain('--sal: env(safe-area-inset-left, 0px);');
      expect(cssContent).toContain('--sar: env(safe-area-inset-right, 0px);');
    });

    it('PokerTable header renders all buttons with min 44px touch hit-box and safe area padding', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const html = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: sharedMockGameState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {},
          onToggleChat: () => {},
          isChatOpen: false,
          unreadChatCount: 1
        })
      );

      // Root safe area & 100dvh
      expect(html).toContain('h-[100dvh]');
      expect(html).toContain('overscroll-y-none');
      expect(html).toContain('pl-[env(safe-area-inset-left,0px)]');
      expect(html).toContain('pr-[env(safe-area-inset-right,0px)]');

      // Header safe area left/right
      expect(html).toContain('pl-[max(0.375rem,env(safe-area-inset-left,0px))]');
      expect(html).toContain('pr-[max(0.375rem,env(safe-area-inset-right,0px))]');

      // All header buttons touch targets >= 44px
      expect(html).toContain('min-w-[44px] min-h-[44px]');
    });

    it('ActionPanel ensures cancel X button, combo chips, and action buttons are touch-friendly (>=44px standard, chips >=40px)', () => {
      const handWithPair: Card[] = [
        { id: 'c1', rank: 5, suit: 'S', rankLabel: '5', suitSymbol: '♠', suitName: 'Waru', suitValue: 1, color: 'black', isPoker: false, isAce: false, isThreeSpades: false },
        { id: 'c2', rank: 5, suit: 'H', rankLabel: '5', suitSymbol: '♥', suitName: 'Hati', suitValue: 4, color: 'red', isPoker: false, isAce: false, isThreeSpades: false }
      ];

      const html = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: handWithPair,
          selectedCardIds: ['c1'],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: true,
          lastPlay: null,
          isFirstTurnOfGame: false
        })
      );

      // Cancel X button touch target (>= 44px)
      expect(html).toContain('min-w-[44px] min-h-[44px]');

      // Combo chip touch target (>= 40px)
      expect(html).toContain('min-h-[40px]');

      // Action buttons (Pass, Play, Sort) touch target (>= 44px)
      expect(html).toContain('min-h-[44px]');

      // Auto-scaling text on play button
      expect(html).toContain('text-[11px] xs:text-xs sm:text-sm');

      // Card swipe touch-manipulation and data-card-id
      expect(html).toContain('data-card-id="c1"');
      expect(html).toContain('touch-manipulation');

      // Dynamic spacing: 2 cards in hand uses non-overlapping space-x
      expect(html).toContain('space-x-1.5');
    });

    it('ChatBox provides touch-friendly close, input, send and emotes with visualViewport readiness', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChatBox, {
          messages: [{ id: '1', senderId: 'u1', senderName: 'Tester', text: 'Semangat!', timestamp: Date.now(), isSystem: false }],
          onSendMessage: () => {},
          isOpen: true,
          onToggleOpen: () => {}
        })
      );

      // Close button touch target >= 44px
      expect(html).toContain('min-w-[44px] min-h-[44px]');
      // Quick emotes touch target >= 40px
      expect(html).toContain('min-h-[40px]');
      // Input touch target >= 44px
      expect(html).toContain('min-h-[44px]');
      // Landscape bottom-anchoring
      expect(html).toContain('landscape:items-end');
    });

    it('verifies dynamic hand spacing: large hands overlap smoothly while small hands expand', () => {
      const largeHand: Card[] = Array.from({ length: 13 }, (_, i) => ({
        id: `c_${i}`,
        rank: (i % 13) + 3,
        suit: 'S',
        rankLabel: `${(i % 13) + 3}`,
        suitSymbol: '♠',
        suitName: 'Waru',
        suitValue: 1,
        color: 'black',
        isPoker: false,
        isAce: false,
        isThreeSpades: false
      }));

      const html = renderToStaticMarkup(
        React.createElement(ActionPanel, {
          hand: largeHand,
          selectedCardIds: [],
          onToggleCard: () => {},
          onSelectCards: () => {},
          onClearSelection: () => {},
          onPlaySelected: () => {},
          onPass: () => {},
          onSortToggle: () => {},
          sortMode: 'rank',
          isMyTurn: true,
          lastPlay: null,
          isFirstTurnOfGame: false
        })
      );

      // Hand with 13 cards uses negative spacing
      expect(html).toContain('-space-x-5');
    });

    it('PokerTable copy code button has minimum 44px touch hit-box', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const html = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: sharedMockGameState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {},
          onToggleChat: () => {},
          isChatOpen: false,
          unreadChatCount: 0
        })
      );

      // Copy room code button >= 44px
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('TEST_RM');
    });

    it('verifies App.tsx wraps Lobby in an overflow-y-auto safe-area-full container', async () => {
      const fs = await import('fs');
      const appContent = fs.readFileSync('src/client/src/App.tsx', 'utf-8');
      expect(appContent).toContain('w-full flex-1 overflow-y-auto safe-area-full');
    });

    it('renders BongExplosionBanner with explosive header and tongkrongan text', () => {
      const html = renderToStaticMarkup(
        React.createElement(BongExplosionBanner, {
          bongLossInfo: {
            victimPlayerId: 'p1',
            victimName: 'Budi',
            bomberPlayerId: 'p2',
            bomberName: 'Siti',
            bongType: 'BONG_FOUR',
            bongDescription: 'Bong 4 of a Kind (10)'
          },
          myPlayerId: 'p1',
          onDismiss: () => {}
        })
      );

      expect(html).toContain('KENA BONG!');
      expect(html).toContain('HUUUUU! KAMU KENA BONG!');
      expect(html).toContain('Langsung Modar / Kalah Telak!');
      expect(html).toContain('Budi');
      expect(html).toContain('Siti');
      expect(html).toContain('Bong 4 of a Kind (10)');
      expect(html).toContain('Ledakkan &amp; Soraki Huu Lagi!');
    });

    it('renders PokerTable with floating minimal header (height max 36px, transparent backdrop)', async () => {
      const { PokerTable } = await import('../src/client/src/components/PokerTable.js');
      const html = renderToStaticMarkup(
        React.createElement(PokerTable, {
          gameState: sharedMockGameState,
          myPlayerId: 'me',
          onPlayCards: () => {},
          onPassTurn: () => {},
          onStartGame: () => {},
          onLeaveRoom: () => {},
          onOpenRules: () => {},
          errorMessage: null,
          onClearError: () => {}
        })
      );

      // Minimal floating header
      expect(html).toContain('max-h-[36px] landscape:max-h-[34px]');
      expect(html).toContain('bg-transparent border-b-0');
    });
  });
});


