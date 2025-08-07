document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("audio-player");
  const playBtn = document.getElementById("play-btn");
  const seekBar = document.getElementById("seek-bar");
  const currentTimeEl = document.getElementById("current-time");
  const durationEl = document.getElementById("duration");

  let canPlayRequested = false;
  let isReady = false;

  // Play tugmasi bosilganda
  playBtn.addEventListener("click", () => {
    if (!isReady) {
      canPlayRequested = true;
      return; // audio tayyor bo‘lishi kutiladi
    }

    if (audio.paused) {
      audio.play().then(() => {
        playBtn.textContent = "⏸️";
      }).catch((e) => {
        console.error("Play failed:", e);
      });
    } else {
      audio.pause();
      playBtn.textContent = "▶️";
    }
  });

  // Audio metadata tayyor bo‘lganda
  audio.addEventListener("loadedmetadata", () => {
    isReady = true;
    seekBar.max = audio.duration;
    durationEl.textContent = formatTime(audio.duration);

    if (canPlayRequested) {
      canPlayRequested = false;
      playBtn.click(); // avtomatik yana ishlatamiz
    }
  });

  // Audio davomida currentTime ni yangilash
  audio.addEventListener("timeupdate", () => {
    seekBar.value = audio.currentTime;
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  // Qo‘lda vaqtni o‘zgartirish
  seekBar.addEventListener("input", () => {
    audio.currentTime = seekBar.value;
  });

  // Formatlash: mm:ss
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  // Qo‘shimcha sug‘urta: metadata yuklanmasa, 2 soniyadan keyin tekshirib ko‘r
  setTimeout(() => {
    if (audio.readyState >= 1 && !isNaN(audio.duration)) {
      isReady = true;
      seekBar.max = audio.duration;
      durationEl.textContent = formatTime(audio.duration);
    }
  }, 2000);
});
