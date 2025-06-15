import { ethers } from 'ethers';

// Full Contract ABI
const SupplyChainEscrowABI = [
  // Constructor
  {
    "inputs": [
      { "internalType": "address", "name": "_seller", "type": "address" },
      { "internalType": "address", "name": "_arbitrator", "type": "address" },
      { "internalType": "uint256", "name": "_deliveryDeadline", "type": "uint256" }
    ],
    "stateMutability": "payable",
    "type": "constructor"
  },
  
  // View Functions
  {
    "inputs": [],
    "name": "amount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "arbitrator",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyer",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyerConfirmedDelivery",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deliveryDeadline",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "seller",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sellerRequestedPayout",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "state",
    "outputs": [{ "internalType": "enum SupplyChainEscrow.State", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },

  // Transaction Functions
  {
    "inputs": [],
    "name": "confirmDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lockFunds",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "refundBuyer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bool", "name": "releaseToSeller", "type": "bool" }],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Configuration
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const LOCAL_RPC_URL = "http://localhost:8545";

/**
 * Initialize contract with MetaMask provider
 * @returns {Promise<ethers.Contract>} Connected contract instance
 * @throws {Error} If MetaMask is not installed or connection fails
 */
export async function initContract() {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask extension not detected");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Handle chain changes
    window.ethereum.on('chainChanged', () => window.location.reload());
    
    // Request account access
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts available");
    }

    const signer = await provider.getSigner();
    return createContractInstance(signer);
    
  } catch (error) {
    console.error("Contract initialization failed:", error);
    throw new Error(`Contract connection error: ${error.message}`);
  }
}

/**
 * Create read-only contract instance
 * @param {ethers.Provider} provider - Ethers provider instance
 * @returns {ethers.Contract} Contract instance
 */
export function getContract(provider) {
  if (!provider) {
    throw new Error("Provider cannot be null");
  }
  return createContractInstance(provider);
}

/**
 * Connect to local Hardhat node
 * @param {string} [url=LOCAL_RPC_URL] - RPC endpoint URL
 * @returns {ethers.Contract} Contract instance
 */
export function getLocalContract(url = LOCAL_RPC_URL) {
  const provider = new ethers.JsonRpcProvider(url);
  return getContract(provider);
}

/**
 * Create contract instance with signer/provider
 * @private
 * @param {ethers.Signer|ethers.Provider} signerOrProvider 
 * @returns {ethers.Contract} 
 */
function createContractInstance(signerOrProvider) {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    SupplyChainEscrowABI,
    signerOrProvider
  );
}

// Export ABI and address for direct use
export { SupplyChainEscrowABI as abi, CONTRACT_ADDRESS as address };