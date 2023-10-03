// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.4;

import "./NFTAuction.sol";

contract MaliciousReceiver {
    uint256 public counter = 0;
    NFTAuction public auction;

    constructor(address _auction) {
        auction = NFTAuction(_auction);
    }

    fallback() external payable {
        counter += 1;
        for(uint i = 0; i < 100; i++) {
            counter += 1; // This loop will consume more gas
        }
    }

    function placeMaliciousBid() external payable {
        // This will call the `placeBid` function on the NFTAuction contract
        auction.placeBid{value: msg.value}();
    }

    function withdrawFromAuction() external {
        // This will call the `withdraw` function on the NFTAuction contract
        auction.withdraw();
    }
}
