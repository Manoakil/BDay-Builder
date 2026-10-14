import React, { useState, useEffect, useRef } from "react";
import { getBirthdayVault, getWisherAccessStatus, uploadMedia, getMyWishes, getMyTimeline } from "../service/wishService";
import { API_BASE_URL } from "../service/authService";
import { compressVideo, isLargeVideo, formatFileSize, fixWebmBlobDuration } from "../utils/videoCompressor";

const WisherVaultConfig = () => {
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actualEventId, setActualEventId] = useState(localStorage.getItem("eventId") || null);

  // Tabs for main config sections
  const [activeTab, setActiveTab] = useState("info"); // info, textWish, videoWish, timeline, confession

  // Dynamic fields
  const [bdayGirlName, setBdayGirlName] = useState("");
  const [wisherName, setWisherName] = useState("");
  const [flowerLine1, setFlowerLine1] = useState("If I had a flower for every time I thought of you...");
  const [flowerLine2, setFlowerLine2] = useState("...I'd probably need a bigger garden.");

  const [littleThings, setLittleThings] = useState([]);
  const [newLittleThing, setNewLittleThing] = useState("");

  const [letterParagraphs, setLetterParagraphs] = useState([]);
  const [newParagraph, setNewParagraph] = useState("");

  const [confessionText, setConfessionText] = useState("I've been wanting to tell you something for a while.");
  const [proposalQuestion, setProposalQuestion] = useState("Would you let me love you a little more than just a best friend?");

  const [timeline, setTimeline] = useState([]);
  const [tlDate, setTlDate] = useState("");
  const [tlYear, setTlYear] = useState("");
  const [tlTitle, setTlTitle] = useState("");
  const [tlDesc, setTlDesc] = useState("");
  const tlFileInput = useRef(null);

  const [photos, setPhotos] = useState([]);
  const photoFileInput = useRef(null);

  const [savingStatus, setSavingStatus] = useState({});

  // Text Wish state
  const [personalMessage, setPersonalMessage] = useState("");
  const maxChars = 500;

  // Video Wish state
  const [videoWish, setVideoWish] = useState("");
  const [videoTab, setVideoTab] = useState("record"); // record or upload
  const [wishUploadFile, setWishUploadFile] = useState(null);
  const [wishUploadPreview, setWishUploadPreview] = useState(null);
  const [isCompressingVideo, setIsCompressingVideo] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [compressStatus, setCompressStatus] = useState("");
  const [compressedInfo, setCompressedInfo] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [wishVideoURL, setWishVideoURL] = useState(null);
  const [wishVideoBlob, setWishVideoBlob] = useState(null);
  const [videoRecordingTime, setVideoRecordingTime] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wishMediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const wishRecordingStartTimeRef = useRef(0);

  useEffect(() => {
    let interval = null;
    if (isRecordingVideo) {
      interval = setInterval(() => {
        setVideoRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingVideo]);

  const formatTime = (timeInSeconds) => {
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
    const s = (timeInSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const fetchVaultAndEvent = async () => {
      try {
        const wisherRes = await getWisherAccessStatus().catch(() => null);
        console.log("Vault Config wisherRes:", wisherRes);
        let fetchedEventId = actualEventId;
        if (wisherRes && wisherRes.event) {
          fetchedEventId = wisherRes.event.id;
          setActualEventId(fetchedEventId);
        }
        console.log("Resolved Event ID:", fetchedEventId);

        const [v, myWishesRes, myTimelineRes] = await Promise.all([
          fetchedEventId ? getBirthdayVault(fetchedEventId).catch(() => null) : Promise.resolve(null),
          getMyWishes().catch(() => []),
          getMyTimeline().catch(() => [])
        ]);

        let defaultBdayName = "";
        if (wisherRes && wisherRes.event) {
          defaultBdayName = wisherRes.event.birthday_person_name || wisherRes.event.title || "";
        }

        let defaultWisherName = "";
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          defaultWisherName = u.full_name || u.fullName || "";
        } catch { }

        let existingTextWish = "";
        let existingVideoWish = "";
        if (myWishesRes && myWishesRes.length > 0) {
          const textW = myWishesRes.find(w => w.wish_type === "text" || w.wish_type === "image");
          if (textW) existingTextWish = textW.message || "";
          const vidW = myWishesRes.find(w => w.wish_type === "video");
          if (vidW) existingVideoWish = vidW.media_url || "";
        }

        let existingTimeline = [];
        if (myTimelineRes && myTimelineRes.length > 0) {
          existingTimeline = myTimelineRes.map(t => {
            let dString = "Unknown";
            let yString = "Unknown";
            if (t.entry_date) {
              const d = new Date(t.entry_date);
              if (!isNaN(d.getTime())) {
                dString = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                yString = d.getFullYear().toString();
              }
            }
            return {
              date: dString,
              year: yString,
              title: t.title || "Memory",
              description: t.description || "",
              image: t.media_url || t.file_url || t.image_url || "/images/memory-01.jpg"
            };
          });
        }

        if (v) {
          setVault(v);
          const dyn = v.dynamic_data || {};
          setBdayGirlName(dyn.bday_girl_name || defaultBdayName);
          setWisherName(dyn.wisher_name || defaultWisherName);
          if (dyn.flowerLine1) setFlowerLine1(dyn.flowerLine1);
          if (dyn.flowerLine2) setFlowerLine2(dyn.flowerLine2);
          if (dyn.littleThings) setLittleThings(dyn.littleThings);
          if (dyn.letterParagraphs) setLetterParagraphs(dyn.letterParagraphs);
          setPersonalMessage(dyn.personalMessage !== undefined ? dyn.personalMessage : existingTextWish);
          setVideoWish(dyn.videoWish !== undefined ? dyn.videoWish : existingVideoWish);
          if (dyn.confessionText) setConfessionText(dyn.confessionText);
          if (dyn.proposalQuestion) setProposalQuestion(dyn.proposalQuestion);
          setTimeline(dyn.timeline && dyn.timeline.length > 0 ? dyn.timeline : existingTimeline);
          if (dyn.photos) setPhotos(dyn.photos);
        } else {
          setBdayGirlName(defaultBdayName);
          setWisherName(defaultWisherName);
          setPersonalMessage(existingTextWish);
          setVideoWish(existingVideoWish);
          setTimeline(existingTimeline);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchVaultAndEvent();
  }, [actualEventId]);

  const saveSection = async (sectionName, dataToMerge) => {
    setSavingStatus(prev => ({ ...prev, [sectionName]: "Saving..." }));
    try {
      const currentFullData = {
        bday_girl_name: bdayGirlName,
        wisher_name: wisherName,
        flowerLine1,
        flowerLine2,
        littleThings,
        letterParagraphs,
        personalMessage,
        videoWish,
        confessionText,
        proposalQuestion,
        timeline,
        photos,
        ...dataToMerge
      };

      let res;
      if (vault) {
        res = await fetch(`${API_BASE_URL}/vault/${vault.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("access_token")}`
          },
          body: JSON.stringify({ dynamic_data: currentFullData })
        });
      } else {
        let currentEventId = actualEventId;
        if (!currentEventId) {
          try {
            const wisherRes = await getWisherAccessStatus();
            if (wisherRes && wisherRes.event) {
              currentEventId = wisherRes.event.id;
              setActualEventId(currentEventId);
            }
          } catch (e) {
            console.error("Failed to fetch event ID on save", e);
          }
        }

        if (!currentEventId) {
          alert("Error: Missing Event ID. Please refresh the page or make sure you are assigned to an event.");
          setSavingStatus(prev => ({ ...prev, [sectionName]: null }));
          return;
        }
        res = await fetch(`${API_BASE_URL}/vault/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("access_token")}`
          },
          body: JSON.stringify({
            event_id: currentEventId,
            question: "Ready for your surprise?",
            answer_hash: "none",
            dynamic_data: currentFullData
          })
        });
      }

      if (res.ok) {
        const updatedVault = await res.json();
        setVault(updatedVault);
        setSavingStatus(prev => ({ ...prev, [sectionName]: "Saved!" }));
        setTimeout(() => setSavingStatus(prev => ({ ...prev, [sectionName]: null })), 2000);
      } else {
        setSavingStatus(prev => ({ ...prev, [sectionName]: "Failed!" }));
      }
    } catch (e) {
      console.error(e);
      setSavingStatus(prev => ({ ...prev, [sectionName]: "Error!" }));
    }
  };

  const handleAddLittleThing = () => {
    if (newLittleThing.trim()) {
      setLittleThings(prev => [...prev, newLittleThing]);
      setNewLittleThing("");
    }
  };

  const handleAddParagraph = () => {
    if (newParagraph.trim()) {
      setLetterParagraphs(prev => [...prev, newParagraph]);
      setNewParagraph("");
    }
  };

  const getPublicUrl = (data) => {
    if (!data) return null;
    return data.metadata?.public_url || data.path || data.url || data.media_url || null;
  };

  const handlePhotoUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const data = await uploadMedia(e.target.files[0], "wishes");
        const url = getPublicUrl(data);
        if (url) {
          const newPhotos = [...photos, url];
          setPhotos(newPhotos);
          saveSection('photos', { photos: newPhotos });
        }
      } catch (err) {
        alert("Upload failed");
      }
    }
  };

  const handleTimelinePhoto = async (e) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const data = await uploadMedia(e.target.files[0], "wishes");
        const url = getPublicUrl(data);
        if (url) {
          const newTimeline = [...timeline, {
            date: tlDate,
            year: tlYear,
            title: tlTitle,
            description: tlDesc,
            image: url
          }];
          setTimeline(newTimeline);
          setTlDate(""); setTlYear(""); setTlTitle(""); setTlDesc("");
          saveSection('timeline', { timeline: newTimeline });
        }
      } catch (err) {
        alert("Upload failed");
      }
    }
  };

  // VIDEO RECORDING LOGIC
  const openWishCamera = async (event) => {
    if (event) event.preventDefault();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera access is not supported by this browser.");
        return;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }
      setWishVideoURL(null);
      setWishVideoBlob(null);
      setIsCameraOn(true);
      setIsRecordingVideo(false);
      setVideoRecordingTime(0);
    } catch (error) {
      alert("Camera and microphone access is required to record a video wish.");
    }
  };

  const startWishVideoRecording = (event) => {
    if (event) event.preventDefault();
    if (!streamRef.current) {
      alert("Please open the camera first.");
      return;
    }
    if (isRecordingVideo) return;
    try {
      videoChunksRef.current = [];
      let mimeType = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";

      const recorder = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const rawBlob = new Blob(videoChunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (rawBlob.size === 0) {
          alert("No video was recorded.");
          return;
        }

        const durationMs = Math.max(1000, Date.now() - wishRecordingStartTimeRef.current);
        const fixedBlob = await fixWebmBlobDuration(rawBlob, durationMs);

        setWishVideoBlob(fixedBlob);
        setWishVideoURL(URL.createObjectURL(fixedBlob));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setIsCameraOn(false);
        setIsRecordingVideo(false);
      };
      wishMediaRecorderRef.current = recorder;
      wishRecordingStartTimeRef.current = Date.now();
      recorder.start(250);
      setVideoRecordingTime(0);
      setIsRecordingVideo(true);
    } catch (error) {
      alert("Unable to start video recording.");
    }
  };

  const stopWishVideoRecording = (event) => {
    if (event) event.preventDefault();
    const recorder = wishMediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
    setIsRecordingVideo(false);
  };

  const cancelWishCamera = (event) => {
    if (event) event.preventDefault();
    const recorder = wishMediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setIsRecordingVideo(false);
    setVideoRecordingTime(0);
  };

  const removeRecordedVideo = () => {
    if (wishVideoURL) URL.revokeObjectURL(wishVideoURL);
    setWishVideoURL(null);
    setWishVideoBlob(null);
  };

  const sendRecordedWish = async (event) => {
    if (event) event.preventDefault();
    if (!wishVideoBlob) return;
    try {
      setSavingStatus(prev => ({ ...prev, 'video': "Uploading..." }));
      const file = new File([wishVideoBlob], "video_wish.webm", { type: wishVideoBlob.type });
      const uploaded = await uploadMedia(file, "wishes");
      const pubUrl = getPublicUrl(uploaded);
      if (pubUrl) {
        setVideoWish(pubUrl);
        await saveSection('video', { videoWish: pubUrl });
        removeRecordedVideo();
      } else {
        setSavingStatus(prev => ({ ...prev, 'video': "Failed to get URL" }));
      }
    } catch (e) {
      setSavingStatus(prev => ({ ...prev, 'video': "Error!" }));
    }
  };

  const handleWishFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type || !file.type.startsWith("video/")) {
      alert("Only video files are allowed for wishes.");
      return;
    }

    if (wishUploadPreview) URL.revokeObjectURL(wishUploadPreview);

    if (isLargeVideo(file, 100)) {
      setIsCompressingVideo(true);
      setCompressProgress(5);
      setCompressStatus(`Optimizing large video (${formatFileSize(file.size)}) with WhatsApp HD compression...`);
      setCompressedInfo("");

      try {
        const compressed = await compressVideo(file, (pct, status) => {
          setCompressProgress(pct);
          setCompressStatus(status);
        });

        const origStr = formatFileSize(file.size);
        const compStr = formatFileSize(compressed.size);
        const savedPct = Math.round((1 - compressed.size / file.size) * 100);

        setCompressedInfo(`✨ WhatsApp HD Optimization: Reduced from ${origStr} to ${compStr} (${savedPct}% smaller, high quality preserved)`);
        setWishUploadFile(compressed);
        setWishUploadPreview(URL.createObjectURL(compressed));
      } catch (err) {
        console.error("Video compression failed, using original file:", err);
        setWishUploadFile(file);
        setWishUploadPreview(URL.createObjectURL(file));
      } finally {
        setIsCompressingVideo(false);
      }
      return;
    }

    setCompressedInfo("");
    setWishUploadFile(file);
    setWishUploadPreview(URL.createObjectURL(file));
  };

  const sendUploadWish = async (event) => {
    if (event) event.preventDefault();
    if (!wishUploadFile) return;
    try {
      setSavingStatus(prev => ({ ...prev, 'video': "Uploading..." }));
      const uploaded = await uploadMedia(wishUploadFile, "wishes");
      const pubUrl = getPublicUrl(uploaded);
      if (pubUrl) {
        setVideoWish(pubUrl);
        await saveSection('video', { videoWish: pubUrl });
        setWishUploadFile(null);
        setWishUploadPreview(null);
      } else {
        setSavingStatus(prev => ({ ...prev, 'video': "Failed to get URL" }));
      }
    } catch (e) {
      setSavingStatus(prev => ({ ...prev, 'video': "Error!" }));
    }
  };

  if (loading) return <div style={{ color: "black", textAlign: "center", marginTop: "50px" }}>Loading vault...</div>;

  const cardStyle = {
    background: "rgba(20, 20, 25, 0.7)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  };

  const labelStyle = {
    fontSize: "0.95rem",
    color: "#a0a0b0",
    fontWeight: "500",
    marginBottom: "4px",
    display: "block"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s"
  };

  const buttonStyle = {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #6e8efb, #a777e3)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(167, 119, 227, 0.4)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  };

  const SaveButton = ({ sectionName, onClick }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
      <button
        type="button"
        onClick={onClick}
        style={{ ...buttonStyle, background: savingStatus[sectionName] === "Saved!" ? "#10b981" : savingStatus[sectionName] === "Uploading..." ? "#f59e0b" : "linear-gradient(135deg, #4facfe, #00f2fe)" }}
      >
        {savingStatus[sectionName] || "Upload / Update DB"}
      </button>
    </div>
  );

  return (
    <div style={{ color: "#ffffff", padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
        <h2 style={{ margin: 0, background: "rgba(0, 0, 0, 0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "black", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Secret Vault Config</h2>
        <button
          onClick={() => window.location.href = "/admin"}
          style={{ background: "rgba(0, 0, 0, 0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "black", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
        >
          {"< Back to Admin"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", overflowX: "auto" }}>
        <button onClick={() => setActiveTab("textWish")} style={{ ...buttonStyle, background: activeTab === "textWish" ? "var(--red, #e74c3c)" : "rgba(255,255,255,0.1)", boxShadow: "none", color: activeTab === "textWish" ? "white" : "black" }}>💌 Text Wish</button>
        <button onClick={() => setActiveTab("videoWish")} style={{ ...buttonStyle, background: activeTab === "videoWish" ? "var(--red, #e74c3c)" : "rgba(255,255,255,0.1)", boxShadow: "none", color: activeTab === "videoWish" ? "white" : "black" }}>📹 Video Wish</button>
        <button onClick={() => setActiveTab("info")} style={{ ...buttonStyle, background: activeTab === "info" ? "var(--red, #e74c3c)" : "rgba(255,255,255,0.1)", boxShadow: "none", color: activeTab === "info" ? "white" : "black" }}>Basic Info</button>
        <button onClick={() => setActiveTab("photos")} style={{ ...buttonStyle, background: activeTab === "photos" ? "var(--red, #e74c3c)" : "rgba(255,255,255,0.1)", boxShadow: "none", color: activeTab === "photos" ? "white" : "black" }}>Photos & Letter</button>
        <button onClick={() => setActiveTab("timeline")} style={{ ...buttonStyle, background: activeTab === "timeline" ? "var(--red, #e74c3c)" : "rgba(255,255,255,0.1)", boxShadow: "none", color: activeTab === "timeline" ? "white" : "black" }}>Timeline</button>
      </div>

      {activeTab === "textWish" && (
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>💌 Text Wish</h3>
          <div>
            <textarea
              value={personalMessage}
              onChange={e => {
                if (e.target.value.length <= maxChars) setPersonalMessage(e.target.value);
              }}
              style={{ ...inputStyle, minHeight: "150px" }}
              placeholder="Write your wish..."
            />
            <div style={{ textAlign: "right", fontSize: "0.85rem", color: "#a0a0b0", marginTop: "4px" }}>
              {personalMessage.length}/{maxChars}
            </div>
          </div>
          <SaveButton sectionName="personal" onClick={() => saveSection('personal', { personalMessage })} />
        </div>
      )}

      {activeTab === "videoWish" && (
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>📹 Video Wish</h3>

          {videoWish && !isCameraOn && !wishUploadPreview && !wishVideoURL && (
            <div style={{ position: "relative", width: "fit-content", marginTop: "8px", marginBottom: "16px" }}>
              <video src={videoWish} style={{ height: "200px", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.1)" }} controls />
              <button type="button" onClick={() => { setVideoWish(""); saveSection('video', { videoWish: "" }); }} style={{ position: "absolute", top: "-10px", right: "-10px", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "26px", height: "26px", cursor: "pointer", fontWeight: "bold" }}>×</button>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button onClick={() => setVideoTab("record")} style={{ ...buttonStyle, flex: 1, background: videoTab === "record" ? "#3b82f6" : "rgba(255,255,255,0.1)" }}>Record a Video Wish</button>
            <button onClick={() => setVideoTab("upload")} style={{ ...buttonStyle, flex: 1, background: videoTab === "upload" ? "#3b82f6" : "rgba(255,255,255,0.1)" }}>Upload Video Wish</button>
          </div>

          {videoTab === "record" && (
            <div>
              {wishVideoURL ? (
                <div style={{ textAlign: "center" }}>
                  <video src={wishVideoURL} controls style={{ width: "100%", maxHeight: "300px", borderRadius: "12px", background: "black" }} />
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
                    <button onClick={removeRecordedVideo} style={{ ...buttonStyle, background: "#ef4444" }}>Retake</button>
                    <button onClick={sendRecordedWish} style={{ ...buttonStyle, background: "#10b981" }}>Send Video Wish</button>
                  </div>
                </div>
              ) : isCameraOn ? (
                <div style={{ textAlign: "center" }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxHeight: "300px", borderRadius: "12px", background: "black" }} />
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px", alignItems: "center" }}>
                    {isRecordingVideo ? (
                      <>
                        <span style={{ color: "#ef4444", fontWeight: "bold" }}>Recording: {formatTime(videoRecordingTime)}</span>
                        <button onClick={stopWishVideoRecording} style={{ ...buttonStyle, background: "#ef4444" }}>Stop Recording</button>
                      </>
                    ) : (
                      <button onClick={startWishVideoRecording} style={{ ...buttonStyle, background: "#ef4444" }}>Start Recording</button>
                    )}
                    <button onClick={cancelWishCamera} style={{ ...buttonStyle, background: "rgba(255,255,255,0.1)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", border: "1px dashed rgba(255,255,255,0.3)", borderRadius: "12px" }}>
                  <button onClick={openWishCamera} style={{ ...buttonStyle, background: "#3b82f6" }}>Open Camera</button>
                </div>
              )}
            </div>
          )}

          {videoTab === "upload" && (
            <div>
              {isCompressingVideo && (
                <div style={{
                  background: "linear-gradient(135deg, rgba(37, 211, 102, 0.12) 0%, rgba(18, 140, 126, 0.2) 100%)",
                  border: "1px solid rgba(37, 211, 102, 0.4)",
                  borderRadius: "16px",
                  padding: "20px",
                  margin: "12px 0",
                  textAlign: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "1.4rem" }}>🎬</span>
                    <strong style={{ color: "#25D366", fontSize: "0.95rem" }}>HD Compression Active</strong>
                  </div>
                  <p style={{ margin: "4px 0 10px", fontSize: "0.85rem", color: "rgba(255,255,255,0.85)" }}>
                    {compressStatus || "Optimizing large video for fast, smooth playback..."}
                  </p>
                  <div style={{
                    width: "100%",
                    height: "8px",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${compressProgress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #25D366 0%, #128C7E 100%)",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginTop: "6px", display: "inline-block" }}>
                    {compressProgress}% • Crisp 720p HD Quality Preserved
                  </span>
                </div>
              )}

              {compressedInfo && !isCompressingVideo && (
                <div style={{
                  background: "rgba(37, 211, 102, 0.12)",
                  border: "1px solid rgba(37, 211, 102, 0.3)",
                  color: "#25D366",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "0.84rem",
                  margin: "10px 0",
                  textAlign: "center",
                  fontWeight: "500"
                }}>
                  {compressedInfo}
                </div>
              )}

              {wishUploadPreview ? (
                <div style={{ textAlign: "center" }}>
                  <video src={wishUploadPreview} controls style={{ width: "100%", maxHeight: "300px", borderRadius: "12px", background: "black" }} />
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
                    <button onClick={() => { setWishUploadFile(null); setWishUploadPreview(null); setCompressedInfo(""); }} style={{ ...buttonStyle, background: "#ef4444" }}>Cancel</button>
                    <button onClick={sendUploadWish} style={{ ...buttonStyle, background: "#10b981" }}>Send Video Wish</button>
                  </div>
                </div>
              ) : !isCompressingVideo ? (
                <div style={{ textAlign: "center", padding: "40px", border: "1px dashed rgba(255,255,255,0.3)", borderRadius: "12px" }}>
                  <p style={{ color: "#a0a0b0", marginBottom: "16px" }}>Only video files are allowed.</p>
                  <label style={{ ...buttonStyle, background: "#3b82f6", display: "inline-block" }}>
                    Click to upload a video
                    <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleWishFile} />
                  </label>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {activeTab === "info" && (
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>Basic Information</h3>
          <div>
            <label style={labelStyle}>Birthday Girl Name</label>
            <input type="text" value={bdayGirlName} onChange={e => setBdayGirlName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Your Name (The Wisher)</label>
            <input type="text" value={wisherName} onChange={e => setWisherName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Gallery Flower Quotes</label>
            <input type="text" value={flowerLine1} onChange={e => setFlowerLine1(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
            <input type="text" value={flowerLine2} onChange={e => setFlowerLine2(e.target.value)} style={inputStyle} />
          </div>
          <SaveButton sectionName="basic" onClick={() => saveSection('basic', { bdayGirlName, wisherName, flowerLine1, flowerLine2 })} />
        </div>
      )}

      {activeTab === "photos" && (
        <>
          <div style={cardStyle}>
            <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>Little Things About You</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {littleThings.map((thing, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: "8px" }}>
                  <span>{thing}</span>
                  <button type="button" onClick={() => setLittleThings(littleThings.filter((_, i) => i !== idx))} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="text" value={newLittleThing} onChange={e => setNewLittleThing(e.target.value)} style={inputStyle} placeholder="E.g., The way you laugh at bad jokes..." />
              <button type="button" onClick={handleAddLittleThing} style={{ ...buttonStyle, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "none" }}>Add</button>
            </div>
            <SaveButton sectionName="littleThings" onClick={() => saveSection('littleThings', { littleThings })} />
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>Proof That We Were Here (Special Photos)</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {photos.map((url, idx) => (
                <div key={idx} style={{ position: "relative", width: "120px", height: "120px" }}>
                  <img src={url} alt="special" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.1)" }} />
                  <button type="button" onClick={() => {
                    const newP = photos.filter((_, i) => i !== idx);
                    setPhotos(newP);
                    saveSection('photos', { photos: newP });
                  }} style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "26px", height: "26px", cursor: "pointer", fontWeight: "bold" }}>×</button>
                </div>
              ))}
            </div>
            <input type="file" ref={photoFileInput} style={{ display: "none" }} accept="image/*" onChange={handlePhotoUpload} />
            <button type="button" onClick={() => photoFileInput.current.click()} style={{ ...buttonStyle, alignSelf: "flex-start", background: "rgba(255,255,255,0.1)", boxShadow: "none", border: "1px solid rgba(255,255,255,0.2)" }}>
              + Upload Special Photo
            </button>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>A Letter For You</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {letterParagraphs.map((para, idx) => (
                <div key={idx} style={{ position: "relative", background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px" }}>
                  <p style={{ margin: 0, paddingRight: "20px", lineHeight: "1.5" }}>{para}</p>
                  <button type="button" onClick={() => setLetterParagraphs(letterParagraphs.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "12px", right: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
                </div>
              ))}
            </div>
            <textarea value={newParagraph} onChange={e => setNewParagraph(e.target.value)} style={{ ...inputStyle, minHeight: "100px" }} placeholder="Write a paragraph..."></textarea>
            <button type="button" onClick={handleAddParagraph} style={{ ...buttonStyle, alignSelf: "flex-start", background: "rgba(255,255,255,0.1)", boxShadow: "none", border: "1px solid rgba(255,255,255,0.2)" }}>+ Add Paragraph</button>
            <SaveButton sectionName="letter" onClick={() => saveSection('letter', { letterParagraphs })} />
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>The Confession / Proposal</h3>
            <div>
              <label style={labelStyle}>Confession Text</label>
              <textarea value={confessionText} onChange={e => setConfessionText(e.target.value)} style={{ ...inputStyle, minHeight: "100px" }}></textarea>
            </div>
            <div>
              <label style={labelStyle}>Final Question</label>
              <input type="text" value={proposalQuestion} onChange={e => setProposalQuestion(e.target.value)} style={inputStyle} />
            </div>
            <SaveButton sectionName="confession" onClick={() => saveSection('confession', { confessionText, proposalQuestion })} />
          </div>
        </>
      )}

      {activeTab === "timeline" && (
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#e2e8f0" }}>Moments I Keep (Vault Timeline)</h3>
          <p style={{ color: "#a0a0b0", fontSize: "0.9rem" }}>Year and Title are mandatory. Date and Description are optional.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {timeline.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px" }}>
                <img src={item.image} alt="timeline" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#fff", marginBottom: "4px" }}>
                    {item.date && item.date !== "Unknown" ? `${item.date} ` : ""}{item.year} - {item.title}
                  </div>
                  <div style={{ color: "#94a3b8", lineHeight: "1.4" }}>{item.description}</div>
                </div>
                <button type="button" onClick={() => setTimeline(timeline.filter((_, i) => i !== idx))} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem" }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", marginTop: "8px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <input type="text" placeholder="Date (Optional, e.g. 15 Oct)" value={tlDate} onChange={e => setTlDate(e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Year (Mandatory, e.g. 2023)" value={tlYear} onChange={e => setTlYear(e.target.value)} style={inputStyle} />
            </div>
            <input type="text" placeholder="Title (Mandatory)" value={tlTitle} onChange={e => setTlTitle(e.target.value)} style={inputStyle} />
            <textarea placeholder="Description (Optional)" value={tlDesc} onChange={e => setTlDesc(e.target.value)} style={{ ...inputStyle, minHeight: "80px" }}></textarea>
            <input type="file" ref={tlFileInput} style={{ display: "none" }} accept="image/*" onChange={handleTimelinePhoto} />
            <button type="button" onClick={() => { if (tlYear && tlTitle) tlFileInput.current.click(); else alert("Fill Year & Title first!"); }} style={{ ...buttonStyle, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "none", alignSelf: "flex-start" }}>
              + Choose Image & Add Moment
            </button>
          </div>
          <SaveButton sectionName="timeline" onClick={() => saveSection('timeline', { timeline })} />
        </div>
      )}

    </div>
  );
};

export default WisherVaultConfig;
