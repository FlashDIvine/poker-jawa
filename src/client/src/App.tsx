import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, ChatMessage, Card } from '@shared/types.js';
import { Lobby } from './components/Lobby.js';
import { PokerTable } from './components/PokerTable.js';
import { GameOverModal } from './components/GameOverModal.js';
import { RulesModal } from './components/RulesModal.js';
import { ChatBox } from './components/ChatBox.js';
import { sounds } from './audio/soundEffects.js';

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerAvatar, setPlayerAvatar] = useState<string>('🤠');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevLastPlayRef = useRef<any>(null);
  const prevStatusRef = useRef<string>('waiting');

  // Initialize player identity from localStorage
  useEffect(() => {
    let savedId = localStorage.getItem('poker_remi_player_id');
    if (!savedId) {
      savedId = `p_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('poker_remi_player_id', savedId);
    }
    setPlayerId(savedId);

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
    const newSocket = io('/', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected with id:', newSocket.id);
    });

    newSocket.on('joined_room', (data) => {
      console.log('[Socket] Joined room:', data);
    });

    newSocket.on('game_state', (state: GameState) => {
      // Audio trigger on dealing
      if (prevStatusRef.current !== 'playing' && state.status === 'playing') {
        sounds.playDeal();
      }
      prevStatusRef.current = state.status;

      // Audio trigger on card plays
      if (state.lastPlay && state.lastPlay.timestamp !== prevLastPlayRef.current?.timestamp) {
        const combo = state.lastPlay.combo;
        const isBongOrPoker =
          combo.type === 'BONG_FOUR' ||
          combo.type === 'BONG_SF' ||
          combo.cards.some((c: Card) => c.isPoker);

        if (isBongOrPoker) {
          sounds.playBantingSlam();
        } else {
          sounds.playCardSnap();
        }
      }
      prevLastPlayRef.current = state.lastPlay;

      setGameState(state);
    });

    newSocket.on('turn_tick', ({ timeRemaining, playerId: currentPid }) => {
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
      if (msg.isSystem && msg.text.includes('Lewat')) {
        sounds.playPass();
      }
    });

    newSocket.on('error_message', (err: string) => {
      setErrorMessage(err);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Room Actions
  const handleCreateRoom = async (roomName: string, fillWithBots: boolean, turnTimerSeconds: number) => {
    if (!socket) return;
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, fillWithBots, turnTimerSeconds })
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

  const handlePlayCards = (cardIds: string[]) => {
    if (!socket || !gameState) return;
    socket.emit('play_cards', {
      roomId: gameState.roomId,
      playerId,
      cardIds
    });
  };

  const handlePassTurn = () => {
    if (!socket || !gameState) return;
    socket.emit('pass_turn', {
      roomId: gameState.roomId,
      playerId
    });
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !gameState) return;
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
    setGameState(null);
    setChatMessages([]);
  };

  const me = gameState?.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
          />

          <ChatBox
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isOpen={isChatOpen}
            onToggleOpen={() => setIsChatOpen(!isChatOpen)}
          />

          {gameState.status === 'game_over' && (
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
        <Lobby
          playerName={playerName}
          onPlayerNameChange={handlePlayerNameChange}
          playerAvatar={playerAvatar}
          onPlayerAvatarChange={handlePlayerAvatarChange}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenRules={() => setIsRulesOpen(true)}
        />
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
};
