// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const MockToken = await hre.ethers.getContractFactory("MockToken");
  const Iofy = await hre.ethers.getContractFactory("Iofy");

  const mockToken = await MockToken.deploy();
  await mockToken.deployed();
  console.log(`Mock USDT Token deployed to ${mockToken.address}`);

  const iofy = await Iofy.deploy(mockToken.address, 100);
  await iofy.deployed();
  console.log(`Iofy contract deployed to ${iofy.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
