const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get test accounts from Hardhat
  const [buyer, seller, arbitrator] = await ethers.getSigners();
  
  // Constructor parameters (adjust as needed)
  const sellerAddress = seller.address;
  const arbitratorAddress = arbitrator.address;
  const deliveryDeadlineDays = 7; // 7 days from deployment
  const depositAmount = ethers.parseEther("1.0"); // 1 ETH deposit

  // Deploy with ETH value
  const Escrow = await ethers.getContractFactory("SupplyChainEscrow");
  const escrow = await Escrow.deploy(
    sellerAddress,
    arbitratorAddress,
    deliveryDeadlineDays * 24 * 60 * 60, // Convert days to seconds
    { value: depositAmount }
  );

  await escrow.waitForDeployment();
  console.log(`
    Contract deployed!
    Address: ${await escrow.getAddress()}
    Buyer: ${buyer.address}
    Seller: ${sellerAddress}
    Arbitrator: ${arbitratorAddress}
    Deposit Amount: ${ethers.formatEther(depositAmount)} ETH
    Deadline: ${deliveryDeadlineDays} days from now
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});