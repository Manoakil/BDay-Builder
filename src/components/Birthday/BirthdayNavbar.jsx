import React, { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import './BirthdayNavbar.css';

export default function BirthdayNavbar({ birthdayName, hasVault, enableWishes=true, enableVideos=true, enableTimeline=true }) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setScrolled(latest > 50);
  });

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav 
      className={`bb-navbar ${scrolled ? 'bb-navbar-scrolled' : ''}`}
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" }
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <div className="bb-navbar-container">
        <div className="bb-navbar-brand">
          <span className="bb-navbar-icon" style={{ fontSize: "1.5rem" }}>♡</span>
        </div>
        
        <div className="bb-navbar-center">
          <span className="bb-navbar-name">{birthdayName}</span>
        </div>
        
        <div className="bb-navbar-links">
          <button onClick={() => scrollTo('memories')} className="bb-navbar-link hide-mobile">
            Memory Line
          </button>
          <button onClick={() => scrollTo('wishes')} className="bb-navbar-link hide-mobile">
            Wishes
          </button>
          {hasVault && (
            <button onClick={() => scrollTo('vault')} className="bb-navbar-link bb-vault-link">
              <span className="bb-navbar-icon-small">♡</span> Vault
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
