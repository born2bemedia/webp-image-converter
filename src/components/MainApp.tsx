'use client';

import { useState } from 'react';
import ImageConverter from './ImageConverter';
import ImageResizer from './ImageResizer';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<'converter' | 'resizer'>('converter');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex py-4 gap-3 ">
            <button
              onClick={() => setActiveTab('converter')}
              className={`flex-1 w-1/2 md:w-auto md:flex-none px-3 md:px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform ${
                activeTab === 'converter'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl scale-105'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-102'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className='text-sm md:text-base'>WebP Converter</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('resizer')}
              className={`flex-1 w-1/2 md:w-auto md:flex-none px-3 md:px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform ${
                activeTab === 'resizer'
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-2xl scale-105'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-102'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>Image Resizer</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="transition-all duration-500">
        {activeTab === 'converter' ? <ImageConverter /> : <ImageResizer />}
      </div>
    </div>
  );
}
