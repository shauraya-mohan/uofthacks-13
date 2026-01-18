import React from 'react';
import Globe from './Globe'; // Adjust path as needed

interface LandingPageProps {
    onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
    return (
        <div className="relative w-screen h-screen bg-[#0f0f0f] overflow-hidden flex flex-col md:flex-row items-center justify-center">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

            {/* Content Section */}
            <div className="z-10 flex flex-col items-center md:items-start text-center md:text-left p-8 md:pl-20 max-w-2xl animate-slide-in">
                <h1 className="text-5xl md:text-8xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-200 to-white animate-fade-in-up">
                    Communify
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-lg leading-relaxed font-light">
                    Access the world without barriers. <br />
                    <span className="text-blue-400/80">A community-driven platform for accessible mobility navigation.</span>
                </p>

                <button
                    onClick={onEnter}
                    className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center gap-3"
                >
                    <span>Get Started</span>
                    <svg
                        className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>

                {/* Status Indicators */}
                <div className="mt-12 flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>Live Data</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span>Global Coverage</span>
                    </div>
                </div>
            </div>

            {/* Globe Section */}
            <div className="flex-1 w-full h-[50vh] md:h-full relative flex items-center justify-center animate-slide-in-right opacity-90 hover:opacity-100 transition-opacity duration-500 cursor-grab active:cursor-grabbing">
                <Globe />
            </div>
        </div>
    );
}
