require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    // hyperspace: {
    //   url: process.env.NODE_URL,
    //   accounts: [process.env.PRIVATE_KEY],
    // },
  },
};
