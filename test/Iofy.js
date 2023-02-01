const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Iofy", () => {
  let admin, creator1, creator2, user1, user2, usdt, iofy, pricePerHour;

  before(async () => {
    // Set addresses
    [admin, creator1, creator2, user1, user2] = await ethers.getSigners();

    // Get contract abstractions
    const MockToken = await hre.ethers.getContractFactory("MockToken");
    const Iofy = await hre.ethers.getContractFactory("Iofy");

    usdt = await MockToken.deploy();
    await usdt.deployed();

    iofy = await Iofy.deploy(usdt.address, 100);
    await iofy.deployed();

    pricePerHour = ethers.utils.parseEther("10");
    const transferAmount = ethers.utils.parseEther("1000");

    // Transfer Tokens
    await usdt.transfer(user1.address, transferAmount);
    await usdt.transfer(user2.address, transferAmount);

    // Approve IoFy contract
    await usdt.connect(user1).approve(iofy.address, transferAmount);
    await usdt.connect(user2).approve(iofy.address, transferAmount);
  });

  it("Should set the right values on deployment", async () => {
    expect(await iofy.getLastestOrderId()).to.equal(0);
    expect(await iofy.getFee()).to.equal(100);
  });

  describe("USER ACTIONS", () => {
    it("Should create IOT devices accurately", async () => {
      const cid1a = "aMockCIDUsedToCarryOutThisTestForTheFVMSpaceWarpHackathon";
      const cid1b =
        "anotherMockCIDUsedToCarryOutThisTestForTheFVMSpaceHackathon";
      const cid2a = "aNewMockCIDUsedToCarryOutThisTestForTheFVMSpaceWarpHack";
      const cid2b =
        "anotherNewMockCIDToCarryOutThisTestTheFVMSpaceWarpHackathon";

      // Try connecting with ZERO hourly price
      await expect(iofy.connect(creator1).createIoTDevice(cid1a, 1, 0)).to
        .reverted;

      // creator1 creates
      await iofy.connect(creator1).createIoTDevice(cid1a, 1, pricePerHour);
      await expect(iofy.connect(creator1).createIoTDevice(cid1a, 1, 0)).to
        .reverted;

      // creator2 creates
      await iofy.connect(creator2).createIoTDevice(cid2a, 2, pricePerHour);

      // creator1 creates
      await iofy.connect(creator1).createIoTDevice(cid1b, 3, pricePerHour);

      // creator2 creates
      await iofy.connect(creator2).createIoTDevice(cid2b, 4, pricePerHour);

      // Query read method
      let info = await iofy.getIoTOwnerInfo(creator1.address);

      expect(info.length).to.be.equal(3);
      expect(info[0]).to.be.equal(0);
      expect(info[1]).to.be.equal(0);
      expect(info[2].length).to.be.equal(2);
      expect(info[2][0]).to.be.equal(1);
      expect(info[2][1]).to.be.equal(3);

      info = await iofy.getDeviceIds();

      expect(info.length).to.be.equal(4);
      expect(info[0]).to.be.equal(1);
      expect(info[1]).to.be.equal(2);
      expect(info[2]).to.be.equal(3);
      expect(info[3]).to.be.equal(4);
    });

    it("Should properly modify IoT devices", async () => {
      // Try modifying with unauthorized wallet
      await expect(iofy.connect(creator1).modifyIoTDevice(2, 0, false)).to
        .reverted;

      // Try modifying with ZERO price
      await expect(iofy.connect(creator1).modifyIoTDevice(1, 0, false)).to
        .reverted;

      await iofy
        .connect(creator1)
        .modifyIoTDevice(1, ethers.utils.parseEther("30"), false);

      const info = await iofy.getIoTDevice(1);

      expect(info[6]).to.be.equal(false);
    });

    it("Should accurately rent IoT device to users", async () => {
      // Try renting an inactive IoT device
      await expect(
        iofy.connect(user1).rentIoT(1, user1.address, pricePerHour, 0)
      ).to.reverted;

      // Try renting with ZERO payment
      await expect(iofy.connect(user1).rentIoT(2, user1.address, 0, 0)).to
        .reverted;

      const latest = await time.latest();
      await iofy.connect(user1).rentIoT(2, user1.address, pricePerHour, 0);
      await iofy.connect(user2).rentIoT(3, user2.address, pricePerHour, 0);

      expect(await iofy.getLastestOrderId()).to.equal(2);
      expect(await iofy.getTotalRaisedInDeals()).to.equal(
        ethers.BigNumber.from(pricePerHour)
          .mul(2)
          .sub(ethers.BigNumber.from(pricePerHour).mul(2).div(100))
      );

      // Query IoT Device
      const infoDevice = await iofy.getIoTDevice(2);

      expect(infoDevice[2]).to.be.equal(
        ethers.BigNumber.from(pricePerHour).sub(
          ethers.BigNumber.from(pricePerHour).div(100)
        )
      );
      expect(infoDevice[3]).to.be.equal(1);

      // Query Order
      const infoOrder = await iofy.getOrderInfo(1);

      expect(infoOrder[0]).to.be.equal(2);
      expect(infoOrder[1]).to.be.equal(pricePerHour);
      expect(infoOrder[2]).to.be.equal(latest + 1);
      expect(infoOrder[3]).to.be.equal(latest + 1 + 60 * 60);
      expect(infoOrder[4]).to.equal(user1.address);

      // Query read method for Creator
      const infoCreator = await iofy.getIoTOwnerInfo(creator2.address);

      expect(infoCreator[0]).to.be.equal(
        ethers.BigNumber.from(pricePerHour).sub(
          ethers.BigNumber.from(pricePerHour).div(100)
        )
      );

      // Query user
      const infoUser = await iofy.getUserInfo(user1.address);

      expect(infoUser[0]).to.be.equal(pricePerHour);
      expect(infoUser[1][0].endTimestamp).to.be.equal(infoOrder[3]);
    });

    it("Should properly withdraw creators' funds", async () => {
      // Query read method for Creator
      let info = await iofy.getIoTOwnerInfo(creator2.address);
      const balance = info[0] - info[1];
      const walletBal = await usdt.balanceOf(creator2.address);

      // Try withdrawing excess
      await expect(
        iofy.connect(creator2).withdraw(creator2.address, info[0] + 1)
      ).to.be.reverted;

      await iofy.connect(creator2).withdraw(creator2.address, info[0]);

      info = await iofy.getIoTOwnerInfo(creator2.address);

      const newWalletBal = await usdt.balanceOf(creator2.address);

      expect(Number(info[0])).to.be.equal(balance);
      expect(Number(info[1])).to.be.equal(balance);
      expect(Number(newWalletBal) - Number(walletBal)).to.equal(balance);
    });
  });

  describe("ADMIN ACTIONS", () => {
    it("Should accurately modify fees if executed by the admin", async () => {
      await expect(iofy.connect(creator1).setFee(200)).to.revertedWith(
        "Ownable: caller is not the owner"
      );

      await iofy.setFee(200);
      expect(await iofy.getFee()).to.equal(200);
    });

    it("Should properly withdraw fees for admin", async () => {
      const balance = await iofy.getAvailableFees();

      // Try withdrawing excess
      await expect(iofy.takeFee(admin.address, balance + 1)).to.be.reverted;

      // Try taking fee with unauthorized wallet
      await expect(iofy.connect(creator2).takeFee(admin.address, balance)).to.be
        .reverted;

      const walletBal = await usdt.balanceOf(admin.address);

      await expect(iofy.takeFee(admin.address, balance))
        .to.emit(iofy, "TakeFee")
        .withArgs(admin.address, admin.address, balance)
        .to.emit(usdt, "Transfer")
        .withArgs(iofy.address, admin.address, balance); // We accept any value as `when` arg
    });
  });
});
