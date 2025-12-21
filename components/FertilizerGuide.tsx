import React, { useState } from 'react';
import { Beaker, Loader2, Search } from 'lucide-react';
import { FertilizerGuide } from '../types';

interface FertilizerGuideProps {
  language: 'en-US' | 'hi-IN';
}

const FertilizerGuideComp: React.FC<FertilizerGuideProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [fertilizers, setFertilizers] = useState<FertilizerGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [cropType, setCropType] = useState('wheat');

  const mockFertilizers: { [key: string]: FertilizerGuide[] } = {
    wheat: [
      {
        name: 'NPK 10:26:26',
        type: 'chemical',
        cropSuitable: ['Wheat', 'Rice', 'Corn'],
        dosage: '100-150 kg/hectare',
        applicationTime: 'At planting',
        safetyPrecautions: ['Wear gloves', 'Avoid dust inhalation', 'Store in dry place'],
        cost: '₹5000-6000/bag'
      },
      {
        name: 'Compost/FYM',
        type: 'organic',
        cropSuitable: ['All crops'],
        dosage: '10-15 tons/hectare',
        applicationTime: 'Before planting',
        safetyPrecautions: ['Fully decomposed', 'Free from weed seeds'],
        cost: '₹2000-3000/load'
      },
      {
        name: 'Urea',
        type: 'chemical',
        cropSuitable: ['Wheat', 'Rice', 'Corn'],
        dosage: '100-120 kg/hectare',
        applicationTime: 'In splits - 50% at planting, 50% at tillering',
        safetyPrecautions: ['Use in adequate moisture', 'Avoid direct contact'],
        cost: '₹3500-4000/bag'
      }
    ]
  };

  const handleSearch = async () => {
    setLoading(true);
    setTimeout(() => {
      const primaryCrop = cropType.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)[0] || 'wheat';
      setFertilizers(mockFertilizers[primaryCrop] || mockFertilizers.wheat);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-lime-600 to-lime-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <Beaker className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "खाद गाइड" : "Fertilizer Guide"}</h1>
        </div>
        <p className="text-lime-100">{isHindi ? "अपनी फसल के लिए सही खाद और खुराक खोजें" : "Find the right fertilizer with dosage and application guidelines"}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 transition-colors">
        <div>
          <label className="block text-sm font-medium mb-2">{isHindi ? "फसल (कॉमा से अलग करें)" : "Crop (comma-separated)"}</label>
          <input
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            placeholder={isHindi ? "उदाहरण: गेहूँ, मक्का" : "e.g., wheat, corn"}
            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full px-6 py-3 bg-lime-600 text-white rounded-xl hover:bg-lime-700 disabled:bg-gray-400 font-medium flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {isHindi ? "खोज रहे हैं..." : "Searching..."}
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              {isHindi ? "खाद खोजें" : "Find Fertilizers"}
            </>
          )}
        </button>
      </div>

      {fertilizers.length > 0 && (
        <div className="space-y-4">
          {fertilizers.map((fert, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{fert.name}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded mt-1 inline-block ${
                    fert.type === 'organic' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {fert.type.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-bold text-lime-600">{fert.cost}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{isHindi ? "खुराक" : "Dosage"}</p>
                  <p className="font-semibold">{fert.dosage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{isHindi ? "आवेदन समय" : "Application Time"}</p>
                  <p className="font-semibold">{fert.applicationTime}</p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">{isHindi ? "सुरक्षा सावधानियां" : "Safety Precautions"}</p>
                <ul className="text-sm space-y-1">
                  {fert.safetyPrecautions.map((precaution, j) => (
                    <li key={j} className="flex items-center">
                      <span className="text-lime-600 mr-2">✓</span>
                      {precaution}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">{isHindi ? "उपयुक्त फसलें" : "Suitable Crops"}</p>
                <div className="flex flex-wrap gap-2">
                  {fert.cropSuitable.map((crop, j) => (
                    <span key={j} className="bg-gray-100 dark:bg-slate-700 text-xs px-2 py-1 rounded">
                      {crop}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FertilizerGuideComp;
