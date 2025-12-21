import React, { useState } from 'react';
import { Map, Plus, Loader2, MapPin } from 'lucide-react';
import { FarmLocation } from '../types';

interface MultiLocationsProps {
  language: 'en-US' | 'hi-IN';
}

const MultiLocations: React.FC<MultiLocationsProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [locations, setLocations] = useState<FarmLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', cropTypes: '', areaSize: 5 });

  const handleAdd = () => {
    const newLocation: FarmLocation = {
      id: Date.now().toString(),
      name: formData.name,
      latitude: 28.7041 + Math.random() * 0.5,
      longitude: 77.1025 + Math.random() * 0.5,
      cropTypes: formData.cropTypes.split(',').map(c => c.trim()),
      areaSize: formData.areaSize,
      createdAt: Date.now()
    };
    setLocations([...locations, newLocation]);
    setFormData({ name: '', cropTypes: '', areaSize: 5 });
    setShowForm(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <Map className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "बहु-स्थान प्रबंधक" : "Multi-Location Manager"}</h1>
        </div>
        <p className="text-emerald-100">{isHindi ? "अपने कई खेत स्थानों को प्रबंधित करें और तुलना करें" : "Manage multiple farm locations and compare conditions"}</p>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center"
      >
        <Plus className="w-5 h-5 mr-2" />
        {isHindi ? "नया स्थान जोड़ें" : "Add New Location"}
      </button>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 transition-colors">
          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "स्थान का नाम" : "Location Name"}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isHindi ? "जैसे: उत्तरी खेत" : "e.g., North Farm"}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "फसलें (अल्पविराम से अलग करें)" : "Crops (comma separated)"}</label>
            <input
              type="text"
              value={formData.cropTypes}
              onChange={(e) => setFormData({ ...formData, cropTypes: e.target.value })}
              placeholder={isHindi ? "गेहूँ, चावल, मकई" : "Wheat, Rice, Corn"}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{isHindi ? "क्षेत्रफल (हेक्टेयर)" : "Area (hectares)"}</label>
            <input
              type="number"
              value={formData.areaSize}
              onChange={(e) => setFormData({ ...formData, areaSize: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              {isHindi ? "जोड़ें" : "Add"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 font-medium"
            >
              {isHindi ? "रद्द करें" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {locations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg">{loc.name}</h3>
                    <p className="text-xs text-gray-500">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{isHindi ? "क्षेत्रफल" : "Area"}</p>
                  <p className="font-bold">{loc.areaSize} {isHindi ? "हेक्टेयर" : "hectares"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">{isHindi ? "फसलें" : "Crops"}</p>
                  <div className="flex flex-wrap gap-2">
                    {loc.cropTypes.map((crop, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {locations.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{isHindi ? "कोई स्थान जोड़ा नहीं गया है" : "No locations added yet"}</p>
        </div>
      )}
    </div>
  );
};

export default MultiLocations;
