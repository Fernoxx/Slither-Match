// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SlitherMatch is Ownable, ReentrancyGuard {
    uint256 public lobbyCounter;
    uint256 public entryFee; // in USDC (6 decimals)
    IERC20 public usdcToken; // USDC contract address
    
    uint256 public constant WAIT_TIME = 5 minutes;
    uint256 public constant COUNTDOWN_TIME = 30 seconds;
    uint256 public constant GAME_DURATION = 3 minutes;
    uint256 public constant MIN_PLAYERS = 3;
    uint256 public constant MAX_PLAYERS = 5;

    enum LobbyState { Waiting, Countdown, Active, Completed, Refundable }

    struct Player {
        address wallet;
        uint256 score;
        bool alive;
        bool hasJoined;
    }

    struct Lobby {
        uint256 id;
        address[] players;
        mapping(address => Player) playerData;
        uint256 createdAt;
        uint256 gameStartTime;
        LobbyState state;
        address winner;
        uint256 prizePool;
    }

    mapping(uint256 => Lobby) private lobbies;
    mapping(address => uint256) public playerCurrentLobby;

    event LobbyCreated(uint256 indexed lobbyId);
    event PlayerJoined(uint256 indexed lobbyId, address indexed player);
    event CountdownStarted(uint256 indexed lobbyId);
    event GameStarted(uint256 indexed lobbyId);
    event GameEnded(uint256 indexed lobbyId, address indexed winner, uint256 prize);
    event RefundIssued(uint256 indexed lobbyId, address indexed player, uint256 amount);

    constructor(address _usdcToken, uint256 _entryFee) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        entryFee = _entryFee; // 1 USDC = 1000000 (6 decimals)
        lobbyCounter = 0;
    }

    function createLobby() external returns (uint256) {
        lobbyCounter++;
        Lobby storage lobby = lobbies[lobbyCounter];
        lobby.id = lobbyCounter;
        lobby.createdAt = block.timestamp;
        lobby.state = LobbyState.Waiting;
        lobby.prizePool = 0;
        
        emit LobbyCreated(lobbyCounter);
        return lobbyCounter;
    }

    function joinLobby(uint256 _lobbyId) external nonReentrant {
        require(_lobbyId > 0 && _lobbyId <= lobbyCounter, "Invalid lobby ID");
        require(playerCurrentLobby[msg.sender] == 0, "Already in a lobby");
        
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Waiting || lobby.state == LobbyState.Countdown, "Lobby not available");
        require(lobby.players.length < MAX_PLAYERS, "Lobby is full");
        require(!lobby.playerData[msg.sender].hasJoined, "Already joined this lobby");

        // Transfer USDC from player to contract
        require(usdcToken.transferFrom(msg.sender, address(this), entryFee), "USDC transfer failed");

        lobby.players.push(msg.sender);
        lobby.playerData[msg.sender] = Player({
            wallet: msg.sender,
            score: 0,
            alive: true,
            hasJoined: true
        });
        lobby.prizePool += entryFee;
        playerCurrentLobby[msg.sender] = _lobbyId;

        emit PlayerJoined(_lobbyId, msg.sender);

        // Start countdown when minimum players reached
        if (lobby.players.length >= MIN_PLAYERS && lobby.state == LobbyState.Waiting) {
            lobby.state = LobbyState.Countdown;
            lobby.gameStartTime = block.timestamp + COUNTDOWN_TIME;
            emit CountdownStarted(_lobbyId);
        }
    }

    function markGameStarted(uint256 _lobbyId) external onlyOwner {
        Lobby storage lobby = lobbies[_lobbyId];
        require(
            lobby.state == LobbyState.Countdown && 
            block.timestamp >= lobby.gameStartTime,
            "Cannot start game yet"
        );
        require(lobby.players.length >= MIN_PLAYERS, "Not enough players");

        lobby.state = LobbyState.Active;
        lobby.gameStartTime = block.timestamp;
        emit GameStarted(_lobbyId);
    }

    function declareWinner(uint256 _lobbyId, address _winner) external onlyOwner nonReentrant {
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Active, "Game not active");
        require(lobby.playerData[_winner].hasJoined, "Winner not in lobby");

        lobby.state = LobbyState.Completed;
        lobby.winner = _winner;

        // Clear player's current lobby
        for (uint256 i = 0; i < lobby.players.length; i++) {
            playerCurrentLobby[lobby.players[i]] = 0;
        }

        // Transfer prize to winner
        require(usdcToken.transfer(_winner, lobby.prizePool), "Prize transfer failed");

        emit GameEnded(_lobbyId, _winner, lobby.prizePool);
    }

    function markRefundable(uint256 _lobbyId) external {
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Waiting, "Lobby already active or ended");
        require(block.timestamp > lobby.createdAt + WAIT_TIME, "Lobby still within wait time");
        
        lobby.state = LobbyState.Refundable;
    }

    function refundIfUnstarted(uint256 _lobbyId, address _player) external nonReentrant {
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Refundable, "Refunds not enabled");
        require(lobby.playerData[_player].hasJoined, "Player not in lobby");
        require(lobby.playerData[_player].wallet != address(0), "Already refunded");

        lobby.playerData[_player].wallet = address(0); // Mark as refunded
        lobby.prizePool -= entryFee;
        playerCurrentLobby[_player] = 0;

        require(usdcToken.transfer(_player, entryFee), "Refund transfer failed");
        emit RefundIssued(_lobbyId, _player, entryFee);
    }

    // View functions
    function getPlayers(uint256 _lobbyId) external view returns (address[] memory) {
        return lobbies[_lobbyId].players;
    }

    function getLobbyState(uint256 _lobbyId) external view returns (LobbyState) {
        return lobbies[_lobbyId].state;
    }

    function getLobbyInfo(uint256 _lobbyId) external view returns (
        uint256 id,
        address[] memory players,
        uint256 createdAt,
        uint256 gameStartTime,
        LobbyState state,
        address winner,
        uint256 prizePool
    ) {
        Lobby storage lobby = lobbies[_lobbyId];
        return (
            lobby.id,
            lobby.players,
            lobby.createdAt,
            lobby.gameStartTime,
            lobby.state,
            lobby.winner,
            lobby.prizePool
        );
    }

    function getPlayerData(uint256 _lobbyId, address _player) external view returns (
        address wallet,
        uint256 score,
        bool alive,
        bool hasJoined
    ) {
        Player storage player = lobbies[_lobbyId].playerData[_player];
        return (player.wallet, player.score, player.alive, player.hasJoined);
    }

    function getCurrentLobby(address _player) external view returns (uint256) {
        return playerCurrentLobby[_player];
    }

    function canJoinLobby(uint256 _lobbyId, address _player) external view returns (bool) {
        if (_lobbyId == 0 || _lobbyId > lobbyCounter) return false;
        if (playerCurrentLobby[_player] != 0) return false;
        
        Lobby storage lobby = lobbies[_lobbyId];
        if (lobby.state != LobbyState.Waiting && lobby.state != LobbyState.Countdown) return false;
        if (lobby.players.length >= MAX_PLAYERS) return false;
        if (lobby.playerData[_player].hasJoined) return false;
        
        return true;
    }

    // Owner functions
    function updateEntryFee(uint256 _newFee) external onlyOwner {
        entryFee = _newFee;
    }

    function updateUSDCToken(address _newToken) external onlyOwner {
        usdcToken = IERC20(_newToken);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(usdcToken.transfer(owner(), balance), "Emergency withdraw failed");
    }
}