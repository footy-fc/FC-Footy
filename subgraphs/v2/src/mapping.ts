import { BigInt } from "@graphprotocol/graph-ts";
import {
  GameCreated,
  TicketsPurchased,
  GameFinalized,
  PrizesDistributed,
  TicketsRefunded
} from "../generated/ScoreSquareV2/ScoreSquareV2";
import {
  Game,
  TicketPurchase,
  GameFinalization,
  PrizeDistribution,
  Refund
} from "../generated/schema";

export function handleGameCreated(event: GameCreated): void {
  let game = new Game(event.params.gameId.toString());
  game.deployer = event.params.deployer;
  game.squarePrice = event.params.squarePrice;
  game.paymentToken = event.params.paymentToken;
  game.eventId = event.params.eventId;
  game.referee = event.params.referee;
  game.deployerFeePercent = event.params.deployerFeePercent;
  game.ticketsSold = 0;
  game.prizePool = BigInt.zero();
  game.active = true;
  game.prizeClaimed = false;
  game.createdAt = event.block.timestamp;
  game.save();
}

export function handleTicketsPurchased(event: TicketsPurchased): void {
  let game = Game.load(event.params.gameId.toString());
  if (game === null) return;
  game.ticketsSold += event.params.numTickets;
  game.save();

  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let purchase = new TicketPurchase(id);
  purchase.game = game.id;
  purchase.buyer = event.params.buyer;
  purchase.numTickets = event.params.numTickets;
  purchase.save();
}

export function handleGameFinalized(event: GameFinalized): void {
  let game = Game.load(event.params.gameId.toString());
  if (game === null) return;
  game.active = false;
  game.finalizedAt = event.block.timestamp;
  game.save();

  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let fin = new GameFinalization(id);
  fin.game = game.id;
  fin.winningSquares = event.params.winningSquares;
  fin.winnerPercentages = event.params.winnerPercentages;
  fin.save();
}

export function handlePrizesDistributed(event: PrizesDistributed): void {
  let game = Game.load(event.params.gameId.toString());
  if (game === null) return;
  game.prizeClaimed = true;
  game.save();

  let dist = new PrizeDistribution(event.transaction.hash.toHex());
  dist.game = game.id;
  dist.distributor = event.params.distributor;
  dist.save();
}

export function handleTicketsRefunded(event: TicketsRefunded): void {
  let game = Game.load(event.params.gameId.toString());
  if (game === null) return;

  let ref = new Refund(event.transaction.hash.toHex());
  ref.game = game.id;
  ref.ticketsRefunded = event.params.ticketsRefunded;
  ref.save();
}
