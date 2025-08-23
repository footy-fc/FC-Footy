// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../v2/ScoreSquareV2.sol";

contract GasReceiver {
    ScoreSquareV2 public game;
    uint256 public received;

    constructor(address _game) {
        game = ScoreSquareV2(_game);
    }

    function buy(uint256 gameId) external payable {
        game.buyTickets{value: msg.value}(gameId, 1);
    }

    receive() external payable {
        // write to storage to require >2300 gas
        received += msg.value;
    }
}
