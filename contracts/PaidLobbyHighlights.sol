// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PaidLobbyHighlights {
    struct Highlight {
        address winner;
        string farcasterUsername;
        uint256 prizeAmount;
        uint256 playerCount;
        uint256 timestamp;
        uint256 gameDuration;
    }

    struct PlayerStats {
        uint256 totalWins;
        uint256 totalEarnings;
        uint256 highestPrize;
        uint256 lastWinTime;
    }

    mapping(uint256 => Highlight) public highlights;
    mapping(address => PlayerStats) public playerStats;
    mapping(address => uint256[]) public playerHighlights;
    
    uint256 public highlightCount;
    uint256[] public recentHighlights;
    uint256 public constant MAX_RECENT = 50;

    address public owner;
    
    event HighlightSaved(uint256 indexed highlightId, address indexed winner, uint256 prizeAmount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function saveHighlight(
        address _winner,
        string memory _farcasterUsername,
        uint256 _prizeAmount,
        uint256 _playerCount,
        uint256 _gameDuration
    ) external onlyOwner {
        uint256 highlightId = highlightCount++;
        
        highlights[highlightId] = Highlight({
            winner: _winner,
            farcasterUsername: _farcasterUsername,
            prizeAmount: _prizeAmount,
            playerCount: _playerCount,
            timestamp: block.timestamp,
            gameDuration: _gameDuration
        });

        PlayerStats storage stats = playerStats[_winner];
        stats.totalWins++;
        stats.totalEarnings += _prizeAmount;
        stats.lastWinTime = block.timestamp;
        if (_prizeAmount > stats.highestPrize) {
            stats.highestPrize = _prizeAmount;
        }

        playerHighlights[_winner].push(highlightId);

        recentHighlights.push(highlightId);
        if (recentHighlights.length > MAX_RECENT) {
            for (uint i = 0; i < recentHighlights.length - 1; i++) {
                recentHighlights[i] = recentHighlights[i + 1];
            }
            recentHighlights.pop();
        }

        emit HighlightSaved(highlightId, _winner, _prizeAmount);
    }

    function getRecentHighlights(uint256 _count) external view returns (Highlight[] memory) {
        uint256 count = _count;
        if (count > recentHighlights.length) {
            count = recentHighlights.length;
        }

        Highlight[] memory recent = new Highlight[](count);
        uint256 startIdx = recentHighlights.length > count ? recentHighlights.length - count : 0;
        
        for (uint256 i = 0; i < count; i++) {
            recent[i] = highlights[recentHighlights[startIdx + i]];
        }
        
        return recent;
    }

    function getPlayerHighlights(address _player) external view returns (Highlight[] memory) {
        uint256[] memory playerIds = playerHighlights[_player];
        Highlight[] memory playerGames = new Highlight[](playerIds.length);
        
        for (uint256 i = 0; i < playerIds.length; i++) {
            playerGames[i] = highlights[playerIds[i]];
        }
        
        return playerGames;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}