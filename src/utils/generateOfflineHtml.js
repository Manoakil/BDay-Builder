// Date formatter helper
const formatMemoryDate = (dateStr, tags = []) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  let precision = 'day';
  if (tags && tags.length) {
    const precisionTag = tags.find(t => typeof t === 'string' && t.startsWith('precision:'));
    if (precisionTag) precision = precisionTag.split(':')[1];
  } else {
    const parts = dateStr.split('-');
    if (parts.length === 1) precision = 'year';
    if (parts.length === 2) precision = 'month';
  }
  if (precision === 'year') return date.getFullYear().toString();
  if (precision === 'month') return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

/**
 * Generates and downloads the NORMAL Celebration page offline keepsake.
 * Contains text wishes, video memories, and memory timeline.
 * Does NOT include the secret vault wish.
 */
export const generateOfflineHtml = (birthdayName, wishes = [], videoWishes = [], timeline = []) => {
  const sortedTimeline = [...timeline].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

  const css = `
    :root {
      --bg: #140d18;
      --text: #fdfaf6;
      --accent: #f43f5e;
      --card-bg: #221626;
      --gold: #fbbf24;
      --border: rgba(244, 63, 94, 0.2);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: radial-gradient(circle at top, #24142a 0%, #0d0810 100%);
      color: var(--text);
      font-family: 'Poppins', sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 60px 24px 100px;
    }
    .header {
      text-align: center;
      margin-bottom: 70px;
    }
    .header-badge {
      display: inline-block;
      padding: 6px 18px;
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.4);
      border-radius: 999px;
      font-size: 0.85rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #fda4af;
      margin-bottom: 16px;
    }
    .header h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 3.5rem;
      color: #fff;
      margin: 0;
      line-height: 1.1;
      text-shadow: 0 4px 20px rgba(244, 63, 94, 0.3);
    }
    .header p {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 1.8rem;
      color: var(--gold);
      margin: 10px 0 0 0;
    }
    .section-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.2rem;
      text-align: center;
      margin: 70px 0 35px;
      color: #fff;
      position: relative;
    }
    .section-title::after {
      content: '';
      display: block;
      width: 60px;
      height: 2px;
      background: var(--accent);
      margin: 14px auto 0;
      border-radius: 2px;
    }
    .wishes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .wish-card {
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .wish-card img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 16px;
    }
    .wish-message {
      font-size: 1rem;
      line-height: 1.7;
      color: #f3e8f0;
      margin-bottom: 18px;
      white-space: pre-wrap;
    }
    .wish-author {
      font-size: 0.95rem;
      color: var(--gold);
      font-weight: 600;
      text-align: right;
    }
    .video-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .video-card video {
      width: 100%;
      border-radius: 10px;
      background: #000;
      max-height: 260px;
    }
    .timeline {
      position: relative;
      max-width: 720px;
      margin: 0 auto;
      padding-left: 28px;
      border-left: 2px solid rgba(244, 63, 94, 0.3);
    }
    .timeline-item {
      position: relative;
      margin-bottom: 40px;
    }
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -35px;
      top: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
    }
    .timeline-date {
      font-size: 0.85rem;
      color: var(--gold);
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 6px;
    }
    .timeline-title {
      font-family: 'Playfair Display', serif;
      font-size: 1.4rem;
      color: #fff;
      margin: 0 0 8px;
    }
    .timeline-desc {
      font-size: 0.95rem;
      color: #d1c5d3;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .timeline-img {
      max-width: 100%;
      border-radius: 10px;
      margin-top: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 80px;
      padding-top: 30px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #8d7a91;
      font-size: 0.9rem;
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Birthday Celebration • ${birthdayName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-badge">Celebration Keepsake</div>
      <h1>Happy Birthday</h1>
      <p>${birthdayName} ♡</p>
    </div>

    ${wishes.length > 0 ? `
      <h2 class="section-title">Wishes from Everyone</h2>
      <div class="wishes-grid">
        ${wishes.map(wish => `
          <div class="wish-card">
            ${wish.media_url ? `<img src="${wish.media_url}" alt="Attachment">` : ''}
            <div class="wish-message">${wish.content}</div>
            <div class="wish-author">— ${wish.wisher_name || 'Someone special'}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${videoWishes.length > 0 ? `
      <h2 class="section-title">Video Wishes</h2>
      <div class="wishes-grid">
        ${videoWishes.map(video => `
          <div class="video-card">
            <video src="${video.media_url}" controls preload="metadata"></video>
            <div class="wish-author" style="margin-top: 12px; text-align: right;">— ${video.wisher_name || 'Someone special'}</div>
            ${video.content ? `<div class="wish-message" style="margin-top: 10px;">${video.content}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${sortedTimeline.length > 0 ? `
      <h2 class="section-title">Memory Lane</h2>
      <div class="timeline">
        ${sortedTimeline.map(entry => `
          <div class="timeline-item">
            <span class="timeline-date">${formatMemoryDate(entry.entry_date, entry.tags)}</span>
            <h3 class="timeline-title">${entry.title}</h3>
            ${entry.description ? `<div class="timeline-desc">${entry.description}</div>` : ''}
            ${entry.media_url ? `<img src="${entry.media_url}" class="timeline-img" alt="Memory">` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="footer">
      Happy Birthday, ${birthdayName} • Saved with love
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${birthdayName}_Celebration.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads the DEDICATED SECRET VAULT WISH offline keepsake.
 * Contains the unlocked secret confession, letter, things I love, secret memories, and audio/media.
 */
export const generateVaultWishHtml = (birthdayName, vault, wisherName = "Your Secret Admirer") => {
  const dyn = vault?.dynamic_data || {};
  const confessionTitle = dyn.confession_title || vault?.unlock_message || "A Secret Kept Just for You";
  const confessionBody = dyn.confession_body || dyn.confessionText || vault?.unlock_message || "";
  const letterTitle = dyn.letter_title || `To ${birthdayName},`;
  const letterBody = dyn.letter_body || (Array.isArray(dyn.letterParagraphs) ? dyn.letterParagraphs.join('\n\n') : "");
  const thingsILove = dyn.things_i_love || dyn.littleThings || [];
  const secretMemories = dyn.memories || dyn.timeline || [];
  const fromName = dyn.wisher_name || wisherName || "Someone Who Adores You";

  const css = `
    :root {
      --bg: #11050e;
      --card-bg: #1c0a18;
      --gold: #f6c872;
      --rose: #e6396e;
      --text: #fff6fa;
      --text-muted: #d0b8c6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: radial-gradient(circle at 50% 10%, #290d23 0%, #11050e 100%);
      color: var(--text);
      font-family: 'Poppins', sans-serif;
      min-height: 100vh;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      padding: 70px 24px 100px;
    }
    .seal-badge {
      width: 70px;
      height: 70px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: radial-gradient(circle, #f6c872 0%, #b88628 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      box-shadow: 0 0 30px rgba(246, 200, 114, 0.4);
    }
    .header {
      text-align: center;
      margin-bottom: 60px;
    }
    .header h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 3.2rem;
      color: #fff;
      margin: 0 0 10px;
      letter-spacing: -0.5px;
    }
    .header p {
      font-family: 'Caveat', cursive, sans-serif;
      font-size: 2rem;
      color: var(--gold);
      margin: 0;
    }
    .card {
      background: rgba(28, 10, 24, 0.85);
      border: 1px solid rgba(246, 200, 114, 0.25);
      border-radius: 20px;
      padding: 36px 32px;
      margin-bottom: 40px;
      box-shadow: 0 15px 45px rgba(0,0,0,0.5);
    }
    .card-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2rem;
      color: var(--gold);
      margin-top: 0;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(246, 200, 114, 0.2);
      padding-bottom: 12px;
    }
    .confession-text {
      font-size: 1.15rem;
      line-height: 1.85;
      color: #fce7f3;
      white-space: pre-wrap;
    }
    .letter-container {
      background: #fbf3e4;
      color: #4a2810;
      border-radius: 8px;
      padding: 45px 35px;
      font-family: 'Caveat', cursive, sans-serif;
      font-size: 1.7rem;
      line-height: 1.6;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      position: relative;
    }
    .letter-title {
      font-size: 2.2rem;
      margin-bottom: 20px;
      color: #8b2500;
      font-weight: 700;
    }
    .letter-sign {
      text-align: right;
      margin-top: 30px;
      font-size: 2rem;
      color: #8b2500;
      font-weight: bold;
    }
    .things-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .thing-pill {
      background: rgba(230, 57, 110, 0.12);
      border: 1px solid rgba(230, 57, 110, 0.35);
      padding: 16px 20px;
      border-radius: 14px;
      font-size: 0.98rem;
      color: #ffd6e5;
      line-height: 1.5;
    }
    .media-preview {
      width: 100%;
      border-radius: 14px;
      margin-top: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .memory-item {
      padding: 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .memory-item:last-child { border-bottom: none; }
    .memory-date {
      color: var(--gold);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .memory-title {
      font-size: 1.25rem;
      color: #fff;
      margin: 6px 0;
      font-family: 'Playfair Display', serif;
    }
    .memory-desc {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
    }
    .footer {
      text-align: center;
      margin-top: 80px;
      color: #9f768e;
      font-size: 0.9rem;
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secret Vault • For ${birthdayName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <div class="seal-badge">🗝️</div>
    <div class="header">
      <h1>The Secret Vault</h1>
      <p>Reserved strictly for ${birthdayName} ♡</p>
    </div>

    ${confessionBody ? `
      <div class="card">
        <h2 class="card-title">${confessionTitle}</h2>
        <div class="confession-text">${confessionBody}</div>
        ${vault?.unlock_media_url ? `<img src="${vault.unlock_media_url}" class="media-preview" alt="Unlocked Memory">` : ''}
      </div>
    ` : ''}

    ${letterBody ? `
      <div class="card" style="background: transparent; border: none; padding: 0;">
        <div class="letter-container">
          <div class="letter-title">${letterTitle}</div>
          <div style="white-space: pre-wrap;">${letterBody}</div>
          <div class="letter-sign">— ${fromName}</div>
        </div>
      </div>
    ` : ''}

    ${thingsILove.length > 0 ? `
      <div class="card">
        <h2 class="card-title">Things I Love About You</h2>
        <div class="things-grid">
          ${thingsILove.map(t => `<div class="thing-pill">♥ ${typeof t === 'string' ? t : t.title || t.text || ''}</div>`).join('')}
        </div>
      </div>
    ` : ''}

    ${secretMemories.length > 0 ? `
      <div class="card">
        <h2 class="card-title">Our Secret Moments</h2>
        ${secretMemories.map(m => `
          <div class="memory-item">
            <span class="memory-date">${m.date || m.year || ''}</span>
            <div class="memory-title">${m.title || ''}</div>
            <div class="memory-desc">${m.description || m.desc || ''}</div>
            ${m.image || m.media_url ? `<img src="${m.image || m.media_url}" class="media-preview" alt="Memory">` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="footer">
      A secret wish kept forever • For ${birthdayName}
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${birthdayName}_Secret_Vault_Wish.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
