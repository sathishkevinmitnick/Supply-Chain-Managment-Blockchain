import React, { useState, useEffect, useMemo } from "react";
import WalletConnect from "./components/WalletConnect";
import { fetchWithErrorHandling } from './utils/api';
import { connectWallet, getWalletState } from "./utils/wallet";
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import EscrowActions from './components/EscrowActions';
import EscrowInterface from './components/EscrowInterface';

export default function App() {
  // Form and application state
  const [formData, setFormData] = useState({
    productId: "",
    description: "",
    owner: ""
  });
  const [eventForm, setEventForm] = useState({
    productId: "",
    eventType: "Production Start",
    key: "",
    value: ""
  });
  const [chain, setChain] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("products");
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showQRCodes, setShowQRCodes] = useState(false);
  const [qrLoading, setQrLoading] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  
  const filteredChain = useMemo(() => 
    chain.filter((block) =>
      JSON.stringify(block.data).toLowerCase().includes(search.toLowerCase())
    ),
    [chain, search]
  );

  // Enhanced Analytics data
  const analyticsData = useMemo(() => {
    const totalProducts = chain.length;
    const totalEvents = events.length;
    const avgEventsPerProduct = totalProducts > 0 ? (totalEvents / totalProducts).toFixed(1) : 0;
    
    const eventTypeDistribution = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    // New analytics metrics
    const recentEvents = events.slice(-5).reverse();
    const productLocations = {};
    const temperatureStats = { min: Infinity, max: -Infinity, avg: 0 };
    let tempSum = 0;
    let tempCount = 0;

    events.forEach(event => {
      if (event.key?.toLowerCase() === 'location') {
        productLocations[event.productId] = event.value;
      }
      if (event.key?.toLowerCase() === 'temperature' && !isNaN(event.value)) {
        const temp = parseFloat(event.value);
        temperatureStats.min = Math.min(temperatureStats.min, temp);
        temperatureStats.max = Math.max(temperatureStats.max, temp);
        tempSum += temp;
        tempCount++;
      }
    });

    if (tempCount > 0) {
      temperatureStats.avg = (tempSum / tempCount).toFixed(2);
    } else {
      temperatureStats.min = 'N/A';
      temperatureStats.max = 'N/A';
      temperatureStats.avg = 'N/A';
    }

    const alertEvents = events.filter(e => e.eventType === 'Alert');
    const shipmentEvents = events.filter(e => e.eventType === 'Shipment');
    const avgShipmentDuration = shipmentEvents.length > 1 ? 
      (new Date(shipmentEvents[shipmentEvents.length - 1].timestamp) - 
       new Date(shipmentEvents[0].timestamp)) / (1000 * 60 * 60 * 24) : 0;
    
    return {
      totalProducts,
      totalEvents,
      avgEventsPerProduct,
      eventTypeDistribution,
      activeAlerts: alertEvents.length,
      recentEvents,
      productLocations,
      temperatureStats,
      avgShipmentDuration: avgShipmentDuration.toFixed(1),
      eventTimeline: events.map(e => ({
        date: new Date(e.timestamp).toLocaleDateString(),
        type: e.eventType,
        product: e.productId
      }))
    };
  }, [chain, events]);

  // Initialize wallet connection and fetch data on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize wallet
        const wallet = await getWalletState();
        if (wallet?.address) {
          setAccount(wallet.address);
          toast.success("Wallet connected successfully!");
        }

        // Fetch initial data
        await fetchChain();
        await fetchEvents();
      } catch (err) {
        console.error("Initialization error:", err);
        toast.error("Failed to initialize application. Please refresh the page.");
      }
    };

    initApp();

    // Add wallet event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      // Cleanup event listeners
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Wallet event handlers
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      toast.info("Wallet disconnected");
    } else if (account !== accounts[0]) {
      setAccount(accounts[0]);
      toast.success("Wallet account changed");
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  // Data fetching with improved error handling
  const fetchChain = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await fetchWithErrorHandling(`${API_URL}/chain`);
      setChain(data);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch chain:", err);
      setChain([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const data = await fetchWithErrorHandling(`${API_URL}/events`);
      setEvents(data);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch events:", err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet connection
  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const { address } = await connectWallet();
      setAccount(address);
      setError("");
      toast.success("Wallet connected successfully!");
    } catch (err) {
      setError(err.message);
      console.error("Error connecting wallet:", err);
      toast.error(`Wallet connection failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Form handling
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.description || !formData.owner) {
      setError("Please fill in all fields");
      toast.warn("Please fill in all fields");
      return;
    }

    try {
      const currentWallet = await getWalletState();
      if (!currentWallet?.address) {
        throw new Error("Wallet connection lost. Please reconnect.");
      }

      setIsLoading(true);
      setError("");
      setSuccessMessage("");

      const toastId = toast.loading("Adding product to the blockchain...");

      await fetchWithErrorHandling(`${API_URL}/addProduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData,
          walletAddress: currentWallet.address 
        }),
      });

      toast.update(toastId, {
        render: "Product successfully added to the chain!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setFormData({ productId: "", description: "", owner: "" });
      await fetchChain();
    } catch (err) {
      setError(err.message);
      console.error("Error adding product:", err);
      toast.error(`Failed to add product: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    
    if (!eventForm.productId || !eventForm.eventType) {
      setError("Please select a product and event type");
      toast.warn("Please select a product and event type");
      return;
    }

    try {
      const currentWallet = await getWalletState();
      if (!currentWallet?.address) {
        throw new Error("Wallet connection lost. Please reconnect.");
      }

      setIsLoading(true);
      setError("");
      setSuccessMessage("");

      const toastId = toast.loading("Adding event to the blockchain...");

      await fetchWithErrorHandling(`${API_URL}/addEvent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...eventForm,
          walletAddress: currentWallet.address,
          timestamp: new Date().toISOString()
        }),
      });

      toast.update(toastId, {
        render: "Event successfully added!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setEventForm({
        productId: "",
        eventType: "Production Start",
        key: "",
        value: ""
      });
      await fetchEvents();
    } catch (err) {
      setError(err.message);
      console.error("Error adding event:", err);
      toast.error(`Failed to add event: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // QR Code functions
  const downloadQRCode = async (blockData) => {
    try {
      setQrLoading(prev => ({...prev, [blockData.productId]: true}));
      
      const toastId = toast.loading("Generating QR code...");

      const svg = document.getElementById(`qr-${blockData.productId}`);
      if (!svg) throw new Error("QR Code element not found");

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            saveAs(blob, `product-${blockData.productId}-qrcode.png`);
            resolve();
          });
        };
        
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
      });

      toast.update(toastId, {
        render: "QR code downloaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error("Error downloading QR code:", err);
      toast.error("Failed to download QR code");
    } finally {
      setQrLoading(prev => ({...prev, [blockData.productId]: false}));
    }
  };

  // Render functions for different tabs
  const renderProductsTab = () => (
    <>
      <form onSubmit={handleAdd} className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Add New Product
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID
            </label>
            <input
              type="text"
              name="productId"
              placeholder="P1001"
              value={formData.productId}
              onChange={handleInputChange}
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
              name="description"
              placeholder="Organic Apples"
              value={formData.description}
              onChange={handleInputChange}
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
              name="owner"
              placeholder="Sathish Kevin"
              value={formData.owner}
              onChange={handleInputChange}
              className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-semibold transition duration-200 flex items-center justify-center gap-2 ${
            isLoading
              ? "bg-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          } text-white`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            "➕ Add Product"
          )}
        </button>
      </form>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search Products
        </label>
        <input
          type="text"
          placeholder="Search by ID, Description, or Owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-3 shadow-sm focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">
            🔗 Blockchain Ledger
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowQRCodes(!showQRCodes)}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              {showQRCodes ? 'Hide QR Codes' : 'Show QR Codes'}
            </button>
            <button
              onClick={fetchChain}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {isLoading && chain.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredChain.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-500">
              {search ? "No matching products found" : "No products in the chain yet"}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg shadow-inner max-h-96 overflow-y-auto text-sm space-y-4">
            {filteredChain.map((block) => (
              <div key={block.hash} className="p-4 border rounded-md bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-900">🔢 Block #{block.index}</p>
                    <p className="text-gray-600"><span className="font-medium">🕒 Timestamp:</span> {new Date(block.timestamp).toLocaleString()}</p>
                    <p className="text-gray-600"><span className="font-medium">📦 Product ID:</span> {block.data.productId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600"><span className="font-medium">📝 Description:</span> {block.data.description}</p>
                    <p className="text-gray-600"><span className="font-medium">👤 Owner:</span> {block.data.owner}</p>
                    {block.data.walletAddress && (
                      <p className="text-gray-600 text-xs mt-1">
                        <span className="font-medium">Wallet:</span> {`${block.data.walletAddress.slice(0, 6)}...${block.data.walletAddress.slice(-4)}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-xs">
                  <p className="truncate"><span className="font-medium">🔗 Previous Hash:</span> {block.previousHash}</p>
                  <p className="truncate"><span className="font-medium">🔐 Hash:</span> {block.hash}</p>
                </div>
                
                {showQRCodes && (
                  <div className="mt-4 pt-4 border-t flex flex-col items-center">
                    <div className="relative">
                      <QRCodeSVG
                        id={`qr-${block.data.productId}`}
                        value={JSON.stringify({
                          productId: block.data.productId,
                          description: block.data.description,
                          owner: block.data.owner,
                          timestamp: block.timestamp,
                          blockIndex: block.index,
                          walletAddress: block.data.walletAddress
                        })}
                        size={128}
                        level="H"
                        includeMargin={true}
                      />
                      {qrLoading[block.data.productId] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => downloadQRCode(block.data)}
                      className="mt-2 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded transition-colors"
                      disabled={qrLoading[block.data.productId]}
                    >
                      {qrLoading[block.data.productId] ? 'Generating...' : 'Download QR'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Scan to verify product authenticity
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderEventsTab = () => (
    <div className="space-y-8">
      <form onSubmit={handleAddEvent} className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Add Event
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID
            </label>
            <select
              name="productId"
              value={eventForm.productId}
              onChange={handleEventInputChange}
              className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Product</option>
              {chain.map((block) => (
                <option key={block.data.productId} value={block.data.productId}>
                  {block.data.productId} - {block.data.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              name="eventType"
              value={eventForm.eventType}
              onChange={handleEventInputChange}
              className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="Production Start">Production Start</option>
              <option value="Quality Check">Quality Check</option>
              <option value="Shipment">Shipment</option>
              <option value="Storage">Storage</option>
              <option value="Delivery">Delivery</option>
              <option value="Alert">Alert</option>
            </select>
          </div>
          <div className="sm:col-span-3 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key (e.g., temperature)
              </label>
              <input
                type="text"
                name="key"
                placeholder="e.g., temperature"
                value={eventForm.key}
                onChange={handleEventInputChange}
                className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value (e.g., 25°C)
              </label>
              <input
                type="text"
                name="value"
                placeholder="e.g., 25°C"
                value={eventForm.value}
                onChange={handleEventInputChange}
                className="border rounded-lg p-3 w-full shadow-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-semibold transition duration-200 flex items-center justify-center gap-2 ${
            isLoading
              ? "bg-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          } text-white`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            "➕ Add Event"
          )}
        </button>
      </form>

      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Event Timeline
        </h2>
        
        {isLoading && events.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-500">No events recorded yet</p>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg shadow-inner max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={index} className="p-4 border rounded-md bg-white shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {event.productId} - {event.eventType}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.key && event.value && (
                        <p className="text-gray-600 mt-1">
                          <span className="font-medium">{event.key}:</span> {event.value}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {event.eventType}
                    </span>
                  </div>
                  {event.walletAddress && (
                    <p className="text-xs text-gray-500 mt-2">
                      Recorded by: {`${event.walletAddress.slice(0, 6)}...${event.walletAddress.slice(-4)}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Condition Monitoring
        </h2>
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp (°C)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Humidity (%)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shock (g)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Light (lux)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chain.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-gray-500">No products available</td>
                </tr>
              ) : (
                chain.map((block) => {
                  const productEvents = events.filter(e => e.productId === block.data.productId);
                  const tempEvent = productEvents.find(e => e.key?.toLowerCase() === 'temperature');
                  const humidityEvent = productEvents.find(e => e.key?.toLowerCase() === 'humidity');
                  const shockEvent = productEvents.find(e => e.key?.toLowerCase() === 'shock');
                  const lightEvent = productEvents.find(e => e.key?.toLowerCase() === 'light');
                  const locationEvent = productEvents.find(e => e.key?.toLowerCase() === 'location');

                  return (
                    <tr key={block.data.productId}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {block.data.productId}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {tempEvent?.value || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {humidityEvent?.value || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {shockEvent?.value || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {lightEvent?.value || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {locationEvent?.value || 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          📊 Analytics Dashboard
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
              <p className="text-3xl font-semibold text-indigo-600">{analyticsData.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">Tracked in blockchain</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
              <p className="text-3xl font-semibold text-indigo-600">{analyticsData.totalEvents}</p>
              <p className="text-xs text-gray-500 mt-1">Across all products</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-medium text-gray-500">Avg Events/Product</h3>
              <p className="text-3xl font-semibold text-indigo-600">{analyticsData.avgEventsPerProduct}</p>
              <p className="text-xs text-gray-500 mt-1">Detailed tracking</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-medium text-gray-500">Active Alerts</h3>
              <p className="text-3xl font-semibold text-indigo-600">{analyticsData.activeAlerts}</p>
              <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Event Type Distribution</h3>
              <div className="space-y-2">
                {Object.entries(analyticsData.eventTypeDistribution).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Temperature Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Min</p>
                  <p className="text-xl font-semibold text-blue-600">{analyticsData.temperatureStats.min}°C</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Average</p>
                  <p className="text-xl font-semibold text-blue-600">{analyticsData.temperatureStats.avg}°C</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Max</p>
                  <p className="text-xl font-semibold text-blue-600">{analyticsData.temperatureStats.max}°C</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Shipment Performance</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Shipments</p>
                  <p className="text-xl font-semibold text-indigo-600">
                    {events.filter(e => e.eventType === 'Shipment').length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Shipment Duration</p>
                  <p className="text-xl font-semibold text-indigo-600">
                    {analyticsData.avgShipmentDuration} days
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Product Locations</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(analyticsData.productLocations).map(([productId, location]) => (
                  <div key={productId} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{productId}</span>
                    <span className="text-gray-500">{location || 'Unknown'}</span>
                  </div>
                ))}
                {Object.keys(analyticsData.productLocations).length === 0 && (
                  <p className="text-gray-500 text-sm">No location data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Recent Activity Timeline
        </h2>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          {analyticsData.recentEvents.length === 0 ? (
            <p className="text-gray-500">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {analyticsData.recentEvents.map((event, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      {event.productId} - {event.eventType}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.key && event.value && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">{event.key}:</span> {event.value}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 font-sans">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Supply Chain Tracker
            </h1>
            <WalletConnect 
              account={account} 
              onConnect={handleConnect}
              isLoading={isLoading}
            />
          </div>

          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("products")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "products"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "events"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "analytics"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("escrow")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "escrow"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Escrow
              </button>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className={`${activeTab === 'escrow' ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
              {activeTab === "products" && renderProductsTab()}
              {activeTab === "events" && renderEventsTab()}
              {activeTab === "analytics" && renderAnalyticsTab()}
              {activeTab === "escrow" && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <EscrowInterface 
                    account={account}
                    onSuccess={() => {
                      toast.success("Escrow transaction completed!");
                      fetchChain();
                    }}
                  />
                </div>
              )}
            </div>
            
            {activeTab !== 'escrow' && (
              <div className="lg:col-span-1">
                <div className="sticky top-4">
                  <EscrowActions 
                    account={account}
                    onSuccess={() => {
                      toast.success("Escrow transaction completed!");
                      fetchChain();
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}