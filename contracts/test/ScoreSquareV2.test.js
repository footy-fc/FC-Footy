const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ScoreSquareV2", function () {
  let owner, player1, player2, referee, community;
  let token, game;

  beforeEach(async () => {
    [owner, player1, player2, referee, community] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("Mock", "MCK");
    await token.deployed();

    await token.mint(player1.address, ethers.utils.parseEther("1"));
    await token.mint(player2.address, ethers.utils.parseEther("1"));

    const Game = await ethers.getContractFactory("ScoreSquareV2");
    game = await Game.deploy(community.address);
    await game.deployed();

    await game
      .connect(player1)
      .createGame(
        ethers.utils.parseEther("0.1"),
        "event1",
        referee.address,
        0,
        token.address
      );
  });

  it("allows token ticket purchase and prize distribution", async () => {
    const price = ethers.utils.parseEther("0.1");

    await token.connect(player1).approve(game.address, price);
    await game.connect(player1).buyTickets(1, 1);

    await token.connect(player2).approve(game.address, price);
    await game.connect(player2).buyTickets(1, 1);

    await game.connect(referee).finalizeGame(1, [0], [100]);
    await game.connect(referee).distributeWinnings(1);

    const bal = await token.balanceOf(player1.address);
    expect(bal).to.equal(ethers.utils.parseEther("1.2"));
  });

  it("pays smart contract wallets when using ETH", async () => {
    const ethPrice = ethers.utils.parseEther("0.01");

    await game
      .connect(owner)
      .createGame(ethPrice, "event2", referee.address, 0, ethers.constants.AddressZero);

    const Receiver = await ethers.getContractFactory("GasReceiver");
    const receiver = await Receiver.deploy(game.address);
    await receiver.deployed();

    await receiver.buy(2, { value: ethPrice });

    await game.connect(referee).finalizeGame(2, [0], [100]);
    await game.connect(referee).distributeWinnings(2);

    expect(await receiver.received()).to.equal(ethPrice);
  });
});
