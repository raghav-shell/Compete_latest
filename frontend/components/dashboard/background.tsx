"use client"

import { motion } from "framer-motion"

export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient - softer, more luxurious */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.92 0.06 280 / 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 100% 100%, oklch(0.88 0.08 200 / 0.25) 0%, transparent 40%),
            linear-gradient(180deg, oklch(0.99 0.005 280) 0%, oklch(0.98 0.008 270) 50%, oklch(0.985 0.006 280) 100%)
          `,
        }}
      />

      {/* Primary floating orb - top right */}
      <motion.div
        className="absolute top-[-15%] right-[-8%] w-[700px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, oklch(0.88 0.08 280 / 0.5) 0%, oklch(0.85 0.06 260 / 0.2) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary orb - bottom left */}
      <motion.div
        className="absolute bottom-[-12%] left-[-8%] w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle at 70% 70%, oklch(0.8 0.12 200 / 0.35) 0%, oklch(0.85 0.08 210 / 0.15) 40%, transparent 65%)",
          filter: "blur(50px)",
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, 40, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Accent orb - center left */}
      <motion.div
        className="absolute top-[35%] left-[15%] w-[450px] h-[450px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.75 0.1 260 / 0.2) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle highlight orb - top center */}
      <motion.div
        className="absolute top-[10%] left-[40%] w-[500px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, oklch(0.95 0.03 270 / 0.6) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, -20, 0],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Mesh gradient layer */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(at 20% 80%, oklch(0.85 0.1 200 / 0.15) 0%, transparent 50%),
            radial-gradient(at 80% 20%, oklch(0.85 0.08 280 / 0.15) 0%, transparent 50%),
            radial-gradient(at 50% 50%, oklch(0.9 0.05 260 / 0.1) 0%, transparent 60%)
          `,
        }}
      />

      {/* Subtle animated line accent */}
      <motion.div
        className="absolute top-[25%] left-0 right-0 h-px opacity-20"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.7 0.1 260) 20%, oklch(0.75 0.12 200) 50%, oklch(0.7 0.1 260) 80%, transparent 100%)",
        }}
        animate={{
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle grid pattern - more refined */}
      <div 
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.4 0.05 280) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.4 0.05 280) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Fine dot pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(oklch(0.4 0.08 260) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Noise texture overlay - very subtle */}
      <div 
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, oklch(0.98 0.005 280 / 0.4) 100%)",
        }}
      />
    </div>
  )
}
