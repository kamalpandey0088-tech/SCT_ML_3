import { useEffect, useRef, useState } from 'react'

interface NavbarProps {
  onScrollToClassifier: () => void
}

export default function Navbar({ onScrollToClassifier }: NavbarProps) {
  const navRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'navbar-scrolled' : 'bg-transparent'
      }`}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a
          href="/"
          id="nav-logo"
          className="flex items-center gap-2.5 group"
          aria-label="NeuralPaw home"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center
            bg-gradient-to-br from-cyan-500 to-violet-500 text-sm font-bold text-black
            group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-shadow duration-300">
            🐾
          </div>
          <span className="font-bold text-white tracking-tight">
            Neural<span className="gradient-text-cyan-violet">Paw</span>
          </span>
        </a>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Architecture', href: '#architecture' },
            { label: 'Classifier', href: '#classifier' },
            { label: 'API Docs', href: 'http://localhost:8000/docs', external: true },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              id={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="text-sm text-white/50 hover:text-white/90 transition-colors duration-200 font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <button
          id="nav-cta-classify"
          onClick={onScrollToClassifier}
          className="btn-primary text-xs px-5 py-2.5"
        >
          Try It Free
        </button>
      </div>
    </nav>
  )
}
