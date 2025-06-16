import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { toast } from 'react-toastify';
import escrowABI from '../contracts/SupplyChainEscrow.json';

export default function EscrowActions({ account, onSuccess }) {
  const [escrowContract, setEscrowContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const contractAddress = import.meta.env.VITE_ESCROW_ADDRESS;
  const hardhatChainId = import.meta.env.VITE_LOCAL_CHAIN_ID || "31337";

  const switchToHardhatNetwork = async (provider) => {
    try {
      await provider.send("wallet_switchEthereumChain", [
        { chainId: `0x${parseInt(hardhatChainId).toString(16)}` }
      ]);
      return true;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await provider.send("wallet_addEthereumChain", [
            {
              chainId: `0x${parseInt(hardhatChainId).toString(16)}`,
              chainName: "Hardhat Local Network",
              nativeCurrency: {
                name: "Ether",
                symbol: "ETH",
                decimals: 18
              },
              rpcUrls: ["http://127.0.0.1:8545"],
              blockExplorerUrls: []
            }
          ]);
          return true;
        } catch (addError) {
          console.error("Error adding Hardhat network:", addError);
          return false;
        }
      }
      console.error("Error switching to Hardhat network:", switchError);
      return false;
    }
  };

  const connectContract = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask!");
      }

      if (!account) {
        throw new Error("Please connect wallet first");
      }

      if (!contractAddress) {
        throw new Error("Contract address not configured");
      }

      setIsLoading(true);
      toast.info("Connecting to escrow contract...");

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      // Check if already on Hardhat network
      if (network.chainId.toString() !== hardhatChainId) {
        toast.info("Switching to Hardhat network...");
        const switched = await switchToHardhatNetwork(window.ethereum);
        if (!switched) {
          throw new Error(`Please switch to Hardhat network (Chain ID: ${hardhatChainId}) manually`);
        }
        // Refresh provider after network switch
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const signer = await provider.getSigner();

      // Create contract instance
      const contract = new Contract(
        contractAddress,
        escrowABI.abi,
        signer
      );

      // Test connection
      try {
        await contract.buyer();
      } catch (err) {
        console.error("Contract test call failed:", err);
        throw new Error("Failed to connect to contract - check ABI and address");
      }

      setEscrowContract(contract);
      toast.success("Escrow contract connected!");
      if (onSuccess) onSuccess();
      
      return contract;
    } catch (err) {
      console.error("Contract connection error:", err);
      toast.error(`Connection failed: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800">Escrow Actions</h2>
      
      {!escrowContract ? (
        <button
          onClick={connectContract}
          disabled={isLoading || !account}
          className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors
            ${isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : account 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400 cursor-not-allowed'}`}
        >
          {isLoading 
            ? 'Connecting...' 
            : !account 
              ? 'Connect Wallet First' 
              : 'Connect Escrow Contract'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Connected to contract: 
              <span className="font-mono block truncate">
                {contractAddress}
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              On Hardhat Network (Chain ID: {hardhatChainId})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}