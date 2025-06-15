import { ethers } from "ethers";

// No global variables - better state management

export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask");
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    
    // Store connection in localStorage with address
    localStorage.setItem('walletConnected', accounts[0]);
    
    return {
      address: accounts[0],
      signer,
      provider
    };
  } catch (err) {
    if (err.code === 4001) {
      // User rejected request
      throw new Error("Connection rejected by user");
    }
    throw err;
  }
};

export const getWalletState = async () => {
  if (!window.ethereum) return null;
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    
    if (accounts.length > 0) {
      const signer = provider.getSigner();
      return {
        address: accounts[0],
        signer,
        provider
      };
    }
    return null;
  } catch (err) {
    console.error("Error getting wallet state:", err);
    return null;
  }
};

export const checkWalletConnection = async () => {
  const storedAddress = localStorage.getItem('walletConnected');
  if (!storedAddress) return null;

  const state = await getWalletState();
  if (state && state.address.toLowerCase() === storedAddress.toLowerCase()) {
    return state;
  }
  
  // Clear storage if address doesn't match
  localStorage.removeItem('walletConnected');
  return null;
};

export const disconnectWallet = () => {
  localStorage.removeItem('walletConnected');
};