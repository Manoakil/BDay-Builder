// import React, { useEffect, useRef, useState } from "react";
// import "./CupidScroller.css";

// const TOP_PADDING = 55;
// const BOTTOM_PADDING = 75;

// export default function CupidScroller() {
//   const [progress, setProgress] = useState(0);
//   const [isDragging, setIsDragging] = useState(false);

//   const dragStartY = useRef(0);
//   const dragStartProgress = useRef(0);

//   /*
//   |--------------------------------------------------------------------------
//   | Calculate page scroll percentage
//   |--------------------------------------------------------------------------
//   */

//   const getProgress = () => {
//     const scrollTop =
//       window.scrollY || document.documentElement.scrollTop;

//     const documentHeight =
//       document.documentElement.scrollHeight;

//     const viewportHeight =
//       window.innerHeight;

//     const maxScroll =
//       documentHeight - viewportHeight;

//     if (maxScroll <= 0) {
//       return 0;
//     }

//     return Math.min(
//       1,
//       Math.max(0, scrollTop / maxScroll)
//     );
//   };

//   /*
//   |--------------------------------------------------------------------------
//   | Update Cupid when normal scrolling happens
//   |--------------------------------------------------------------------------
//   */

//   useEffect(() => {
//     const updateCupid = () => {
//       setProgress(getProgress());
//     };

//     window.addEventListener(
//       "scroll",
//       updateCupid,
//       { passive: true }
//     );

//     window.addEventListener(
//       "resize",
//       updateCupid
//     );

//     updateCupid();

//     return () => {
//       window.removeEventListener(
//         "scroll",
//         updateCupid
//       );

//       window.removeEventListener(
//         "resize",
//         updateCupid
//       );
//     };
//   }, []);

//   /*
//   |--------------------------------------------------------------------------
//   | Calculate Cupid position
//   |--------------------------------------------------------------------------
//   */

//   const getCupidPosition = () => {
//     const availableHeight =
//       window.innerHeight -
//       TOP_PADDING -
//       BOTTOM_PADDING;

//     return (
//       TOP_PADDING +
//       progress * availableHeight
//     );
//   };

//   /*
//   |--------------------------------------------------------------------------
//   | Start dragging
//   |--------------------------------------------------------------------------
//   */

//   const handlePointerDown = (event) => {
//     event.preventDefault();

//     setIsDragging(true);

//     dragStartY.current =
//       event.clientY;

//     dragStartProgress.current =
//       progress;

//     document.body.classList.add(
//       "cupid-is-dragging-page"
//     );

//     event.currentTarget.setPointerCapture(
//       event.pointerId
//     );
//   };

//   /*
//   |--------------------------------------------------------------------------
//   | Drag Cupid
//   |--------------------------------------------------------------------------
//   */

//   const handlePointerMove = (event) => {
//     if (!isDragging) {
//       return;
//     }

//     const availableHeight =
//       window.innerHeight -
//       TOP_PADDING -
//       BOTTOM_PADDING;

//     if (availableHeight <= 0) {
//       return;
//     }

//     const movement =
//       (event.clientY -
//         dragStartY.current) /
//       availableHeight;

//     let newProgress =
//       dragStartProgress.current +
//       movement;

//     newProgress = Math.max(
//       0,
//       Math.min(1, newProgress)
//     );

//     setProgress(newProgress);

//     const maxScroll =
//       document.documentElement.scrollHeight -
//       window.innerHeight;

//     window.scrollTo({
//       top: newProgress * maxScroll,
//       behavior: "auto",
//     });
//   };

//   /*
//   |--------------------------------------------------------------------------
//   | Stop dragging
//   |--------------------------------------------------------------------------
//   */

//   const handlePointerUp = () => {
//     setIsDragging(false);

//     document.body.classList.remove(
//       "cupid-is-dragging-page"
//     );
//   };

//   /*
//   |--------------------------------------------------------------------------
//   | Click anywhere on the vertical track
//   |--------------------------------------------------------------------------
//   */

//   const handleTrackClick = (event) => {
//     if (
//       event.target.closest(
//         ".cupid-scroll-thumb"
//       )
//     ) {
//       return;
//     }

//     const rect =
//       event.currentTarget.getBoundingClientRect();

//     const availableHeight =
//       window.innerHeight -
//       TOP_PADDING -
//       BOTTOM_PADDING;

//     const clickY =
//       event.clientY -
//       rect.top -
//       TOP_PADDING;

//     let newProgress =
//       clickY / availableHeight;

//     newProgress = Math.max(
//       0,
//       Math.min(1, newProgress)
//     );

//     const maxScroll =
//       document.documentElement.scrollHeight -
//       window.innerHeight;

//     window.scrollTo({
//       top: newProgress * maxScroll,
//       behavior: "smooth",
//     });
//   };

//   const cupidPosition =
//     getCupidPosition();

//   return (
//     <aside
//       className="cupid-scroll-system"
//       aria-label="Page scroll controller"
//       onClick={handleTrackClick}
//     >

//       {/* ==============================================================
//           DECORATIVE ROPE
//       ============================================================== */}

//       <div className="cupid-rope-track">
//         <div
//           className="cupid-rope-progress"
//           style={{
//             height: `${cupidPosition}px`,
//           }}
//         />
//       </div>


//       {/* ==============================================================
//           TOP DECORATION
//       ============================================================== */}

//       <div className="cupid-top-decoration">
//         <span>✦</span>
//       </div>


//       {/* ==============================================================
//           CUPID
//       ============================================================== */}

//       <div
//         className={`cupid-scroll-thumb ${
//           isDragging
//             ? "cupid-dragging"
//             : ""
//         }`}
//         style={{
//           top: `${cupidPosition}px`,
//         }}
//         onPointerDown={handlePointerDown}
//         onPointerMove={handlePointerMove}
//         onPointerUp={handlePointerUp}
//         onPointerCancel={handlePointerUp}
//         onLostPointerCapture={
//           handlePointerUp
//         }
//       >

//         <div className="cupid-hanging-rope" />

//         <img
//           src="/images/cupid.png"
//           alt="Cupid"
//           draggable="false"
//           className="cupid-gif"
//         />

//         <div className="cupid-grab-hint">
//           <span>↕</span>
//         </div>

//       </div>


//       {/* ==============================================================
//           BOTTOM DECORATION
//       ============================================================== */}

//       <div className="cupid-bottom-decoration">
//         <span>♡</span>
//       </div>


//       {/* ==============================================================
//           PROGRESS
//       ============================================================== */}

//       <div className="cupid-scroll-progress">
//         {Math.round(progress * 100)}%
//       </div>

//     </aside>
//   );
// }
