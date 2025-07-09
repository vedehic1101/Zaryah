import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { getConnectionStatus, reconnect, healthCheck } from '../lib/supabase';

export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [isVisible, setIsVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const currentStatus = getConnectionStatus();
      setStatus(currentStatus);
      setIsVisible(currentStatus === 'failed' || currentStatus === 'connecting');
    };

    // Check status immediately
    checkStatus();

    // Check status every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    reconnect();
    
    // Wait a bit and check status
    setTimeout(() => {
      setStatus(getConnectionStatus());
      setIsRetrying(false);
      // Hide if connected
      if (getConnectionStatus() === 'connected') {
        setTimeout(() => setIsVisible(false), 2000);
      }
    }, 2000);
  };

  const handleManualCheck = async () => {
    setIsRetrying(true);
    const { healthy } = await healthCheck();
    setStatus(healthy ? 'connected' : 'failed');
    setIsRetrying(false);
    
    // Hide if connected
    if (healthy) {
      setTimeout(() => setIsVisible(false), 2000);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 right-4 z-50 max-w-sm"
      >
        <div className={`rounded-xl shadow-lg border p-4 ${
          status === 'connected' 
            ? 'bg-green-50 border-green-200' 
            : status === 'connecting'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {status === 'connected' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : status === 'connecting' ? (
                <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-semibold ${
                status === 'connected' ? 'text-green-900' :
                status === 'connecting' ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {status === 'connected' ? 'Connected' : 
                 status === 'connecting' ? 'Connecting...' : 'Connection Failed'}
              </h3>
              <p className={`text-sm mt-1 ${
                status === 'connected' ? 'text-green-700' :
                status === 'connecting' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {status === 'connected' ? 'Database connection is working properly.' :
                 status === 'connecting' ? 'Attempting to connect to the database...' :
                 'Unable to connect to the database. Some features may not work.'}
              </p>
              
              {status === 'failed' && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                  <button
                    onClick={handleManualCheck}
                    disabled={isRetrying}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check Status
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsVisible(false)}
              className={`flex-shrink-0 hover:opacity-75 ${
                status === 'connected' ? 'text-green-400' :
                status === 'connecting' ? 'text-yellow-400' : 'text-red-400'
              }`}
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 