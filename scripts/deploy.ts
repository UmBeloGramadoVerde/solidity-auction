import { ethers } from "hardhat";

async function main() {
  const mockNFT = await ethers.deployContract("ERC721Mock");
  await mockNFT.waitForDeployment();
  console.log(`Mock NFT deployed to ${mockNFT.target}`);

  const auction = await ethers.deployContract("NFTAuction", [mockNFT.target]);
  await auction.waitForDeployment();
  console.log(
    `NFTAuction for NFT contract ${mockNFT.target} deployed to ${auction.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
