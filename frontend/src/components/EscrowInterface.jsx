import { useState } from 'react';
import { initContract } from '../utils/contract';
import { toast } from 'react-toastify';

export default function EscrowInterface() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [amount, setAmount] = useState('1');

  const connectContract = async () => {
    try {
      const escrow = await initContract();
      setContract(escrow);
      setAccount(await escrow.signer.getAddress());
      toast.success("Contract connected!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelivery = async () => {
    try {
      await contract.confirmDelivery();
      toast.success("Delivery confirmed!");
    } catch (err) {
      toast.error(err.reason || err.message);
    }
  };

  return (
    <div className="escrow-interface">
      {!contract ? (
        <button onClick={connectContract}>Connect Contract</button>
      ) : (
        <>
          <h2>Connected as: {account}</h2>
          
          <div className="action-section">
            <h3>Buyer Actions</h3>
            <button onClick={confirmDelivery}>Confirm Delivery</button>
            <button onClick={() => contract.refundBuyer()}>Request Refund</button>
          </div>

          <div className="action-section">
            <h3>Seller Actions</h3>
            <button onClick={() => contract.requestPayout()}>Request Payout</button>
          </div>
        </>
      )}
    </div>
  );
}