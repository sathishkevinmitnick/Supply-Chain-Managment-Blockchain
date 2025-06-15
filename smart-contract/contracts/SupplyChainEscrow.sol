// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SupplyChainEscrow {
    address public buyer;
    address public seller;
    address public arbitrator; // Optional for disputes
    uint256 public amount;
    uint256 public deliveryDeadline;
    bool public buyerConfirmedDelivery;
    bool public sellerRequestedPayout;

    enum State { Created, Locked, Released, Refunded }
    State public state;

    constructor(address _seller, address _arbitrator, uint256 _deliveryDeadline) payable {
        buyer = msg.sender;
        seller = _seller;
        arbitrator = _arbitrator;
        amount = msg.value;
        deliveryDeadline = block.timestamp + _deliveryDeadline;
        state = State.Created;
    }

    // Buyer confirms delivery (releases funds to seller)
    function confirmDelivery() external {
        require(msg.sender == buyer, "Only buyer can confirm");
        require(state == State.Locked, "Invalid state");
        state = State.Released;
        payable(seller).transfer(amount);
    }

    // Seller requests payout (if buyer doesn't confirm in time)
    function requestPayout() external {
        require(msg.sender == seller, "Only seller can request");
        require(block.timestamp >= deliveryDeadline, "Deadline not passed");
        require(state == State.Locked, "Invalid state");
        sellerRequestedPayout = true;
    }

    // Arbitrator resolves disputes (can force release/refund)
    function resolveDispute(bool releaseToSeller) external {
        require(msg.sender == arbitrator, "Only arbitrator");
        require(state == State.Locked, "Invalid state");
        if (releaseToSeller) {
            payable(seller).transfer(amount);
        } else {
            payable(buyer).transfer(amount);
        }
        state = State.Released;
    }

    // Refund buyer if deadline passes without delivery
    function refundBuyer() external {
        require(block.timestamp >= deliveryDeadline, "Deadline not passed");
        require(state == State.Locked, "Invalid state");
        state = State.Refunded;
        payable(buyer).transfer(amount);
    }

    // Buyer locks funds (after contract creation)
    function lockFunds() external payable {
        require(msg.sender == buyer, "Only buyer");
        require(msg.value == amount, "Incorrect amount");
        state = State.Locked;
    }
}