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

        // Update player stats
        PlayerStats storage stats = playerStats[_winner];
        stats.totalWins++;
        stats.totalEarnings += _prizeAmount;
        stats.lastWinTime = block.timestamp;
        if (_prizeAmount > stats.highestPrize) {
            stats.highestPrize = _prizeAmount;
        }

        // Track player's highlights
        playerHighlights[_winner].push(highlightId);

        // Update recent highlights
        recentHighlights.push(highlightId);
        if (recentHighlights.length > MAX_RECENT) {
            // Remove oldest highlight
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

    function getTopEarners(uint256 _count) external view returns (
        address[] memory players,
        string[] memory usernames,
        uint256[] memory earnings
    ) {
        require(_count > 0, "Count must be greater than 0");
        
        // Create arrays to store results
        address[] memory topPlayers = new address[](_count);
        string[] memory topUsernames = new string[](_count);
        uint256[] memory topEarnings = new uint256[](_count);
        
        // Get recent highlights and aggregate earnings
        uint256 processed = 0;
        for (uint256 i = 0; i < recentHighlights.length && processed < _count; i++) {
            Highlight memory h = highlights[recentHighlights[i]];
            
            // Check if player already in list
            bool found = false;
            for (uint256 j = 0; j < processed; j++) {
                if (topPlayers[j] == h.winner) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                topPlayers[processed] = h.winner;
                topUsernames[processed] = h.farcasterUsername;
                topEarnings[processed] = playerStats[h.winner].totalEarnings;
                processed++;
            }
        }
        
        // Sort by earnings (bubble sort for simplicity)
        for (uint256 i = 0; i < processed - 1; i++) {
            for (uint256 j = 0; j < processed - i - 1; j++) {
                if (topEarnings[j] < topEarnings[j + 1]) {
                    // Swap
                    address tempAddr = topPlayers[j];
                    topPlayers[j] = topPlayers[j + 1];
                    topPlayers[j + 1] = tempAddr;
                    
                    string memory tempUser = topUsernames[j];
                    topUsernames[j] = topUsernames[j + 1];
                    topUsernames[j + 1] = tempUser;
                    
                    uint256 tempEarn = topEarnings[j];
                    topEarnings[j] = topEarnings[j + 1];
                    topEarnings[j + 1] = tempEarn;
                }
            }
        }
        
        return (topPlayers, topUsernames, topEarnings);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}