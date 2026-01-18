import createGlobe from 'cobe';
import { useEffect, useRef } from 'react';
import { useSpring } from 'react-spring';

export default function Globe() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerInteracting = useRef(null);
    const pointerInteractionMovement = useRef(0);
    const [{ r }, api] = useSpring(() => ({
        r: 0,
        config: {
            mass: 1,
            tension: 280,
            friction: 40,
            precision: 0.001,
        },
    }));

    useEffect(() => {
        let phi = 0;
        let width = 0;
        const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
        window.addEventListener('resize', onResize);
        onResize();

        const globe = createGlobe(canvasRef.current!, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0.3,
            dark: 1,
            diffuse: 1.5,
            mapSamples: 16000,
            mapBrightness: 8,
            baseColor: [0.15, 0.15, 0.25], // Slightly lighter and bluer
            markerColor: [0.3, 0.6, 1], // Brighter blue markers
            glowColor: [0.15, 0.15, 0.3], // Enhanced glow
            markers: [
                // Example markers (optional, can be removed or dynamic)
                { location: [43.6532, -79.3832], size: 0.1 }, // Toronto
                { location: [40.7128, -74.0060], size: 0.05 }, // NYC
            ],
            onRender: (state) => {
                // This is called on every animation frame.
                // state.phi = phi;
                // phi += 0.01;
                state.phi = phi + r.get();
                phi += 0.005; // Auto rotation speed
                state.width = width * 2;
                state.height = width * 2;
            },
        });

        setTimeout(() => (canvasRef.current!.style.opacity = '1'));
        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <div style={{
            width: '100%',
            maxWidth: 600,
            aspectRatio: 1,
            margin: 'auto',
            position: 'relative',
        }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    contain: 'layout paint size',
                    opacity: 0,
                    transition: 'opacity 1s ease',
                }}
                onPointerDown={(e) => {
                    // @ts-ignore
                    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
                    // @ts-ignore
                    canvasRef.current.style.cursor = 'grabbing';
                }}
                onPointerUp={() => {
                    pointerInteracting.current = null;
                    // @ts-ignore
                    canvasRef.current.style.cursor = 'grab';
                }}
                onPointerOut={() => {
                    pointerInteracting.current = null;
                    // @ts-ignore
                    canvasRef.current.style.cursor = 'grab';
                }}
                onMouseMove={(e) => {
                    if (pointerInteracting.current !== null) {
                        const delta = e.clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta;
                        api.start({
                            r: delta / 200,
                        });
                    }
                }}
                onTouchMove={(e) => {
                    if (pointerInteracting.current !== null && e.touches[0]) {
                        // @ts-ignore
                        const delta = e.touches[0].clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta;
                        api.start({
                            r: delta / 100,
                        });
                    }
                }}
            />
        </div>
    );
}
