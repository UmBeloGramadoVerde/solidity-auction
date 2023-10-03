// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721Mock is ERC721Enumerable, Ownable {
    constructor() ERC721("MockNFT", "MNFT") {}

    /**
     * @dev Public function to mint a new token.
     * @param to The address that will receive the minted token.
     * @param tokenId The token id to mint.
     */
    function mint(address to, uint256 tokenId) public onlyOwner {
        _mint(to, tokenId);
    }
}
