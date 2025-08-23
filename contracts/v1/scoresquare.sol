// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ScoreSquare
 * @dev A smart contract for managing football scores and predictions
 */
contract ScoreSquare {
    // Contract owner
    address public owner;
    address public communityWallet;
    bool public communityWalletLocked;

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
        bool refunded; // New field to track if refunds have been processed
    }

    // Mappings
    mapping(uint256 => Game) private games;
    
    uint256 public gameCounter;

    // Events
    event GameCreated(uint256 gameId, address deployer, uint256 squarePrice, string eventId, address referee, uint8 deployerFeePercent);
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

        emit GameCreated(gameId, msg.sender, _squarePrice, _eventId, _referee, _deployerFeePercent);
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
                game.ticketsSold++;
                if (ticketsAssigned == numTickets) {
                    break;
                }
            }
        }

        require(ticketsAssigned == numTickets, "Not enough available squares");

        game.prizePool += msg.value;
        emit TicketsPurchased(gameId, msg.sender, numTickets);

        // Randomize tickets if all are sold
        if (game.ticketsSold == 25) {
            shuffleTickets(gameId);
        }
    }

    // Shuffle tickets
    function shuffleTickets(uint256 gameId) internal {
        Game storage game = games[gameId];
        for (uint8 i = 0; i < game.squareOwners.length; i++) {
            uint8 n = i + uint8(uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % (game.squareOwners.length - i));
            address temp = game.squareOwners[n];
            game.squareOwners[n] = game.squareOwners[i];
            game.squareOwners[i] = temp;
        }
    }

    // Finalize a game
    function finalizeGame(uint256 gameId, uint8[] calldata _winningSquares, uint8[] calldata _winnerPercentages) external {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];
        require(game.active, "Game already finalized");
        require(msg.sender == game.referee, "Only the referee can finalize the game");
        
        // If all 25 tickets are sold, proceed with normal finalization
        if (game.ticketsSold == 25) {
            require(_winningSquares.length > 0 && _winningSquares.length <= 3, "Must have 1 to 3 winners");
            require(_winningSquares.length == _winnerPercentages.length, "Winners and percentages mismatch");

            uint8 totalPercentage = 0;
            for (uint8 i = 0; i < _winnerPercentages.length; i++) {
                totalPercentage += _winnerPercentages[i];
            }
            require(totalPercentage == 100, "Total percentage must be 100");

            game.winningSquares = _winningSquares;
            game.winnerPercentages = _winnerPercentages;
        } else {
            // If less than 25 tickets are sold, mark for refund
            // We don't need winning squares or percentages in this case
            game.winningSquares = new uint8[](0);
            game.winnerPercentages = new uint8[](0);
        }
        
        game.active = false;
        emit GameFinalized(gameId, _winningSquares, _winnerPercentages);
    }

    // Process refunds for a game with less than 25 tickets sold
    function processRefunds(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(!game.active, "Game is still active");
        require(game.ticketsSold < 25, "All tickets were sold, no refunds needed");
        require(!game.refunded, "Refunds already processed");
        require(game.prizePool > 0, "No prize pool available for refunds");
        
        // Mark as refunded first to prevent reentrancy
        game.refunded = true;
        
        // Process refunds for each ticket owner
        uint8 refundedTickets = 0;
        for (uint8 i = 0; i < 25; i++) {
            address ticketOwner = game.squareOwners[i];
            if (ticketOwner != address(0)) {
                // Calculate refund amount for this ticket
                uint256 refundAmount = game.squarePrice;
                
                // Send refund to ticket owner
                payable(ticketOwner).transfer(refundAmount);
                refundedTickets++;
            }
        }
        
        // Reset prize pool
        game.prizePool = 0;
        
        emit TicketsRefunded(gameId, refundedTickets);
    }

    // Distribute winnings to all winners (can be called by anyone)
    function distributeWinnings(uint256 gameId) external {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];
        require(!game.active, "Game is still active");
        require(game.prizePool > 0, "No prize pool available");
        require(!game.prizeClaimed, "Prizes already claimed");
        
        // If less than 25 tickets were sold, process refunds instead
        if (game.ticketsSold < 25) {
            require(!game.refunded, "Refunds already processed");
            processRefunds(gameId);
            return;
        }
        
        uint256 totalPot = game.prizePool;
        uint256 deployerFee = (totalPot * game.deployerFeePercent) / 100;
        uint256 communityFee = (totalPot * 4) / 100;
        uint256 remainingPrize = totalPot - deployerFee - communityFee;
        
        // Send fees
        payable(game.deployer).transfer(deployerFee);
        payable(communityWallet).transfer(communityFee);
        
        // Distribute prizes to winners
        for (uint8 i = 0; i < game.winningSquares.length; i++) {
            uint8 winningSquare = game.winningSquares[i];
            address winner = game.squareOwners[winningSquare];
            uint256 winnerAmount = (remainingPrize * game.winnerPercentages[i]) / 100;
            
            if (winner != address(0)) {
                payable(winner).transfer(winnerAmount);
                game.claimedPrizes[winningSquare] = true;
            }
        }
        
        // Mark game as claimed
        game.prizePool = 0;
        game.prizeClaimed = true;
        
        emit PrizesDistributed(gameId, msg.sender);
    }

    // Get game status
    function getGameStatus(uint256 gameId) external view returns (
        bool active,
        address referee,
        uint256 squarePrice,
        uint8 ticketsSold,
        uint256 prizePool,
        uint8[] memory winningSquares,
        uint8[] memory winnerPercentages,
        bool prizeClaimed,
        string memory eventId,
        bool refunded
    ) {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];

        return (
            game.active,
            game.referee,
            game.squarePrice,
            game.ticketsSold,
            game.prizePool,
            game.winningSquares,
            game.winnerPercentages,
            game.prizeClaimed,
            game.eventId,
            game.refunded
        );
    }

    // Get game ID by event ID
    function getGameIdByEventId(string calldata _eventId) external view returns (uint256) {
        for (uint256 i = 1; i <= gameCounter; i++) {
            if (keccak256(abi.encodePacked(games[i].eventId)) == keccak256(abi.encodePacked(_eventId))) {
                return i;
            }
        }
        return 0;
    }

    // Get all tickets for a game
    function getAllTickets(uint256 gameId) external view returns (uint8[] memory, address[] memory) {
        require(gameId > 0 && gameId <= gameCounter, "Invalid game ID");
        Game storage game = games[gameId];

        uint8[] memory ticketNumbers = new uint8[](game.ticketsSold);
        address[] memory owners = new address[](game.ticketsSold);

        uint8 index = 0;
        for (uint8 i = 0; i < 25; i++) {
            if (game.squareOwners[i] != address(0)) {
                ticketNumbers[index] = i;
                owners[index] = game.squareOwners[i];
                index++;
            }
        }

        return (ticketNumbers, owners);
    }

    // Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Set community wallet
    function setCommunityWallet(address newWallet) external {
        require(!communityWalletLocked, "Community wallet is locked");
        require(newWallet != address(0), "Invalid address");
        communityWallet = newWallet;
        emit CommunityWalletUpdated(newWallet);
    }

    // Lock community wallet
    function lockCommunityWallet() external onlyOwner {
        communityWalletLocked = true;
        emit CommunityWalletLocked();
    }
} 
