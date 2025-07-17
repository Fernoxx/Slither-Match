// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SlitherMatch {
    uint256 public lobbyCounter;
    uint256 public entryFee;
    address public owner;

    enum LobbyState { Waiting, Active, Completed, Refundable }

    struct Player {
        address wallet;
        uint256 score;
        bool alive;
    }

    struct Lobby {
        uint256 id;
        address[] players;
        mapping(address => Player) playerData;
        uint256 createdAt;
        LobbyState state;
        address winner;
    }

    mapping(uint256 => Lobby) private lobbies;

    event LobbyCreated(uint256 indexed lobbyId);
    event PlayerJoined(uint256 indexed lobbyId, address indexed player);
    event LobbyActivated(uint256 indexed lobbyId);
    event GameEnded(uint256 indexed lobbyId, address indexed winner);
    event RefundIssued(uint256 indexed lobbyId, address indexed player);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(uint256 _entryFee) {
        owner = msg.sender;
        entryFee = _entryFee; // in wei, e.g., 0.001 ETH = 1e15
        lobbyCounter = 0;
    }

    function createLobby() internal returns (uint256) {
        lobbyCounter++;
        Lobby storage lobby = lobbies[lobbyCounter];
        lobby.id = lobbyCounter;
        lobby.createdAt = block.timestamp;
        lobby.state = LobbyState.Waiting;
        emit LobbyCreated(lobbyCounter);
        return lobbyCounter;
    }

    function joinLobby(uint256 _lobbyId) external payable {
        require(msg.value == entryFee, "Incorrect entry fee");
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Waiting, "Lobby not available");
        require(lobby.players.length < 5, "Lobby is full");

        lobby.players.push(msg.sender);
        lobby.playerData[msg.sender] = Player(msg.sender, 0, true);

        emit PlayerJoined(_lobbyId, msg.sender);

        if (lobby.players.length == 3) {
            lobby.state = LobbyState.Active;
            emit LobbyActivated(_lobbyId);
        }
    }

    function markRefundable(uint256 _lobbyId) external {
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Waiting, "Lobby already active or ended");
        require(block.timestamp > lobby.createdAt + 5 minutes, "Lobby still within wait time");
        lobby.state = LobbyState.Refundable;
    }

    function refund(uint256 _lobbyId) external {
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Refundable, "Refunds not enabled");

        Player storage player = lobby.playerData[msg.sender];
        require(player.wallet == msg.sender, "Not part of lobby");

        player.wallet = address(0); // prevent double refund
        payable(msg.sender).transfer(entryFee);
        emit RefundIssued(_lobbyId, msg.sender);
    }

    function endGame(uint256 _lobbyId, address _winner) external onlyOwner {
        Lobby storage lobby = lobbies[_lobbyId];
        require(lobby.state == LobbyState.Active, "Game not active");

        lobby.state = LobbyState.Completed;
        lobby.winner = _winner;

        uint256 payout = entryFee * lobby.players.length;
        payable(_winner).transfer(payout);

        emit GameEnded(_lobbyId, _winner);
    }

    function getPlayers(uint256 _lobbyId) external view returns (address[] memory) {
        return lobbies[_lobbyId].players;
    }

    function getLobbyState(uint256 _lobbyId) external view returns (LobbyState) {
        return lobbies[_lobbyId].state;
    }
}