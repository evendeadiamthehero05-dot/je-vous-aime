import { motion } from 'framer-motion';

export default function SceneShell({ title, subtitle, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="romantic-panel w-full max-w-4xl rounded-3xl p-8"
    >
      <h3 className="text-center text-3xl text-rose-50">{title}</h3>
      <p className="mt-2 text-center text-rose-100/80">{subtitle}</p>
      <div className="mt-7">{children}</div>
    </motion.section>
  );
}