import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../style/VaultWishes.css";
import { getBirthdayVault, attemptBirthdayVault } from "../service/wishService";
import { API_BASE_URL } from "../service/authService";
import { generateVaultWishHtml } from "../utils/generateOfflineHtml";

import ScrollReveal from "../components/Birthday/ScrollReveal";
import WishCard from "../components/Birthday/WishCard";
import WishModal from "../components/Birthday/WishModal";
import { AnimatePresence } from "framer-motion";

function VaultWishes({ isOffline, offlineVaultData, offlineEventData, onBack }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [vaultData, setVaultData] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vault Unlock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [started, setStarted] = useState(false);
  const [activeMemory, setActiveMemory] = useState(null);
  const [revealedThings, setRevealedThings] = useState([]);
  const [showLetter, setShowLetter] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedWish, setSelectedWish] = useState(null);

  const timelineRef = useRef(null);
  const noCountRef = useRef(0);
  const noButtonRef = useRef(null);

  useEffect(() => {
    document.title = "Wish Land • The Secret Vault";
    return () => {
      document.title = "Velora Studio";
    };
  }, []);

  useEffect(() => {
    if (isOffline) {
      setVaultData(offlineVaultData);
      setEventData(offlineEventData);
      setIsUnlocked(true);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const searchStr = window.location.search || "";
        const searchParams = new URLSearchParams(searchStr);
        let vaultId = searchParams.get("vault_id") || searchParams.get("vaultid") || searchParams.get("vault");
        let orgId = searchParams.get("org_id") || searchParams.get("orgid") || searchParams.get("org");
        let eventIdParam = eventId || searchParams.get("event_id") || searchParams.get("eventid") || searchParams.get("event");

        // Support concatenated or raw formats like ?orgidvaultid or multiple UUIDs in query string
        const uuidMatches = searchStr.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g) || [];
        if (uuidMatches.length >= 2) {
          if (!orgId) orgId = uuidMatches[0];
          if (!vaultId) vaultId = uuidMatches[1];
        } else if (uuidMatches.length === 1) {
          if (!vaultId && !eventIdParam && !orgId) {
            vaultId = uuidMatches[0];
          }
        }
        const rawQuery = searchStr.replace(/^\?/, "").trim();

        let loadedVault = null;
        let loadedEvent = null;

        // 1. Flexible lookup by vaultId, eventIdParam, orgId, or rawQuery
        const lookupTarget = vaultId || eventIdParam || orgId || rawQuery;
        if (lookupTarget) {
          try {
            const lookupRes = await fetch(`${API_BASE_URL}/vault/lookup/${lookupTarget}`);
            if (lookupRes.ok) {
              const lookupData = await lookupRes.json();
              if (lookupData.vault) loadedVault = lookupData.vault;
              if (lookupData.event) loadedEvent = lookupData.event;
            }
          } catch (err) {
            console.warn("Vault lookup failed:", err);
          }
        }

        // 2. Direct event-based fallback
        if (!loadedVault && (eventIdParam || eventId)) {
          loadedVault = await getBirthdayVault(eventIdParam || eventId).catch(() => null);
        }

        // 3. User session context
        const [evRes, wisherRes, secretWishesData] = await Promise.all([
          fetch(`${API_BASE_URL}/events/my-birthday-event`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` }
          }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE_URL}/events/my-wisher-access`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` }
          }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE_URL}/wishes/birthday-person-vault`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` }
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (loadedVault) {
          setVaultData({ ...loadedVault, secret_wishes: secretWishesData || [] });
          // If already has dynamic content or previously unlocked
          const alreadyUnlocked = Boolean(
            loadedVault.dynamic_data && 
            (loadedVault.dynamic_data.timeline?.length > 0 || 
             loadedVault.dynamic_data.confessionText || 
             loadedVault.dynamic_data.letterParagraphs?.length > 0)
          );
          setIsUnlocked(alreadyUnlocked);
        }

        let bestName = loadedEvent?.birthday_person_name || "Birthday Star";
        let bestSlug = loadedEvent?.slug || "";

        if (evRes) {
          if (evRes.birthday_person_name) bestName = evRes.birthday_person_name;
          if (evRes.slug) bestSlug = evRes.slug;
        } else if (wisherRes && wisherRes.event) {
          if (wisherRes.event.birthday_person_name) bestName = wisherRes.event.birthday_person_name;
          if (wisherRes.event.slug) bestSlug = wisherRes.event.slug;
        }

        setEventData({ birthday_person_name: bestName, slug: bestSlug });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, isOffline, offlineVaultData, offlineEventData]);

  useEffect(() => {
    document.body.classList.toggle("bb-lock", !started && isUnlocked);
    return () => {
      document.body.classList.remove("bb-lock");
    };
  }, [started, isUnlocked]);

  const handleUnlockAttempt = async (e) => {
    if (e) e.preventDefault();
    if (!challengeAnswer.trim() || !vaultData?.id) return;
    setUnlocking(true);
    setUnlockError("");

    try {
      const res = await attemptBirthdayVault(vaultData.id, challengeAnswer.trim());
      if (res && res.unlocked) {
        const updatedVault = res.vault || {};
        setVaultData((prev) => ({
          ...prev,
          ...updatedVault,
          dynamic_data: updatedVault.dynamic_data || prev?.dynamic_data || {},
          unlock_message: updatedVault.unlock_message || prev?.unlock_message,
          unlock_media_url: updatedVault.unlock_media_url || prev?.unlock_media_url,
        }));
        setIsUnlocked(true);
        setStarted(true);
      } else {
        setUnlockError("That's not the secret key. Think back to that special memory and try again!");
      }
    } catch (err) {
      setUnlockError(err.message || "Incorrect secret answer. Try again!");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <div style={{ color: 'black', textAlign: 'center', marginTop: '20vh' }}>Loading the secret vault...</div>;
  if (!vaultData) {
    return (
      <div className="bb-vault-challenge-screen">
        <div className="bb-vault-challenge-card">
          <div className="bb-vault-challenge-icon">🗝️</div>
          <h2 className="bb-vault-challenge-title">Vault Not Found</h2>
          <p className="bb-vault-challenge-subtitle">
            This secret vault link may have expired or is not active yet.
          </p>
          <button 
            className="bb-vault-unlock-btn" 
            onClick={() => navigate("/")}
            style={{ marginTop: '16px' }}
          >
            Go to Celebration
          </button>
        </div>
      </div>
    );
  }

  const dynamic = vaultData.dynamic_data || {};
  const fallbackBdayName = eventData?.birthday_person_name || "Her Name";
  const HER_NAME = dynamic.bday_girl_name || fallbackBdayName;
  const YOUR_NAME = dynamic.wisher_name || "Your Name";
  const timeline = dynamic.timeline || [];
  const littleThings = dynamic.littleThings || [];
  const letterParagraphs = dynamic.letterParagraphs || [];
  const flowerLine1 = dynamic.flowerLine1 || "If I had a flower for every time I thought of you...";
  const flowerLine2 = dynamic.flowerLine2 || "{flowerLine2}";
  const confessionText = dynamic.confessionText || "I've been wanting to tell you something for a while.";
  const proposalQuestion = dynamic.proposalQuestion || "Would you let me love you a little more than just a best friend?";
  const photos = dynamic.photos || ["/images/memory-01.jpg", "/images/memory-02.jpg", "/images/memory-03.jpg", "/images/memory-04.jpg"];


  const revealThing = (index) => {
    if (!revealedThings.includes(index)) {
      setRevealedThings((prev) => [...prev, index]);
    }
  };

  const scrollTimeline = (direction) => {
    if (!timelineRef.current) return;
    timelineRef.current.scrollBy({
      left: direction === "next" ? 420 : -420,
      behavior: "smooth",
    });
  };

  const submitAnswer = async (ans) => {
    try {
      if (!isOffline) {
        await fetch(`${API_BASE_URL}/vault/${vaultData.id}/confess`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
          body: JSON.stringify({ answer: ans })
        });
      }
      localStorage.setItem("confessionAnswer", ans);
    } catch (e) {
      console.error(e);
    }
  };

  const handleYes = () => {
    setAnswer("yes");
    setShowCelebration(true);
    submitAnswer("yes");
    setTimeout(() => {
      document.getElementById("ending")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleNo = () => {
    setAnswer("no");
    submitAnswer("no");
  };

  const handleNoHover = () => {
    noCountRef.current += 1;
    if (noCountRef.current >= 100) {
      setAnswer("hate");
      submitAnswer("hate");
      return;
    }
    if (noButtonRef.current) {
      const x = Math.floor(Math.random() * 200) - 100; // -100px to 100px
      const y = Math.floor(Math.random() * 100) - 50;  // -50px to 50px
      noButtonRef.current.style.transform = `translate(${x}px, ${y}px)`;
      noButtonRef.current.style.transition = 'all 0.2s ease';
      noButtonRef.current.style.zIndex = '100';
    }
  };

  const handleTime = () => {
    setAnswer("time");
    submitAnswer("time");
  };


  // If Vault is Locked, present the Secret Question Challenge Screen
  if (!isUnlocked) {
    return (
      <div className="bb-vault-challenge-screen">
        <div className="bb-vault-challenge-card">
          <div className="bb-vault-challenge-icon">🔒</div>
          <span className="bb-vault-challenge-badge">Special Delivery</span>
          <h1 className="bb-vault-challenge-title">The Secret Vault</h1>
          <p className="bb-vault-challenge-subtitle">
            A secret wish was kept safe here for <strong style={{ color: "#ffd166" }}>{HER_NAME}</strong>. Only the birthday star can answer the secret key to open it.
          </p>

          <div className="bb-vault-question-box">
            <span className="bb-vault-q-label">Secret Challenge Question</span>
            <p className="bb-vault-q-text">
              "{vaultData.question || 'What is our special secret?'}"
            </p>
            {vaultData.hint && (
              <div className="bb-vault-hint-text">
                💡 Clue: {vaultData.hint}
              </div>
            )}
          </div>

          <form onSubmit={handleUnlockAttempt} className="bb-vault-answer-form">
            <input
              type="text"
              className="bb-vault-answer-input"
              placeholder="Enter your secret answer..."
              value={challengeAnswer}
              onChange={(e) => {
                setChallengeAnswer(e.target.value);
                setUnlockError("");
              }}
              disabled={unlocking}
              autoFocus
            />
            {unlockError && (
              <div className="bb-vault-error-msg">
                {unlockError}
              </div>
            )}
            <button
              type="submit"
              className="bb-vault-unlock-btn"
              disabled={unlocking || !challengeAnswer.trim()}
            >
              {unlocking ? "Verifying Secret..." : "Unlock Vault ✨"}
            </button>
          </form>

          <div style={{ marginTop: "24px" }}>
            <button
              onClick={() => {
                if (eventData?.slug) {
                  navigate(`/birthday/${eventData.slug}`);
                } else {
                  navigate("/");
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: "0.85rem",
                textDecoration: "underline"
              }}
            >
              ← Back to Celebration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="bb-page">

      {/* Floating Download Keepsake Button */}
      <div className="bb-vault-topbar">
        <button
          onClick={() => generateVaultWishHtml(HER_NAME, vaultData, YOUR_NAME)}
          className="bb-vault-download-btn"
          title="Download Vault Wish Keepsake"
        >
          📥 Download Vault Wish
        </button>
      </div>

      {/* ================================================================
          OPENING
      ================================================================= */}

      {!started && (
        <section className="bb-opening">
          <div className="bb-opening-noise" />

          <div className="bb-opening-content">

            <div className="bb-opening-stamp">
              SPECIAL DELIVERY
            </div>

            <p className="bb-small-label">
              FOR SOMEONE VERY SPECIAL
            </p>

            <h1>
              Hey, <span>{HER_NAME}</span>...
            </h1>

            <p className="bb-opening-text">
              I made you something.
              <br />
              Please don't rush through it.
            </p>

            <div className="bb-envelope-wrap">

              <div className="bb-envelope">
                <div className="bb-envelope-flap" />

                <div className="bb-letter-preview">
                  <span>for you</span>
                  <strong>♡</strong>
                </div>

                <div className="bb-envelope-front" />
              </div>

              <div className="bb-envelope-sticker">
                ♥
              </div>

            </div>

            <button
              className="bb-open-button"
              onClick={() => setStarted(true)}
            >
              Open your little surprise
              <span>→</span>
            </button>

            <p className="bb-scroll-hint">
              take your time · there is no rush
            </p>
          </div>
        </section>
      )}

      {started && (
        <>

          {/* ================================================================
              NAV
          ================================================================= */}

          <nav className="bb-nav">
            <div className="bb-nav-name">
              {HER_NAME}
              <span>♡</span>
            </div>

            <div className="bb-nav-links">
              <a href="#story">our story</a>
              <a href="#letter">a letter</a>
              <a href="#ending">♡</a>
            </div>
          </nav>


          {/* ================================================================
              HERO
          ================================================================= */}

          <ScrollReveal>
            <section className="bb-hero">

              <div className="bb-hero-content">

                <p className="bb-eyebrow">
                  ✦ HAPPY BIRTHDAY, {HER_NAME.toUpperCase()} ✦
                </p>

                <h2>
                  Today is about
                  <br />
                  <em>you.</em>
                </h2>

                <div className="bb-hero-divider">
                  <span>♡</span>
                </div>

                <p className="bb-hero-submessage">
                  And there's something else I've been meaning to tell you.
                </p>

                <a href="#story" className="bb-down-arrow">
                  ↓
                </a>
              </div>

            </section>
          </ScrollReveal>


          {/* ================================================================
              LITTLE NOTE
          ================================================================= */}

          <ScrollReveal>
            <section className="bb-note-section">

              <div className="bb-paper-note" style={{ width: 'min(900px, 80vw)', padding: '50px 30px', minHeight: 'auto' }}>
                <span className="bb-note-tape" />

                <p className="bb-handwritten">
                  {flowerLine1}
                </p>

                <p className="bb-note-small">
                  {flowerLine2}
                </p>

                {/* Combined Wishes Grid for Vault inside the Note */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', width: '100%', marginTop: '50px' }}>

                  {/* this wish should be like text wish envelope in the normal wish page  */}
                  <div className="wish-wall-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {dynamic.personalMessage && [
                      {
                        id: "vault-personal",
                        content: dynamic.personalMessage,
                      }
                    ].map((wish, idx) => (
                      <WishCard
                        key={wish.id}
                        wish={wish}
                        index={idx}
                        onClick={setSelectedWish}
                      />
                    ))}
                  </div>

                  {/* Video Wish from Dynamic Data */}
                  {dynamic.videoWish && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <video src={dynamic.videoWish} controls style={{ width: "100%", maxWidth: "250px", borderRadius: "10px", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }} />
                    </div>
                  )}

                </div>
              </div>

            </section>
          </ScrollReveal>

          <AnimatePresence>
            {selectedWish && (
              <WishModal
                wish={selectedWish}
                onClose={() => setSelectedWish(null)}
              />
            )}
          </AnimatePresence>



          {/* ================================================================
              TIMELINE
          ================================================================= */}

          <ScrollReveal>
            <section className="bb-timeline-section">

              <div className="bb-timeline-top">

                <div>
                  <span className="bb-section-kicker" style={{ fontWeight: "bold" }}>
                    OUR LITTLE ARCHIVE
                  </span>

                  <h2>
                    Moments I
                    <em>keep.</em>
                  </h2>
                </div>

                <div className="bb-timeline-controls">

                  <button
                    onClick={() => scrollTimeline("prev")}
                    aria-label="Previous memory"
                  >
                    ←
                  </button>

                  <button
                    onClick={() => scrollTimeline("next")}
                    aria-label="Next memory"
                  >
                    →
                  </button>

                </div>

              </div>


              <div
                ref={timelineRef}
                className="bb-timeline"
              >

                {timeline.map((memory, index) => (

                  <article
                    className={`bb-memory-card ${index % 2 === 0
                      ? "bb-card-up"
                      : "bb-card-down"
                      }`}
                    key={index}
                    onClick={() => setActiveMemory(memory)}
                  >

                    <div className="bb-memory-pin">
                      ♥
                    </div>

                    <div className="bb-memory-photo">

                      <img
                        src={memory.image}
                        alt={memory.title}
                      />

                      <div className="bb-photo-overlay">
                        <span>view memory</span>
                      </div>

                    </div>

                    <div className="bb-memory-content">

                      <div className="bb-memory-date">
                        {memory.date && memory.date !== "Unknown" ? `${memory.date} ` : ""}
                        <span>{memory.year !== "Unknown" ? memory.year : ""}</span>
                      </div>

                      <h3>
                        {memory.title}
                      </h3>

                      <p>
                        {memory.description}
                      </p>

                    </div>

                  </article>

                ))}

                <div className="bb-timeline-end">
                  <span>♡</span>
                  <p>and many more to come...</p>
                </div>

              </div>


              <div className="bb-timeline-scroll-label">
                <span>←</span>
                swipe / scroll
                <span>→</span>
              </div>

            </section>
          </ScrollReveal>


          {/* ================================================================
              THINGS I LIKE
          ================================================================= */}

          <ScrollReveal>
            <section className="bb-things-section">

              <div className="bb-section-number" style={{ fontWeight: "bold" }}>
                THINGS I NEVER SAY ENOUGH
              </div>

              <div className="bb-things-header">

                <h2>
                  Little things
                  <br />
                  <em>about you.</em>
                </h2>


              </div>


              <div className="bb-heart-grid">

                {littleThings.map((thing, index) => (

                  <button
                    className={`bb-heart-note ${revealedThings.includes(index)
                      ? "revealed"
                      : ""
                      }`}
                    key={index}
                    onClick={() => revealThing(index)}
                  >

                    {!revealedThings.includes(index) ? (
                      <>
                        <span className="bb-heart-symbol">
                          ♥
                        </span>

                        <small>
                          tap me
                        </small>
                      </>
                    ) : (
                      <>
                        <span className="bb-revealed-number">
                          0{index + 1}
                        </span>

                        <p>
                          {thing}
                        </p>
                      </>
                    )}

                  </button>

                ))}

              </div>

            </section>
          </ScrollReveal>


          {/* ================================================================
              SCRAPBOOK GALLERY
          ================================================================= */}

          <ScrollReveal>
            <section className="bb-scrapbook">

              <div className="bb-scrapbook-title">

                <span className="bb-section-kicker">
                  THE PHOTO ALBUM
                </span>

                <h2>
                  Proof that
                  <br />
                  <em>we were here.</em>
                </h2>

              </div>

              <div className="bb-scrapbook-board">
                {photos[0] && (
                  <div className="bb-polaroid bb-polaroid-one">
                    <img src={photos[0]} alt="" />
                    <span>one of my favourites</span>
                  </div>
                )}

                {photos[1] && (
                  <div className="bb-polaroid bb-polaroid-two">
                    <img src={photos[1]} alt="" />
                    <span>you + me</span>
                  </div>
                )}

                {photos[2] && (
                  <div className="bb-polaroid bb-polaroid-three">
                    <img src={photos[2]} alt="" />
                    <span>remember this?</span>
                  </div>
                )}

                {photos[3] && (
                  <div className="bb-polaroid bb-polaroid-four">
                    <img src={photos[3]} alt="" />
                    <span>♡</span>
                  </div>
                )}

              </div>

            </section>
          </ScrollReveal>


          {/* ================================================================
              LETTER
          ================================================================= */}

          {letterParagraphs.length && (
            <ScrollReveal>
              <section
                id="letter"
                className="bb-letter-section"
              >
                <div className="bb-letter-wrapper">

                  <div className="bb-letter-heading">

                    <span className="bb-section-kicker">
                      SOMETHING FROM ME
                    </span>

                    <h2>
                      A letter
                      <br />
                      <em>for you.</em>
                    </h2>

                  </div>


                  <div className="bb-letter-paper">

                    <div className="bb-letter-top">
                      <span>✦</span>
                      <span>✦</span>
                      <span>✦</span>
                    </div>

                    <div className="bb-letter-body">

                      <p>
                        {letterParagraphs[0]}
                      </p>

                      {!showLetter ? (

                        <button
                          className="bb-reveal-letter"
                          onClick={() => setShowLetter(true)}
                        >
                          <span>Open the rest of my heart</span>
                          <b>♡</b>
                        </button>

                      ) : (

                        <div className="bb-hidden-letter bb-reveal-anim">
                          {letterParagraphs.length > 1 && letterParagraphs.slice(1).map((paragraph, index) => (
                            <p key={index}>
                              {paragraph}
                            </p>
                          ))}
                          <div className="bb-signature">
                            Always,
                            <br />
                            <strong>{YOUR_NAME}</strong>
                          </div>
                        </div>

                      )}

                    </div>

                  </div>

                </div>

              </section>
            </ScrollReveal>
          )}


          {/* ================================================================
              CONFESSION
          ================================================================= */}

          <ScrollReveal>
            <section
              id="ending"
              className="bb-confession-section"
            >

              <div className="bb-confession-content">

                <span className="bb-section-kicker">
                  ONE LAST THING
                </span>

                <div className="bb-confession-stamp">
                  PLEASE READ THIS PART
                </div>



                {(dynamic.confessionText || dynamic.proposalQuestion) && (
                  <>
                    <h2>
                      So...
                    </h2>

                    <p className="bb-confession-main">
                      I've spent all this time
                      <br />
                      talking about
                      <br />
                      <strong>You are Something.</strong>
                    </p>

                    <div className="bb-big-heart">
                      ♥
                    </div>

                    <div className="bb-confession-card">

                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {confessionText ? confessionText : "I have to tell you something"}
                      </p>

                      <p className="bb-final-question">
                        {proposalQuestion}
                      </p>

                    </div>


                    {!answer && (

                      <div className="bb-answer-area">

                        <p>
                          You don't have to answer immediately.
                        </p>

                        <div className="bb-answer-buttons" style={{ position: 'relative' }}>

                          <button
                            className="bb-yes-button"
                            onClick={handleYes}
                          >
                            Yes
                            <span>♡</span>
                          </button>

                          <button
                            className="bb-time-button"
                            onClick={handleTime}
                          >
                            I need some time 🤍
                          </button>

                          <button
                            ref={noButtonRef}
                            className="bb-time-button bb-no-runaway"
                            onMouseEnter={handleNoHover}
                            onClick={handleNoHover}
                          >
                            No, I'm sorry
                          </button>

                        </div>

                      </div>

                    )}


                    {answer === "time" && (

                      <div className="bb-time-response">

                        <span>🤍</span>

                        <h3>
                          That's completely okay.
                        </h3>

                        <p>
                          Take all the time you need.
                          <br />
                          Nothing about this changes how much
                          <br />
                          I value you.
                        </p>

                      </div>

                    )}

                    {answer === "hate" && (

                      <div className="bb-time-response">

                        <span>💔</span>

                        <h3>
                          That much you hate me ?!
                        </h3>

                        <p>
                          I guess I tried 100 times to stop you...
                          <br />
                          But I'll respect your choice.
                        </p>

                      </div>

                    )}

                    {showCelebration && (

                      <div className="bb-yes-response">

                        <div className="bb-confetti-hearts">
                          ♥　♡　♥　♡　♥
                        </div>

                        <h3>
                          I know you'll say yes
                        </h3>

                        <p>
                          Happy birthday, {HER_NAME}.
                          <br />
                          Here's to whatever comes next. ♡
                        </p>

                      </div>

                    )}
                  </>
                )}

              </div>

            </section>
          </ScrollReveal>


          {/* ================================================================
              FOOTER
          ================================================================= */}

          <footer className="bb-footer">

            <div className="bb-footer-cat">
            </div>

            <p>
              made with love
            </p>
            <br />

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "10px" }}>
              <button
                onClick={() => generateVaultWishHtml(HER_NAME, vaultData, YOUR_NAME)}
                style={{
                  background: "linear-gradient(135deg, #ffd166 0%, #e6a836 100%)",
                  border: "none",
                  color: "#3b1e08",
                  padding: "10px 24px",
                  borderRadius: "30px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  boxShadow: "0 4px 15px rgba(255, 209, 102, 0.4)"
                }}
              >
                📥 Download Vault Wish
              </button>
              <button
                onClick={() => {
                  if (isOffline && onBack) {
                    onBack();
                  } else if (eventData?.slug) {
                    navigate(`/birthday/${eventData.slug}`, { state: { skipIntro: true } });
                  } else {
                    window.history.back();
                  }
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "30px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "all 0.3s"
                }}
              >
                ← Back to Celebration
              </button>
            </div>

          </footer>


          {/* ================================================================
              MEMORY MODAL
          ================================================================= */}

          {activeMemory && (

            <div
              className="bb-modal"
              onClick={() => setActiveMemory(null)}
            >

              <div
                className="bb-modal-card"
                onClick={(event) => event.stopPropagation()}
              >

                <button
                  className="bb-modal-close"
                  onClick={() => setActiveMemory(null)}
                >
                  ×
                </button>

                <img
                  src={activeMemory.image}
                  alt={activeMemory.title}
                />

                <div className="bb-modal-content">

                  <span>
                    {activeMemory.date && activeMemory.date !== "Unknown" ? `${activeMemory.date} · ` : ""}{activeMemory.year !== "Unknown" ? activeMemory.year : ""}
                  </span>

                  <h3>
                    {activeMemory.title}
                  </h3>

                  <p>
                    {activeMemory.description}
                  </p>

                </div>

              </div>

            </div>

          )}

        </>
      )}
    </main>
  );
}

export default VaultWishes;
