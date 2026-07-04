import { useRef, useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface TextRevealProps {
  /** The full text string to split into individually-animated words */
  text: string
  /** Tailwind / CSS class applied to the outer wrapper */
  className?: string
  /** Delay in seconds before the stagger starts (default: 0) */
  delay?: number
  /** If true, trigger immediately regardless of scroll position */
  immediate?: boolean
}

/**
 * Splits a string into individual words and reveals each from below
 * using GSAP ScrollTrigger. No Club GSAP SplitText required.
 *
 * Each word is wrapped in an overflow:hidden container, with an inner span
 * that translates from yPercent:105 → 0. This creates the "sliding up from
 * a mask" effect seen on premium marketing sites.
 */
export default function TextReveal({
  text,
  className = '',
  delay = 0,
  immediate = false,
}: TextRevealProps) {
  const containerRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const wordInners = container.querySelectorAll<HTMLElement>('.word-inner')

    const ctx = gsap.context(() => {
      gsap.fromTo(
        wordInners,
        { yPercent: 105, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.055,
          delay,
          scrollTrigger: immediate
            ? undefined
            : {
                trigger: container,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
        }
      )
    }, container)

    return () => ctx.revert()
  }, [text, delay, immediate])

  const words = text.split(' ')

  return (
    <p ref={containerRef} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="word-wrapper"
          /* Space between words */
          style={{ marginRight: i < words.length - 1 ? '0.28em' : 0 }}
        >
          <span className="word-inner">{word}</span>
        </span>
      ))}
    </p>
  )
}
