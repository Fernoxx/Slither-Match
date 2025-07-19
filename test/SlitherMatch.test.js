const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SlitherMatch", function () {
  let slitherMatch;
  let slitherUser;
  let mockUSDC;
  let owner;
  let player1;
  let player2;
  let player3;
  let player4;

  beforeEach(async function () {
    [owner, player1, player2, player3, player4] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();

    // Deploy SlitherUser
    const SlitherUser = await ethers.getContractFactory("SlitherUser");
    slitherUser = await SlitherUser.deploy();

    // Deploy SlitherMatch
    const SlitherMatch = await ethers.getContractFactory("SlitherMatch");
    const entryFee = ethers.parseUnits("1", 6); // 1 USDC
    slitherMatch = await SlitherMatch.deploy(await mockUSDC.getAddress(), entryFee);

    // Mint USDC to players
    const mintAmount = ethers.parseUnits("100", 6); // 100 USDC each
    await mockUSDC.mint(player1.address, mintAmount);
    await mockUSDC.mint(player2.address, mintAmount);
    await mockUSDC.mint(player3.address, mintAmount);
    await mockUSDC.mint(player4.address, mintAmount);

    // Approve USDC spending
    const entryFeeAmount = ethers.parseUnits("10", 6); // 10 USDC allowance
    await mockUSDC.connect(player1).approve(await slitherMatch.getAddress(), entryFeeAmount);
    await mockUSDC.connect(player2).approve(await slitherMatch.getAddress(), entryFeeAmount);
    await mockUSDC.connect(player3).approve(await slitherMatch.getAddress(), entryFeeAmount);
    await mockUSDC.connect(player4).approve(await slitherMatch.getAddress(), entryFeeAmount);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await slitherMatch.owner()).to.equal(owner.address);
    });

    it("Should set the correct entry fee", async function () {
      const expectedFee = ethers.parseUnits("1", 6);
      expect(await slitherMatch.entryFee()).to.equal(expectedFee);
    });
  });

  describe("Lobby Creation", function () {
    it("Should create a lobby with correct initial state", async function () {
      await slitherMatch.createLobby();
      
      const lobbyInfo = await slitherMatch.getLobbyInfo(1);
      expect(lobbyInfo[0]).to.equal(1); // id
      expect(lobbyInfo[4]).to.equal(0); // state (Waiting)
      expect(lobbyInfo[6]).to.equal(0); // prizePool
    });

    it("Should increment lobby counter", async function () {
      await slitherMatch.createLobby();
      await slitherMatch.createLobby();
      expect(await slitherMatch.lobbyCounter()).to.equal(2);
    });
  });

  describe("Joining Lobbies", function () {
    beforeEach(async function () {
      await slitherMatch.createLobby();
    });

    it("Should allow player to join lobby", async function () {
      await expect(slitherMatch.connect(player1).joinLobby(1))
        .to.emit(slitherMatch, "PlayerJoined")
        .withArgs(1, player1.address);

      const players = await slitherMatch.getPlayers(1);
      expect(players[0]).to.equal(player1.address);
    });

    it("Should start countdown when 3 players join", async function () {
      await slitherMatch.connect(player1).joinLobby(1);
      await slitherMatch.connect(player2).joinLobby(1);
      
      await expect(slitherMatch.connect(player3).joinLobby(1))
        .to.emit(slitherMatch, "CountdownStarted")
        .withArgs(1);

      const lobbyState = await slitherMatch.getLobbyState(1);
      expect(lobbyState).to.equal(1); // Countdown state
    });

    it("Should not allow joining full lobby", async function () {
      // Mint and approve USDC for owner
      await mockUSDC.mint(owner.address, ethers.parseUnits("10", 6));
      await mockUSDC.connect(owner).approve(await slitherMatch.getAddress(), ethers.parseUnits("10", 6));
      
      // Join 5 players (max capacity)
      await slitherMatch.connect(player1).joinLobby(1);
      await slitherMatch.connect(player2).joinLobby(1);
      await slitherMatch.connect(player3).joinLobby(1);
      await slitherMatch.connect(player4).joinLobby(1);
      await slitherMatch.connect(owner).joinLobby(1);
      
      // Get a new signer for the 6th player
      const [, , , , , player5] = await ethers.getSigners();
      await mockUSDC.mint(player5.address, ethers.parseUnits("10", 6));
      await mockUSDC.connect(player5).approve(await slitherMatch.getAddress(), ethers.parseUnits("10", 6));
      
      // Try to add 6th player (should fail)
      await expect(slitherMatch.connect(player5).joinLobby(1))
        .to.be.revertedWith("Lobby is full");
    });

    it("Should not allow double joining", async function () {
      await slitherMatch.connect(player1).joinLobby(1);
      await expect(slitherMatch.connect(player1).joinLobby(1))
        .to.be.revertedWith("Already in a lobby");
    });
  });

  describe("Game Flow", function () {
    beforeEach(async function () {
      await slitherMatch.createLobby();
      await slitherMatch.connect(player1).joinLobby(1);
      await slitherMatch.connect(player2).joinLobby(1);
      await slitherMatch.connect(player3).joinLobby(1);
    });

    it("Should start game after countdown", async function () {
      // Simulate countdown time passing
      await ethers.provider.send("evm_increaseTime", [30]); // 30 seconds
      await ethers.provider.send("evm_mine");

      await expect(slitherMatch.markGameStarted(1))
        .to.emit(slitherMatch, "GameStarted")
        .withArgs(1);

      const lobbyState = await slitherMatch.getLobbyState(1);
      expect(lobbyState).to.equal(2); // Active state
    });

    it("Should declare winner and distribute prize", async function () {
      // Start game
      await ethers.provider.send("evm_increaseTime", [30]);
      await ethers.provider.send("evm_mine");
      await slitherMatch.markGameStarted(1);

      const initialBalance = await mockUSDC.balanceOf(player1.address);
      const prizePool = ethers.parseUnits("3", 6); // 3 USDC

      await expect(slitherMatch.declareWinner(1, player1.address))
        .to.emit(slitherMatch, "GameEnded")
        .withArgs(1, player1.address, prizePool);

      const finalBalance = await mockUSDC.balanceOf(player1.address);
      expect(finalBalance - initialBalance).to.equal(prizePool);
    });
  });

  describe("Refunds", function () {
    beforeEach(async function () {
      await slitherMatch.createLobby();
      await slitherMatch.connect(player1).joinLobby(1);
    });

    it("Should allow refund after wait time", async function () {
      // Increase time beyond wait period
      await ethers.provider.send("evm_increaseTime", [301]); // 5 minutes + 1 second
      await ethers.provider.send("evm_mine");

      await slitherMatch.markRefundable(1);
      
      const initialBalance = await mockUSDC.balanceOf(player1.address);
      
      await expect(slitherMatch.refundIfUnstarted(1, player1.address))
        .to.emit(slitherMatch, "RefundIssued")
        .withArgs(1, player1.address, ethers.parseUnits("1", 6));

      const finalBalance = await mockUSDC.balanceOf(player1.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseUnits("1", 6));
    });

    it("Should not allow refund before wait time", async function () {
      await expect(slitherMatch.markRefundable(1))
        .to.be.revertedWith("Lobby still within wait time");
    });
  });
});

describe("SlitherUser", function () {
  let slitherUser;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const SlitherUser = await ethers.getContractFactory("SlitherUser");
    slitherUser = await SlitherUser.deploy();
  });

  describe("User Registration", function () {
    it("Should register a new user", async function () {
      await expect(slitherUser.registerUser(
        12345,
        "testuser",
        "Test User",
        "https://example.com/pfp.jpg",
        user1.address
      ))
        .to.emit(slitherUser, "UserRegistered")
        .withArgs(user1.address, 12345, "testuser");

      const profile = await slitherUser.getUserProfile(user1.address);
      expect(profile.fid).to.equal(12345);
      expect(profile.username).to.equal("testuser");
      expect(profile.wallet).to.equal(user1.address);
    });

    it("Should not allow duplicate FID", async function () {
      await slitherUser.registerUser(12345, "user1", "User 1", "url1", user1.address);
      
      await expect(slitherUser.registerUser(12345, "user2", "User 2", "url2", user2.address))
        .to.be.revertedWith("FID already registered");
    });

    it("Should update existing user", async function () {
      await slitherUser.registerUser(12345, "oldname", "Old Name", "old.jpg", user1.address);
      
      await expect(slitherUser.updateUser(user1.address, "newname", "New Name", "new.jpg"))
        .to.emit(slitherUser, "UserUpdated");

      const profile = await slitherUser.getUserProfile(user1.address);
      expect(profile.username).to.equal("newname");
      expect(profile.displayName).to.equal("New Name");
    });
  });

  describe("Game Statistics", function () {
    beforeEach(async function () {
      await slitherUser.registerUser(12345, "player1", "Player 1", "url", user1.address);
    });

    it("Should record game results", async function () {
      await expect(slitherUser.recordGameResult(
        user1.address,
        1500, // score
        true, // won
        ethers.parseUnits("3", 6), // earnings
        10, // red dots
        5, // green dots
        2, // purple dots
        180 // game time
      ))
        .to.emit(slitherUser, "GameCompleted")
        .withArgs(user1.address, 1500, true, ethers.parseUnits("3", 6));

      const profile = await slitherUser.getUserProfile(user1.address);
      expect(profile.gamesPlayed).to.equal(1);
      expect(profile.gamesWon).to.equal(1);
      expect(profile.totalScore).to.equal(1500);
      expect(profile.highestScore).to.equal(1500);
    });

    it("Should calculate win rate correctly", async function () {
      // Record 2 wins and 1 loss
      await slitherUser.recordGameResult(user1.address, 1000, true, ethers.parseUnits("3", 6), 5, 3, 1, 180);
      await slitherUser.recordGameResult(user1.address, 800, false, 0, 3, 2, 0, 120);
      await slitherUser.recordGameResult(user1.address, 1200, true, ethers.parseUnits("3", 6), 6, 4, 2, 180);

      const winRate = await slitherUser.getWinRate(user1.address);
      expect(winRate).to.equal(66); // 2/3 * 100 = 66%
    });
  });
});

// Mock USDC Contract for testing
const MockUSDCSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`;