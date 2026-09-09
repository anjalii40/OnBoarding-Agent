export default function BackgroundGlow() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      {/* The Electric Blue Aurora Glow */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[120%] h-[80%] rounded-[100%] opacity-60 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(0,85,255,0.8) 0%, rgba(0,0,0,0) 70%)'
        }}
      />
      
      {/* The Cinematic Film Grain Texture */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.25] mix-blend-overlay">
        <filter id="noiseFilter">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.8" 
            numOctaves="3" 
            stitchTiles="stitch" 
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
}
