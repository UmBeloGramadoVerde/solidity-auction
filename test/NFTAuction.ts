import { ethers } from "hardhat";
import { NFTAuction, ERC721Mock, MaliciousReceiver } from "../typechain-types";
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Signer } from "ethers";

enum AuctionState {
  NotStarted,
  Ongoing,
  Ended,
}

describe("NFTAuction", () => {
  async function deployFixture() {
    const [owner, bidder1, bidder2, ...others] = await ethers.getSigners();
    const mockERC721 = (await (
      await ethers.deployContract("ERC721Mock")
    ).waitForDeployment()) as ERC721Mock;

    mockERC721.mint(owner.getAddress(), 1);

    const auction = (await (
      await ethers.deployContract("NFTAuction", [mockERC721.target])
    ).waitForDeployment()) as NFTAuction;

    return { auction, mockERC721, owner, bidder1, bidder2, others };
  }
  async function startAuctionFixture() {
    const fixture = await loadFixture(deployFixture);
    const auctionedTokenId = 1;
    const minimumBid = ethers.parseEther("1");
    const durationInMinutes = 10;
    await fixture.mockERC721.approve(
      fixture.auction.getAddress(),
      auctionedTokenId
    );
    await fixture.auction.startAuction(
      auctionedTokenId,
      minimumBid,
      durationInMinutes
    );

    return { ...fixture, minimumBid, durationInMinutes };
  }
  async function startAuctionWithBidsFixture() {
    const fixture = await loadFixture(startAuctionFixture);

    const initialBid = ethers.parseEther("1");
    const higerBid = ethers.parseEther("1.5");
    await fixture.auction
      .connect(fixture.bidder1)
      .placeBid({ value: initialBid });
    await fixture.auction
      .connect(fixture.bidder2)
      .placeBid({ value: higerBid });

    return { ...fixture, initialBid, higerBid };
  }

  describe("Deployment", () => {
    let fixture: any;
    before(async function () {
      fixture = await loadFixture(deployFixture);
    });
    it("should set correct owner", async () => {
      expect(await fixture.auction.owner()).to.eq(
        await fixture.owner.getAddress()
      );
    });
    it("should set correct nftContract", async () => {
      expect(await fixture.auction.nftContract()).to.eq(
        await fixture.mockERC721.getAddress()
      );
    });
    it("should set correct auctionState", async () => {
      expect((await fixture.auction.auctionState()).toString()).to.eq(
        AuctionState.NotStarted.toString()
      );
    });
  });
  describe("Auction creation", () => {
    let fixture: any;
    const auctionedTokenId = 1;
    const minimumBid = ethers.parseEther("1");
    const durationInMinutes = 10;
    let endTimestamp: number;
    before(async function () {
      fixture = await loadFixture(deployFixture);
      await fixture.mockERC721.approve(
        fixture.auction.getAddress(),
        auctionedTokenId
      );
      await fixture.auction.startAuction(
        auctionedTokenId,
        minimumBid,
        durationInMinutes
      );
      endTimestamp = (await time.latest()) + durationInMinutes * 60;
    });
    it("should set correct auctionedTokenId", async () => {
      expect(await fixture.auction.nftTokenId()).to.eq(auctionedTokenId);
    });
    it("should set correct minimumBid", async () => {
      expect(await fixture.auction.minimumBid()).to.eq(minimumBid);
    });
    it("should set correct endTimestamp", async () => {
      expect(await fixture.auction.endTimestamp()).to.eq(endTimestamp);
    });
    it("should set correct auctionState", async () => {
      expect((await fixture.auction.auctionState()).toString()).to.eq(
        AuctionState.Ongoing.toString()
      );
    });
    it("should fail to start a second action while ongoing", async () => {
      await expect(
        fixture.auction.startAuction(auctionedTokenId, minimumBid, endTimestamp)
      ).to.be.revertedWith("Auction already started");
    });
  });

  describe("Bid placing", () => {
    let fixture: any;
    const belowMinimumBid = ethers.parseEther("0.5");
    before(async function () {
      fixture = await loadFixture(startAuctionFixture);
      await fixture.auction
        .connect(fixture.bidder1)
        .placeBid({ value: fixture.minimumBid });
    });
    it("should set correct highestBid", async () => {
      expect(await fixture.auction.highestBid()).to.eq(fixture.minimumBid);
    });
    it("should set correct highestBidder", async () => {
      expect(await fixture.auction.highestBidder()).to.eq(
        await fixture.bidder1.getAddress()
      );
    });
    it("should fail to bid below minimum", async () => {
      await expect(
        fixture.auction
          .connect(fixture.bidder1)
          .placeBid({ value: belowMinimumBid })
      ).to.be.revertedWith("Bid too low");
    });
  });

  describe("Bid withdrawing", () => {
    let fixture: any;
    before(async function () {
      fixture = await loadFixture(startAuctionWithBidsFixture);
    });
    it("should set correct pendingReturns", async () => {
      expect(
        await fixture.auction.pendingReturns(await fixture.bidder1.getAddress())
      ).to.eq(fixture.initialBid);
    });
    it("should send the funds back if there are any", async () => {
      expect(
        await fixture.auction.connect(fixture.bidder2).withdraw()
      ).to.changeEtherBalances([fixture.bidder1, fixture.auction], [0, 0]);
    });
    it("should not allow highestBidder to withdraw ", async () => {
      expect(
        await fixture.auction.connect(fixture.bidder2).withdraw()
      ).to.changeEtherBalances(
        [fixture.bidder1, fixture.auction],
        [fixture.initialBid, -fixture.initialBid]
      );
    });
    it("should not withdraw when MaliciousReceiver tries to exploit fallback function", async () => {
      const maliciousReceiver = (await (
        await ethers.deployContract("MaliciousReceiver", [
          fixture.auction.getAddress(),
        ])
      ).waitForDeployment()) as MaliciousReceiver;
      await maliciousReceiver.placeMaliciousBid({
        value: ethers.parseEther("2"),
      });
      await fixture.auction
        .connect(fixture.bidder2)
        .placeBid({ value: ethers.parseEther("2.5") });
      expect(
        await maliciousReceiver.withdrawFromAuction()
      ).to.changeEtherBalances([maliciousReceiver, fixture.auction], [0, 0]);
      expect(
        await fixture.auction.pendingReturns(
          await maliciousReceiver.getAddress()
        )
      ).to.eq(ethers.parseEther("2"));
    });
  });

  describe("Auction ending", () => {
    let fixture: any;
    before(async function () {
      fixture = await loadFixture(startAuctionWithBidsFixture);
    });
    it("should fail if endTime has not been reached yet", async () => {
      expect(fixture.auction.endAuction()).to.be.revertedWith(
        "Auction time not ended yet"
      );
    });
    it("should change owner balance by the highestBuild", async () => {
      await time.increase(600);
      expect(await fixture.auction.endAuction()).to.changeEtherBalances(
        [fixture.owner, fixture.auction],
        [fixture.higerBid, -fixture.higerBid]
      );
    });
    it("should set correct auctionState", async () => {
      expect((await fixture.auction.auctionState()).toString()).to.eq(
        AuctionState.Ended.toString()
      );
    });
    it("should transfer auctioned NFT to the highes bidder", async () => {
      expect(await fixture.mockERC721.ownerOf(1)).to.eq(
        await fixture.bidder2.getAddress()
      );
    });
  });
  describe("Auction cancelling", () => {
    let fixture: any;
    before(async function () {
      fixture = await loadFixture(startAuctionWithBidsFixture);
    });
    it("should emit AuctionCanceled event", async () => {
      expect(await fixture.auction.cancelAuction()).to.emit(
        fixture.auction,
        "AuctionCanceled"
      );
    });
    it("should set correct auctionState", async () => {
      expect((await fixture.auction.auctionState()).toString()).to.eq(
        AuctionState.Ended.toString()
      );
    });
    it("should update highestBidder pendingReturns correctly", async () => {
      expect(
        await fixture.auction.pendingReturns(await fixture.bidder2.getAddress())
      ).to.eq(fixture.higerBid);
    });
  });
});
