import { BrowserProvider } from 'ethers';

// Connect wallet and request account access
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const chainId = (await provider.getNetwork()).chainId.toString();
    
    // Store connection in localStorage with address
    localStorage.setItem('walletConnected', accounts[0]);
    
    return {
      address: accounts[0],
      signer,
      provider,
      chainId
    };
  } catch (err) {
    if (err.code === 4001) {
      // User rejected request
      throw new Error("Connection rejected by user");
    }
    console.error("Wallet connection error:", err);
    throw err;
  }
};

// Get current wallet state if already connected
export const getWalletState = async () => {
  if (!window.ethereum) return null;
  
  try {
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    
    if (accounts.length > 0) {
      const signer = await provider.getSigner();
      const chainId = (await provider.getNetwork()).chainId.toString();
      return {
        address: accounts[0],
        signer,
        provider,
        chainId
      };
    }
    return null;
  } catch (err) {
    console.error("Error getting wallet state:", err);
    return null;
  }
};

// Check for existing wallet connection in localStorage
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

// Disconnect wallet (just clears localStorage)
export const disconnectWallet = () => {
  localStorage.removeItem('walletConnected');
};

// Additional helper function to get chain ID
export const getChainId = async () => {
  if (!window.ethereum) return null;
  
  try {
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    return network.chainId.toString();
  } catch (err) {
    console.error("Error getting chain ID:", err);
    return null;
  }
};