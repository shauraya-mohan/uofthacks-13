'use client';

import { useState } from 'react';
import LandingPage from '@/components/LandingPage';
import MainApp from '@/components/MainApp';

export default function HomePage() {
  const [showLanding, setShowLanding] = useState(true);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0f0f0f]">
      {showLanding ? (
        <LandingPage onEnter={() => setShowLanding(false)} />
      ) : (
        <div className="animate-fade-in">
          <MainApp />
        </div>
      )}
    </main>
  );
}
