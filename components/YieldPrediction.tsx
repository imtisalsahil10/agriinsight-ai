import React, { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { YieldPrediction } from '../types';

interface YieldPredictionProps {
  language: 'en-US' | 'hi-IN';
}

const YieldPredictionComp: React.FC<YieldPredictionProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({ cropType: 'wheat', area: 5, rainfallDays: 25, temperature: 22 });

  const handlePredict = async () => {
    setLoading(true);
    setTimeout(() => {
      const primaryCrop = inputs.cropType.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)[0] || 'wheat';
      const baseYields: { [key: string]: number } = { wheat: 50, rice: 60, corn: 70 };
      const baseYield = baseYields[primaryCrop] || 50;
      const rainfallFactor = inputs.rainfallDays / 30;
      const expectedYield = baseYield * inputs.area * (0.5 + rainfallFactor * 0.5);

      setPrediction({
        cropType: primaryCrop,
        expectedYield: Math.round(expectedYield),
        unit: 'quintals',
        qualityGrade: inputs.rainfallDays > 20 && inputs.temperature > 20 ? 'A' : 'B',
        confidence: 75 + Math.random() * 15,
        factors: [
          { name: 'Rainfall', impact: inputs.rainfallDays > 20 ? 'positive' : 'negative', value: `${inputs.rainfallDays} days` },
          { name: 'Temperature', impact: inputs.temperature > 20 ? 'positive' : 'negative', value: `${inputs.temperature}°C` },
          { name: 'Soil Quality', impact: 'positive', value: 'Good' },
          { name: 'Crop Variety', impact: 'positive', value: 'High-yield' }
        ]
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <Zap className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "पैदावार भविष्यवाणी" : "Yield Prediction"}</h1>
        </div>
        <p className="text-yellow-100">{isHindi ? "मौजूदा परिस्थितियों के आधार पर अपनी पैदावार का अनुमान लगाएं" : "Predict your crop yield based on current conditions"}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "फसल (कॉमा से अलग करें)" : "Crop (comma-separated)"}</label>
            <input
              value={inputs.cropType}
              onChange={(e) => setInputs({ ...inputs, cropType: e.target.value })}
              placeholder={isHindi ? "उदाहरण: गेहूँ, चावल" : "e.g., wheat, rice"}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "क्षेत्रफल (हेक्टेयर)" : "Area (hectares)"}</label>
            <input
              type="number"
              value={inputs.area}
              onChange={(e) => setInputs({ ...inputs, area: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "वर्षा के दिन" : "Rainfall Days"}</label>
            <input
              type="number"
              min="0"
              max="30"
              value={inputs.rainfallDays}
              onChange={(e) => setInputs({ ...inputs, rainfallDays: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "औसत तापमान (°C)" : "Avg Temperature (°C)"}</label>
            <input
              type="number"
              value={inputs.temperature}
              onChange={(e) => setInputs({ ...inputs, temperature: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading}
          className="w-full px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {isHindi ? "भविष्यवाणी..." : "Predicting..."}
            </>
          ) : (
            isHindi ? "भविष्यवाणी करें" : "Predict Yield"
          )}
        </button>
      </div>

      {prediction && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-xl text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{isHindi ? "अपेक्षित पैदावार" : "Expected Yield"}</p>
              <p className="text-3xl font-bold text-yellow-600">{prediction.expectedYield}</p>
              <p className="text-xs text-gray-600">{prediction.unit}</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-xl text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{isHindi ? "गुणवत्ता श्रेणी" : "Quality Grade"}</p>
              <p className="text-3xl font-bold text-orange-600">{prediction.qualityGrade}</p>
              <p className="text-xs text-gray-600">{isHindi ? "उत्कृष्ट" : "Excellent"}</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-xl text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{isHindi ? "विश्वास" : "Confidence"}</p>
              <p className="text-3xl font-bold text-amber-600">{prediction.confidence.toFixed(0)}%</p>
              <p className="text-xs text-gray-600">{isHindi ? "उच्च" : "High"}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl transition-colors">
            <h3 className="font-bold mb-4">{isHindi ? "प्रभावशाली कारक" : "Influencing Factors"}</h3>
            <div className="space-y-3">
              {prediction.factors.map((factor, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{factor.name}</p>
                    <p className="text-xs text-gray-500">{factor.value}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    factor.impact === 'positive' ? 'bg-green-100 text-green-800' :
                    factor.impact === 'negative' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {factor.impact === 'positive' ? '↑' : factor.impact === 'negative' ? '↓' : '→'} {factor.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YieldPredictionComp;
