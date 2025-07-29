import { io, Socket } from 'socket.io-client';

// Types matching your server
interface Position {
  x: number;
  y: number;
}

interface Snake {
  id: string;
  segments: Position[];
  angle: number;
  score: number;
  radius: number;
  color: string;
  isDead: boolean;
  killCount: number;
}

interface Player {
  id: string;
  username: string;
  snake: Snake;
}

interface Food {
  id: string;
  position: Position;
  color: string;
  radius: number;
}

interface GameState {
  players: Player[];
  food: Food[];
  worldSize: number;
  state: 'waiting' | 'countdown' | 'playing' | 'ended';
  leaderboard?: Array<{id: string; username: string; score: number}>;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  rank: number;
}

export type GameType = 'paid' | 'casual' | 'freeplay';

class GameSocketService {
  private socket: Socket | null = null;
  private currentGameId: string | null = null;
  private currentPlayerId: string | null = null;
  
  // Event callbacks
  private onGameJoined: ((data: any) => void) | null = null;
  private onGameState: ((data: any) => void) | null = null;
  private onPlayerJoined: ((data: any) => void) | null = null;
  private onPlayerLeft: ((data: any) => void) | null = null;
  private onPlayerDied: ((data: any) => void) | null = null;
  private onPlayerRespawned: ((data: any) => void) | null = null;
  private onFoodEaten: ((data: any) => void) | null = null;
  private onLeaderboardUpdate: ((data: any) => void) | null = null;
  private onCountdownStarted: ((data: any) => void) | null = null;
  private onGameStarted: ((data: any) => void) | null = null;
  private onGameEnded: ((data: any) => void) | null = null;
  private onGameUnavailable: ((data: any) => void) | null = null;
  private onError: ((data: any) => void) | null = null;

  connect(serverUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001') {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to game server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
    });

    this.socket.on('game-joined', (data) => {
      this.currentGameId = data.gameId;
      this.currentPlayerId = data.playerId;
      this.onGameJoined?.(data);
    });

    this.socket.on('game-state', (data) => {
      this.onGameState?.(data);
    });

    this.socket.on('player-joined', (data) => {
      this.onPlayerJoined?.(data);
    });

    this.socket.on('player-left', (data) => {
      this.onPlayerLeft?.(data);
    });

    this.socket.on('player-died', (data) => {
      this.onPlayerDied?.(data);
    });

    this.socket.on('player-respawned', (data) => {
      this.onPlayerRespawned?.(data);
    });

    this.socket.on('food-eaten', (data) => {
      this.onFoodEaten?.(data);
    });

    this.socket.on('leaderboard-update', (data) => {
      this.onLeaderboardUpdate?.(data);
    });

    this.socket.on('countdown-started', (data) => {
      this.onCountdownStarted?.(data);
    });

    this.socket.on('game-started', (data) => {
      this.onGameStarted?.(data);
    });

    this.socket.on('game-ended', (data) => {
      this.onGameEnded?.(data);
    });

    this.socket.on('game-unavailable', (data) => {
      this.onGameUnavailable?.(data);
    });

    this.socket.on('error', (data) => {
      this.onError?.(data);
    });

    this.socket.on('respawned', (data) => {
      // Handle respawn response
      console.log('Respawned:', data);
    });
  }

  findGame(gameType: GameType, playerInfo: {
    address: string;
    username: string;
    profilePic?: string;
  }) {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }

    this.socket.emit('find-game', {
      gameType,
      playerInfo
    });
  }

  move(angle: number) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('move', { angle });
  }

  respawn(username?: string) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('respawn', { username });
  }

  ping() {
    if (!this.socket?.connected) return;
    
    this.socket.emit('ping');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentGameId = null;
    this.currentPlayerId = null;
  }

  // Event listener setters
  setOnGameJoined(callback: (data: any) => void) {
    this.onGameJoined = callback;
  }

  setOnGameState(callback: (data: any) => void) {
    this.onGameState = callback;
  }

  setOnPlayerJoined(callback: (data: any) => void) {
    this.onPlayerJoined = callback;
  }

  setOnPlayerLeft(callback: (data: any) => void) {
    this.onPlayerLeft = callback;
  }

  setOnPlayerDied(callback: (data: any) => void) {
    this.onPlayerDied = callback;
  }

  setOnPlayerRespawned(callback: (data: any) => void) {
    this.onPlayerRespawned = callback;
  }

  setOnFoodEaten(callback: (data: any) => void) {
    this.onFoodEaten = callback;
  }

  setOnLeaderboardUpdate(callback: (data: any) => void) {
    this.onLeaderboardUpdate = callback;
  }

  setOnCountdownStarted(callback: (data: any) => void) {
    this.onCountdownStarted = callback;
  }

  setOnGameStarted(callback: (data: any) => void) {
    this.onGameStarted = callback;
  }

  setOnGameEnded(callback: (data: any) => void) {
    this.onGameEnded = callback;
  }

  setOnGameUnavailable(callback: (data: any) => void) {
    this.onGameUnavailable = callback;
  }

  setOnError(callback: (data: any) => void) {
    this.onError = callback;
  }

  // Getters
  get isConnected() {
    return this.socket?.connected || false;
  }

  get gameId() {
    return this.currentGameId;
  }

  get playerId() {
    return this.currentPlayerId;
  }
}

// Export singleton instance
export const gameSocket = new GameSocketService();
export default gameSocket;