gsap.registerPlugin(MorphSVGPlugin);

const mappingModalOverlay = document.getElementById("mapping-modal-overlay");
const modalFrameFrom = document.getElementById("modal-frame-from");
const modalFrameTo = document.getElementById("modal-frame-to");
const modalSaveBtn = document.getElementById("modal-save-btn");
const modalCloseBtn = document.getElementById("modal-close-btn");

const PATH_COLORS = [
  "#e6194b",
  "#3cb44b",
  "#ffe119",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#46f0f0",
  "#f032e6",
  "#bcf60c",
  "#fabebe",
  "#008080",
  "#e6beff",
  "#9a6324",
  "#fffac8",
  "#800000",
  "#aaffc3",
  "#808000",
  "#ffd8b1",
  "#000075",
  "#808080",
  "#000000",
  "#ffffff",
  "#c0c0c0",
  "#ff7f50",
  "#6a5acd",
  "#2e8b57",
  "#d2691e",
  "#dc143c",
  "#00ffff",
  "#1e90ff",
  "#ff1493",
  "#7fff00",
  "#ff4500",
  "#20b2aa",
  "#ff69b4",
  "#228b22",
  "#daa520",
  "#9932cc",
  "#6495ed",
  "#8b0000",
  "#ff00ff",
  "#00fa9a",
  "#ff6347",
  "#b22222",
  "#32cd32",
  "#00bfff",
  "#adff2f",
  "#ba55d3",
  "#ff8c00",
  "#7cfc00",
  "#8a2be2",
  "#5f9ea0",
  "#ffb6c1",
  "#9acd32",
  "#ffdead",
  "#4169e1",
  "#cd5c5c",
  "#00ced1",
  "#ffdab9",
  "#b8860b",
  "#dda0dd",
  "#2f4f4f",
  "#f0e68c",
  "#ff1493",
  "#48d1cc",
  "#c71585",
  "#deb887",
  "#b0e0e6",
  "#ff00ff",
  "#66cdaa",
  "#ff0000",
  "#7b68ee",
  "#98fb98",
  "#191970",
  "#ffd700",
  "#00ff7f",
  "#ff69b4",
  "#008000",
  "#00ffff",
  "#708090",
];

let currentModalState = {
  fromIndex: -1,
  toIndex: -1,
  tempMapping: [],
  colors: [],
};

const framesContainer = document.getElementById("frames-container");
const addFrameBtnStart = document.getElementById("add-frame-btn-start");
const addFrameBtnEnd = document.getElementById("add-frame-btn-end");
const generateBtn = document.getElementById("generate-btn");
const animationResult = document.getElementById("animation-result");
const durationSlider = document.getElementById("duration-slider");
const durationValue = document.getElementById("duration-value");
const statusEl = document.getElementById("status");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const downloadLink = document.getElementById("download-link");

function updateTransitionButtons() {
  document
    .querySelectorAll(".transition-editor-btn")
    .forEach((el) => el.remove());
  const panels = Array.from(framesContainer.querySelectorAll(".panel")).sort(
    (a, b) =>
      parseInt(a.dataset.frameIndex, 10) - parseInt(b.dataset.frameIndex, 10)
  );

  for (let i = 0; i < panels.length - 1; i++) {
    const fromPanel = panels[i];
    const fromIndex = fromPanel.dataset.frameIndex;
    const toIndex = panels[i + 1].dataset.frameIndex;
    if (state.framesData[fromIndex] && state.framesData[toIndex]) {
      const transitionEditorBtn = document.createElement("button");
      transitionEditorBtn.className = "transition-editor-btn";
      transitionEditorBtn.dataset.fromIndex = fromIndex;
      transitionEditorBtn.dataset.toIndex = toIndex;
      transitionEditorBtn.title = "Настроить переход";
      transitionEditorBtn.textContent = "Настроить переход";
      fromPanel.append(transitionEditorBtn);
    }
  }
}

addFrameBtnEnd.addEventListener("click", () => {
  addFrame(framesContainer);
  updateTransitionButtons();
});
addFrameBtnStart.addEventListener("click", () => {
  addFrame(framesContainer);

  state.framesData.unshift(undefined);

  for (let i = state.frameCounter - 1; i > 0; i--) {
    const sourceTextarea = document.getElementById(`frame-input-${i - 1}`);
    const targetTextarea = document.getElementById(`frame-input-${i}`);
    const sourceDuration = document.getElementById(`duration-input-${i - 1}`);
    const targetDuration = document.getElementById(`duration-input-${i}`);

    if (sourceTextarea && targetTextarea) {
      targetTextarea.value = sourceTextarea.value;
    }
    if (sourceDuration && targetDuration) {
      targetDuration.value = sourceDuration.value;
    }

    if (targetTextarea.value.trim()) {
      loadFrame(i);
    } else {
      document.getElementById(`frame-svg-${i}`).innerHTML = "";
      document.getElementById(`frame-placeholder-${i}`).style.display = "block";
    }
  }

  document.getElementById("frame-input-0").value = "";
  document.getElementById("duration-input-0").value = "";
  document.getElementById("frame-svg-0").innerHTML = "";
  document.getElementById("frame-placeholder-0").style.display = "block";

  showStatus(
    "Новый кадр добавлен в начало. Заполните данные Кадра 1.",
    "success"
  );
  updateTransitionButtons();
});

framesContainer.addEventListener("click", (e) => {
  if (e.target.closest(".load-btn")) {
    const button = e.target.closest(".load-btn");
    const frameIndex = parseInt(button.dataset.frameIndex, 10);
    loadFrame(frameIndex);
  } else if (e.target.classList.contains("transition-editor-btn")) {
    const fromIndex = parseInt(e.target.dataset.fromIndex, 10);
    const toIndex = parseInt(e.target.dataset.toIndex, 10);
    openMappingModal(fromIndex, toIndex);
  }
});

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status";
  if (type) statusEl.classList.add(type);
}

function updateProgress(percent, text) {
  progressContainer.style.display = "block";
  progressFill.style.width = `${percent}%`;
  progressText.textContent = text;
}

function downloadFile(content, fileName, mimeType) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = fileName;
  downloadLink.style.display = "block";
  downloadLink.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    downloadLink.style.display = "none";
    progressContainer.style.display = "none";
  }, 100);
}

function loadFrame(index) {
  const input = document.getElementById(`frame-input-${index}`);
  const svgString = input.value.trim();
  if (!svgString) {
    showStatus(`Введите SVG код для кадра ${index + 1}`, "error");
    return;
  }
  try {
    let svg = parseSvgString(svgString);
    svg = svg.cloneNode(true);
    convertShapesToPaths(svg);
    svg.querySelectorAll("path").forEach((path, pathIndex) => {
      if (!path.id) {
        path.id = `morph-path-${pathIndex}`;
      }
    });
    if (index == 0) {
      svg.querySelectorAll("filter").forEach((filter) => {
        filter.setAttribute("x", "0");
        filter.setAttribute("y", "0");
        filter.setAttribute("width", `${svg.width.baseVal.value}`);
        filter.setAttribute("height", `${svg.height.baseVal.value}`);
      });
    }
    const container = document.getElementById(`frame-svg-${index}`);
    const placeholder = document.getElementById(`frame-placeholder-${index}`);
    container.innerHTML = "";
    container.appendChild(svg.cloneNode(true));
    placeholder.style.display = "none";
    const durationInput = document.getElementById(`duration-input-${index}`);
    const duration = parseFloat(durationInput.value);
    state.framesData[index] = {
      svg: svg,
      duration: !isNaN(duration) && duration > 0 ? duration : null,
    };
    showStatus(`Кадр ${index + 1} успешно загружен`, "success");
    updateTransitionButtons();
  } catch (error) {
    showStatus(`Ошибка загрузки кадра ${index + 1}: ${error.message}`, "error");
  }
}

function checkSaveability() {
  const usedSourceIndexes = new Set(currentModalState.tempMapping);
  const isSaveable =
    usedSourceIndexes.size === currentModalState.tempMapping.length;
  modalSaveBtn.disabled = !isSaveable;
}

function openMappingModal(fromIndex, toIndex) {
  const fromFrame = state.framesData[fromIndex];
  const toFrame = state.framesData[toIndex];

  if (!fromFrame || !toFrame) {
    showStatus("Загрузите оба кадра перед настройкой перехода.", "error");
    return;
  }

  const fromPaths = fromFrame.svg.querySelectorAll("path");
  const toPaths = toFrame.svg.querySelectorAll("path");

  if (fromPaths.length !== toPaths.length) {
    showStatus("Количество путей в кадрах должно совпадать.", "error");
    return;
  }

  if (fromPaths.length === 0) {
    showStatus("В кадрах нет путей для настройки.", "error");
    return;
  }

  if (fromPaths.length > PATH_COLORS.length) {
    showStatus(`Поддерживается до ${PATH_COLORS.length} путей.`, "error");
    return;
  }

  currentModalState.fromIndex = fromIndex;
  currentModalState.toIndex = toIndex;
  currentModalState.colors = PATH_COLORS.slice(0, fromPaths.length);
  const initialMapping =
    state.mappings[fromIndex] || Array.from(Array(fromPaths.length).keys());
  currentModalState.tempMapping = [...initialMapping];

  const fromSvgClone = fromFrame.svg.cloneNode(true);
  const toSvgClone = toFrame.svg.cloneNode(true);

  fromSvgClone.querySelectorAll("path").forEach((path, i) => {
    path.style.fill = currentModalState.colors[i];
  });

  toSvgClone.querySelectorAll("path").forEach((path, i) => {
    const sourceIndex = currentModalState.tempMapping[i];
    path.style.fill = currentModalState.colors[sourceIndex];
    path.dataset.pathIndex = i;
  });

  modalFrameFrom.innerHTML = "";
  modalFrameTo.innerHTML = "";
  modalFrameFrom.appendChild(fromSvgClone);
  modalFrameTo.appendChild(toSvgClone);

  modalFrameTo.onclick = (e) => {
    const targetPath = e.target.closest("path");
    if (!targetPath) return;

    const pathIndex = parseInt(targetPath.dataset.pathIndex, 10);
    const currentSourceIndex = currentModalState.tempMapping[pathIndex];
    const nextSourceIndex =
      (currentSourceIndex + 1) % currentModalState.colors.length;

    targetPath.style.fill = currentModalState.colors[nextSourceIndex];
    currentModalState.tempMapping[pathIndex] = nextSourceIndex;

    checkSaveability();
  };

  checkSaveability();
  mappingModalOverlay.style.display = "flex";
}

modalCloseBtn.addEventListener("click", () => {
  mappingModalOverlay.style.display = "none";
});

modalSaveBtn.addEventListener("click", () => {
  state.mappings[currentModalState.fromIndex] = [
    ...currentModalState.tempMapping,
  ];
  showStatus(
    `Переход ${currentModalState.fromIndex + 1} → ${
      currentModalState.toIndex + 1
    } сохранен.`,
    "success"
  );
  mappingModalOverlay.style.display = "none";
  if (animationResult.firstChild) {
    generateAnimation();
  }
});

generateBtn.addEventListener("click", generateAnimation);

function generateAnimation() {
  const validFrames = state.framesData.filter((f) => f);
  if (validFrames.length < 2) {
    showStatus(
      "Загрузите как минимум два кадра для генерации анимации",
      "error"
    );
    return;
  }
  const firstFramePathCount =
    validFrames[0].svg.querySelectorAll("path").length;
  for (let i = 1; i < validFrames.length; i++) {
    if (
      validFrames[i].svg.querySelectorAll("path").length !== firstFramePathCount
    ) {
      showStatus(
        "Ошибка: количество элементов (путей) в кадрах не совпадает. Проверьте SVG-файлы.",
        "error"
      );
      return;
    }
  }
  try {
    if (state.currentAnimation) {
      state.currentAnimation.kill();
    }
    animationResult.innerHTML = "";
    const animatedSVG = validFrames[0].svg.cloneNode(true);
    const combinedViewBox = getCombinedViewBox(
      validFrames.map((obj) => obj.svg)
    );
    animatedSVG.setAttribute("viewBox", combinedViewBox);
    animatedSVG.style.scale = `${
      100 /
      Math.min(
        animatedSVG.width.baseVal.value,
        animatedSVG.height.baseVal.value
      )
    }`;
    animationResult.appendChild(animatedSVG);
    const pathsToAnimate = Array.from(animatedSVG.querySelectorAll("path"));
    const timeline = gsap.timeline({
      repeat: -1,
      onStart: () => showStatus("Анимация запущена...", "success"),
    });
    const defaultDuration = parseFloat(durationSlider.value);
    for (let i = 0; i < validFrames.length; i++) {
      const transitionDuration = validFrames[i].duration || defaultDuration;
      const nextFrameSVG = validFrames[(i + 1) % validFrames.length].svg;
      const targetPaths = Array.from(nextFrameSVG.querySelectorAll("path"));

      const mapping = state.mappings[i];

      pathsToAnimate.forEach((path, pathIndex) => {
        const targetPathIndex = mapping
          ? mapping.indexOf(pathIndex)
          : pathIndex;
        const targetPathEl = targetPaths[targetPathIndex];

        if (targetPathEl) {
          const animationProps = {
            duration: transitionDuration,
            ease: "power1.inOut",
            attr: {},
          };
          animationProps.morphSVG = {
            shape: targetPathEl.getAttribute("d"),
            shapeIndex: "auto",
          };
          const attrsToAnimate = ["fill", "stroke", "stroke-width", "opacity"];
          attrsToAnimate.forEach((attr) => {
            const endAttr = targetPathEl.getAttribute(attr);
            if (endAttr !== null) {
              animationProps.attr[attr] = endAttr;
            }
          });
          if (Object.keys(animationProps.attr).length === 0) {
            delete animationProps.attr;
          }
          timeline.to(path, animationProps, `frame${i}`);
        }
      });
    }
    state.currentAnimation = timeline;
    showStatus(
      `Анимация успешно создана из ${validFrames.length} кадров!`,
      "success"
    );
  } catch (error) {
    showStatus(`Ошибка создания анимации: ${error.message}`, "error");
    console.error(error);
  }
}

durationSlider.addEventListener("input", () => {
  durationValue.textContent = durationSlider.value;
});

const initialInput = document.getElementById("frame-input-0");
if (initialInput)
  initialInput.value = `<svg viewBox="0 0 100 100"><circle id="demo-circle" cx="50" cy="50" r="20" fill="#4361ee"></circle></svg>`;
showStatus(
  "Демонстрационный пример загружен в Кадр 1. Добавьте второй кадр и загрузите в него SVG.",
  "success"
);

document.getElementById("export-svg").addEventListener("click", async () => {
  if (!animationResult.firstChild) {
    showStatus("Сначала создайте анимацию", "error");
    return;
  }
  updateProgress(20, "Подготовка данных для экспорта...");
  const validFrames = state.framesData.filter((f) => f);
  const pathSequences = {};
  validFrames[0].svg.querySelectorAll("path").forEach((path) => {
    if (path.id) pathSequences[path.id] = [];
  });
  const attrsToAnimate = ["d", "fill", "stroke", "stroke-width", "opacity"];
  validFrames.forEach((frame) => {
    Object.keys(pathSequences).forEach((id) => {
      const path = frame.svg.querySelector(`#${id}`);
      if (path) {
        const frameAttrs = {};
        attrsToAnimate.forEach((attr) => {
          const value = path.getAttribute(attr);
          if (value !== null) frameAttrs[attr] = value;
        });
        pathSequences[id].push(frameAttrs);
      }
    });
  });
  updateProgress(40, "Загрузка библиотек...");
  try {
    const [gsapSrc, morphSrc] = await Promise.all([
      fetch(
        "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js"
      ).then((r) => r.text()),
      fetch(
        "https://cdn.jsdelivr.net/npm/gsap@3.13/dist/MorphSVGPlugin.min.js"
      ).then((r) => r.text()),
    ]);
    const svgElement = animationResult.firstChild.cloneNode(true);
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgElement.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    svgElement.removeAttribute("style");
    const script = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "script"
    );
    script.setAttribute("type", "text/javascript");
    script.textContent = `
          ${gsapSrc}
          ${morphSrc}
          gsap.registerPlugin(MorphSVGPlugin);
          
          const pathDataByFrame = ${JSON.stringify(pathSequences)};
          const mappings = ${JSON.stringify(state.mappings)};
          const totalFrames = ${validFrames.length};
          const defaultDuration = ${durationSlider.value};
          const durations = ${JSON.stringify(
            validFrames.map((f) => f.duration)
          )};

          const masterTl = gsap.timeline({ repeat: -1 });

          Object.keys(pathDataByFrame).forEach(pathId => {
              const pathEl = document.getElementById(pathId);
              if (!pathEl) return;
              
              const initialState = pathDataByFrame[pathId][0];
              const initialProps = { attr: {} };
              let hasAttr = false;
              for (const attr in initialState) {
                  if (attr === 'd') {
                      initialProps.morphSVG = initialState[attr];
                  } else {
                      initialProps.attr[attr] = initialState[attr];
                      hasAttr = true;
                  }
              }
              if (!hasAttr) delete initialProps.attr;
              gsap.set(pathEl, initialProps);
          });

          for (let i = 0; i < totalFrames; i++) {
              const transitionDuration = durations[i] || defaultDuration;
              const nextFrameIndex = (i + 1) % totalFrames;
              const mapping = mappings[i];

              Object.keys(pathDataByFrame).forEach(pathId => {
                  const pathEl = document.getElementById(pathId);
                  if (!pathEl) return;
                  const sourcePathIndex = parseInt(pathId.replace('morph-path-', ''), 10);

                  const targetPathIndex = mapping ? mapping.indexOf(sourcePathIndex) : sourcePathIndex;
                  const targetPathId = 'morph-path-' + targetPathIndex;
                  
                  const endState = pathDataByFrame[targetPathId] ? pathDataByFrame[targetPathId][nextFrameIndex] : null;
                  if (!endState) return;

                  const props = { 
                      duration: transitionDuration, 
                      ease: "power1.inOut",
                      attr: {}
                  };
                  let hasAttr = false;
                  for (const attr in endState) {
                      if (attr === 'd') {
                          props.morphSVG = endState[attr];
                      } else {
                          props.attr[attr] = endState[attr];
                          hasAttr = true;
                      }
                  }
                  if (!hasAttr) delete props.attr;
                  masterTl.to(pathEl, props, "frame" + i);
              });
          }
        `;
    svgElement.appendChild(script);
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    updateProgress(100, "SVG готов!");
    setTimeout(() => {
      downloadFile(svgString, "animation.svg", "image/svg+xml");
    }, 500);
  } catch (error) {
    showStatus(`Ошибка экспорта SVG: ${error.message}`, "error");
    progressContainer.style.display = "none";
  }
});

document.getElementById("export-png").addEventListener("click", () => {
  if (typeof html2canvas === "undefined") {
    showStatus(
      "Библиотека для экспорта PNG (html2canvas) не найдена.",
      "error"
    );
    return;
  }
  if (!animationResult.firstChild) {
    showStatus("Сначала создайте анимацию", "error");
    return;
  }
  updateProgress(30, "Создание изображения...");
  html2canvas(document.querySelector(".animation-container"), {
    backgroundColor: null,
    logging: false,
  })
    .then((canvas) => {
      updateProgress(80, "Преобразование в PNG...");
      setTimeout(() => {
        canvas.toBlob((blob) => {
          downloadFile(blob, "frame.png", "image/png");
        }, "image/png");
      }, 500);
    })
    .catch((error) => {
      showStatus(`Ошибка экспорта PNG: ${error.message}`, "error");
      progressContainer.style.display = "none";
    });
});

document.getElementById("export-gif").addEventListener("click", async () => {
  if (!state.currentAnimation) {
    showStatus("Сначала создайте анимацию", "error");
    return;
  }
  if (typeof GIF === "undefined") {
    showStatus("Библиотека GIF.js не найдена.", "error");
    return;
  }
  showStatus("Начинается экспорт в GIF...", "success");
  updateProgress(0, "Инициализация...");
  const svgElement = document.querySelector("#animation-result svg");
  if (!svgElement) {
    showStatus("Не найден SVG для экспорта.", "error");
    return;
  }
  let workerUrl;
  try {
    const workerScriptContent = await fetch(
      "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js"
    ).then((res) => res.text());
    const workerBlob = new Blob([workerScriptContent], {
      type: "application/javascript",
    });
    workerUrl = URL.createObjectURL(workerBlob);
  } catch (error) {
    showStatus("Не удалось загрузить воркер для GIF.", "error");
    return;
  }
  const gif = new GIF({
    workers: 4,
    quality: 5,
    workerScript: workerUrl,
    background: "#00000000",
    transparent: 0x00000000,
  });
  const duration = state.currentAnimation.duration();
  const fps = 25;
  const frameCount = Math.floor(duration * fps);
  const delay = 1000 / fps;
  state.currentAnimation.pause(0);
  try {
    const viewBox = svgElement.viewBox.baseVal;
    const aspectRatio = viewBox.width / viewBox.height;
    const quality = Number(document.querySelector(".quality__input").value);
    const targetWidth = quality;
    const targetHeight = Math.round(targetWidth / aspectRatio);
    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      state.currentAnimation.progress(progress);
      await waitTwoFrames();
      const canvas = await renderSvgOnCanvas(
        svgElement,
        targetWidth,
        targetHeight,
        null
      );
      gif.addFrame(canvas, { delay: delay, copy: true });
      updateProgress(
        Math.round((i / frameCount) * 90),
        `Захват кадра ${i + 1} из ${frameCount}`
      );
    }
  } catch (error) {
    showStatus(`Ошибка при захвате кадров для GIF: ${error.message}`, "error");
    console.error(error);
  } finally {
    state.currentAnimation.play(0);
  }
  gif.on("finished", (blob) => {
    updateProgress(100, "GIF готов!");
    URL.revokeObjectURL(workerUrl);
    setTimeout(() => downloadFile(blob, "animation.gif", "image/gif"), 500);
  });
  gif.on("progress", (p) =>
    updateProgress(90 + Math.round(p * 10), "Сборка GIF...")
  );
  gif.render();
});

document.getElementById("export-mp4").addEventListener("click", async () => {
  if (!state.currentAnimation) {
    showStatus("Сначала создайте анимацию", "error");
    return;
  }
  if (typeof FFmpeg === "undefined") {
    showStatus("Библиотека FFmpeg.wasm не найдена.", "error");
    return;
  }
  showStatus("Начинается экспорт в MP4...", "success");
  updateProgress(0, "Инициализация...");
  const svgElement = document.querySelector("#animation-result svg");
  if (!svgElement) {
    showStatus("Не найден SVG для экспорта.", "error");
    return;
  }
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: false,
    mainName: "main",
    corePath: "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js",
  });
  try {
    await ffmpeg.load();
    updateProgress(10, "Кодеки загружены. Захват кадров...");
    const duration = state.currentAnimation.duration();
    const fps = 30;
    const frameCount = Math.floor(duration * fps);
    state.currentAnimation.pause(0);
    const viewBox = svgElement.viewBox.baseVal;
    const aspectRatio = viewBox.width / viewBox.height;
    const quality = Number(document.querySelector(".quality__input").value);
    const targetWidth = quality;
    const targetHeight =
      Math.floor(Math.round(targetWidth / aspectRatio) / 2) * 2;
    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      state.currentAnimation.progress(progress);
      await waitTwoFrames();
      const canvas = await renderSvgOnCanvas(
        svgElement,
        targetWidth,
        targetHeight,
        "#FFFFFF"
      );
      const dataURL = canvas.toDataURL("image/png");
      const frameNumber = String(i).padStart(4, "0");
      ffmpeg.FS(
        "writeFile",
        `frame-${frameNumber}.png`,
        await fetchFile(dataURL)
      );
      const captureProgress = 10 + Math.round((i / frameCount) * 80);
      updateProgress(captureProgress, `Захват кадра ${i + 1} из ${frameCount}`);
    }
    updateProgress(90, "Кадры захвачены. Кодирование видео...");
    await ffmpeg.run(
      "-framerate",
      String(fps),
      "-i",
      "frame-%04d.png",
      "-c:v",
      "libx264",
      "-profile:v",
      "baseline",
      "-level",
      "3.0",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      "-crf",
      "23",
      "output.mp4"
    );
    updateProgress(98, "Чтение готового файла...");
    const data = ffmpeg.FS("readFile", "output.mp4");
    if (data.length === 0) throw new Error("FFmpeg создал пустой файл.");
    updateProgress(100, "Видео готово!");
    setTimeout(() => {
      downloadFile(
        new Blob([data.buffer], { type: "video/mp4" }),
        "animation.mp4",
        "video/mp4"
      );
    }, 500);
  } catch (error) {
    showStatus(`Ошибка при создании MP4: ${error.message}`, "error");
    console.error("FFmpeg/MP4 Error:", error);
    progressContainer.style.display = "none";
  } finally {
    state.currentAnimation.play(0);
    if (ffmpeg && ffmpeg.isLoaded && ffmpeg.isLoaded()) {
      try {
        await ffmpeg.exit();
      } catch (e) {}
    }
  }
});

document.getElementById("export-json").addEventListener("click", async () => {
  showStatus(
    "Экспорт в Lottie JSON для многокадровой анимации находится в разработке.",
    "error"
  );
});
