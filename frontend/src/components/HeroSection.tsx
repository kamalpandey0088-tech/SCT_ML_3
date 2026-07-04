import { useRef, useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import NeuralNetCanvas from './NeuralNetCanvas'
import TextReveal from './TextReveal'

const STATS = [
  { label: 'Training Images', value: '25,000' },
  { label: 'Feature Dims', value: '1,280' },
  { label: 'Model Accuracy', value: '98.2%' },
  { label: 'Inference', value: '<50ms' },
]

interface HeroSectionProps {
  onScrollToClassifier: () => void
}

export default function HeroSection({ onScrollToClassifier }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollProgress = useRef<number>(0)
  const badgeRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // ── ScrollTrigger for 3D mesh dissolve ─────────────────────────────
      // The section is 200vh tall; the sticky canvas fills the first 100vh.
      // As we scroll through the second 100vh, progress goes 0 → 1.
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.8,
        onUpdate: (self) => {
          scrollProgress.current = self.progress
        },
      })

      // ── Badge entrance ───────────────────────────────────────────────
      gsap.fromTo(
        badgeRef.current,
        { opacity: 0, y: 28, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.1,
          delay: 0.2,
          ease: 'power3.out',
        }
      )

      // ── CTA entrance ─────────────────────────────────────────────────
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 1.0, delay: 1.4, ease: 'power3.out' }
      )

      // ── Stats stagger ────────────────────────────────────────────────
      gsap.fromTo(
        statsRef.current?.querySelectorAll('.stat-item') ?? [],
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: 1.8,
          stagger: 0.1,
          ease: 'power3.out',
        }
      )

      // ── Scroll indicator fade ─────────────────────────────────────────
      gsap.fromTo(
        scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, delay: 2.5, ease: 'power2.out' }
      )

      // Fade out scroll indicator as user scrolls
      gsap.to(scrollIndicatorRef.current, {
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '10% top',
          scrub: true,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative h-[200vh]"
      aria-label="Hero section"
    >
      {/* Sticky viewport — canvas + overlay content */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg" aria-hidden="true" />

        {/* Radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 65%)',
          }}
          aria-hidden="true"
        />

        {/* Three.js canvas — full bleed */}
        <div className="absolute inset-0" aria-hidden="true">
          <NeuralNetCanvas
            scrollProgress={scrollProgress}
            className="w-full h-full"
          />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          {/* Badge */}
          <div ref={badgeRef} style={{ opacity: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono text-cyan-400"
              style={{
                background: 'rgba(6,182,212,0.07)',
                border: '1px solid rgba(6,182,212,0.22)',
              }}>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              MobileNetV2 · PCA · SVM · RBF Kernel
            </span>
          </div>

          {/* Headline */}
          <div className="mt-8 mb-2">
            <TextReveal
              text="Neural Intelligence"
              className="text-6xl md:text-8xl lg:text-9xl font-bold text-white leading-none"
              delay={0.4}
              immediate
            />
          </div>
          <div className="mb-10">
            <TextReveal
              text="Meets Animal Vision"
              className="text-6xl md:text-8xl lg:text-9xl font-bold gradient-text leading-none"
              delay={0.65}
              immediate
            />
          </div>

          {/* Subheadline */}
          <TextReveal
            text="Deep feature extraction via frozen MobileNetV2, dimensionality reduction via PCA, and probabilistic classification via a radial-basis SVM."
            className="text-base md:text-lg text-white/45 max-w-2xl leading-relaxed font-light"
            delay={0.95}
            immediate
          />

          {/* CTA buttons */}
          <div
            ref={ctaRef}
            style={{ opacity: 0 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          >
            <button
              id="hero-btn-classify"
              onClick={onScrollToClassifier}
              className="btn-primary"
            >
              <span>Classify an Image</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <a
              id="hero-btn-docs"
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              API Docs
            </a>
          </div>

          {/* Stats row */}
          <div
            ref={statsRef}
            className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-6"
          >
            {STATS.map((s) => (
              <div key={s.label} className="stat-item flex flex-col items-center gap-1">
                <span className="text-2xl md:text-3xl font-bold text-white font-mono">
                  {s.value}
                </span>
                <span className="text-xs text-white/35 font-mono tracking-wide uppercase">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30"
          style={{ opacity: 0 }}
          aria-hidden="true"
        >
          <span className="text-xs font-mono tracking-[0.25em] uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </div>
    </section>
  )
}
