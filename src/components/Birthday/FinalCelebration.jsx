import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DownloadModal from '../../components/download/DownloadModal';
import './FinalCelebration.css';

export default function FinalCelebration({ eventId, birthdayName, onReplay, wishes = [], videoWishes = [], timeline = [], vault, vaultUnlocked, isOffline = false, orgSettings = {} }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = () => {
    setIsModalOpen(true);
  };

  return (
    <section className="bb-final-section">
      <div className="bb-final-container">

        <div className="bb-final-sequence">
          <motion.h2
            className="bb-h2 bb-final-pause"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
          >
            That's everything.
          </motion.h2>

          <motion.p
            className="bb-final-except"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            Except one thing...
          </motion.p>
        </div>

        <motion.div
          className="bb-final-climax"
          initial={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 3, duration: 1.5, ease: "easeOut" }}
        >
          <h1 className="bb-h1 bb-final-hero bb-editorial-text">
            Happy Birthday,<br />
            <span className="bb-final-name">{birthdayName}</span>
            <span className="bb-final-heart">♡</span>
          </h1>

          <p className="bb-final-subheading">
            Here's to everything you've lived,<br />
            everything you're becoming,<br />
            and everything still waiting for you.
          </p>
        </motion.div>

        <motion.div
          className="bb-final-actions"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <button className="bb-btn-primary p-4" onClick={onReplay} style={{ background: 'transparent', border: '1px solid var(--bb-primary)', color: 'var(--bb-primary)', paddingLeft: '20px', paddingRight: '20px' }}>
            Replay Your Birthday
          </button>
          {!isOffline && (
            <button
              className="bb-btn-primary"
              onClick={handleDownload}
              style={{ background: 'var(--bb-primary)', border: '1px solid var(--bb-primary)', color: '#fff', paddingLeft: '20px', paddingRight: '20px', fontWeight: '600' }}
            >
              📥 Download Celebration
            </button>
          )}
          <button className="bb-btn-primary" onClick={scrollToTop} style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--bb-text-deep)', boxShadow: 'none', border: '1px solid var(--bb-primary)', padding: "5px", paddingLeft: "10px", paddingRight: "10px" }}>
            Explore Memories Again
          </button>
        </motion.div>
      </div>

      <DownloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventId={eventId}
        birthdayName={birthdayName}
        wishes={wishes}
        videoWishes={videoWishes}
        timeline={timeline}
        stats={{
          wishes: wishes.length + videoWishes.length,
          memories: timeline.length,
          videos: videoWishes.length
        }}
      />

      <motion.footer
        className="bb-final-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 5, duration: 1 }}
      >
        Made with <span className="bb-footer-heart">♡</span> LOVE you deserve
      </motion.footer>
    </section>
  );
}
