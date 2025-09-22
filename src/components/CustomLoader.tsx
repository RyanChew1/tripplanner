export default function CustomLoader({ size = 240 }) {
  const airplaneSize = Math.max(16, size * 0.15); // Airplane is 15% of the circle size
  const circleRadius = size / 2 - airplaneSize / 2; // Radius accounting for airplane size
  const trailLength = 60; // Length of the trail in degrees
  const trailDots = 8; // Number of dots in the trail

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-col gap-4`}
    >
      {/* Optional: Circle track (uncomment to show the path) */}
      <div
        className="absolute border border-gray-200 rounded-full opacity-30"
        style={{
          width: size,
          height: size,
        }}
      />

      {/* Rotating container */}
      <div
        className="absolute"
        style={{
          width: size,
          height: size,
          animation: "spin 2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite",
        }}
      >
        {/* Trail dots */}
        {Array.from({ length: trailDots }, (_, i) => {
          const angle = -(i + 1) * (trailLength / trailDots); // Negative for behind airplane
          const opacity = 1 - (i / trailDots) * 0.9; // Fade from 1 to 0.1
          const dotSize = Math.max(
            2,
            airplaneSize * 0.15 * (1 - i / trailDots)
          ); // Shrink dots

          return (
            <div
              key={i}
              className="absolute bg-blue-400 rounded-full"
              style={{
                width: dotSize,
                height: dotSize,
                top: "50%",
                left: "50%",
                transform: `
                    translateX(-50%) 
                    translateY(-50%) 
                    rotate(${angle}deg) 
                    translateY(-${circleRadius}px)
                  `,
                opacity: opacity,
              }}
            />
          );
        })}

        {/* Airplane positioned at the top of the circle */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            transformOrigin: `50% ${circleRadius + airplaneSize / 2}px`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={airplaneSize}
            height={airplaneSize}
            fill="currentColor"
            className="text-blue-500"
            style={{
              transform: "rotate(90deg)", // Point airplane in direction of travel
            }}
          >
            {/* Realistic Airplane SVG */}
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
      </div>
      <p className="text-blue-500 font-bold text-lg">
          <span>Loading</span>
          <span className="inline-block ml-1 animate-pulse">.</span>
          <span className="inline-block animate-pulse" style={{ animationDelay: '0.5s' }}>.</span>
          <span className="inline-block animate-pulse" style={{ animationDelay: '1s' }}>.</span>
        </p>
    </div>
  );
}
