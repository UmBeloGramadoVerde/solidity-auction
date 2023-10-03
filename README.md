
# NFTAuction

A simple Ethereum smart contract for auctioning NFTs.

## Setup

1. **Prerequisites**: Ensure you have the following installed on your machine:
    - [Node.js](https://nodejs.org/)
    - [npm](https://www.npmjs.com/get-npm)
    
2. **Clone the repository**:
    ```bash
    git clone https://github.com/UmBeloGramadoVerde/solidity-auction.git
    cd solidity-auction
    ```

3. **Node version**:
    ```bash
    nvm use
    ```

4. **Install dependencies**:
    ```bash
    npm install
    ```

4. **Set up environment variables**: Rename `.env.example` to `.env` and update the `LOCALHOST_PRIVATE_KEY`, `GOERLI_PRIVATE_KEY` and `INFURA_API_KEY` variables with your Localhost private key, Goerli private key and Infura API key respectively.
To get a `LOCALHOST_PRIVATE_KEY` you can run:
    ```bash
    npx hardhat node
    ```

## Compile

To compile the smart contracts, run:

```bash
npx hardhat compile
```

This will compile the contracts and generate the necessary artifacts.

## Deploy

### Localhost

1. **Start a local Ethereum node**: 

    First, you'll need to run a local Ethereum node for development purposes:

    ```bash
    npx hardhat node
    ```

    This command will start a local Ethereum node with pre-funded accounts.

2. **Update `.env` file**: 

    Ensure your `.env` file has a valid value for `LOCALHOST_PRIVATE_KEY` which comes from the previous command output.

3. **Deploy the contract**:

    In a new terminal window, run:

    ```bash
    npx hardhat run --network localhost scripts/deploy.ts
    ```

    This will deploy the contract to your local Ethereum node.

### Goerli Testnet

1. **Update `.env` file**: 

    Ensure your `.env` file has valid values for `GOERLI_PRIVATE_KEY` (an Ethereum private key with some Goerli Ether) and `INFURA_API_KEY` (your Infura API key).

2. **Deploy the contract**:

    ```bash
    npx hardhat run --network goerli scripts/deploy.ts
    ```

    This will deploy the contract to the Goerli testnet. Ensure you have enough Goerli Ether in the account associated with the provided private key.

## Test

    ```bash
    npx hardhat test
    ```

## Architecture Considerations:
### Modular Design:
The smart contract has been designed with modularity in mind. This ensures that different functionalities are separated into distinct methods, allowing for easier unit testing and upgrades in the future. For instance, the bidding and auction ending logic are kept separate, ensuring clarity and simplicity in the contract's operations.

### Gas Efficiency:
Throughout the contract, there's a conscious effort to optimize for gas usage. For instance, by using the withdrawal pattern instead of directly sending Ether, the contract avoids potential gas wastage and makes certain operations more predictable in terms of their gas consumption.

### Integration with ERC-721:
The contract is designed to work seamlessly with any compliant ERC-721 token. This ensures that the auction contract remains versatile and can be used for auctioning any NFT, not just a specific one.

## Security Observations:
### Reentrancy Guards:
The withdrawal pattern inherently acts as a guard against reentrancy attacks. By allowing users to pull funds rather than pushing them, the contract mitigates the risk associated with external calls.

### Access Control:
The contract employs the onlyOwner modifier for functions that should only be accessible by the contract owner, ensuring that no unauthorized entity can disrupt the auction's operations.

### Auction State Management:
The contract's use of an AuctionState enum ensures that the auction's state is always clear and that functions can only be executed in the appropriate states, reducing potential attack vectors.

### Gas Limitations:
It's important to note that the .send() and .transfer() functions impose a gas limit, which is a security feature but can also lead to unintended failures if the receiving contract's fallback function consumes too much gas. This has been exemplified with the MaliciousReceiver in our tests.

## Relevant Points:
### Upgradability:
While the current contract serves its purpose, future requirements might necessitate an upgradeable contract design using proxy patterns. This would allow for adding new features or fixing potential bugs without deploying a completely new contract.

### Front-running:
Like all Ethereum transactions, bids can be susceptible to front-running. Advanced users might observe pending transactions and place higher bids with higher gas prices to ensure their transactions are mined first. While this is a broader issue with public blockchains, solutions like commit-reveal schemes or second-price auctions (Vickrey auctions) can be considered for mitigation.

### Oracles and Time:
The contract uses Ethereum block timestamps (block.timestamp) to determine auction end times. While this is generally safe, it's good to note that miners can manipulate timestamps to a small degree. In high-stakes auctions, oracles or multi-block time spans can be considered for more accurate timekeeping.