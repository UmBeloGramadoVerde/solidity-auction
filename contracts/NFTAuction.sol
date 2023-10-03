// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NFTAuction {
    address public owner;
    IERC721 public nftContract;
    uint256 public nftTokenId;
    uint256 public minimumBid;
    uint256 public endTimestamp;
    address public highestBidder;
    uint256 public highestBid;

    enum AuctionState {
        NotStarted,
        Ongoing,
        Ended
    }
    AuctionState public auctionState;

    // Mapping to keep track of refunds for overbidded amounts
    mapping(address => uint256) public pendingReturns;

    event HighestBidIncreased(address bidder, uint amount);
    event AuctionEnded(address winner, uint amount);
    event AuctionCanceled();

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    modifier auctionOngoing() {
        require(auctionState == AuctionState.Ongoing, "Auction not ongoing");
        _;
    }

    modifier auctionEnded() {
        require(auctionState == AuctionState.Ended, "Auction not ended");
        _;
    }

    constructor(address _nftContract) {
        owner = msg.sender;
        nftContract = IERC721(_nftContract);
        auctionState = AuctionState.NotStarted;
    }

    function startAuction(
        uint256 _tokenId,
        uint256 _minimumBid,
        uint256 _durationInMinutes
    ) external onlyOwner {
        require(
            auctionState == AuctionState.NotStarted,
            "Auction already started"
        );
        nftTokenId = _tokenId;
        minimumBid = _minimumBid;
        endTimestamp = block.timestamp + (_durationInMinutes * 1 minutes);
        auctionState = AuctionState.Ongoing;

        // Transfer NFT to contract for the duration of the auction
        nftContract.transferFrom(owner, address(this), _tokenId);
    }

    function placeBid() external payable auctionOngoing {
        require(
            msg.value > highestBid && msg.value >= minimumBid,
            "Bid too low"
        );

        if (highestBidder != address(0)) {
            // Add the bid amount to be refunded to the previous highest bidder
            pendingReturns[highestBidder] += highestBid;
        }

        highestBid = msg.value;
        highestBidder = msg.sender;

        emit HighestBidIncreased(msg.sender, msg.value);

        // Check if auction time has ended
        if (block.timestamp >= endTimestamp) {
            auctionState = AuctionState.Ended;
        }
    }

    function withdraw() external returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // Reset the pending return before sending to prevent reentrancy attacks
            pendingReturns[msg.sender] = 0;

            if (!payable(msg.sender).send(amount)) {
                // If the send fails, revert the changes
                pendingReturns[msg.sender] = amount;
                return false;
            }
        }
        return true;
    }

    function endAuction() external onlyOwner auctionOngoing {
        require(block.timestamp >= endTimestamp, "Auction time not ended yet");
        auctionState = AuctionState.Ended;

        // Transfer NFT to highest bidder
        nftContract.transferFrom(address(this), highestBidder, nftTokenId);

        // Transfer highest bid amount to owner directly
        payable(owner).transfer(highestBid);

        emit AuctionEnded(highestBidder, highestBid);
    }

    function cancelAuction() external onlyOwner auctionOngoing {
        auctionState = AuctionState.Ended;
        pendingReturns[highestBidder] += highestBid;
        emit AuctionCanceled();
    }
}
