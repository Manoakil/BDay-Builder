import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import WisherVaultConfig from "../components/WisherVaultConfig";

import {
  HiCamera,
  HiVideoCamera,
  HiArrowUpTray,
  HiXMark,
  HiOutlineHeart,
  HiOutlineClock,
  HiOutlinePaperAirplane,
  HiOutlineTrash,
  HiOutlinePencil,
  HiTrash,
  HiMapPin,
} from "react-icons/hi2";

import "../style/WishersHome.css";

import {
  getMyWishes,
  createWish,
  updateWish as updateWishApi,
  deleteWish,
  getMyTimeline,
  createTimelineEntry,
  updateTimelineEntry,
  deleteTimelineEntry,
  uploadMedia,
  getWisherAccessStatus,
} from "../service/wishService";
import { compressVideo, isLargeVideo, formatFileSize, fixWebmBlobDuration } from "../utils/videoCompressor";

// ============================================================
// CONSTANTS
// ============================================================

const MAX_CHARS = 500;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ============================================================
// USER DATA
// ============================================================

const getUserData = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      fullName: user.full_name || user.fullName || "",
      email: user.email || "",
      id: user.id || "",
    };
  } catch {
    return {
      fullName: "",
      email: "",
      id: "",
    };
  }
};

// ============================================================
// BACKEND TYPE MAPPING
// ============================================================

const mapBackendType = (type) => {
  const map = {
    text: "text",
    video: "video",
    image: "photo",
    voice: "audio",
    sticker: "emoji",
    gif: "photo",
    ai_generated: "text",
  };

  return map[type] || "text";
};

// ============================================================
// COMPONENT
// ============================================================

function WishersHome() {
  const navigate = useNavigate();

  const userData = getUserData();
  const guestName = userData.fullName;

  // ============================================================
  // URL PARAMS & ROLES
  // ============================================================
  const searchParams = new URLSearchParams(window.location.search);
  const isSecretMode = searchParams.get('mode') === 'secret';
  const role = localStorage.getItem("role") || "";
  const isAdmin = role.includes('admin');

  // ============================================================
  // ACTIVE TAB
  // ============================================================

  const [activeTab, setActiveTab] = useState("wishes");

  // ============================================================
  // STABLE FLOATING ITEMS
  // IMPORTANT:
  // DO NOT USE Math.random() DIRECTLY INSIDE JSX RENDER.
  // ============================================================

  const floatingItemsRef = useRef(
    Array.from({ length: 10 }, (_, index) => ({
      id: index,
      x:
        Math.random() *
        (typeof window !== "undefined" ? window.innerWidth : 1200),
      duration: Math.random() * 12 + 8,
    })),
  );

  // ============================================================
  // WISHES STATE
  // ============================================================

  const [wishes, setWishes] = useState([]);
  const [editWishId, setEditWishId] = useState(null);
  const [textWishId, setTextWishId] = useState(null);

  const [loadingWishes, setLoadingWishes] = useState(true);
  const [sendingWish, setSendingWish] = useState(false);
  const [birthdayPersonName, setBirthdayPersonName] = useState("");

  useEffect(() => {
    const fetchBdayName = async () => {
      try {
        const res = await getWisherAccessStatus();
        if (res && res.birthday_name) {
          setBirthdayPersonName(res.birthday_name);
        } else if (res && res.birthday_person_name) {
          setBirthdayPersonName(res.birthday_person_name);
        }
      } catch (err) {
        console.error("Failed to fetch bday name", err);
      }
    };
    fetchBdayName();
  }, []);

  // ============================================================
  // TEXT WISH
  // ============================================================

  const [wishText, setWishText] = useState("");
  const [wishCharCount, setWishCharCount] = useState(0);

  // ============================================================
  // VIDEO WISH
  // ============================================================

  const [wishVideoURL, setWishVideoURL] = useState(null);
  const [wishVideoBlob, setWishVideoBlob] = useState(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);

  const [videoRecordingTime, setVideoRecordingTime] = useState(0);

  // ============================================================
  // VIDEO FILE UPLOAD
  // ============================================================

  const [wishUploadFile, setWishUploadFile] = useState(null);
  const [wishUploadPreview, setWishUploadPreview] = useState(null);
  const [isCompressingVideo, setIsCompressingVideo] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [compressStatus, setCompressStatus] = useState("");
  const [compressedInfo, setCompressedInfo] = useState("");

  // ============================================================
  // TIMELINE STATE
  // KEEP THIS SECTION AS YOUR EXISTING TIMELINE LOGIC
  // ============================================================

  const [timeline, setTimeline] = useState([]);
  const [editTimelineId, setEditTimelineId] = useState(null);

  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [savingTimeline, setSavingTimeline] = useState(false);

  const [tlTitle, setTlTitle] = useState("");
  const [tlDay, setTlDay] = useState("");
  const [tlMonth, setTlMonth] = useState("");
  const [tlYear, setTlYear] = useState("");
  const [tlLocation, setTlLocation] = useState("");
  const [tlDesc, setTlDesc] = useState("");

  const [tlType, setTlType] = useState("photo");
  const [tlFile, setTlFile] = useState(null);
  const [tlPreview, setTlPreview] = useState(null);

  const [tlIsRecording, setTlIsRecording] = useState(false);
  const [tlRecTime, setTlRecTime] = useState(0);
  const [tlShowCamera, setTlShowCamera] = useState(false);
  const [tlCameraReady, setTlCameraReady] = useState(false);
  const [tlIsRecVideo, setTlIsRecVideo] = useState(false);

  // ============================================================
  // REFS
  // ============================================================

  const videoRef = useRef(null);
  const tlVideoRef = useRef(null);

  // IMPORTANT:
  // Separate recorder references.
  const wishMediaRecorderRef = useRef(null);
  const tlMediaRecorderRef = useRef(null);

  const streamRef = useRef(null);
  const tlStreamRef = useRef(null);

  const timerRef = useRef(null);

  const wishFileInputRef = useRef(null);
  const tlFileInputRef = useRef(null);

  const videoChunksRef = useRef([]);
  const wishRecordingStartTimeRef = useRef(0);

  // ============================================================
  // ACCESS CHECK
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const access = await getWisherAccessStatus();

        if (!mounted) return;

        // if (!access?.allowed) {
        //   if (access?.is_revealed) {
        //     navigate("/birthday/event", {
        //       replace: true,
        //     });
        //   } else {
        //     localStorage.clear();

        //     navigate("/login", {
        //       replace: true,
        //     });
        //   }
        // }
      } catch (error) {
        console.error("Access check failed:", error);
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // ============================================================
  // FETCH DATA
  // ============================================================

  useEffect(() => {
    fetchWishes();
    fetchTimeline();

    return () => {
      stopAllMedia();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // This effect intentionally runs only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // FETCH WISHES
  // ============================================================

  const fetchWishes = async () => {
    setLoadingWishes(true);

    try {
      const data = await getMyWishes();

      const mapped = (data || []).map((w) => ({
        ...w,
        type: mapBackendType(w.wish_type),
        wish_type: w.wish_type,
        preview: w.media_url || null,
        file: null,
      }));

      setWishes(mapped);

      const existingTextWish = mapped.find(w => w.type === "text");
      if (existingTextWish) {
        setTextWishId(existingTextWish.id);
        setWishText(existingTextWish.content || "");
        setWishCharCount((existingTextWish.content || "").length);
      }
    } catch (error) {
      console.error("Failed to fetch wishes:", error);
    } finally {
      setLoadingWishes(false);
    }
  };

  // ============================================================
  // FETCH TIMELINE
  // ============================================================

  const fetchTimeline = async () => {
    setLoadingTimeline(true);

    try {
      const data = await getMyTimeline();

      const mapped = (data || []).map((t) => ({
        ...t,

        day: t.entry_date ? new Date(t.entry_date).getDate().toString() : "",

        month: t.entry_date
          ? (new Date(t.entry_date).getMonth() + 1).toString()
          : "",

        year: t.entry_date
          ? new Date(t.entry_date).getFullYear().toString()
          : "",

        preview: t.media_url || null,

        file: null,
      }));

      setTimeline(mapped);
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // ============================================================
  // RECORDING TIMER
  // ============================================================

  useEffect(() => {
    if (!isRecordingVideo && !tlIsRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    timerRef.current = setInterval(() => {
      if (isRecordingVideo) {
        setVideoRecordingTime((previous) => previous + 1);
      }

      if (tlIsRecording) {
        setTlRecTime((previous) => previous + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecordingVideo, tlIsRecording]);

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = () => {
    const role = localStorage.getItem("role");
    if (role === "admin" || role === "org_admin" || role === "super_admin") {
      navigate("/admin");
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      navigate("/login");
    }
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  // ============================================================
  // CREATE WISH
  // ============================================================

  const submitWish = (wishData) => {
    return createWish({
      ...wishData,
      is_anonymous: false,
      visibility: isSecretMode ? "secret" : "normal",
    });
  };

  // ============================================================
  // IMPORTANT:
  // PREVENT ANY PARENT FORM FROM SUBMITTING
  // ============================================================

  const handleSubmitCapture = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // ============================================================
  // TEXT WISH CHANGE
  // ============================================================

  const handleWishTextChange = (event) => {
    // Do NOT allow the event to reach a possible parent handler.
    event.stopPropagation();

    const value = event.target.value;

    if (value.length > MAX_CHARS) {
      return;
    }

    setWishText(value);
    setWishCharCount(value.length);
  };

  // ============================================================
  // TEXT WISH KEYBOARD
  // ============================================================

  const handleWishTextKeyDown = (event) => {
    event.stopPropagation();

    /*
     * Textarea normally allows Enter for a new line.
     *
     * If your parent application has a form which submits when
     * Enter is pressed, Shift + Enter can still be used for a
     * new line while plain Enter is prevented.
     */
    if (event.key === "Enter" && !event.shiftKey) {
      event.stopPropagation();
    }
  };

  // ============================================================
  // SEND TEXT WISH
  // ============================================================

  const sendTextWish = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const text = wishText.trim();

    if (!text) {
      return;
    }

    if (sendingWish) {
      return;
    }

    setSendingWish(true);

    try {
      if (textWishId) {
        await updateWishApi(textWishId, {
          wish_type: "text",
          content: text
        });
        // Do not clear the text box because it's an in-place editor
      } else {
        const wishData = {
          wish_type: "text",
          content: text,
          guest_name: guestName || null,
          wisher_name: guestName || null,
        };

        const created = await submitWish(wishData);

        const newWish = {
          ...created,
          type: "text",
          wish_type: "text",
          content: created?.content || text,
          file: null,
          preview: null,
        };

        setWishes((previous) => [newWish, ...previous]);
        setTextWishId(created.id);
      }

      alert("Text wish saved!");
    } catch (error) {
      console.error("Failed to send text wish:", error);

      alert(`Failed to save text wish: ${error?.message || "Unknown error"}`);
    } finally {
      setSendingWish(false);
    }
  };

  // ============================================================
  // OPEN WISH CAMERA
  // ============================================================

  const openWishCamera = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

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
        video: {
          facingMode: "user",
        },
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
      console.error("Camera error:", error);

      alert("Camera and microphone access is required to record a video wish.");
    }
  };

  // ============================================================
  // START WISH VIDEO RECORDING
  // ============================================================

  const startWishVideoRecording = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!streamRef.current) {
      alert("Please open the camera first.");
      return;
    }

    if (isRecordingVideo) {
      return;
    }

    try {
      videoChunksRef.current = [];

      let mimeType = "video/webm;codecs=vp9";

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }

      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, {
          mimeType,
        })
        : new MediaRecorder(streamRef.current);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(videoChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });

        if (rawBlob.size === 0) {
          alert("No video was recorded.");
          return;
        }

        const durationMs = Math.max(1000, Date.now() - wishRecordingStartTimeRef.current);
        const fixedBlob = await fixWebmBlobDuration(rawBlob, durationMs);
        const previewUrl = URL.createObjectURL(fixedBlob);

        setWishVideoBlob(fixedBlob);
        setWishVideoURL(previewUrl);

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
      console.error("Video recording error:", error);

      alert("Unable to start video recording.");
    }
  };

  // ============================================================
  // STOP WISH VIDEO
  // ============================================================

  const stopWishVideoRecording = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const recorder = wishMediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }

    setIsRecordingVideo(false);
  };

  // ============================================================
  // CANCEL WISH CAMERA
  // ============================================================

  const cancelWishCamera = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const recorder = wishMediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
    }

    setIsCameraOn(false);
    setIsRecordingVideo(false);
    setVideoRecordingTime(0);
  };

  // ============================================================
  // REMOVE RECORDED VIDEO
  // ============================================================

  const removeRecordedVideo = () => {
    if (wishVideoURL) {
      URL.revokeObjectURL(wishVideoURL);
    }

    setWishVideoURL(null);
    setWishVideoBlob(null);
    setVideoRecordingTime(0);
  };

  const removeUploadedVideo = () => {
    if (wishUploadPreview) {
      URL.revokeObjectURL(wishUploadPreview);
    }
    setWishUploadFile(null);
    setWishUploadPreview(null);
  };

  // ============================================================
  // SEND RECORDED VIDEO WISH
  // ============================================================

  const sendVideoWish = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!wishVideoBlob) {
      alert("Please record a video first.");
      return;
    }

    if (sendingWish) {
      return;
    }

    setSendingWish(true);

    try {
      const videoFile = new File(
        [wishVideoBlob],
        `video-wish-${Date.now()}.webm`,
        {
          type: wishVideoBlob.type || "video/webm",
        },
      );

      const uploaded = await uploadMedia(videoFile, "wishes");

      if (!uploaded?.id) {
        throw new Error("Video upload failed.");
      }

      const wishData = {
        wish_type: "video",
        content: "Video message",
        file_id: uploaded.id,
        guest_name: guestName || null,
        wisher_name: guestName || null,
      };

      const created = await submitWish(wishData);

      const publicUrl =
        uploaded?.metadata?.public_url || created?.media_url || wishVideoURL;

      const newWish = {
        ...created,
        type: "video",
        wish_type: "video",
        content: "",
        file: videoFile,
        preview: publicUrl,
        media_url: publicUrl,
      };

      setWishes((previous) => [newWish, ...previous]);

      removeRecordedVideo();
    } catch (error) {
      console.error("Failed to send video wish:", error);

      alert(`Failed to send video wish: ${error?.message || "Unknown error"}`);
    } finally {
      setSendingWish(false);
    }
  };

  // ============================================================
  // VIDEO FILE UPLOAD
  // ONLY VIDEO IS ALLOWED
  // ============================================================

  const handleWishFile = async (event) => {
    event.stopPropagation();

    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type || !file.type.startsWith("video/")) {
      alert("Only video files are allowed for wishes.");
      return;
    }

    if (wishUploadPreview) {
      URL.revokeObjectURL(wishUploadPreview);
    }

    // If video is larger than 100MB, apply WhatsApp-style HD compression
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

    // Video is under 100 MB: use directly
    setCompressedInfo("");
    setWishUploadFile(file);
    setWishUploadPreview(URL.createObjectURL(file));
  };

  // ============================================================
  // SEND UPLOADED VIDEO WISH
  // ============================================================

  const sendUploadWish = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!wishUploadFile) {
      return;
    }

    if (!wishUploadFile.type || !wishUploadFile.type.startsWith("video/")) {
      alert("Only video files are allowed.");

      return;
    }

    if (sendingWish) {
      return;
    }

    setSendingWish(true);

    try {
      const uploaded = await uploadMedia(wishUploadFile, "wishes");

      if (!uploaded?.id) {
        throw new Error("Video upload failed.");
      }

      const wishData = {
        wish_type: "video",
        content: "Video message",
        file_id: uploaded.id,
        guest_name: guestName || null,
        wisher_name: guestName || null,
      };

      const created = await submitWish(wishData);

      const publicUrl =
        uploaded?.metadata?.public_url ||
        created?.media_url ||
        wishUploadPreview;

      const newWish = {
        ...created,
        type: "video",
        wish_type: "video",
        content: "",
        file: wishUploadFile,
        preview: publicUrl,
        media_url: publicUrl,
      };

      setWishes((previous) => [newWish, ...previous]);

      removeUploadedVideo();
    } catch (error) {
      console.error("Failed to upload video wish:", error);

      alert(`Failed to send video wish: ${error?.message || "Unknown error"}`);
    } finally {
      setSendingWish(false);
    }
  };

  // ============================================================
  // EDIT WISH
  // ============================================================

  const editWish = (wish) => {
    setEditWishId(wish.id);

    if (wish.type === "text") {
      const text = wish.content || "";

      setWishText(text);
      setWishCharCount(text.length);

      return;
    }

    if (wish.type === "video") {
      setWishVideoURL(wish.preview || wish.media_url || null);

      setWishVideoBlob(null);
    }
  };

  // ============================================================
  // UPDATE WISH
  // ============================================================

  const submitWishUpdate = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!editWishId) {
      return;
    }

    if (sendingWish) {
      return;
    }

    setSendingWish(true);

    try {
      const updateData = {};

      if (wishText.trim()) {
        updateData.content = wishText.trim();

        updateData.wish_type = "text";
      }

      /*
       * If a new recorded video exists,
       * upload it once.
       */
      if (wishVideoBlob) {
        const videoFile = new File(
          [wishVideoBlob],
          `video-wish-${Date.now()}.webm`,
          {
            type: wishVideoBlob.type || "video/webm",
          },
        );

        const uploaded = await uploadMedia(videoFile, "wishes");

        if (!uploaded?.id) {
          throw new Error("Video upload failed.");
        }

        updateData.wish_type = "video";

        updateData.file_id = uploaded.id;

        updateData.content = "Video message";
      }

      /*
       * If a new uploaded video exists,
       * upload it only once.
       */
      if (wishUploadFile) {
        if (!wishUploadFile.type.startsWith("video/")) {
          throw new Error("Only video files are allowed.");
        }

        const uploaded = await uploadMedia(wishUploadFile, "wishes");

        if (!uploaded?.id) {
          throw new Error("Video upload failed.");
        }

        updateData.wish_type = "video";

        updateData.file_id = uploaded.id;

        updateData.content = "Video message";
      }

      await updateWishApi(editWishId, updateData);

      await fetchWishes();

      resetAllWishForms();
    } catch (error) {
      console.error("Failed to update wish:", error);

      alert(`Failed to update wish: ${error?.message || "Unknown error"}`);
    } finally {
      setSendingWish(false);
    }
  };

  // ============================================================
  // DELETE WISH
  // ============================================================

  const deleteWishHandler = async (id, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      await deleteWish(id);

      setWishes((previous) => previous.filter((wish) => wish.id !== id));

      if (editWishId === id) {
        resetAllWishForms();
      }
    } catch (error) {
      console.error("Failed to delete wish:", error);

      alert(`Failed to delete wish: ${error?.message || "Unknown error"}`);
    }
  };

  // ============================================================
  // RESET WISH FORM
  // ============================================================

  const resetAllWishForms = () => {
    setWishText("");
    setWishCharCount(0);

    removeRecordedVideo();
    removeUploadedVideo();

    setEditWishId(null);

    cancelWishCamera();
  };

  // ============================================================
  // STOP ALL MEDIA
  // ============================================================

  const stopAllMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (tlStreamRef.current) {
      tlStreamRef.current.getTracks().forEach((track) => track.stop());

      tlStreamRef.current = null;
    }

    if (
      wishMediaRecorderRef.current &&
      wishMediaRecorderRef.current.state === "recording"
    ) {
      wishMediaRecorderRef.current.stop();
    }

    if (
      tlMediaRecorderRef.current &&
      tlMediaRecorderRef.current.state === "recording"
    ) {
      tlMediaRecorderRef.current.stop();
    }

    setIsCameraOn(false);
    setIsRecordingVideo(false);

    setTlShowCamera(false);
    setTlCameraReady(false);
    setTlIsRecVideo(false);
  };

  // ============================================================
  // TIMELINE FUNCTIONS
  // ============================================================
  // KEEP YOUR EXISTING TIMELINE FUNCTIONS HERE.
  //
  // The important point is:
  // do NOT use wishMediaRecorderRef inside Timeline.
  // Timeline must use tlMediaRecorderRef.
  // ============================================================

  const handleTLFile = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (file.type.startsWith("image/")) {
      setTlType("photo");
    } else if (file.type.startsWith("video/")) {
      setTlType("video");
      if (isLargeVideo(file, 100)) {
        setIsCompressingVideo(true);
        setCompressProgress(5);
        setCompressStatus(`Optimizing timeline video (${formatFileSize(file.size)}) with WhatsApp HD compression...`);
        try {
          const compressed = await compressVideo(file, (pct, status) => {
            setCompressProgress(pct);
            setCompressStatus(status);
          });
          if (tlPreview) URL.revokeObjectURL(tlPreview);
          setTlFile(compressed);
          setTlPreview(URL.createObjectURL(compressed));
          return;
        } catch (e) {
          console.warn("Timeline video compression fallback:", e);
        } finally {
          setIsCompressingVideo(false);
        }
      }
    } else if (file.type.startsWith("audio/")) {
      setTlType("audio");
    }

    if (tlPreview) {
      URL.revokeObjectURL(tlPreview);
    }

    setTlFile(file);

    setTlPreview(URL.createObjectURL(file));
  };

  const resetTimelineForm = () => {
    setTlTitle("");
    setTlDay("");
    setTlMonth("");
    setTlYear("");
    setTlLocation("");
    setTlDesc("");
    setTlType("photo");

    if (tlPreview) {
      URL.revokeObjectURL(tlPreview);
    }

    setTlFile(null);
    setTlPreview(null);

    setEditTimelineId(null);
  };

  const editTimeline = (entry) => {
    setEditTimelineId(entry.id);

    setTlTitle(entry.title || "");
    setTlDay(entry.day || "");
    setTlMonth(entry.month || "");
    setTlYear(entry.year || "");

    setTlLocation(entry.location || "");

    setTlDesc(entry.desc || "");

    setTlType(entry.category || "photo");

    setTlFile(null);
    setTlPreview(entry.preview || null);
  };

  const saveTimeline = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!tlYear) {
      alert("Please enter the year.");
      return;
    }

    if (!tlDesc || !tlDesc.trim()) {
      alert("Please provide a description for this memory.");
      return;
    }

    if (savingTimeline) return;

    setSavingTimeline(true);

    try {
      const entryDate = `${tlYear}-${String(tlMonth || "1").padStart(
        2,
        "0",
      )}-${String(tlDay || "1").padStart(2, "0")}`;

      let fileId = null;

      if (tlFile) {
        const uploaded = await uploadMedia(tlFile, "timeline");

        fileId = uploaded?.id || null;
      }

      let precision = 'day';
      if (!tlDay && !tlMonth) precision = 'year';
      else if (!tlDay) precision = 'month';

      const data = {
        title: tlTitle || "Untitled",
        entry_date: entryDate,
        location: tlLocation || null,
        description: tlDesc || null,
        category: tlType,
        file_id: fileId,
        tags: [`precision:${precision}`]
      };

      if (editTimelineId) {
        await updateTimelineEntry(editTimelineId, data);
      } else {
        await createTimelineEntry(data);
      }

      await fetchTimeline();

      resetTimelineForm();
    } catch (error) {
      console.error("Failed to save timeline:", error);

      alert(`Failed to save timeline: ${error?.message || "Unknown error"}`);
    } finally {
      setSavingTimeline(false);
    }
  };

  const deleteTimelineHandler = async (id, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      await deleteTimelineEntry(id);

      setTimeline((previous) => previous.filter((entry) => entry.id !== id));

      if (editTimelineId === id) {
        resetTimelineForm();
      }
    } catch (error) {
      alert(
        `Failed to delete timeline entry: ${error?.message || "Unknown error"}`,
      );
    }
  };

  // ============================================================
  // UI
  // ============================================================

  // ============================================================
  // VAULT MODE FULL PAGE
  // ============================================================
  if (isSecretMode) {
    return (
      <div className="wh-page">
        <div className="wh-floating">
          {floatingItemsRef.current.map((item) => (
            <div
              key={item.id}
              className="wh-float-item"
              style={{
                left: `${item.x}px`,
                animationDuration: `${item.duration}s`,
                animationDelay: `-${Math.random() * 5}s`,
              }}
            >
              {["✨", "🎈", "🎉", "💖", "🌸"][item.id % 5]}
            </div>
          ))}
        </div>
        <div className="wh-header" style={{ position: 'relative', margin: "0 auto 2rem auto", textAlign: 'center' }}>
          <h1 className="wh-title">Secret Vault Setup</h1>
          <p className="wh-subtitle">Configure the hidden experience for <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{birthdayPersonName || "the birthday person"}</span>.</p>
        </div>
        <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "900px", margin: "0 auto", paddingBottom: "4rem" }}>
          <WisherVaultConfig />
        </div>
      </div>
    );
  }

  return (
    <div
      className="wh-page"
      /*
       * Capture submit before it can reach a parent form.
       */
      onSubmitCapture={handleSubmitCapture}
    >
      {/* ====================================================== */}
      {/* SECRET VAULT MODE BANNER */}
      {/* ====================================================== */}
      {isSecretMode && (
        <div style={{ background: "var(--primary-color)", color: "white", padding: "10px", textAlign: "center", position: "sticky", top: 0, zIndex: 1000 }}>
          <span style={{ fontWeight: "bold" }}>🔐 Secret Vault Mode:</span> Any wishes you leave here will only be visible to the birthday person when the vault is unlocked!
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              style={{ marginLeft: "15px", background: "rgba(0, 0, 0, 0.2)", border: "none", color: "white", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" }}
            >
              Back to Admin
            </button>
          )}
        </div>
      )}

      {/* ====================================================== */}
      {/* FLOATING BACKGROUND */}
      {/* ====================================================== */}

      <div className="wh-floating">
        {floatingItemsRef.current.map((item) => (
          <div
            key={item.id}
            className="wh-float-item"
            style={{
              left: `${item.x}px`,
              animationDuration: `${item.duration}s`,
              animationDelay: `-${Math.random() * 5}s`,
            }}
          >
            {["✨", "🎈", "🎉", "💖", "🌸"][item.id % 5]}
          </div>
        ))}
      </div>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="wh-header" style={{ position: 'relative' }}>
        <button
          onClick={handleLogout}
          style={{
            position: 'absolute',
            top: '10px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '500',
            backdropFilter: 'blur(5px)'
          }}
        >
          {["admin", "org_admin", "super_admin"].includes(localStorage.getItem("role")) ? "Go back to admin" : "Logout"}
        </button>
        <h1 className="wh-title">Birthday Wishes</h1>

        <p className="wh-subtitle">
          Welcome <strong>{guestName || "Guest"}</strong>! Share your love.
        </p>
      </div>

      {/* ====================================================== */}
      {/* TABS */}
      {/* ====================================================== */}

      <div className="wh-tabs">
        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`wh-tab ${activeTab === "timeline" ? "active" : ""}`}
        >
          <HiOutlineClock />
          Memory Line
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wishes")}
          className={`wh-tab ${activeTab === "wishes" ? "active" : ""}`}
        >
          <HiOutlineHeart />
          Wishes
        </button>
        {isSecretMode && (
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`wh-tab ${activeTab === "vault" ? "active" : ""}`}
          >
            <HiOutlineHeart />
            Secret Vault
          </button>
        )}
      </div>

      {/* ====================================================== */}
      {/* CONTENT */}
      {/* ====================================================== */}

      <div className="wh-content">
        {/* ==================================================== */}
        {/* MEMORY LINE */}
        {/* ==================================================== */}

        {activeTab === "timeline" && (
          <div className="wh-col">
            <h2 className="wh-col-title">
              <HiOutlineClock />
              Memory Line
            </h2>
            <p style={{ margin: "-8px 0 16px", color: "rgba(255, 255, 255, 0.7)", fontSize: "0.88rem" }}>
              Contribute cherished moments, photos, and milestones to the live Memory Line.
            </p>

            <div className="wh-section">
              <input
                type="text"
                placeholder="Memory title *"
                value={tlTitle}
                onChange={(e) => setTlTitle(e.target.value)}
                className="wh-input required"
              />

              <div className="wh-date-row">
                <input
                  type="number"
                  placeholder="Day"
                  value={tlDay}
                  onChange={(e) => setTlDay(e.target.value)}
                  min="1"
                  max="31"
                  className="wh-input wh-date"
                />

                <select
                  value={tlMonth}
                  onChange={(e) => setTlMonth(e.target.value)}
                  className="wh-input wh-date"
                >
                  <option value="">Month</option>

                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Year *"
                  value={tlYear}
                  onChange={(e) => setTlYear(e.target.value)}
                  min="1900"
                  max="2030"
                  className="wh-input wh-date required"
                />
              </div>

              <input
                type="text"
                placeholder="Location (optional)"
                value={tlLocation}
                onChange={(e) => setTlLocation(e.target.value)}
                className="wh-input"
              />

              <textarea
                placeholder="Description..."
                value={tlDesc}
                onChange={(e) => setTlDesc(e.target.value)}
                rows={2}
                className="wh-input wh-textarea"
              />

              {tlPreview && (
                <div className="wh-prev">
                  {tlType === "photo" && (
                    <img
                      src={tlPreview}
                      alt="Timeline upload preview"
                      className="wh-prev-img"
                    />
                  )}

                  {tlType === "video" && (
                    <video src={tlPreview} controls className="wh-prev-vid" />
                  )}

                  {tlType === "audio" && <audio src={tlPreview} controls />}

                  <button
                    type="button"
                    onClick={() => {
                      if (tlPreview) {
                        URL.revokeObjectURL(tlPreview);
                      }

                      setTlFile(null);
                      setTlPreview(null);
                    }}
                    className="wh-btn-t"
                  >
                    <HiTrash />
                    Remove
                  </button>
                </div>
              )}

              <div
                onClick={() => tlFileInputRef.current?.click()}
                className="wh-upload-zone"
              >
                <HiArrowUpTray />
                Upload photo, video, or audio from device
                <input
                  type="file"
                  ref={tlFileInputRef}
                  onChange={handleTLFile}
                  accept="image/*,video/*,audio/*"
                  hidden
                />
              </div>

              <button
                type="button"
                onClick={saveTimeline}
                className="wh-submit active"
                disabled={!tlYear || savingTimeline}
              >
                {savingTimeline
                  ? "Saving..."
                  : editTimelineId
                    ? "Update Memory"
                    : "Add to Timeline"}
              </button>
            </div>

            {/* TIMELINE LIST */}

            <div className="wh-list wh-timeline-list">
              {loadingTimeline ? (
                <p className="wh-empty">Loading memories...</p>
              ) : (
                <>
                  {timeline.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      className="wh-card-item"
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: index * 0.05,
                      }}
                    >
                      <div className="wh-card-date">
                        {entry.day && `${entry.day} `}

                        {entry.month && `${MONTHS[Number(entry.month) - 1]} `}

                        {entry.year}
                      </div>

                      <h4>{entry.title || "Untitled"}</h4>

                      {entry.preview && entry.category === "photo" && (
                        <img
                          src={entry.preview}
                          alt="Timeline memory"
                          className="wh-prev-img"
                        />
                      )}

                      {entry.preview && entry.category === "video" && (
                        <video
                          src={entry.preview}
                          controls
                          className="wh-prev-vid"
                        />
                      )}

                      {entry.preview && entry.category === "audio" && (
                        <audio src={entry.preview} controls />
                      )}

                      {entry.location && (
                        <p className="wh-card-loc">
                          <HiMapPin />
                          {entry.location}
                        </p>
                      )}

                      {entry.desc && (
                        <p className="wh-card-desc">{entry.desc}</p>
                      )}

                      <div className="wh-card-actions">
                        <button
                          type="button"
                          onClick={() => editTimeline(entry)}
                          className="wh-btn-sm"
                        >
                          <HiOutlinePencil />
                        </button>

                        <button
                          type="button"
                          onClick={(event) =>
                            deleteTimelineHandler(entry.id, event)
                          }
                          className="wh-btn-sm del"
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {timeline.length === 0 && (
                    <p className="wh-empty">No memories yet. Add your first!</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* WISHES */}
        {/* ==================================================== */}

        {activeTab === "wishes" && (
          <div className="wh-col">
            <h2 className="wh-col-title">
              <HiOutlineHeart />
              Send Wishes
            </h2>

            {/* ================================================= */}
            {/* MY WISHES */}
            {/* ================================================= */}

            {wishes.filter(w => w.type !== "text").length > 0 && (
              <div className="wh-list">
                <h3 className="wh-list-title">My Wishes ({wishes.filter(w => w.type !== "text").length})</h3>

                {wishes.filter(w => w.type !== "text").map((wish) => (
                  <motion.div
                    key={wish.id}
                    className="wh-card-item"
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                  >
                    <span className="wh-wish-type">
                      {wish.type === "text" && "💌 Text"}

                      {wish.type === "video" && "🎬 Video"}

                      {" • "}

                      {new Date(
                        wish.created_at || wish.createdAt,
                      ).toLocaleDateString()}
                    </span>

                    {wish.content && (
                      <p className="wh-wish-content">{wish.content}</p>
                    )}

                    {wish.preview && wish.type === "video" && (
                      <video
                        src={wish.preview}
                        controls
                        playsInline
                        className="wh-prev-vid"
                      />
                    )}

                    <div className="wh-card-actions">
                      <button
                        type="button"
                        onClick={() => editWish(wish)}
                        className="wh-btn-sm"
                      >
                        <HiOutlinePencil />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={(event) => deleteWishHandler(wish.id, event)}
                        className="wh-btn-sm del"
                      >
                        <HiOutlineTrash />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {loadingWishes && wishes.length === 0 && (
              <p className="wh-empty">Loading your wishes...</p>
            )}

            {/* ================================================= */}
            {/* TEXT WISH */}
            {/* ================================================= */}

            <div className="wh-section" onSubmitCapture={handleSubmitCapture}>
              <h3 className="wh-section-title">💌 Text Wish</h3>

              <textarea
                value={wishText}
                onChange={handleWishTextChange}
                onKeyDown={handleWishTextKeyDown}
                onKeyPress={(event) => event.stopPropagation()}
                onInput={(event) => event.stopPropagation()}
                placeholder="Write your wish..."
                rows={3}
                maxLength={MAX_CHARS}
                className="wh-input wh-textarea"
                autoComplete="off"
              />

              <span className="wh-char">
                {wishCharCount}/{MAX_CHARS}
              </span>

              <button
                type="button"
                onClick={sendTextWish}
                className="wh-submit active"
                disabled={!wishText.trim() || sendingWish}
              >
                <HiOutlinePaperAirplane />

                {sendingWish
                  ? "Saving..."
                  : textWishId
                    ? "Update Text Wish"
                    : "Send Text Wish"}
              </button>
            </div>

            {/* ================================================= */}
            {/* VIDEO CAMERA WISH */}
            {/* ================================================= */}

            <div className="wh-section">
              <h3 className="wh-section-title">
                <HiVideoCamera />
                Video Wish
              </h3>

              {!isCameraOn && !wishVideoURL && (
                <button
                  type="button"
                  onClick={openWishCamera}
                  className="wh-upload-zone"
                >
                  <HiCamera />
                  Record a Video Wish
                </button>
              )}

              {isCameraOn && (
                <div className="wh-camera">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="wh-camera-video"
                  />

                  <div className="wh-record-time">
                    {formatTime(videoRecordingTime)}
                  </div>

                  {!isRecordingVideo ? (
                    <button
                      type="button"
                      onClick={startWishVideoRecording}
                      className="wh-submit active"
                    >
                      <HiVideoCamera />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopWishVideoRecording}
                      className="wh-submit active"
                    >
                      <HiVideoCamera />
                      Stop Recording
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={cancelWishCamera}
                    className="wh-btn-g"
                  >
                    <HiXMark />
                    Cancel
                  </button>
                </div>
              )}

              {wishVideoURL && !isCameraOn && (
                <div className="wh-prev">
                  <p className="wh-preview-label">Video preview</p>

                  <video
                    src={wishVideoURL}
                    controls
                    playsInline
                    className="wh-prev-vid"
                  />

                  <div className="wh-card-actions">
                    <button
                      type="button"
                      onClick={sendVideoWish}
                      className="wh-submit active"
                      disabled={sendingWish}
                    >
                      <HiOutlinePaperAirplane />

                      {sendingWish ? "Sending..." : "Send Video Wish"}
                    </button>

                    <button
                      type="button"
                      onClick={removeRecordedVideo}
                      className="wh-btn-t"
                    >
                      <HiTrash />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ================================================= */}
            {/* VIDEO FILE UPLOAD */}
            {/* ================================================= */}

            <div className="wh-section">
              <h3 className="wh-section-title">
                <HiArrowUpTray />
                Upload Video Wish
              </h3>

              <p className="wh-upload-help">Only video files are allowed.</p>

              <input
                type="file"
                ref={wishFileInputRef}
                onChange={handleWishFile}
                accept="video/*"
                hidden
              />

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
                    <strong style={{ color: "#25D366", fontSize: "0.95rem" }}>WhatsApp HD Compression Active</strong>
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

              {!wishUploadFile && !isCompressingVideo ? (
                <div
                  onClick={(event) => {
                    event.stopPropagation();

                    wishFileInputRef.current?.click();
                  }}
                  className="wh-upload-zone"
                >
                  <HiArrowUpTray />
                  Click to upload a video
                </div>
              ) : (
                <div className="wh-prev">
                  <p className="wh-preview-label">Video preview</p>

                  <video
                    src={wishUploadPreview}
                    controls
                    playsInline
                    className="wh-prev-vid"
                  />

                  <button
                    type="button"
                    onClick={removeUploadedVideo}
                    className="wh-btn-t"
                  >
                    <HiTrash />
                    Remove
                  </button>
                </div>
              )}

              {wishUploadFile && (
                <button
                  type="button"
                  onClick={editWishId ? submitWishUpdate : sendUploadWish}
                  className="wh-submit active"
                  disabled={sendingWish}
                >
                  <HiOutlinePaperAirplane />

                  {sendingWish
                    ? "Sending..."
                    : editWishId
                      ? "Update Video Wish"
                      : "Send Video Wish"}
                </button>
              )}
            </div>

            {/* ================================================= */}
            {/* CANCEL EDIT */}
            {/* ================================================= */}

            {editWishId && (
              <button
                type="button"
                onClick={resetAllWishForms}
                className="wh-btn-g"
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                }}
              >
                <HiXMark />
                Cancel Edit
              </button>
            )}
          </div>
        )}

        {activeTab === "vault" && (
          <div className="wh-col slide-in-bottom">
            <WisherVaultConfig />
          </div>
        )}
      </div>
    </div>
  );
}

export default WishersHome;
