// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SupplyChainEscrow {
    address public immutable buyer;
    address public immutable seller;
    address public immutable arbitrator;
    uint256 public immutable amount;
    uint256 public immutable deliveryDeadline;
    
    bool public buyerConfirmedDelivery;
    bool public sellerRequestedPayout;
    bool public fundsLocked;

    enum State { Created, Locked, Released, Refunded }
    State public state;

    event FundsLocked(uint256 amount, uint256 timestamp);
    event DeliveryConfirmed(uint256 timestamp);
    event PayoutRequested(uint256 timestamp);
    event DisputeResolved(bool releasedToSeller, uint256 timestamp);
    event RefundIssued(uint256 timestamp);

    constructor(address _seller, address _arbitrator, uint256 _deliveryDeadlineDays) payable {
        require(_seller != address(0), "Invalid seller address");
        require(_arbitrator != address(0), "Invalid arbitrator address");
        require(msg.value > 0, "Escrow amount must be > 0");
        require(_deliveryDeadlineDays > 0, "Deadline must be > 0 days");

        buyer = msg.sender;
        seller = _seller;
        arbitrator = _arbitrator;
        amount = msg.value;
        deliveryDeadline = block.timestamp + (_deliveryDeadlineDays * 1 days);
        state = State.Created;
    }

    function lockFunds() external payable {
        require(msg.sender == buyer, "Only buyer can lock funds");
        require(msg.value == amount, "Must send exact amount");
        require(state == State.Created, "Invalid state");
        require(!fundsLocked, "Funds already locked");

        fundsLocked = true;
        state = State.Locked;
        emit FundsLocked(msg.value, block.timestamp);
    }

    function confirmDelivery() external {
        require(msg.sender == buyer, "Only buyer can confirm");
        require(state == State.Locked, "Invalid state");
        require(fundsLocked, "Funds not locked");

        state = State.Released;
        (bool sent, ) = payable(seller).call{value: amount}("");
        require(sent, "Transfer failed");
        emit DeliveryConfirmed(block.timestamp);
    }

    function requestPayout() external {
        require(msg.sender == seller, "Only seller can request");
        require(block.timestamp >= deliveryDeadline, "Deadline not passed");
        require(state == State.Locked, "Invalid state");
        require(fundsLocked, "Funds not locked");

        sellerRequestedPayout = true;
        emit PayoutRequested(block.timestamp);
    }

    function resolveDispute(bool releaseToSeller) external {
        require(msg.sender == arbitrator, "Only arbitrator");
        require(state == State.Locked, "Invalid state");
        require(fundsLocked, "Funds not locked");

        state = State.Released;
        if (releaseToSeller) {
            (bool sent, ) = payable(seller).call{value: amount}("");
            require(sent, "Transfer to seller failed");
        } else {
            (bool sent, ) = payable(buyer).call{value: amount}("");
            require(sent, "Transfer to buyer failed");
        }
        emit DisputeResolved(releaseToSeller, block.timestamp);
    }

    function refundBuyer() external {
        require(block.timestamp >= deliveryDeadline, "Deadline not passed");
        require(state == State.Locked, "Invalid state");
        require(fundsLocked, "Funds not locked");

        state = State.Refunded;
        (bool sent, ) = payable(buyer).call{value: amount}("");
        require(sent, "Transfer failed");
        emit RefundIssued(block.timestamp);
    }

    // Safety feature - allow arbitrator to recover accidentally sent ETH
    function recoverETH() external {
        require(msg.sender == arbitrator, "Only arbitrator");
        require(address(this).balance > amount, "No extra ETH to recover");
        uint256 excess = address(this).balance - amount;
        (bool sent, ) = payable(arbitrator).call{value: excess}("");
        require(sent, "Recovery failed");
    }
}