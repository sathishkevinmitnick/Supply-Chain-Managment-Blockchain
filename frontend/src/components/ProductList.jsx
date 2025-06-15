import React from 'react';

const ProductList = ({ products }) => {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Blockchain Ledger</h2>
      {products.length === 0 ? (
        <p className="text-gray-500">No products in the chain yet</p>
      ) : (
        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={index} className="border rounded-lg p-4">
              <p><strong>Product ID:</strong> {product.productId}</p>
              <p><strong>Description:</strong> {product.description}</p>
              <p><strong>Owner:</strong> {product.owner}</p>
              {product.walletAddress && (
                <p className="text-sm text-gray-600">
                  Added by: {product.walletAddress.slice(0, 6)}...{product.walletAddress.slice(-4)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;