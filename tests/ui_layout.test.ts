import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatBox } from '../src/client/src/components/ChatBox.js';
import { ActionPanel } from '../src/client/src/components/ActionPanel.js';
import { PlayerSeat } from '../src/client/src/components/PlayerSeat.js';
import { CenterTable } from '../src/client/src/components/CenterTable.js';
import { BooingBanner } from '../src/client/src/components/BooingBanner.js';
import { GameOverModal } from '../src/client/src/components/GameOverModal.js';
import { Card, GameState, Player, POKER_JAWA_RULES, GameResult } from '../src/shared/types.js';

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
        combo: { type: 'SINGLE' as const, mainRank: 8, description: 'Satuan 8♠', cards: [{ id: '8S', rank: 8, suit: 'S' as const, suitValue: 1, rankLabel: '8', suitSymbol: '♠', suitName: 'Waru', color: 'black' as const, isPoker: false, isAce: false, isThreeSpades: false }] },
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
});


