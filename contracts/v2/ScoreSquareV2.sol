// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ScoreSquareV2
 * @dev A smart contract for managing football scores and predictions - Version 2
 * @notice This is an upgraded version of the original ScoreSquare contract
 */
contract ScoreSquareV2 {
    // Contract owner
    address public owner;
    address public communityWallet;
    bool public communityWalletLocked;
    
    // Version tracking
    uint256 public constant VERSION = 2;

    // Game struct to store game details
    struct Game {
        address deployer;
        address referee;
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
        uint256 createdAt; // New field for V2
        uint256 finalizedAt; // New field for V2
    }

    // Mappings
    mapping(uint256 => Game) private games;
    
    uint256 public gameCounter;

    // Events
    event GameCreated(uint256 gameId, address deployer, uint256 squarePrice, string eventId, address referee, uint8 deployerFeePercent, uint256 version);
    event TicketsPurchased(uint256 gameId, address buyer, uint8 numTickets);
    event GameFinalized(uint256 gameId, uint8[] winningSquares, uint8[] winnerPercentages);
    event PrizesDistributed(uint256 gameId, address distributor);
    event TicketsRefunded(uint256 gameId, uint8 ticketsRefunded);
    event CommunityWalletUpdated(address newWallet);
    event CommunityWalletLocked();

    constructor(address _communityWallet) {
        require(_communityWallet != address(0), "Invalid community wallet");
        owner = msg.sender;
        communityWallet = _communityWallet;
        gameCounter = 0;
    }

    // Modifier to restrict certain functions to the owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Create a new game
    function createGame(
        uint256 _squarePrice,
        string calldata _eventId,
        address _referee,
        uint8 _deployerFeePercent
    ) external returns (uint256 gameId) {
        require(_referee != address(0), "Invalid referee address");
        require(_deployerFeePercent <= 10, "Deployer fee must be between 0 and 10%");

        gameCounter++;
        gameId = gameCounter;

        Game storage game = games[gameId];

        game.deployer = msg.sender;
        game.squarePrice = _squarePrice;
        game.active = true;
        game.eventId = _eventId;
        game.referee = _referee;
        game.deployerFeePercent = _deployerFeePercent;
        game.ticketsSold = 0;
        game.squareOwners = new address[](25);
        game.refunded = false;
        game.prizePool = 0; // Initialize prize pool
        game.createdAt = block.timestamp; // V2 addition

        emit GameCreated(gameId, msg.sender, _squarePrice, _eventId, _referee, _deployerFeePercent, VERSION);
    }

    // Buy tickets for a game
    function buyTickets(uint256 gameId, uint8 numTickets) external payable {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];
        require(game.active, "Game is not active");
        require(numTickets > 0, "Must buy at least one ticket");
        require(game.ticketsSold + numTickets <= 25, "Not enough tickets left");
        require(msg.value >= game.squarePrice * numTickets, "Insufficient ETH sent");

        uint8 ticketsAssigned = 0;
        for (uint8 i = 0; i < 25; i++) {
            if (game.squareOwners[i] == address(0)) {
                game.squareOwners[i] = msg.sender;
                ticketsAssigned++;
                if (ticketsAssigned == numTickets) break;
            }
        }

        game.ticketsSold += numTickets;
        game.prizePool += msg.value;

        emit TicketsPurchased(gameId, msg.sender, numTickets);
    }

    // Finalize a game with winning squares
    function finalizeGame(
        uint256 gameId,
        uint8[] calldata _winningSquares,
        uint8[] calldata _winnerPercentages
    ) external {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];
        require(game.active, "Game is not active");
        require(msg.sender == game.referee, "Only referee can finalize game");
        require(_winningSquares.length == _winnerPercentages.length, "Arrays must have same length");
        require(_winningSquares.length > 0, "Must have at least one winning square");

        game.active = false;
        game.winningSquares = _winningSquares;
        game.winnerPercentages = _winnerPercentages;
        game.finalizedAt = block.timestamp; // V2 addition

        emit GameFinalized(gameId, _winningSquares, _winnerPercentages);
    }

    // Distribute winnings or process refunds
    function distributeWinnings(uint256 gameId) external {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];
        require(!game.active, "Game is still active");
        require(!game.prizeClaimed, "Prizes already claimed");
        require(msg.sender == game.referee || msg.sender == owner, "Only referee or owner can distribute");

        if (game.winningSquares.length == 0) {
            // No winners, process refunds
            processRefunds(gameId);
        } else {
            // Distribute prizes
            uint256 totalPrize = game.prizePool;
            uint256 deployerFee = (totalPrize * game.deployerFeePercent) / 100;
            uint256 communityFee = (totalPrize * 5) / 100; // 5% community fee
            uint256 remainingPrize = totalPrize - deployerFee - communityFee;

            // Pay deployer fee
            if (deployerFee > 0) {
                payable(game.deployer).transfer(deployerFee);
            }

            // Pay community fee
            if (communityFee > 0) {
                payable(communityWallet).transfer(communityFee);
            }

            // Distribute remaining prize to winners
            for (uint256 i = 0; i < game.winningSquares.length; i++) {
                uint8 square = game.winningSquares[i];
                uint8 percentage = game.winnerPercentages[i];
                address winner = game.squareOwners[square];

                if (winner != address(0) && !game.claimedPrizes[square]) {
                    uint256 prizeAmount = (remainingPrize * percentage) / 100;
                    payable(winner).transfer(prizeAmount);
                    game.claimedPrizes[square] = true;
                }
            }

            game.prizeClaimed = true;
            emit PrizesDistributed(gameId, msg.sender);
        }
    }

    // Process refunds for games with no winners
    function processRefunds(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(!game.refunded, "Refunds already processed");

        uint8 refundedTickets = 0;
        for (uint8 i = 0; i < 25; i++) {
            if (game.squareOwners[i] != address(0)) {
                payable(game.squareOwners[i]).transfer(game.squarePrice);
                refundedTickets++;
            }
        }

        game.refunded = true;
        emit TicketsRefunded(gameId, refundedTickets);
    }

    // Update community wallet
    function updateCommunityWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet address");
        require(!communityWalletLocked, "Community wallet is locked");
        
        communityWallet = _newWallet;
        emit CommunityWalletUpdated(_newWallet);
    }

    // Lock community wallet (irreversible)
    function lockCommunityWallet() external onlyOwner {
        communityWalletLocked = true;
        emit CommunityWalletLocked();
    }

    // Get game details
    function getGame(uint256 gameId) external view returns (
        address deployer,
        address referee,
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
    ) {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];
        
        return (
            game.deployer,
            game.referee,
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

    // Check if a specific square is claimed
    function isSquareClaimed(uint256 gameId, uint8 square) external view returns (bool) {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        require(square < 25, "Invalid square");
        return games[gameId].claimedPrizes[square];
    }

    // Emergency function to withdraw stuck ETH (owner only)
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Receive function to accept ETH
    receive() external payable {}
}
