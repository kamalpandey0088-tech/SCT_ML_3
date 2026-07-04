import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import UploadTerminal from './components/UploadTerminal'
import TextReveal from './components/TextReveal'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/Toast'
import PredictionHistory from './components/PredictionHistory'
import AdminDashboard from './components/AdminDashboard'
import { useToast } from './hooks/useToast'

const ARCHITECTURE_STEPS = [
  {
    step: '01',
    title: 'Deep Feature Extraction',
    desc: 'A frozen MobileNetV2 backbone converts each 224×224 image into a rich 1,280-dimensional feature vector, capturing complex textures, shapes, and structural patterns.',
    icon: '🧠',
    color: '#06b6d4',
  },
  {
    step: '02',
    title: 'PCA Dimensionality Reduction',
    desc: 'PCA retains 95% of explained variance, compressing the 1,280-dim feature space. This removes redundant noise and speeds up linear/RBF decision boundaries.',
    icon: '📐',
    color: '#8b5cf6',
  },
  {
    step: '03',
    title: 'SVM Classification',
    desc: 'An RBF SVM finds the maximum-margin hyperplane in the reduced space. GridSearchCV selects the optimal margin regulariser C to guarantee structural risk boundaries.',
    icon: '⚡',
    color: '#ec4899',
  },
]

export default function App() {
  const classifierRef = useRef<HTMLElement>(null)
  const archRef = useRef<HTMLElement>(null)
  const lenisRef = useRef<Lenis | null>(null)

  const { toasts, addToast, dismissToast } = useToast()
  
  const [historyOpen, setHistoryOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  // ── Lenis Smooth Scroll ────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const tickerCb = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tickerCb)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tickerCb)
      lenis.destroy()
    }
  }, [])

  // ── Scroll Reveals ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = archRef.current?.querySelectorAll<HTMLElement>('.arch-card')
      if (!cards?.length) return

      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 50, rotateX: 8 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
            delay: i * 0.1,
          }
        )
      })
    }, archRef)

    return () => ctx.revert()
  }, [])

  // ── Keyboard Shortcuts (Admin Dashboard: Ctrl + Shift + A) ────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setAdminOpen((prev) => !prev)
        addToast("Opening telemetry log...", "info")
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addToast])

  const scrollToClassifier = () => {
    if (classifierRef.current && lenisRef.current) {
      lenisRef.current.scrollTo(classifierRef.current, { offset: -80, duration: 1.6 })
    }
  }

  return (
    <ErrorBoundary>
      <div className="noise min-h-screen bg-bg text-white overflow-x-hidden">
        {/* Navigation */}
        <Navbar onScrollToClassifier={scrollToClassifier} />

        {/* Global Floating Actions */}
        <div className="fixed top-20 right-6 z-40 flex flex-col gap-3">
          <button
            onClick={() => setHistoryOpen(true)}
            className="glass w-10 h-10 rounded-xl flex items-center justify-center text-sm hover:border-cyan-500/30 transition-all shadow-lg pointer-events-auto"
            title="Open history logs"
          >
            📋
          </button>
          <button
            onClick={() => setAdminOpen(true)}
            className="glass w-10 h-10 rounded-xl flex items-center justify-center text-sm hover:border-violet-500/30 transition-all shadow-lg pointer-events-auto"
            title="System Telemetry"
          >
            📊
          </button>
        </div>

        {/* Hero Section */}
        <HeroSection onScrollToClassifier={scrollToClassifier} />

        {/* Technical pipeline breakdown */}
        <section
          ref={archRef}
          id="architecture"
          aria-label="Model architecture"
          className="relative py-28 px-6"
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(6,182,212,0.4), transparent)' }}
          />

          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center mb-16 gap-4">
              <span className="section-tag">Mathematical Pipeline</span>
              <TextReveal
                text="Three-Stage Vision Extraction"
                className="text-3xl md:text-5xl font-bold text-white font-sans"
              />
              <TextReveal
                text="How raw camera pixels are transformed into probabilistic SVM decision vectors."
                className="text-white/40 max-w-xl text-sm leading-relaxed"
                delay={0.15}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {ARCHITECTURE_STEPS.map((step) => (
                <div
                  key={step.step}
                  className="arch-card glass rounded-3xl p-8 flex flex-col gap-5 hover:border-white/10 transition-all duration-400 group"
                  style={{ opacity: 0, transformStyle: 'preserve-3d' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase" style={{ color: step.color }}>
                      Step {step.step}
                    </span>
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </span>
                  </div>

                  <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${step.color}44, transparent)` }} />
                  <h3 className="text-lg font-bold text-white leading-tight">{step.title}</h3>
                  <p className="text-white/45 text-xs leading-relaxed flex-1 font-light">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upload Sandbox */}
        <section
          ref={classifierRef}
          id="classifier"
          aria-label="Image classifier"
          className="relative py-28 px-6"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%)' }}
          />

          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center mb-14 gap-4">
              <span className="section-tag">Live Inference</span>
              <TextReveal text="Try the Predictor Sandbox" className="text-3xl md:text-5xl font-bold text-white" />
              <TextReveal text="FastAPI backend · Sub-50ms CPU execution · Magic bytes verification" className="text-white/35 text-sm" delay={0.1} />
            </div>

            <div className="flex justify-center">
              <UploadTerminal onAddToast={addToast} />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-10 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🐾</span>
              <span className="font-semibold text-white/60">
                Neural<span className="gradient-text-cyan-violet">Paw</span>
              </span>
            </div>
            <p className="text-white/20 text-xs">Built with 100% architectural efficiency.</p>
          </div>
        </footer>

        {/* Log drawers */}
        <PredictionHistory isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
        <AdminDashboard isOpen={adminOpen} onClose={() => setAdminOpen(false)} />

        {/* Toast system */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </ErrorBoundary>
  )
}
