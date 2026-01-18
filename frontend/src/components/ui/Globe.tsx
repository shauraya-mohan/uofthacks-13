'use client';

import createGlobe from 'cobe';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function Globe({ className }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let phi = 0;

        if (!canvasRef.current) return;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: 600 * 2,
            height: 600 * 2,
            phi: 0,
            theta: 0,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.1, 0.1, 0.1],
            markerColor: [0.2, 0.5, 1], // Blue
            glowColor: [0.2, 0.5, 1],
            opacity: 0.8,
            markers: [
                // North America
                { location: [43.6532, -79.3832], size: 0.1 }, // Toronto
                { location: [40.7128, -74.0060], size: 0.05 }, // NYC
                { location: [34.0522, -118.2437], size: 0.05 }, // LA
                // Europe
                { location: [51.5074, -0.1278], size: 0.05 }, // London
                { location: [48.8566, 2.3522], size: 0.05 }, // Paris
                // Asia
                { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
                { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
            ],
            onRender: (state) => {
                // Called on every animation frame.
                // `state` will be an empty object, return updated params.
                state.phi = phi;
                phi += 0.003;
            },
        });

        return () => {
            globe.destroy();
        };
    }, []);

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="w-[600px] h-[600px] relative z-10"
            >
                <canvas
                    ref={canvasRef}
                    style={{ width: 600, height: 600, maxWidth: '100%', aspectRatio: '1' }}
                    className="drop-shadow-[0_0_50px_rgba(0,255,163,0.15)]"
                />
            </motion.div>

            {/* Decorative gradient behind globe */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />
        </div>
    );
}
