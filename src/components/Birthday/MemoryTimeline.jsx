import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import "./MemoryTimeline.css";

const formatMemoryDate = (dateStr, tags = []) => {
  if (!dateStr) return "";
  let precision = "day";

  if (Array.isArray(tags) && tags.length) {
    const precisionTag = tags.find((tag) => typeof tag === "string" && tag.startsWith("precision:"));
    if (precisionTag) precision = precisionTag.split(":")[1]?.toLowerCase();
  } else {
    const parts = String(dateStr).split("-");
    if (parts.length === 1) precision = "year";
    if (parts.length === 2) precision = "month";
  }

  if (precision === "year") {
    const yearMatch = /^(\d{4})/.exec(String(dateStr));
    if (yearMatch) return yearMatch[1];
    const date = new Date(dateStr);
    if (!Number.isNaN(date.getTime())) return date.getFullYear().toString();
    return dateStr;
  }

  if (precision === "month") {
    const match = /^(\d{4})-(\d{1,2})/.exec(String(dateStr));
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month >= 1 && month <= 12) {
        return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
      }
    }
  }

  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }
  return dateStr;
};

export default function MemoryTimeline({ timelineEntries = [], wisherName }) {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const carouselRef = useRef(null);

  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Find the center of the scroll container
      const center = container.scrollLeft + container.offsetWidth / 2;
      let closestIndex = 0;
      let minDistance = Infinity;

      // Filter out ::before and ::after if they show up in children, though pseudo-elements don't.
      const items = Array.from(container.children).filter(el => el.classList.contains('bb-carousel-item'));

      items.forEach((item, index) => {
        const itemCenter = item.offsetLeft + item.offsetWidth / 2;
        const distance = Math.abs(itemCenter - center);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== activeIndexRef.current) {
        activeIndexRef.current = closestIndex;
        setActiveIndex(closestIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to set initial active index (should be 0 since it starts centered)
    // slight delay to let layout settle
    setTimeout(() => handleScroll(), 100);

    return () => container.removeEventListener('scroll', handleScroll);
  }, [timelineEntries]);

  if (!timelineEntries || timelineEntries.length === 0) return null;

  const sortedTimeline = [...timelineEntries].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

  const scrollLeft = () => {
    if (carouselRef.current) {
      const itemWidth = window.innerWidth <= 768 ? 280 : 320;
      const scrollAmount = itemWidth + 20; // width + gap
      carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      const itemWidth = window.innerWidth <= 768 ? 280 : 320;
      const scrollAmount = itemWidth + 20; // width + gap
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="bb-timeline-section" id="memories">
      <div className="bb-timeline-header">
        <span className="bb-timeline-kicker" style={{
          display: "inline-block",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontSize: "0.78rem",
          fontWeight: 700,
          color: "var(--bb-accent, #e63946)",
          marginBottom: "12px",
          background: "rgba(230, 57, 70, 0.08)",
          padding: "5px 16px",
          borderRadius: "20px",
          border: "1px solid rgba(230, 57, 70, 0.2)"
        }}>
          ✦ Memory Line ✦
        </span>
        <h2 className="bb-h2 bb-timeline-heading">Memory Line</h2>
        <p className="bb-timeline-subheading" style={{ maxWidth: "620px", margin: "0 auto", fontSize: "15px", lineHeight: "1.7", color: "#6b5e68" }}>
          A walk through cherished moments, milestones, and memories leading up to your special day — captured and preserved with love.
        </p>
      </div>

      <div className="bb-carousel-wrapper">
        <button className="bb-carousel-btn prev-btn" onClick={scrollLeft} aria-label="Previous">
          <FiChevronLeft />
        </button>

        <div className="bb-carousel-content" ref={carouselRef}>
          {sortedTimeline.map((entry, index) => {
            const isActive = index === activeIndex;
            return (
              <div key={entry.id || index} className={`bb-carousel-item ${isActive ? 'active' : ''}`}>
                <div className="bb-card-timeline-layout">

                  {/* MEDIA TOP */}
                  <div className="bb-card-media-wrapper" onClick={() => setSelectedMedia(entry)}>
                    {entry.media_url ? (
                      entry.media_type === "video" ? (
                        <div className="bb-media-video-wrapper">
                          <video src={entry.media_url} className="bb-card-media" muted playsInline />
                          <div className="bb-media-play-icon">▶</div>
                        </div>
                      ) : (
                        <img src={entry.media_url} alt={entry.title || "Memory"} className="bb-card-media" />
                      )
                    ) : (
                      <div className="bb-card-media-placeholder">
                        <span>✦</span>
                      </div>
                    )}
                  </div>

                  {/* TIMELINE TRACK */}
                  <div className="bb-timeline-track">
                    {index < sortedTimeline.length - 1 && <div className="bb-timeline-line"></div>}
                    <div className="bb-node-dot">
                      {isActive && (
                        <motion.div
                          layoutId="glowing-star"
                          className="bb-active-star"
                          transition={{ type: "spring", stiffness: 150, damping: 20 }}
                        >
                          ✦
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* TEXT BOTTOM */}
                  <div className="bb-card-content">
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.div
                          key="text-content"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.3 }}
                          style={{ width: '100%' }}
                        >
                          <span className="bb-node-date">{formatMemoryDate(entry.entry_date, entry.tags)}</span>
                          <h3 className="bb-node-title bb-editorial-text">{entry.title}</h3>
                          {entry.description && <p className="bb-node-desc">{entry.description}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        <button className="bb-carousel-btn next-btn" onClick={scrollRight} aria-label="Next">
          <FiChevronRight />
        </button>
      </div>

      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="bb-media-viewer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMedia(null)}
          >
            <motion.div
              className="bb-media-viewer-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button className="bb-viewer-close" onClick={() => setSelectedMedia(null)} aria-label="Close">×</button>
              <div className="bb-viewer-media-container">
                {selectedMedia.media_type === "video" ? (
                  <video src={selectedMedia.media_url} controls autoPlay playsInline className="bb-viewer-media" />
                ) : (
                  <img src={selectedMedia.media_url} alt={selectedMedia.title || "Memory"} className="bb-viewer-media" />
                )}
              </div>
              <div className="bb-viewer-details">
                <span className="bb-viewer-date">{formatMemoryDate(selectedMedia.entry_date, selectedMedia.tags)}</span>
                <h3 className="bb-editorial-text">{selectedMedia.title}</h3>
                {selectedMedia.description && <p>{selectedMedia.description}</p>}
                <p className="bb-editorial-text">
                  Added by {selectedMedia.wisher_name}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
