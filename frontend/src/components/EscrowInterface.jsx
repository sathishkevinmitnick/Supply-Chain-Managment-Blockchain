import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { toast } from 'react-toastify';
import escrowABI from '../contracts/SupplyChainEscrow.json';

export default function EscrowInterface({ account, onSuccess }) {
  const [contract, setContract] = useState(null);
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
              rpcUrls: ["http://127.0.0.1:8545"]
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
      if (!window.ethereum) throw new Error("Please install MetaMask!");
      if (!account) throw new Error("Please connect wallet first");
      if (!contractAddress) throw new Error("Contract address not configured");

      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      
      // Verify network
      const network = await provider.getNetwork();
      if (network.chainId.toString() !== hardhatChainId) {
        const switched = await switchToHardhatNetwork(window.ethereum);
        if (!switched) {
          throw new Error(`Please switch to Hardhat network (Chain ID: ${hardhatChainId})`);
        }
      }

      const signer = await provider.getSigner();
      const escrow = new Contract(contractAddress, escrowABI.abi, signer);

      // Verify connection
      try {
        await escrow.buyer();
      } catch (err) {
        throw new Error("Failed to connect to contract");
      }

      setContract(escrow);
      toast.success("Escrow contract connected!");
    } catch (err) {
      console.error("Connection error:", err);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const executeContractMethod = async (methodName) => {
    try {
      if (!contract) throw new Error("Contract not connected");
      setIsLoading(true);
      
      const tx = await contract[methodName]();
      await tx.wait();
      
      toast.success(`${methodName} successful!`);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(`${methodName} error:`, err);
      toast.error(err.reason || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {!contract ? (
        <button
          onClick={connectContract}
          disabled={isLoading || !account}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isLoading
              ? 'bg-indigo-400 cursor-not-allowed'
              : account
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-400 cursor-not-allowed'
          } text-white`}
        >
          {isLoading ? 'Connecting...' : !account ? 'Connect Wallet First' : 'Connect Escrow Contract'}
        </button>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Connected Contract:
            </h2>
            <p className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">
              {contractAddress}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buyer Actions */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                Buyer Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => executeContractMethod('confirmDelivery')}
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    isLoading
                      ? 'bg-green-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  Confirm Delivery
                </button>
                <button
                  onClick={() => executeContractMethod('refundBuyer')}
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    isLoading
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  Request Refund
                </button>
              </div>
            </div>

            {/* Seller Actions */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                Seller Actions
              </h3>
              <button
                onClick={() => executeContractMethod('requestPayout')}
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                  isLoading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                Request Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}