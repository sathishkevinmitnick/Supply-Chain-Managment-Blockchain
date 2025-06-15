const hre = require("hardhat");

async function main() {
  const escrow = await hre.ethers.getContractAt(
    "SupplyChainEscrow",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  console.log("Current state:", await escrow.state());
  console.log("Contract balance:", await hre.ethers.provider.getBalance(escrow.target));
}

main();