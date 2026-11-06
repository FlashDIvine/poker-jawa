import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, ChatMessage, Card, GameRules, DEFAULT_RULES } from '@shared/types.js';
import { Lobby } from './components/Lobby.js';
import { PokerTable } from './components/PokerTable.js';
import { GameOverModal } from './components/GameOverModal.js';
import { RulesModal } from './components/RulesModal.js';
import { ChatBox } from './components/ChatBox.js';
import { RotateDevicePrompt } from './components/RotateDevicePrompt.js';
import { sounds } from './audio/soundEffects.js';

export const SERVER_URL = ((import.meta.env.VITE_SERVER_URL as string) || '').replace(/\/$/, '');

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerAvatar, setPlayerAvatar] = useState<string>('🤠');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastReadChatCount, setLastReadChatCount] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  const prevLastPlayRef = useRef<any>(null);
  const prevStatusRef = useRef<string>('waiting');
  const prevTurnPlayerRef = useRef<string | null>(null);
  const prevPassedMapRef = useRef<Record<string, boolean>>({});
  const playerIdRef = useRef<string>('');
  const selfJustPassedRef = useRef<boolean>(false);
  const prevAutoPlayRef = useRef<boolean>(false);
  const currentRoomIdRef = useRef<string | null>(null);

  // Initialize player identity from localStorage
  useEffect(() => {
    let savedId = localStorage.getItem('poker_remi_player_id');
    if (!savedId) {
      savedId = `p_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('poker_remi_player_id', savedId);
    }
    setPlayerId(savedId);
    playerIdRef.current = savedId;

    const savedName = localStorage.getItem('poker_remi_player_name');
    setPlayerName(savedName || `Pemain_${savedId.substring(2, 6)}`);

    const savedAvatar = localStorage.getItem('poker_remi_player_avatar');
    if (savedAvatar) setPlayerAvatar(savedAvatar);
  }, []);

  // Save profile updates
  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('poker_remi_player_name', name);
  };

  const handlePlayerAvatarChange = (avatar: string) => {
    setPlayerAvatar(avatar);
    localStorage.setItem('poker_remi_player_avatar', avatar);
  };

  // Setup Socket.IO connection
  useEffect(() => {
    const newSocket = io(SERVER_URL || '/', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected with id:', newSocket.id);
      if (currentRoomIdRef.current && playerIdRef.current) {
        newSocket.emit('join_room', {
          roomId: currentRoomIdRef.current,
          playerName: localStorage.getItem('poker_remi_player_name') || playerName,
          avatar: localStorage.getItem('poker_remi_player_avatar') || playerAvatar,
          playerId: playerIdRef.current
        });
      }
    });

    newSocket.on('joined_room', (data) => {
      console.log('[Socket] Joined room:', data);
    });

    newSocket.on('game_state', (state: GameState) => {
      // Audio trigger on dealing
      if (prevStatusRef.current !== 'playing' && state.status === 'playing') {
        sounds.playDeal();
      }

      // Audio trigger on game over
      if (prevStatusRef.current === 'playing' && state.status === 'game_over') {
        if (state.hasPokerBooing || state.results?.some(r => r.caughtHoldingPoker)) {
          sounds.playBooingSound();
          setTimeout(() => {
            sounds.playWinFanfare();
          }, 1500);
        } else {
          sounds.playWinFanfare();
        }
      }
      prevStatusRef.current = state.status;

      // Audio trigger on card plays
      if (state.lastPlay && state.lastPlay.timestamp !== prevLastPlayRef.current?.timestamp) {
        const combo = state.lastPlay.combo;
        if (combo.type === 'TRIS') {
          sounds.playTrisSound();
        } else if (
          combo.type === 'BONG_FOUR' ||
          combo.type === 'BONG_SF' ||
          combo.type === 'FULL_HOUSE' ||
          combo.cards.some((c: Card) => c.isPoker)
        ) {
          sounds.playBantingSlam();
        } else {
          sounds.playCardSnap();
        }
      }

      // Audio trigger on trick won / table sweep
      if (prevLastPlayRef.current && !state.lastPlay && state.status === 'playing') {
        sounds.playTrickWon();
      }
      prevLastPlayRef.current = state.lastPlay;

      // Audio trigger on player passing
      if (state.status === 'playing') {
        const myPid = playerIdRef.current;
        const newlyPassedOther = state.players.some(
          p => p.id !== myPid && p.passed && !prevPassedMapRef.current[p.id]
        );
        const newlyPassedSelf = state.players.some(
          p => p.id === myPid && p.passed && !prevPassedMapRef.current[p.id]
        );

        if (newlyPassedOther) {
          sounds.playPass();
        } else if (newlyPassedSelf && !selfJustPassedRef.current) {
          sounds.playPass();
        }
        selfJustPassedRef.current = false;

        const updatedMap: Record<string, boolean> = {};
        state.players.forEach(p => { if (p.passed) updatedMap[p.id] = true; });
        prevPassedMapRef.current = updatedMap;
      }

      // Audio trigger on turn changed to self
      const myPid = playerIdRef.current;
      if (
        state.status === 'playing' &&
        state.currentTurnPlayerId &&
        state.currentTurnPlayerId === myPid &&
        prevTurnPlayerRef.current !== myPid
      ) {
        sounds.playTurnAlert();
      }
      prevTurnPlayerRef.current = state.currentTurnPlayerId;

      // Audio trigger when human takes back control (isAutoPlay changes from true to false)
      const myPlayer = state.players.find(p => p.id === myPid);
      if (myPlayer) {
        if (prevAutoPlayRef.current && !myPlayer.isAutoPlay) {
          sounds.playResumeControl();
        }
        prevAutoPlayRef.current = Boolean(myPlayer.isAutoPlay);
      }

      setGameState(state);
      currentRoomIdRef.current = state?.roomId || null;
    });

    newSocket.on('control_resumed', () => {
      sounds.playResumeControl();
    });

    newSocket.on('turn_tick', ({ timeRemaining, playerId: currentPid }) => {
      if (currentPid === playerIdRef.current && timeRemaining <= 5 && timeRemaining > 0) {
        sounds.playTimerWarning();
      }
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          turnTimeRemaining: timeRemaining,
          currentTurnPlayerId: currentPid
        };
      });
    });

    newSocket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    newSocket.on('error_message', (err: string) => {
      sounds.playError();
      setErrorMessage(err);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Room Actions
  const handleCreateRoom = async (
    roomName: string,
    fillWithBots: boolean,
    turnTimerSeconds: number,
    maxPlayers: number = 4,
    rules: GameRules = DEFAULT_RULES
  ) => {
    if (!socket) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, fillWithBots, turnTimerSeconds, maxPlayers, rules })
      });
      if (res.ok) {
        const data = await res.json();
        socket.emit('join_room', {
          roomId: data.roomId,
          playerName,
          avatar: playerAvatar,
          playerId
        });
      }
    } catch (e) {
      console.error('Failed to create room:', e);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('join_room', {
      roomId,
      playerName,
      avatar: playerAvatar,
      playerId
    });
  };

  const handleStartGame = () => {
    if (!socket || !gameState) return;
    socket.emit('start_game', { roomId: gameState.roomId });
  };

  const handleResumeControl = () => {
    if (!socket || !gameState) return;
    sounds.playResumeControl();
    // Optimistically clear isAutoPlay locally for instantaneous 0ms UI feedback (ON)
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(p => (p.id === playerId ? { ...p, isAutoPlay: false } : p))
      };
    });
    socket.emit('resume_control', {
      roomId: gameState.roomId,
      playerId
    });
  };

  const handlePlayCards = (cardIds: string[]) => {
    if (!socket || !gameState) return;
    if (me?.isAutoPlay) {
      handleResumeControl();
    }
    socket.emit('play_cards', {
      roomId: gameState.roomId,
      playerId,
      cardIds
    });
  };

  const handlePassTurn = () => {
    if (!socket || !gameState) return;
    if (me?.isAutoPlay) {
      handleResumeControl();
    }
    selfJustPassedRef.current = true;
    socket.emit('pass_turn', {
      roomId: gameState.roomId,
      playerId
    });
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !gameState) return;
    if (me?.isAutoPlay) {
      handleResumeControl();
    }
    socket.emit('send_chat', {
      roomId: gameState.roomId,
      playerId,
      text
    });
  };

  const handleRestartGame = () => {
    if (!socket || !gameState) return;
    socket.emit('restart_game', { roomId: gameState.roomId });
    socket.emit('start_game', { roomId: gameState.roomId });
  };

  const handleLeaveRoom = () => {
    if (socket && gameState) {
      socket.emit('leave_room', { roomId: gameState.roomId, playerId });
    }
    currentRoomIdRef.current = null;
    setGameState(null);
    setChatMessages([]);
    setLastReadChatCount(0);
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setLastReadChatCount(chatMessages.length);
      }
      return next;
    });
  };

  // If chat is actively open, keep lastReadChatCount current
  useEffect(() => {
    if (isChatOpen) {
      setLastReadChatCount(chatMessages.length);
    }
  }, [isChatOpen, chatMessages.length]);

  const unreadChatCount = isChatOpen ? 0 : Math.max(0, chatMessages.length - lastReadChatCount);

  const me = gameState?.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;

  useEffect(() => {
    if (gameState?.status === 'game_over') {
      if (gameState.hasPokerBooing) {
        // Biarkan banner sorakan 'Huuuuuu!' dan kartu di meja kasino terlihat dramatis terlebih dahulu
        const timer = setTimeout(() => {
          setShowGameOverModal(true);
        }, 2200);
        return () => clearTimeout(timer);
      } else {
        setShowGameOverModal(true);
      }
    } else {
      setShowGameOverModal(false);
    }
  }, [gameState?.status, gameState?.hasPokerBooing]);

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans overscroll-y-none">
      {gameState ? (
        <>
          <PokerTable
            gameState={gameState}
            myPlayerId={playerId}
            onPlayCards={handlePlayCards}
            onPassTurn={handlePassTurn}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            onOpenRules={() => setIsRulesOpen(true)}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
            onResumeControl={handleResumeControl}
            onDismissBooing={() => setShowGameOverModal(true)}
            isGameOverModalOpen={showGameOverModal}
            onToggleChat={handleToggleChat}
            isChatOpen={isChatOpen}
            unreadChatCount={unreadChatCount}
          />

          <ChatBox
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isOpen={isChatOpen}
            onToggleOpen={handleToggleChat}
          />

          {gameState.status === 'game_over' && showGameOverModal && (
            <GameOverModal
              results={gameState.results}
              winnerId={gameState.winnerId}
              isHost={isHost}
              onPlayAgain={handleRestartGame}
              onLeaveRoom={handleLeaveRoom}
            />
          )}
        </>
      ) : (
        <div className="w-full flex-1 overflow-y-auto safe-area-full">
          <Lobby
            playerName={playerName}
            onPlayerNameChange={handlePlayerNameChange}
            playerAvatar={playerAvatar}
            onPlayerAvatarChange={handlePlayerAvatarChange}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onOpenRules={() => setIsRulesOpen(true)}
          />
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Mobile Landscape Orientation Enforcement Modal */}
      <RotateDevicePrompt />
    </div>
  );
};
