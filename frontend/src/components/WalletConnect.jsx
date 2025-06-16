import React, { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

const WalletConnect = () => {
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize provider instance (ethers v6)
  const getProvider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new BrowserProvider(window.ethereum);
    }
    return null;
  };

  const checkIfWalletIsConnected = async () => {
    try {
      const provider = getProvider();
      if (!provider) {
        setError("Please install MetaMask");
        return;
      }

      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        const address = accounts[0];
        setAccount(address);
        localStorage.setItem('walletAddress', address);
        
        const network = await provider.getNetwork();
        setNetwork(network.name);
      }
    } catch (err) {
      console.error("Error checking wallet connection:", err);
      setError(err.message);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError("");

      const provider = getProvider();
      if (!provider) {
        throw new Error("Please install MetaMask");
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      
      setAccount(accounts[0]);
      setNetwork(network.name);
      localStorage.setItem('walletAddress', accounts[0]);
    } catch (err) {
      setError(err.message);
      console.error("Error connecting wallet:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAccount("");
    setNetwork("");
    localStorage.removeItem('walletAddress');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(account);
    alert("Wallet address copied to clipboard!");
  };

  useEffect(() => {
    // Check for existing connection on mount
    const storedAddress = localStorage.getItem('walletAddress');
    if (storedAddress) {
      checkIfWalletIsConnected();
    }

    // Set up event listeners (updated for ethers v6)
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          handleDisconnect();
        } else {
          setAccount(accounts[0]);
          localStorage.setItem('walletAddress', accounts[0]);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="text-red-500 text-xs text-right animate-pulse">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        {account && (
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {network}
            </span>
            <div 
              className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
              onClick={copyToClipboard}
              title="Click to copy"
            >
              <span className="text-sm font-medium">
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </div>
          </div>
        )}

        <button
          onClick={account ? handleDisconnect : handleConnect}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            account 
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {account ? "Disconnecting..." : "Connecting..."}
            </>
          ) : (
            <>
              {account ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Disconnect
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect Wallet
                </>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WalletConnect;