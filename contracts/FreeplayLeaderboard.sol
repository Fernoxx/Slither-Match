// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FreeplayLeaderboard {
    struct PlayerStats {
        address walletAddress;
        string farcasterUsername;
        uint256 highestScore;
        uint256 totalKills;
        uint256 gamesPlayed;
        uint256 lastUpdateTime;
    }

    struct LeaderboardEntry {
        address player;
        string username;
        uint256 score;
        uint256 kills;
        uint256 rank;
    }

    mapping(address => PlayerStats) public playerStats;
    address[] public players;
    
    address public owner;
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    event StatsUpdated(address indexed player, uint256 score, uint256 kills);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function updatePlayerStats(
        address _player,
        string memory _farcasterUsername,
        uint256 _score,
        uint256 _kills
    ) external onlyOwner {
        PlayerStats storage stats = playerStats[_player];
        
        if (stats.lastUpdateTime == 0) {
            players.push(_player);
        }

        stats.walletAddress = _player;
        stats.farcasterUsername = _farcasterUsername;
        stats.gamesPlayed++;
        stats.lastUpdateTime = block.timestamp;

        if (_score > stats.highestScore) {
            stats.highestScore = _score;
        }

        stats.totalKills += _kills;

        emit StatsUpdated(_player, _score, _kills);
    }

    function getLeaderboard(uint256 _count) external view returns (LeaderboardEntry[] memory) {
        uint256 count = _count;
        if (count > players.length || count > MAX_LEADERBOARD_SIZE) {
            count = players.length < MAX_LEADERBOARD_SIZE ? players.length : MAX_LEADERBOARD_SIZE;
        }

        LeaderboardEntry[] memory allEntries = new LeaderboardEntry[](players.length);
        for (uint256 i = 0; i < players.length; i++) {
            PlayerStats memory stats = playerStats[players[i]];
            allEntries[i] = LeaderboardEntry({
                player: players[i],
                username: stats.farcasterUsername,
                score: stats.highestScore,
                kills: stats.totalKills,
                rank: 0
            });
        }

        // Sort by composite score (score + kills * 10)
        for (uint256 i = 0; i < allEntries.length - 1; i++) {
            for (uint256 j = i + 1; j < allEntries.length; j++) {
                uint256 scoreI = allEntries[i].score + (allEntries[i].kills * 10);
                uint256 scoreJ = allEntries[j].score + (allEntries[j].kills * 10);
                if (scoreJ > scoreI) {
                    LeaderboardEntry memory temp = allEntries[i];
                    allEntries[i] = allEntries[j];
                    allEntries[j] = temp;
                }
            }
        }

        LeaderboardEntry[] memory topEntries = new LeaderboardEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            topEntries[i] = allEntries[i];
            topEntries[i].rank = i + 1;
        }

        return topEntries;
    }

    function getPlayerStats(address _player) external view returns (PlayerStats memory) {
        return playerStats[_player];
    }

    function getTopScorers(uint256 _count) external view returns (LeaderboardEntry[] memory) {
        return _getTopByMetric(_count, true);
    }

    function getTopKillers(uint256 _count) external view returns (LeaderboardEntry[] memory) {
        return _getTopByMetric(_count, false);
    }

    function _getTopByMetric(uint256 _count, bool _byScore) internal view returns (LeaderboardEntry[] memory) {
        uint256 count = _count;
        if (count > players.length) {
            count = players.length;
        }

        LeaderboardEntry[] memory allEntries = new LeaderboardEntry[](players.length);
        for (uint256 i = 0; i < players.length; i++) {
            PlayerStats memory stats = playerStats[players[i]];
            allEntries[i] = LeaderboardEntry({
                player: players[i],
                username: stats.farcasterUsername,
                score: stats.highestScore,
                kills: stats.totalKills,
                rank: 0
            });
        }

        // Sort by either score or kills
        for (uint256 i = 0; i < allEntries.length - 1; i++) {
            for (uint256 j = i + 1; j < allEntries.length; j++) {
                bool shouldSwap;
                if (_byScore) {
                    shouldSwap = allEntries[j].score > allEntries[i].score;
                } else {
                    shouldSwap = allEntries[j].kills > allEntries[i].kills;
                }
                
                if (shouldSwap) {
                    LeaderboardEntry memory temp = allEntries[i];
                    allEntries[i] = allEntries[j];
                    allEntries[j] = temp;
                }
            }
        }

        LeaderboardEntry[] memory topEntries = new LeaderboardEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            topEntries[i] = allEntries[i];
            topEntries[i].rank = i + 1;
        }

        return topEntries;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}