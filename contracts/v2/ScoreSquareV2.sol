// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ScoreSquareV2
 * @dev ScoreSquare game supporting ETH or any ERC20 token payments with
 *      smart-contract-wallet friendly payouts.
 */
contract ScoreSquareV2 {
    using Address for address payable;

    address public owner;
    address public communityWallet;
    bool public communityWalletLocked;

    uint256 public constant VERSION = 2;

    struct Game {
        address deployer;
        address referee;
        address paymentToken; // address(0) for ETH
        uint256 squarePrice;
        bool active;
        bool prizeClaimed;
        uint256 prizePool;
        string eventId;
        uint8 deployerFeePercent;
        uint8 ticketsSold;
        uint8[] winningSquares;
        uint8[] winnerPercentages;
        address[] squareOwners;
        mapping(uint8 => bool) claimedPrizes;
        bool refunded;
        uint256 createdAt;
        uint256 finalizedAt;
    }

    mapping(uint256 => Game) private games;
    mapping(address => uint256) public pending; // escrow for failed ETH payouts
    uint256 public gameCounter;

    event GameCreated(
        uint256 indexed gameId,
        address indexed deployer,
        uint256 squarePrice,
        address paymentToken,
        string eventId,
        address referee,
        uint8 deployerFeePercent
    );
    event TicketsPurchased(uint256 indexed gameId, address indexed buyer, uint8 numTickets);
    event GameFinalized(uint256 indexed gameId, uint8[] winningSquares, uint8[] winnerPercentages);
    event PrizesDistributed(uint256 indexed gameId, address distributor);
    event TicketsRefunded(uint256 indexed gameId, uint8 ticketsRefunded);
    event CommunityWalletUpdated(address newWallet);
    event CommunityWalletLocked();
    event PayoutSent(address indexed to, uint256 amount);
    event PayoutEscrowed(address indexed to, uint256 amount);

    constructor(address _communityWallet) {
        require(_communityWallet != address(0), "Invalid community wallet");
        owner = msg.sender;
        communityWallet = _communityWallet;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function createGame(
        uint256 _squarePrice,
        string calldata _eventId,
        address _referee,
        uint8 _deployerFeePercent,
        address _paymentToken
    ) external returns (uint256 gameId) {
        require(_referee != address(0), "Invalid referee");
        require(_deployerFeePercent <= 10, "Deployer fee 0-10%");

        gameCounter++;
        gameId = gameCounter;
        Game storage game = games[gameId];
        game.deployer = msg.sender;
        game.squarePrice = _squarePrice;
        game.eventId = _eventId;
        game.referee = _referee;
        game.deployerFeePercent = _deployerFeePercent;
        game.squareOwners = new address[](25);
        game.paymentToken = _paymentToken;
        game.active = true;
        game.createdAt = block.timestamp;

        emit GameCreated(gameId, msg.sender, _squarePrice, _paymentToken, _eventId, _referee, _deployerFeePercent);
    }

    function buyTickets(uint256 gameId, uint8 numTickets) external payable {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game");
        Game storage game = games[gameId];
        require(game.active, "Game not active");
        require(numTickets > 0, "numTickets 0");
        require(game.ticketsSold + numTickets <= 25, "Not enough tickets");

        uint256 cost = game.squarePrice * numTickets;
        if (game.paymentToken == address(0)) {
            require(msg.value >= cost, "Insufficient ETH");
            game.prizePool += msg.value;
        } else {
            require(msg.value == 0, "ETH not accepted");
            IERC20(game.paymentToken).transferFrom(msg.sender, address(this), cost);
            game.prizePool += cost;
        }

        uint8 ticketsAssigned = 0;
        for (uint8 i = 0; i < 25 && ticketsAssigned < numTickets; i++) {
            if (game.squareOwners[i] == address(0)) {
                game.squareOwners[i] = msg.sender;
                ticketsAssigned++;
            }
        }
        require(ticketsAssigned == numTickets, "Not enough available squares");

        game.ticketsSold += numTickets;
        emit TicketsPurchased(gameId, msg.sender, numTickets);
    }

    function finalizeGame(
        uint256 gameId,
        uint8[] calldata _winningSquares,
        uint8[] calldata _winnerPercentages
    ) external {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game");
        Game storage game = games[gameId];
        require(game.active, "Game not active");
        require(msg.sender == game.referee, "Only referee");
        require(_winningSquares.length == _winnerPercentages.length, "Length mismatch");
        require(_winningSquares.length > 0, "No winners");

        game.active = false;
        game.winningSquares = _winningSquares;
        game.winnerPercentages = _winnerPercentages;
        game.finalizedAt = block.timestamp;

        emit GameFinalized(gameId, _winningSquares, _winnerPercentages);
    }

    function distributeWinnings(uint256 gameId) external {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game");
        Game storage game = games[gameId];
        require(!game.active, "Game active");
        require(!game.prizeClaimed, "Already claimed");
        require(msg.sender == game.referee || msg.sender == owner, "Only referee or owner");

        if (game.winningSquares.length == 0) {
            processRefunds(gameId);
            return;
        }

        uint256 totalPrize = game.prizePool;
        uint256 deployerFee = (totalPrize * game.deployerFeePercent) / 100;
        uint256 communityFee = (totalPrize * 5) / 100;
        uint256 remainingPrize = totalPrize - deployerFee - communityFee;

        _pay(game, game.deployer, deployerFee);
        _pay(game, communityWallet, communityFee);

        for (uint256 i = 0; i < game.winningSquares.length; i++) {
            uint8 square = game.winningSquares[i];
            uint8 percentage = game.winnerPercentages[i];
            address winner = game.squareOwners[square];
            if (winner != address(0) && !game.claimedPrizes[square]) {
                uint256 prizeAmount = (remainingPrize * percentage) / 100;
                _pay(game, winner, prizeAmount);
                game.claimedPrizes[square] = true;
            }
        }

        game.prizePool = 0;
        game.prizeClaimed = true;
        emit PrizesDistributed(gameId, msg.sender);
    }

    function _pay(Game storage game, address to, uint256 amount) internal {
        if (amount == 0 || to == address(0)) return;
        if (game.paymentToken == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            if (!ok) {
                pending[to] += amount;
                emit PayoutEscrowed(to, amount);
            } else {
                emit PayoutSent(to, amount);
            }
        } else {
            IERC20(game.paymentToken).transfer(to, amount);
            emit PayoutSent(to, amount);
        }
    }

    function withdrawPending() external {
        uint256 amt = pending[msg.sender];
        require(amt > 0, "Nothing pending");
        pending[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amt}("");
        require(ok, "Withdraw failed");
        emit PayoutSent(msg.sender, amt);
    }

    function processRefunds(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(!game.refunded, "Refunds processed");

        uint8 refundedTickets = 0;
        for (uint8 i = 0; i < 25; i++) {
            address ticketOwner = game.squareOwners[i];
            if (ticketOwner != address(0)) {
                _pay(game, ticketOwner, game.squarePrice);
                refundedTickets++;
            }
        }

        game.refunded = true;
        emit TicketsRefunded(gameId, refundedTickets);
    }

    function updateCommunityWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet");
        require(!communityWalletLocked, "Community wallet locked");
        communityWallet = _newWallet;
        emit CommunityWalletUpdated(_newWallet);
    }

    function lockCommunityWallet() external onlyOwner {
        communityWalletLocked = true;
        emit CommunityWalletLocked();
    }

    function getGame(
        uint256 gameId
    )
        external
        view
        returns (
            address deployer,
            address referee,
            address paymentToken,
            uint256 squarePrice,
            bool active,
            bool prizeClaimed,
            uint256 prizePool,
            string memory eventId,
            uint8 deployerFeePercent,
            uint8 ticketsSold,
            uint8[] memory winningSquares,
            uint8[] memory winnerPercentages,
            address[] memory squareOwners,
            bool refunded,
            uint256 createdAt,
            uint256 finalizedAt
        )
    {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game");
        Game storage game = games[gameId];
        return (
            game.deployer,
            game.referee,
            game.paymentToken,
            game.squarePrice,
            game.active,
            game.prizeClaimed,
            game.prizePool,
            game.eventId,
            game.deployerFeePercent,
            game.ticketsSold,
            game.winningSquares,
            game.winnerPercentages,
            game.squareOwners,
            game.refunded,
            game.createdAt,
            game.finalizedAt
        );
    }

    function isSquareClaimed(uint256 gameId, uint8 square) external view returns (bool) {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game");
        require(square < 25, "Invalid square");
        return games[gameId].claimedPrizes[square];
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner).sendValue(address(this).balance);
    }

    receive() external payable {}
}

