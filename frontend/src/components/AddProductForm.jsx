import React, { useState } from 'react';

const AddProductForm = ({ onAddProduct }) => {
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productId || !description || !owner) {
      alert('Please fill in all fields');
      return;
    }
    onAddProduct({ productId, description, owner });
    // Clear form after submission
    setProductId('');
    setDescription('');
    setOwner('');
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Add New Product
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID
            </label>
            <input
              type="text"
              placeholder="P1001"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="Organic Apples"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner
            </label>
            <input
              type="text"
              placeholder="Farm Co."
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition duration-200"
        >
          ➕ Add Product
        </button>
      </form>
    </div>
  );
};

export default AddProductForm;