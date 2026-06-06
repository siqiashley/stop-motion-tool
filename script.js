const videoInput = document.querySelector("#videoInput");
const modeLanding = document.querySelector("#modeLanding");
const toolWorkspace = document.querySelector("#toolWorkspace");
const backButton = document.querySelector("#backButton");
const modeTitle = document.querySelector("#modeTitle");
const fileText = document.querySelector("#fileText");
const fpsInput = document.querySelector("#fpsInput");
const fpsValue = document.querySelector("#fpsValue");
const previewInput = document.querySelector("#previewInput");
const backgroundControl = document.querySelector("#backgroundControl");
const backgroundInput = document.querySelector("#backgroundInput");
const backgroundLabel = document.querySelector("#backgroundLabel");
const backgroundSwatch = document.querySelector("#backgroundSwatch");
const backgroundHex = document.querySelector("#backgroundHex");
const customColorLine = document.querySelector("#customColorLine");
const customColorInput = document.querySelector("#customColorInput");
const qualityInput = document.querySelector("#qualityInput");
const qualityLabel = document.querySelector("#qualityLabel");
const exportButton = document.querySelector("#exportButton");
const resultActions = document.querySelector("#resultActions");
const downloadButton = document.querySelector("#downloadButton");
const previewLink = document.querySelector("#previewLink");
const statusText = document.querySelector("#statusText");
const timeText = document.querySelector("#timeText");
const progressBar = document.querySelector("#progressBar");
const dropZone = document.querySelector("#dropZone");
const fileHint = document.querySelector("#fileHint");
const emptyState = document.querySelector("#emptyState");
const canvas = document.querySelector("#stage");
const previewVideo = document.querySelector("#previewVideo");
const video = document.querySelector("#sourceVideo");
const ctx = canvas.getContext("2d");

let fileUrl = "";
let imageUrls = [];
let imageFiles = [];
let selectedMode = "";
let sourceKind = "";
let outputUrl = "";
let outputBlob = null;
let outputFileName = "stop-motion-10fps.mp4";
let isRendering = false;

const mp4MimeTypes = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1.4D401E",
  "video/mp4;codecs=h264",
  "video/mp4",
];

const qualityNames = {
  3500000: "标准",
  6500000: "高清",
  10000000: "超清",
};

const backgroundOptions = {
  green: { label: "绿幕", color: "#00ff00" },
  black: { label: "黑色", color: "#070807" },
  white: { label: "白色", color: "#ffffff" },
  blue: { label: "蓝幕", color: "#0047ff" },
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function setStatus(text) {
  statusText.textContent = text;
}

function getBackgroundColor() {
  if (backgroundInput.value === "custom") {
    return customColorInput.value;
  }
  return backgroundOptions[backgroundInput.value]?.color || backgroundOptions.green.color;
}

function updateBackgroundUi() {
  const isCustom = backgroundInput.value === "custom";
  const color = getBackgroundColor().toUpperCase();
  customColorLine.classList.toggle("hidden", !isCustom);
  backgroundLabel.textContent = isCustom
    ? "自定义"
    : backgroundOptions[backgroundInput.value]?.label || "绿幕";
  backgroundSwatch.style.backgroundColor = color;
  backgroundHex.textContent = color;
}

async function redrawImagePreview() {
  if (sourceKind !== "images" || !imageUrls.length || isRendering) return;
  resetDownload();
  const image = await loadImage(imageUrls[0]);
  setCanvasSize(image.naturalWidth, image.naturalHeight);
  drawContainImage(image);
  updateProgress(0, imageFiles.length / Number(fpsInput.value));
}

function showCanvasPreview() {
  previewVideo.pause();
  previewVideo.classList.add("hidden");
  canvas.classList.remove("preview-hidden");
}

function showVideoPreview(src) {
  canvas.classList.add("preview-hidden");
  previewVideo.src = src;
  previewVideo.currentTime = 0;
  previewVideo.classList.remove("hidden");
}

function resetVisiblePreview() {
  previewVideo.pause();
  previewVideo.removeAttribute("src");
  previewVideo.load();
  previewVideo.classList.add("hidden");
  canvas.classList.add("preview-hidden");
  emptyState.classList.remove("hidden");
}

function updateTime() {
  if (sourceKind === "images") return;
  updateProgress(video.currentTime, video.duration || 0);
}

function updateProgress(current, duration) {
  timeText.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  progressBar.value = duration ? Math.min(current / duration, 1) : 0;
}

function fitCanvasToVideo() {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);
}

function setCanvasSize(width, height) {
  const sourceWidth = width || 1280;
  const sourceHeight = height || 720;
  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
}

function drawContainImage(image) {
  const canvasRatio = canvas.width / canvas.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let drawX = 0;
  let drawY = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = canvas.width / imageRatio;
    drawY = (canvas.height - drawHeight) / 2;
  } else {
    drawWidth = canvas.height * imageRatio;
    drawX = (canvas.width - drawWidth) / 2;
  }

  ctx.fillStyle = getBackgroundColor();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function resetDownload() {
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = "";
  outputBlob = null;
  resultActions.classList.add("hidden");
  previewLink.removeAttribute("href");
}

function resetSourceUrls() {
  if (fileUrl) URL.revokeObjectURL(fileUrl);
  imageUrls.forEach((url) => URL.revokeObjectURL(url));
  fileUrl = "";
  imageUrls = [];
  imageFiles = [];
  sourceKind = "";
  video.removeAttribute("src");
  video.load();
}

function getSupportedMp4MimeType() {
  return mp4MimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function canExportMp4() {
  return "MediaRecorder" in window && Boolean(getSupportedMp4MimeType());
}

function buildOutputFileName() {
  return `stop-motion-${fpsInput.value}fps.mp4`;
}

function updateExportAvailability() {
  outputFileName = buildOutputFileName();
  if (!canExportMp4()) {
    exportButton.disabled = true;
    setStatus("当前浏览器不支持 MP4 导出");
    return;
  }
  exportButton.disabled = sourceKind === "";
}

function selectMode(mode) {
  selectedMode = mode;
  resetDownload();
  resetSourceUrls();
  resetVisiblePreview();
  videoInput.value = "";
  updateProgress(0, 0);

  if (mode === "images") {
    modeTitle.textContent = "照片变 Stop Motion";
    backgroundControl.classList.remove("hidden");
    updateBackgroundUi();
    videoInput.accept = "image/*";
    videoInput.multiple = true;
    fileText.textContent = "选择照片";
    fileHint.textContent = "多选 JPG、PNG、HEIC 等照片";
    setStatus("等待照片");
  } else {
    modeTitle.textContent = "视频变 Stop Motion";
    backgroundControl.classList.add("hidden");
    videoInput.accept = "video/*";
    videoInput.multiple = false;
    fileText.textContent = "选择视频";
    fileHint.textContent = "MP4、MOV 等浏览器可播放格式";
    setStatus("等待视频");
  }

  modeLanding.classList.add("hidden");
  toolWorkspace.classList.remove("hidden");
  updateExportAvailability();
}

function returnToLanding() {
  selectedMode = "";
  resetDownload();
  resetSourceUrls();
  resetVisiblePreview();
  videoInput.value = "";
  updateProgress(0, 0);
  exportButton.disabled = true;
  modeLanding.classList.remove("hidden");
  toolWorkspace.classList.add("hidden");
}

function loadFiles(files) {
  const selectedFiles = Array.from(files || []);

  if (selectedMode === "images") {
    const images = selectedFiles
      .filter((file) => file.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!images.length) {
      setStatus("请选择照片");
      return;
    }
    loadImageSequence(images);
    return;
  }

  if (selectedMode === "video") {
    const videos = selectedFiles.filter((file) => file.type.startsWith("video/"));
    if (videos.length === 1) {
      loadVideoFile(videos[0]);
      return;
    }
    if (videos.length > 1) {
      setStatus("一次只能选择一个视频");
      return;
    }
    setStatus("请选择视频");
    return;
  }

  const images = selectedFiles
    .filter((file) => file.type.startsWith("image/"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const videos = selectedFiles.filter((file) => file.type.startsWith("video/"));

  if (images.length) {
    selectMode("images");
    loadImageSequence(images);
  } else if (videos.length === 1) {
    selectMode("video");
    loadVideoFile(videos[0]);
  } else if (videos.length > 1) {
    setStatus("一次只能选择一个视频");
  } else {
    setStatus("请选择视频或照片");
  }
}

function loadVideoFile(file) {
  if (!file || !file.type.startsWith("video/")) {
    setStatus("请选择视频或照片");
    return;
  }

  resetDownload();
  resetSourceUrls();
  sourceKind = "video";
  imageFiles = [];
  fileUrl = URL.createObjectURL(file);
  video.src = fileUrl;
  video.muted = true;
  video.playsInline = true;
  showVideoPreview(fileUrl);
  fileHint.textContent = file.name;
  setStatus("正在读取视频");
  exportButton.disabled = true;
}

function loadImageSequence(files) {
  resetDownload();
  resetSourceUrls();
  sourceKind = "images";
  video.removeAttribute("src");
  video.load();
  imageFiles = files;
  imageUrls = files.map((file) => URL.createObjectURL(file));
  fileHint.textContent = `${files.length} 张照片，按文件名顺序`;
  setStatus("正在读取照片");
  showCanvasPreview();
  emptyState.classList.add("hidden");
  exportButton.disabled = true;

  const firstImage = new Image();
  firstImage.onload = () => {
    setCanvasSize(firstImage.naturalWidth, firstImage.naturalHeight);
    drawContainImage(firstImage);
    updateProgress(0, files.length / Number(fpsInput.value));
    updateExportAvailability();
    setStatus(canExportMp4() ? "可以生成" : "当前浏览器不支持 MP4 导出");
  };
  firstImage.onerror = () => {
    setStatus("照片读取失败");
  };
  firstImage.src = imageUrls[0];
}

function createRecorder(stream, videoBitsPerSecond) {
  const mimeType = getSupportedMp4MimeType();
  if (!mimeType) {
    throw new Error("当前浏览器不支持 MP4 导出");
  }

  return new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond,
  });
}

async function saveOutput() {
  if (!outputBlob) {
    setStatus("还没有可保存的视频");
    return;
  }

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: outputFileName,
        types: [
          {
            description: "MP4 video",
            accept: { "video/mp4": [".mp4"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(outputBlob);
      await writable.close();
      setStatus("保存完成");
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus("已取消保存");
        return;
      }
    }
  }

  const link = document.createElement("a");
  link.href = outputUrl;
  link.download = outputFileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setStatus("已触发下载");
}

function drawFrame() {
  if (!video.videoWidth || !video.videoHeight) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("照片读取失败"));
    image.src = url;
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForVideoEnd() {
  return new Promise((resolve, reject) => {
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("视频播放失败"));
    };
    const cleanup = () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("ended", onEnded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function seekToStart() {
  return new Promise((resolve) => {
    if (video.readyState >= 2 && video.currentTime < 0.03) {
      resolve();
      return;
    }
    video.addEventListener("seeked", resolve, { once: true });
    video.currentTime = 0;
  });
}

async function renderStopMotion() {
  if (isRendering || sourceKind === "") return;

  isRendering = true;
  resetDownload();
  exportButton.disabled = true;
  showCanvasPreview();
  const targetFps = Number(fpsInput.value);
  const frameInterval = 1 / targetFps;
  const videoBitsPerSecond = Number(qualityInput.value);
  const chunks = [];
  let nextFrameTime = 0;
  let rafId = 0;

  try {
    if (sourceKind === "images") {
      await renderImageSequence(targetFps, videoBitsPerSecond, chunks);
      return;
    }

    setStatus("准备生成");
    video.pause();
    video.muted = true;
    await seekToStart();
    fitCanvasToVideo();

    const stream = canvas.captureStream(targetFps);
    const recorder = createRecorder(stream, videoBitsPerSecond);

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });

    const stopped = new Promise((resolve) => {
      recorder.addEventListener("stop", resolve, { once: true });
    });

    const tick = () => {
      updateTime();
      if (video.currentTime + 0.0001 >= nextFrameTime) {
        drawFrame();
        nextFrameTime += frameInterval;
      }
      if (previewInput.checked && !emptyState.classList.contains("hidden")) {
        emptyState.classList.add("hidden");
      }
      if (!video.ended && !video.paused) {
        rafId = requestAnimationFrame(tick);
      }
    };

    setStatus("生成中");
    recorder.start(250);
    const ended = waitForVideoEnd();
    await video.play();
    tick();
    await ended;
    cancelAnimationFrame(rafId);
    drawFrame();
    recorder.stop();
    await stopped;

    outputBlob = new Blob(chunks, { type: recorder.mimeType || "video/mp4" });
    outputFileName = buildOutputFileName();
    outputUrl = URL.createObjectURL(outputBlob);
    showVideoPreview(outputUrl);
    previewLink.href = outputUrl;
    resultActions.classList.remove("hidden");
    setStatus("生成完成");
    progressBar.value = 1;
  } catch (error) {
    setStatus(error.message || "生成失败");
  } finally {
    isRendering = false;
    video.pause();
    video.muted = true;
    exportButton.disabled = !canExportMp4() || sourceKind === "";
  }
}

async function renderImageSequence(targetFps, videoBitsPerSecond, chunks) {
  const frameDurationMs = 1000 / targetFps;
  const duration = imageUrls.length / targetFps;
  const firstImage = await loadImage(imageUrls[0]);
  setCanvasSize(firstImage.naturalWidth, firstImage.naturalHeight);
  drawContainImage(firstImage);

  const stream = canvas.captureStream(targetFps);
  const track = stream.getVideoTracks()[0];
  const recorder = createRecorder(stream, videoBitsPerSecond);

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) chunks.push(event.data);
  });

  const stopped = new Promise((resolve) => {
    recorder.addEventListener("stop", resolve, { once: true });
  });

  setStatus("生成中");
  recorder.start(250);

  for (let index = 0; index < imageUrls.length; index += 1) {
    const image = index === 0 ? firstImage : await loadImage(imageUrls[index]);
    drawContainImage(image);
    if (track && "requestFrame" in track) {
      track.requestFrame();
    }
    updateProgress((index + 1) / targetFps, duration);
    await sleep(frameDurationMs);
  }

  recorder.stop();
  await stopped;

  outputBlob = new Blob(chunks, { type: recorder.mimeType || "video/mp4" });
  outputFileName = buildOutputFileName();
  outputUrl = URL.createObjectURL(outputBlob);
  showVideoPreview(outputUrl);
  previewLink.href = outputUrl;
  resultActions.classList.remove("hidden");
  setStatus("生成完成");
  progressBar.value = 1;
}

videoInput.addEventListener("change", (event) => {
  loadFiles(event.target.files);
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    selectMode(button.dataset.mode);
  });
});

backButton.addEventListener("click", returnToLanding);

video.addEventListener("loadedmetadata", () => {
  fitCanvasToVideo();
  emptyState.classList.add("hidden");
  if (canExportMp4()) {
    exportButton.disabled = sourceKind !== "video";
    setStatus("可以生成");
  } else {
    exportButton.disabled = true;
    setStatus("当前浏览器不支持 MP4 导出");
  }
  updateTime();
});

video.addEventListener("timeupdate", updateTime);

fpsInput.addEventListener("input", () => {
  fpsValue.textContent = fpsInput.value;
  outputFileName = buildOutputFileName();
  if (sourceKind === "images") {
    updateProgress(0, imageFiles.length / Number(fpsInput.value));
  }
});

qualityInput.addEventListener("change", () => {
  qualityLabel.textContent = qualityNames[qualityInput.value] || "标准";
});

backgroundInput.addEventListener("change", () => {
  updateBackgroundUi();
  redrawImagePreview().catch((error) => {
    setStatus(error.message || "照片读取失败");
  });
});

customColorInput.addEventListener("input", () => {
  updateBackgroundUi();
  redrawImagePreview().catch((error) => {
    setStatus(error.message || "照片读取失败");
  });
});

exportButton.addEventListener("click", renderStopMotion);
downloadButton.addEventListener("click", saveOutput);

updateExportAvailability();
updateBackgroundUi();

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  loadFiles(event.dataTransfer.files);
});
