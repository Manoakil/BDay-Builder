import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// Services
import { attemptBirthdayVault, getBirthdayCelebrationStatus, getBirthdayPersonWishes, getBirthdayVault, getTimelineForEvent } from "../service/wishService";

// Global Theme System
import "../style/BirthdaySystem.css";
import "../style/BirthdayPerson.css"; // Original styles (we'll keep it for loading/locked screens if needed)

// Cinematic Components
import BirthdayNavbar from "../components/Birthday/BirthdayNavbar";
import WelcomeScreen from "../components/Birthday/WelcomeScreen";
import BirthdayReveal from "../components/Birthday/BirthdayReveal";
import PersonalMessage from "../components/Birthday/PersonalMessage";
import WishesIntro from "../components/Birthday/WishesIntro";
import WishWall from "../components/Birthday/WishWall";
import VideoWishes from "../components/Birthday/VideoWishes";
import MemoryTimeline from "../components/Birthday/MemoryTimeline";
import FinalCelebration from "../components/Birthday/FinalCelebration";
// import CupidScroller from "../components/Birthday/CupidScroller";
import ScrollReveal from "../components/Birthday/ScrollReveal";
import DownloadModal from "../components/download/DownloadModal";

// Global variable to persist intro state during a single SPA session.
// This survives React Router navigation (e.g., to the Vault and back) 
// but is properly reset when the user hard-refreshes or opens the page freshly.
let hasSeenIntroThisSession = false;

export default function BirthdayPerson() {
  const navigate = useNavigate();

  const location = useLocation();
  // Story Sequence State
  const [step, setStep] = useState(() => {
    // Check global variable first, then fallback to location state (if forced via a button)
    return hasSeenIntroThisSession || location.state?.skipIntro ? 'main' : 'welcome';
  });

  // Track when they reach the main step so we skip the intro on back navigation
  useEffect(() => {
    if (step === 'main') {
      hasSeenIntroThisSession = true;
    }
  }, [step]);
  
  // Data State
  const [wishes, setWishes] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [event, setEvent] = useState(null);
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(true);
  
  // Event access state
  const [pageAccessible, setPageAccessible] = useState(false);
  const [revealAt, setRevealAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [birthdayName, setBirthdayName] = useState("Birthday Star");
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);


  const [orgSettings, setOrgSettings] = useState({});

  useEffect(() => {
    document.title = "Wish Land";
    return () => {
      document.title = "Velora Studio";
    };
  }, []);

  useEffect(() => {
    const checkEventAccess = async () => {
      setEventLoading(true);
      try {
        const celebration = await getBirthdayCelebrationStatus();
        setEvent(celebration.event);
        setRevealAt(celebration.reveal_at);
        setPageAccessible(celebration.is_revealed);
        if (celebration.org_settings) {
          setOrgSettings(celebration.org_settings);
        }
        
        // Strictly use the name from the event!
        if (celebration.event && celebration.event.birthday_person_name) {
          setBirthdayName(celebration.event.birthday_person_name);
        }
      } catch (err) {
        console.error("Failed to load birthday event:", err);
        setPageAccessible(false);
      } finally {
        setEventLoading(false);
      }
    };
    checkEventAccess();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (revealAt && !pageAccessible && new Date(revealAt).getTime() <= now) {
      window.location.reload();
    }
  }, [now, pageAccessible, revealAt]);

  useEffect(() => {
    if (step !== 'main' || !pageAccessible || !event) return;
    setLoading(true);
    Promise.all([
      getBirthdayPersonWishes(), 
      getBirthdayVault(event.id).catch(() => null), 
      getTimelineForEvent(event.id)
    ]).then(([wishList, vaultData, timelineData]) => { 
        setWishes(wishList || []); 
        if (vaultData && Object.keys(vaultData).length > 0) {
          setVault({...vaultData, is_locked: !vaultData.unlock_time}); 
        }

        const wisherMap = {};
        (wishList || []).forEach((w) => {
          const uid = w.user_id || w.created_by;
          const name = w.wisher_name || w.wisher_display_name || w.guest_name;
          if (uid && name && !wisherMap[String(uid)]) {
            wisherMap[String(uid)] = String(name).trim();
          }
        });

        const enrichedTimeline = (timelineData || []).map((entry) => ({
          ...entry,
          wisher_name: entry.wisher_name || (entry.created_by ? wisherMap[String(entry.created_by)] : null) || entry.author_name || entry.created_by_name || null,
        }));

        setTimeline(enrichedTimeline);
      })
      .catch((err) => console.error("Error loading data:", err))
      .finally(() => setLoading(false));
  }, [step, pageAccessible, event]);



  const handleReplay = () => {
    window.scrollTo({ top: 0 });
    setStep('welcome');
  };

  const timeLeft = () => {
    let remaining = Math.max(0, new Date(revealAt).getTime() - now);
    return [["days", 86400000], ["hours", 3600000], ["minutes", 60000], ["seconds", 1000]].map(([label, unit]) => {
      const value = String(Math.floor(remaining / unit)).padStart(2, "0"); remaining %= unit; return { label, value };
    });
  };

  if (eventLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: '#fff' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!pageAccessible) {
    return (
      <div className="bp-locked-screen">
        <div className="locked-content">
          <span className="locked-icon">🔒</span>
          <h1>Happy Birthday, {birthdayName}!</h1>
          <p>Your surprise celebration isn't ready yet.</p>
          {revealAt && (
            <div className="countdown">
              {timeLeft().map(({ label, value }) => (
                <div key={label} className="countdown-item">
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
          <button className="logout-btn" onClick={() => { localStorage.clear(); navigate("/login", { replace: true }); }}>Log out</button>
        </div>
      </div>
    );
  }

const videoWishes = wishes.filter(w => w.wish_type === 'video');
  const textWishes = wishes.filter(w => w.wish_type === 'text' || w.wish_type === 'image');
  
  const dyn = vault?.dynamic_data || {};
  const enableWishes = dyn.enableWishes !== false;
  const enableVideos = dyn.enableVideos !== false;
  const enableTimeline = dyn.enableTimeline !== false;

  return (
    <div className="birthday-experience">
      
      {/* Sequence 1: Cinematic Welcome */}
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <WelcomeScreen 
            key="welcome"
            birthdayName={birthdayName} 
            onEnter={() => setStep('reveal')} 
          />
        )}
        
        {/* Sequence 2: Cinematic Reveal */}
        {step === 'reveal' && (
          <BirthdayReveal 
            key="reveal"
            birthdayName={birthdayName}
            onComplete={() => setStep('main')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Sequence 3: The Main Scroll Story */}
        {step === 'main' && (
        <>
          <BirthdayNavbar birthdayName={birthdayName} hasVault={false} enableWishes={enableWishes} enableVideos={enableVideos} enableTimeline={enableTimeline} onDownload={() => setIsDownloadModalOpen(true)} />
          
          <ScrollReveal>
            <PersonalMessage />
          </ScrollReveal>
          
          {(enableWishes || enableVideos) && (
            <ScrollReveal delay={0.2}>
              <WishesIntro totalWishes={wishes.length} />
            </ScrollReveal>
          )}
          
          {enableWishes && textWishes.length > 0 && (
            <ScrollReveal direction="left">
              <WishWall textWishes={textWishes} />
            </ScrollReveal>
          )}
          
          {enableVideos && videoWishes.length > 0 && (
            <ScrollReveal direction="right">
              <VideoWishes videoWishes={videoWishes} />
            </ScrollReveal>
          )}
          
          {enableTimeline && (
            timeline.length > 0 ? (
              <ScrollReveal>
                <MemoryTimeline timelineEntries={timeline} wishes={wishes} />
              </ScrollReveal>
            ) : (
              <ScrollReveal>
                <section style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--bb-text-muted)' }}>
                  <p>Your Memory Line is waiting for its first chapter.</p>
                </section>
              </ScrollReveal>
            )
          )}

          <ScrollReveal direction="up">
            <FinalCelebration 
              eventId={event.id}
              birthdayName={birthdayName} 
              onReplay={handleReplay} 
              wishes={textWishes} 
              videoWishes={videoWishes}
              timeline={timeline}
              vault={null}
              vaultUnlocked={false}
              orgSettings={orgSettings}
            />
          </ScrollReveal>

          <DownloadModal
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            eventId={event?.id}
            birthdayName={birthdayName}
            wishes={textWishes}
            videoWishes={videoWishes}
            timeline={timeline}
          />
        </>
      )}
      </AnimatePresence>
    </div>
  );
}
