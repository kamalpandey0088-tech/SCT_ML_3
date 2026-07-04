interface ScanAnimationProps {
  /** Object URL of the image being scanned */
  imageUrl: string
}

/**
 * Displays the uploaded image thumbnail with a neon laser-line sweeping
 * from top to bottom. Plays on loop while inference is in progress.
 *
 * The scan glow overlay subtly illuminates the image beneath the laser
 * for a premium "AI scanning" effect.
 */
export default function ScanAnimation({ imageUrl }: ScanAnimationProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              style={{
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <span className="text-sm font-mono text-cyan-400 tracking-widest uppercase">
          Analyzing Image
        </span>
      </div>

      {/* Image + Laser */}
      <div className="relative w-64 h-64 rounded-2xl overflow-hidden glass-cyan">
        {/* The uploaded image */}
        <img
          src={imageUrl}
          alt="Image being classified"
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* Dark overlay to make laser stand out */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Laser line */}
        <div className="scan-laser" aria-hidden="true" />

        {/* Glow overlay that moves with the laser */}
        <div className="scan-overlay" aria-hidden="true" />

        {/* Corner brackets — terminal aesthetic */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400/70 rounded-tl" />
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400/70 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400/70 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400/70 rounded-br" />
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-white/60 text-sm font-mono">
          MobileNetV2 → PCA → SVM
        </p>
        <p className="text-white/30 text-xs mt-1 font-mono">
          Extracting deep feature vectors…
        </p>
      </div>
    </div>
  )
}
