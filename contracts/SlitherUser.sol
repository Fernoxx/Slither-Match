// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SlitherUser is Ownable {
    struct UserProfile {
        uint256 fid; // Farcaster ID
        string username;
        string displayName;
        string pfpUrl;
        address wallet;
        uint256 gamesPlayed;
        uint256 gamesWon;
        uint256 totalScore;
        uint256 highestScore;
        uint256 totalEarnings; // in USDC
        uint256 createdAt;
        bool isActive;
    }

    struct GameStats {
        uint256 redDotsEaten;
        uint256 greenDotsEaten;
        uint256 purpleDotsEaten;
        uint256 timesSurvived;
        uint256 averageGameTime;
    }

    mapping(address => UserProfile) public userProfiles;
    mapping(address => GameStats) public userGameStats;
    mapping(uint256 => address) public fidToWallet; // FID to wallet mapping
    mapping(string => address) public usernameToWallet; // Username to wallet mapping
    
    address[] public allUsers;
    uint256 public totalUsers;

    event UserRegistered(address indexed wallet, uint256 fid, string username);
    event UserUpdated(address indexed wallet, string username, string displayName);
    event GameCompleted(address indexed wallet, uint256 score, bool won, uint256 earnings);
    event StatsUpdated(address indexed wallet, uint256 redDots, uint256 greenDots, uint256 purpleDots);

    constructor() Ownable(msg.sender) {
        totalUsers = 0;
    }

    function registerUser(
        uint256 _fid,
        string memory _username,
        string memory _displayName,
        string memory _pfpUrl,
        address _wallet
    ) external {
        require(_wallet != address(0), "Invalid wallet address");
        require(_fid > 0, "Invalid FID");
        require(bytes(_username).length > 0, "Username cannot be empty");
        
        // Check if user already exists
        if (userProfiles[_wallet].wallet != address(0)) {
            // Update existing user
            updateUser(_wallet, _username, _displayName, _pfpUrl);
            return;
        }

        // Check for duplicate FID or username
        require(fidToWallet[_fid] == address(0), "FID already registered");
        require(usernameToWallet[_username] == address(0), "Username already taken");

        userProfiles[_wallet] = UserProfile({
            fid: _fid,
            username: _username,
            displayName: _displayName,
            pfpUrl: _pfpUrl,
            wallet: _wallet,
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            highestScore: 0,
            totalEarnings: 0,
            createdAt: block.timestamp,
            isActive: true
        });

        fidToWallet[_fid] = _wallet;
        usernameToWallet[_username] = _wallet;
        allUsers.push(_wallet);
        totalUsers++;

        emit UserRegistered(_wallet, _fid, _username);
    }

    function updateUser(
        address _wallet,
        string memory _username,
        string memory _displayName,
        string memory _pfpUrl
    ) public {
        require(userProfiles[_wallet].wallet != address(0), "User not registered");
        
        UserProfile storage user = userProfiles[_wallet];
        
        // Update username mapping if changed
        if (keccak256(bytes(user.username)) != keccak256(bytes(_username))) {
            require(usernameToWallet[_username] == address(0), "Username already taken");
            delete usernameToWallet[user.username];
            usernameToWallet[_username] = _wallet;
            user.username = _username;
        }
        
        user.displayName = _displayName;
        user.pfpUrl = _pfpUrl;

        emit UserUpdated(_wallet, _username, _displayName);
    }

    function recordGameResult(
        address _wallet,
        uint256 _score,
        bool _won,
        uint256 _earnings,
        uint256 _redDots,
        uint256 _greenDots,
        uint256 _purpleDots,
        uint256 _gameTime
    ) external onlyOwner {
        require(userProfiles[_wallet].wallet != address(0), "User not registered");

        UserProfile storage user = userProfiles[_wallet];
        GameStats storage stats = userGameStats[_wallet];

        user.gamesPlayed++;
        user.totalScore += _score;
        
        if (_score > user.highestScore) {
            user.highestScore = _score;
        }

        if (_won) {
            user.gamesWon++;
            user.totalEarnings += _earnings;
        }

        stats.redDotsEaten += _redDots;
        stats.greenDotsEaten += _greenDots;
        stats.purpleDotsEaten += _purpleDots;

        if (_gameTime > 0) {
            stats.averageGameTime = (stats.averageGameTime * (user.gamesPlayed - 1) + _gameTime) / user.gamesPlayed;
        }

        if (_won || _gameTime >= 180) { // 3 minutes in seconds
            stats.timesSurvived++;
        }

        emit GameCompleted(_wallet, _score, _won, _earnings);
        emit StatsUpdated(_wallet, _redDots, _greenDots, _purpleDots);
    }

    // View functions
    function getUserProfile(address _wallet) external view returns (UserProfile memory) {
        return userProfiles[_wallet];
    }

    function getUserStats(address _wallet) external view returns (GameStats memory) {
        return userGameStats[_wallet];
    }

    function getUserByFID(uint256 _fid) external view returns (UserProfile memory) {
        address wallet = fidToWallet[_fid];
        require(wallet != address(0), "User not found");
        return userProfiles[wallet];
    }

    function getUserByUsername(string memory _username) external view returns (UserProfile memory) {
        address wallet = usernameToWallet[_username];
        require(wallet != address(0), "User not found");
        return userProfiles[wallet];
    }

    function getWinRate(address _wallet) external view returns (uint256) {
        UserProfile memory user = userProfiles[_wallet];
        if (user.gamesPlayed == 0) return 0;
        return (user.gamesWon * 100) / user.gamesPlayed;
    }

    function getAverageScore(address _wallet) external view returns (uint256) {
        UserProfile memory user = userProfiles[_wallet];
        if (user.gamesPlayed == 0) return 0;
        return user.totalScore / user.gamesPlayed;
    }

    function getTopUsers(uint256 _limit) external view returns (address[] memory) {
        require(_limit > 0 && _limit <= totalUsers, "Invalid limit");
        
        address[] memory topUsers = new address[](_limit);
        uint256[] memory scores = new uint256[](_limit);
        
        for (uint256 i = 0; i < allUsers.length && i < _limit; i++) {
            address currentUser = allUsers[i];
            uint256 currentScore = userProfiles[currentUser].totalScore;
            
            // Simple insertion sort for top users
            uint256 j = i;
            while (j > 0 && currentScore > scores[j - 1]) {
                if (j < _limit) {
                    topUsers[j] = topUsers[j - 1];
                    scores[j] = scores[j - 1];
                }
                j--;
            }
            
            if (j < _limit) {
                topUsers[j] = currentUser;
                scores[j] = currentScore;
            }
        }
        
        return topUsers;
    }

    function getUserCount() external view returns (uint256) {
        return totalUsers;
    }

    function isUserRegistered(address _wallet) external view returns (bool) {
        return userProfiles[_wallet].wallet != address(0);
    }

    // Admin functions
    function deactivateUser(address _wallet) external onlyOwner {
        require(userProfiles[_wallet].wallet != address(0), "User not found");
        userProfiles[_wallet].isActive = false;
    }

    function reactivateUser(address _wallet) external onlyOwner {
        require(userProfiles[_wallet].wallet != address(0), "User not found");
        userProfiles[_wallet].isActive = true;
    }
}