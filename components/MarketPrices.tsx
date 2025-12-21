import React, { useState } from 'react';
import { TrendingUp, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { CropPrice } from '../types';

interface MarketPricesProps {
  language: 'en-US' | 'hi-IN';
}

const MarketPrices: React.FC<MarketPricesProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState('Punjab');
  const [cropFilters, setCropFilters] = useState('');

  const mockPrices: CropPrice[] = [
    { cropName: 'Wheat', currentPrice: 2500, minPrice: 2300, maxPrice: 2700, trend: 'up', region: 'Punjab', date: new Date().toLocaleDateString() },
    { cropName: 'Rice', currentPrice: 4200, minPrice: 4000, maxPrice: 4500, trend: 'stable', region: 'Punjab', date: new Date().toLocaleDateString() },
    { cropName: 'Corn', currentPrice: 1800, minPrice: 1700, maxPrice: 1900, trend: 'down', region: 'Punjab', date: new Date().toLocaleDateString() },
    { cropName: 'Cotton', currentPrice: 5500, minPrice: 5300, maxPrice: 5800, trend: 'up', region: 'Punjab', date: new Date().toLocaleDateString() },
  ];

  const handleFetch = async () => {
    setLoading(true);
    setTimeout(() => {
      const selectedCrops = cropFilters
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);

      const filtered = selectedCrops.length
        ? mockPrices.filter((p) => selectedCrops.includes(p.cropName.toLowerCase()))
        : mockPrices;

      setPrices(filtered.map((p) => ({ ...p, region })));
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <TrendingUp className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "बाजार मूल्य" : "Market Prices"}</h1>
        </div>
        <p className="text-purple-100">{isHindi ? "अपने क्षेत्र में वर्तमान फसल मूल्य और रुझान देखें" : "Check current crop prices and market trends in your region"}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "क्षेत्र" : "Region"}</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={isHindi ? "कोई भी क्षेत्र दर्ज करें" : "Enter any region"}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "फसलें (कॉमा से अलग करें)" : "Crops (comma-separated)"}</label>
            <input
              value={cropFilters}
              onChange={(e) => setCropFilters(e.target.value)}
              placeholder={isHindi ? "उदाहरण: गेहूँ, चावल" : "e.g., wheat, rice"}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>

        <button
          onClick={handleFetch}
          disabled={loading}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {isHindi ? "लोड हो रहा है..." : "Loading..."}
            </>
          ) : (
            isHindi ? "मूल्य लाएं" : "Fetch Prices"
          )}
        </button>
      </div>

      {prices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prices.map((price, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{price.cropName}</h3>
                  <p className="text-xs text-gray-500">₹ {price.currentPrice}/quintal • {price.region}</p>
                </div>
                <div className={`flex items-center ${price.trend === 'up' ? 'text-green-600' : price.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {price.trend === 'up' ? <ArrowUp className="w-5 h-5" /> : price.trend === 'down' ? <ArrowDown className="w-5 h-5" /> : '→'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 dark:bg-slate-700 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">{isHindi ? "न्यूनतम" : "Min"}</p>
                  <p className="font-bold">₹{price.minPrice}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">{isHindi ? "अधिकतम" : "Max"}</p>
                  <p className="font-bold">₹{price.maxPrice}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketPrices;
