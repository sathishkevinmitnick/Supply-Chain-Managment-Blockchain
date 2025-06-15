import { useState } from 'react';
import { ethers } from "ethers";
import { toast } from "react-toastify";
import escrowABI from "../contracts/SupplyChainEscrow.json"; // Import ABI

export default function EscrowActions({ account, onSuccess }) {
  const [escrowContract, setEscrowContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const contractAddress = import.meta.env.VITE_ESCROW_ADDRESS; // From .env

  // 1. Initialize Contract Connection
  const connectContract = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed!");
      }

      if (!account) {
        throw new Error("Please connect wallet first");
      }

      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check if already connected
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        escrowABI.abi, // Use the ABI field from JSON
        signer
      );

      // Verify the contract is correctly connected
      try {
        await contract.buyer(); // Simple read call to verify connection
      } catch (err) {
        throw new Error("Failed to verify contract connection");
      }

      setEscrowContract(contract);
      toast.success("Escrow contract connected!");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Contract connection error:", err);
      toast.error(`Connection failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Confirm Delivery Function
  const confirmDelivery = async () => {
    if (!escrowContract) {
      toast.warning("Please connect contract first");
      return;
    }

    try {
      setIsLoading(true);
      const toastId = toast.loading("Confirming delivery...");
      
      const tx = await escrowContract.confirmDelivery();
      await tx.wait(); // Wait for transaction confirmation
      
      toast.update(toastId, {
        render: "✅ Payment released to seller!",
        type: "success",
        isLoading: false,
        autoClose: 5000
      });
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Delivery confirmation error:", err);
      toast.error(`❌ Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Request Payout Function
  const requestPayout = async () => {
    if (!escrowContract) {
      toast.warning("Please connect contract first");
      return;
    }

    try {
      setIsLoading(true);
      const toastId = toast.loading("Requesting payout...");
      
      const tx = await escrowContract.requestPayout();
      await tx.wait();
      
      toast.update(toastId, {
        render: "🕒 Payout requested. Arbitrator will review.",
        type: "info",
        isLoading: false,
        autoClose: 5000
      });
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Payout request error:", err);
      toast.error(`❌ Failed: ${err.reason || err.message}`);
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
          <button
            onClick={confirmDelivery}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isLoading ? 'Processing...' : 'Confirm Delivery'}
          </button>
          
          <button
            onClick={requestPayout}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {isLoading ? 'Processing...' : 'Request Payout'}
          </button>
          
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Connected to contract: 
              <span className="font-mono block truncate">
                {contractAddress}
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Using account: 
              <span className="font-mono block truncate">
                {account}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}