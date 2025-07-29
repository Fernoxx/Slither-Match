// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CasualLobbyLeaderboard {
    struct GameRecord {
        address player;
        string farcasterUsername;
        uint256 winTime;
        uint256 timestamp;
        uint256 score;
    }

    struct PlayerRecord {
        uint256 bestTime;
        uint256 totalWins;
        uint256 lastPlayTime;
    }

    mapping(address => PlayerRecord) public playerRecords;
    GameRecord[] public leaderboard;
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    address public owner;

    event WinRecorded(address indexed player, uint256 winTime);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordWin(
        address _player,
        string memory _farcasterUsername,
        uint256 _winTime,
        uint256 _score
    ) external onlyOwner {
        require(_winTime > 0, "Invalid win time");

        PlayerRecord storage record = playerRecords[_player];
        record.totalWins++;
        record.lastPlayTime = block.timestamp;
        
        if (record.bestTime == 0 || _winTime < record.bestTime) {
            record.bestTime = _winTime;
        }

        GameRecord memory newRecord = GameRecord({
            player: _player,
            farcasterUsername: _farcasterUsername,
            winTime: _winTime,
            timestamp: block.timestamp,
            score: _score
        });

        uint256 insertIndex = leaderboard.length;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (_winTime < leaderboard[i].winTime) {
                insertIndex = i;
                break;
            }
        }

        if (insertIndex < MAX_LEADERBOARD_SIZE) {
            leaderboard.push(newRecord);
            for (uint256 i = leaderboard.length - 1; i > insertIndex; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }
            leaderboard[insertIndex] = newRecord;

            if (leaderboard.length > MAX_LEADERBOARD_SIZE) {
                leaderboard.pop();
            }
        }

        emit WinRecorded(_player, _winTime);
    }

    function getTopPlayers(uint256 _count) external view returns (GameRecord[] memory) {
        uint256 count = _count;
        if (count > leaderboard.length) {
            count = leaderboard.length;
        }

        GameRecord[] memory topPlayers = new GameRecord[](count);
        for (uint256 i = 0; i < count; i++) {
            topPlayers[i] = leaderboard[i];
        }
        
        return topPlayers;
    }

    function getPlayerBestTime(address _player) external view returns (uint256) {
        return playerRecords[_player].bestTime;
    }

    function getFullLeaderboard() external view returns (GameRecord[] memory) {
        return leaderboard;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}