const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain", function () {
  let supplyChain;

  beforeEach(async function () {
    const SupplyChain = await ethers.getContractFactory("SupplyChain");
    supplyChain = await SupplyChain.deploy(); // ✅ no `.deployed()` needed
  });

  it("Should add and retrieve products", async function () {
    await supplyChain.addProduct("P001", "Laptop");
    const product = await supplyChain.products(0);

    expect(product.productId).to.equal("P001");
    expect(product.description).to.equal("Laptop");
  });
});
