import React, { useState } from 'react';
import { Sprout, ArrowRight, Loader2, Leaf } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onGuestLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGuestLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-agri-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 transition-colors duration-500 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-gray-100 dark:border-slate-700">
        
        {/* Header */}
        <div className="bg-agri-600 p-8 text-center relative overflow-hidden">
           {/* Decorative elements */}
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <Leaf className="absolute top-2 left-2 w-16 h-16 text-white transform -rotate-12" />
              <Leaf className="absolute bottom-[-10px] right-[-10px] w-24 h-24 text-white transform rotate-45" />
           </div>

           <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
               <Sprout className="w-10 h-10 text-agri-600" />
             </div>
             <h1 className="text-3xl font-bold text-white mb-1">AgriInsight AI</h1>
             <p className="text-agri-100 text-sm">Your Intelligent Farming Assistant</p>
           </div>
        </div>

        {/* Form */}
        <div className="p-8 pt-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-agri-500 focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="farmer@example.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <a href="#" className="text-xs font-semibold text-agri-600 hover:text-agri-700 dark:text-agri-400">Forgot?</a>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-agri-500 focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 bg-agri-600 hover:bg-agri-700 text-white font-bold rounded-xl shadow-lg shadow-agri-200 dark:shadow-none transition-all transform active:scale-[0.98] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-500"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
            <span className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Or</span>
            <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
          </div>

          <button 
            onClick={onGuestLogin}
            className="w-full py-3.5 bg-white dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Continue as Guest
          </button>

          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account? <a href="#" className="font-bold text-agri-600 dark:text-agri-400 hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;