const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const seekBar = document.getElementById('seek-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');

playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '⏸️';
  } else {
    audio.pause();
    playBtn.textContent = '▶️';
  }
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
  seekBar.max = Math.floor(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  seekBar.value = Math.floor(audio.currentTime);
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

seekBar.addEventListener('input', () => {
  audio.currentTime = seekBar.value;
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}