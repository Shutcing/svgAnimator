gsap.registerPlugin(MorphSVGPlugin);

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

addFrameBtnEnd.addEventListener("click", () => addFrame(framesContainer));
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
});

framesContainer.addEventListener("click", (e) => {
  if (e.target.closest(".load-btn")) {
    const button = e.target.closest(".load-btn");
    const frameIndex = parseInt(button.dataset.frameIndex, 10);
    loadFrame(frameIndex);
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
  } catch (error) {
    showStatus(`Ошибка загрузки кадра ${index + 1}: ${error.message}`, "error");
  }
}

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
      pathsToAnimate.forEach((path, pathIndex) => {
        const targetPathEl = targetPaths[pathIndex];
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
          
          const pathSequences = ${JSON.stringify(pathSequences)};
          const duration = ${durationSlider.value};
          
          const masterTl = gsap.timeline();
          Object.keys(pathSequences).forEach(id => {
            const pathEl = document.getElementById(id);
            if (pathEl) {
              const sequence = pathSequences[id];
              if (sequence.length > 1) {
                const pathTl = gsap.timeline({
                    repeat: -1,
                    yoyo: true 
                });
                const initialState = sequence[0];
                const initialProps = {};
                for (const attr in initialState) {
                    if (attr === 'd') {
                        initialProps.morphSVG = initialState[attr];
                    } else {
                        initialProps[attr] = initialState[attr];
                    }
                }
                gsap.set(pathEl, initialProps);
                for (let i = 1; i < sequence.length; i++) {
                    const state = sequence[i];
                    const props = { 
                        duration: duration, 
                        ease: "power1.inOut" 
                    };
                    for (const attr in state) {
                        if (attr === 'd') {
                            props.morphSVG = state[attr];
                        } else {
                            props[attr] = state[attr];
                        }
                    }
                    pathTl.to(pathEl, props);
                }
                masterTl.add(pathTl, 0);
              }
            }
          });
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
