import { motion } from 'framer-motion';
import FloatingParticles from '../components/FloatingParticles';

/**
 * Landing Page Component
 * 
 * A cinematic, romantic first impression with:
 * - Animated gradient background (Paris night inspired)
 * - Floating particles for dreamy ambiance
 * - Elegant title with fade-in and glow animation
 * - Tagline with gentle reveal
 * - Interactive "Begin Your Evening" button with heartbeat pulse
 */
export default function LandingPage({ onBegin }) {
  // Animation container - stagger children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.4,
      },
    },
  };

  // Title fade-in with subtle scale
  const titleVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 1.2,
        ease: 'easeOut',
      },
    },
  };

  // Tagline gentle fade-in
  const taglineVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: 'easeOut',
      },
    },
  };

  // Button entrance
  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  // Animated gradient background - breathing effect
  const gradientVariants = {
    animate: {
      backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
      transition: {
        duration: 20,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  };

  // Glow animation for title
  const glowAnimation = {
    animate: {
      textShadow: [
        '0 0 30px rgba(190, 24, 93, 0.3), 0 0 60px rgba(244, 114, 182, 0.2)',
        '0 0 50px rgba(190, 24, 93, 0.5), 0 0 80px rgba(244, 114, 182, 0.4)',
        '0 0 30px rgba(190, 24, 93, 0.3), 0 0 60px rgba(244, 114, 182, 0.2)',
      ],
    },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-red-950 via-rose-900 to-pink-100"
        style={{
          backgroundSize: '200% 200%',
        }}
        variants={gradientVariants}
        animate="animate"
      />

      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-red-950/30 pointer-events-none" />

      {/* Floating Particles */}
      <FloatingParticles count={24} />

      {/* Content Container */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center gap-6 md:gap-8 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Title */}
        <motion.div variants={titleVariants}>
          <motion.h1
            className="text-6xl md:text-7xl lg:text-8xl font-light tracking-[0.15em] text-pink-100"
            style={{
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.15em',
            }}
            animate="animate"
            variants={glowAnimation}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            Je vous aime
          </motion.h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          variants={taglineVariants}
          className="text-lg md:text-xl text-pink-200/80 tracking-wide italic font-light"
          style={{
            fontFamily: 'Georgia, serif',
          }}
        >
          Love, beyond distance.
        </motion.p>

        {/* Button */}
        <motion.div
          variants={buttonVariants}
          className="mt-4 pt-4"
        >
          <motion.button
            onClick={onBegin}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            className="group relative px-8 md:px-12 py-3 md:py-4 rounded-full font-light tracking-[0.08em] text-white text-base md:text-lg overflow-hidden transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f472b6 100%)',
              backgroundSize: '200% 200%',
              backgroundPosition: '0% 0%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundPosition = '100% 100%';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundPosition = '0% 0%';
            }}
          >
            {/* Animated shimmer on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer rounded-full transition-opacity duration-300" />

            {/* Heartbeat pulse glow */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(190, 24, 93, 0.3), inset 0 0 20px rgba(190, 24, 93, 0.1)',
                  '0 0 40px rgba(190, 24, 93, 0.6), inset 0 0 30px rgba(190, 24, 93, 0.2)',
                  '0 0 20px rgba(190, 24, 93, 0.3), inset 0 0 20px rgba(190, 24, 93, 0.1)',
                ],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Button text */}
            <span className="relative block uppercase">
              Begin Your Evening
            </span>
          </motion.button>
        </motion.div>

        {/* Decorative line */}
        <motion.div
          className="w-12 h-px bg-gradient-to-r from-transparent via-pink-300/60 to-transparent mt-4"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{
            duration: 1,
            delay: 2,
            ease: 'easeOut',
          }}
        />
      </motion.div>

      {/* Soft radial glow in center background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
    </main>
  );
}