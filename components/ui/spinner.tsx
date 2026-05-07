export function IOSSpinner({ size = 48, color = "currentColor", className = "" }: { size?: number, color?: string, className?: string }) {
  const blades = 12;
  return (
    <span className={className} style={{ width: size, height: size, position: "relative", display: "inline-block", color }}>
      {Array.from({ length: blades }).map((_, i) => {
        const angle = (i / blades) * 360;
        const opacity = (i + 1) / blades;
        const bladeH = size * 0.28;
        const bladeW = size * 0.08;
        const offsetY = size * 0.22;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: bladeW,
              height: bladeH,
              marginLeft: -bladeW / 2,
              marginTop: -offsetY - bladeH / 2,
              borderRadius: bladeW,
              background: "currentColor",
              opacity,
              transform: `rotate(${angle}deg) translateY(${-(offsetY)}px)`,
              transformOrigin: `50% calc(50% + ${offsetY}px)`,
              animation: `ios-spin 1s linear infinite`,
              animationDelay: `${-(blades - i) / blades}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes ios-spin {
          0%   { opacity: 0.1 }
          100% { opacity: 1   }
        }
      `}</style>
    </span>
  );
}
