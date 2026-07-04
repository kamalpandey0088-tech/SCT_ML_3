interface SampleImagesProps {
  onSelectSample: (file: File) => void
}

const CAT_PATH = "M12 2C8 2 5 5 5 9c0 1.5.5 3 1.3 4.2C5.5 14.3 5 15.6 5 17c0 3.3 3.1 6 7 6s7-2.7 7-6c0-1.4-.5-2.7-1.3-3.8C18.5 12 19 10.5 19 9c0-4-3-7-7-7zm0 2c2.8 0 5 2.2 5 5 0 1.2-.4 2.3-1.1 3.2l-.7.8.7.9c.7.9 1.1 2 1.1 3.1 0 2.2-2.2 4-5 4s-5-1.8-5-4c0-1.1.4-2.2 1.1-3.1l.7-.9-.7-.8C7.4 11.3 7 10.2 7 9c0-2.8 2.2-5 5-5z"
const DOG_PATH = "M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z"

export default function SampleImages({ onSelectSample }: SampleImagesProps) {
  
  const generateSampleFile = (type: 'cat' | 'dog', index: number, path: string) => {
    // Generate an SVG markup with gradient backgrounds matching the animal type
    const colorStart = type === 'cat' ? '#06b6d4' : '#22c55e'
    const colorEnd = type === 'cat' ? '#8b5cf6' : '#14b8a6'
    
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="224" height="224">
        <defs>
          <linearGradient id="g_${type}_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colorStart}" />
            <stop offset="100%" stop-color="${colorEnd}" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g_${type}_${index})" />
        <path d="${path}" fill="#ffffff" transform="translate(0, 0) scale(1)" />
      </svg>
    `
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const file = new File([blob], `sample-${type}-${index}.png`, { type: 'image/png' })
    onSelectSample(file)
  }

  const samples = [
    { type: 'cat' as const, name: 'Siamese Cat', path: CAT_PATH, bg: 'from-cyan-500/20 to-violet-500/20' },
    { type: 'cat' as const, name: 'Persian Cat', path: CAT_PATH, bg: 'from-cyan-500/20 to-violet-500/20' },
    { type: 'cat' as const, name: 'Bengal Cat', path: CAT_PATH, bg: 'from-cyan-500/20 to-violet-500/20' },
    { type: 'dog' as const, name: 'Retriever', path: DOG_PATH, bg: 'from-green-500/20 to-teal-500/20' },
    { type: 'dog' as const, name: 'Bulldog', path: DOG_PATH, bg: 'from-green-500/20 to-teal-500/20' },
    { type: 'dog' as const, name: 'German Shepherd', path: DOG_PATH, bg: 'from-green-500/20 to-teal-500/20' }
  ]

  return (
    <div className="w-full">
      <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest text-center mb-4">Or try a sample image</p>
      <div className="grid grid-cols-3 gap-3">
        {samples.map((s, idx) => (
          <button
            key={idx}
            onClick={() => generateSampleFile(s.type, idx, s.path)}
            className={`glass p-3 rounded-2xl flex flex-col items-center gap-2 hover:border-white/20 transition-all duration-300 group`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center border border-white/5 group-hover:scale-105 transition-transform duration-300`}>
              <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                <path d={s.path} />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-white/40 truncate w-full text-center">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
