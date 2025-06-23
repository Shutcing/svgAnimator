gsap.registerPlugin(MorphSVGPlugin);

const framesContainer = document.getElementById("frames-container");
const addFrameBtn = document.getElementById("add-frame-btn");
const generateBtn = document.getElementById("generate-btn");
const animationResult = document.getElementById("animation-result");
const durationSlider = document.getElementById("duration-slider");
const durationValue = document.getElementById("duration-value");
const statusEl = document.getElementById("status");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const downloadLink = document.getElementById("download-link");

let framesData = [];
let currentAnimation = null;
let frameCounter = 1;

addFrameBtn.addEventListener("click", () => {
  const newFrameIndex = frameCounter++;
  const framePanelHTML = `
    <div class="panel" data-frame-index="${newFrameIndex}">
      <div class="panel-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12h20M12 2v20"></path>
        </svg>
        Кадр ${newFrameIndex + 1}
      </div>
      <div class="frame-container" id="frame-container-${newFrameIndex}">
        <div class="frame-placeholder" id="frame-placeholder-${newFrameIndex}">
          Загрузите SVG-кадр
        </div>
        <div class="frame-svg" id="frame-svg-${newFrameIndex}"></div>
      </div>
      <div class="controls">
        <div class="input-group">
          <label for="frame-input-${newFrameIndex}">SVG код:</label>
          <textarea id="frame-input-${newFrameIndex}" placeholder="Вставьте SVG-код кадра..."></textarea>
        </div>
        
        <div class="input-group">
          <label for="duration-input-${newFrameIndex}">Длительность до след. кадра (сек):</label>
          <input type="number" id="duration-input-${newFrameIndex}" class="duration-input" min="0.05" step="0.05" placeholder="По умолч. (${
    durationSlider.value
  } сек)" />
        </div>
        
        <button class="load-btn" data-frame-index="${newFrameIndex}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Загрузить Кадр ${newFrameIndex + 1}
        </button>
      </div>
    </div>
  `;
  framesContainer.insertAdjacentHTML("beforeend", framePanelHTML);
});

framesContainer.addEventListener("click", (e) => {
  if (e.target.closest(".load-btn")) {
    const button = e.target.closest(".load-btn");
    const frameIndex = parseInt(button.dataset.frameIndex, 10);
    loadFrame(frameIndex);
  }
});

function loadFrame(index) {
  const input = document.getElementById(`frame-input-${index}`);
  const regex = /<defs\b[^>]*>[\s\S]*?<\/defs>/gi;
  const svgString = input.value.trim();

  if (!svgString) {
    showStatus(`Введите SVG код для кадра ${index + 1}`, "error");
    return;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    let svg = doc.querySelector("svg");

    if (!svg || svg.getElementsByTagName("parsererror").length) {
      showStatus(`Некорректный SVG код в кадре ${index + 1}`, "error");
      return;
    }

    svg = svg.cloneNode(true);

    convertShapesToPaths(svg);

    svg.querySelectorAll("path").forEach((path, pathIndex) => {
      if (!path.id) {
        path.id = `morph-path-${pathIndex}`;
      }
    });

    if (index == 0) {
      svg.querySelectorAll("filter").forEach((filter, filterIndex) => {
        console.log(filter);
        filter.setAttribute("x", "0");
        filter.setAttribute("y", "0");
        filter.setAttribute("width", `${svg.width.baseVal.value}`);
        filter.setAttribute("height", `${svg.height.baseVal.value}`);
        console.log(filter);
      });
    }

    const container = document.getElementById(`frame-svg-${index}`);
    const placeholder = document.getElementById(`frame-placeholder-${index}`);
    container.innerHTML = "";
    container.appendChild(svg.cloneNode(true));
    placeholder.style.display = "none";

    const durationInput = document.getElementById(`duration-input-${index}`);
    const duration = parseFloat(durationInput.value);

    framesData[index] = {
      svg: svg,
      duration: !isNaN(duration) && duration > 0 ? duration : null,
    };

    showStatus(`Кадр ${index + 1} успешно загружен`, "success");
  } catch (error) {
    showStatus(`Ошибка загрузки кадра ${index + 1}: ${error.message}`, "error");
  }
}

function convertShapesToPaths(svg) {
  const newPaths = [];
  const shapes = svg.querySelectorAll(
    "rect, circle, ellipse, line, polyline, polygon"
  );

  shapes.forEach((el) => {
    let d = "";
    if (el.tagName === "rect") {
      const x = parseFloat(el.getAttribute("x") || 0);
      const y = parseFloat(el.getAttribute("y") || 0);
      const w = parseFloat(el.getAttribute("width"));
      const h = parseFloat(el.getAttribute("height"));
      d = `M${x},${y} h${w} v${h} h${-w} Z`;
    } else if (el.tagName === "circle") {
      const cx = parseFloat(el.getAttribute("cx"));
      const cy = parseFloat(el.getAttribute("cy"));
      const r = parseFloat(el.getAttribute("r"));
      d = `M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${
        -2 * r
      },0`;
    } else if (el.tagName === "ellipse") {
      const cx = parseFloat(el.getAttribute("cx"));
      const cy = parseFloat(el.getAttribute("cy"));
      const rx = parseFloat(el.getAttribute("rx"));
      const ry = parseFloat(el.getAttribute("ry"));
      d = `M ${cx - rx}, ${cy} a ${rx},${ry} 0 1,0 ${
        2 * rx
      },0 a ${rx},${ry} 0 1,0 ${-2 * rx},0`;
    } else if (el.tagName === "line") {
      const x1 = parseFloat(el.getAttribute("x1"));
      const y1 = parseFloat(el.getAttribute("y1"));
      const x2 = parseFloat(el.getAttribute("x2"));
      const y2 = parseFloat(el.getAttribute("y2"));
      d = `M${x1},${y1} L${x2},${y2}`;
    } else if (el.tagName === "polyline") {
      const points = el.getAttribute("points").trim();
      d = `M${points.replace(/\s+/g, " L")}`;
    } else if (el.tagName === "polygon") {
      const points = el.getAttribute("points").trim();
      d = `M${points.replace(/\s+/g, " L")} Z`;
    }

    if (d) {
      const path = createPathFromElement(el, d);
      newPaths.push(path);
    }
  });

  shapes.forEach((el) => el.remove());
  newPaths.forEach((path) => svg.appendChild(path));
}

function createPathFromElement(el, d) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  for (const attr of el.attributes) {
    if (
      ![
        "x",
        "y",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "x1",
        "y1",
        "x2",
        "y2",
        "points",
        "width",
        "height",
      ].includes(attr.name)
    ) {
      path.setAttribute(attr.name, attr.value);
    }
  }
  return path;
}

generateBtn.addEventListener("click", generateAnimation);

function generateAnimation() {
  const validFrames = framesData.filter((f) => f);
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
    if (window.currentAnimation) {
      window.currentAnimation.kill();
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

    currentAnimation = timeline;
    showStatus(
      `Анимация успешно создана из ${validFrames.length} кадров!`,
      "success"
    );
  } catch (error) {
    showStatus(`Ошибка создания анимации: ${error.message}`, "error");
    console.error(error);
  }
}

function getCombinedViewBox(svgs) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  svgs.forEach((svg) => {
    const vb = svg.getAttribute("viewBox");
    if (vb) {
      const [x, y, w, h] = vb.split(/[\s,]+/).map(Number);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }
  });

  if (minX === Infinity) return "0 0 100 100";

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

durationSlider.addEventListener("input", () => {
  durationValue.textContent = durationSlider.value;
});

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status";
  if (type) statusEl.classList.add(type);
}

document.getElementById("example1").addEventListener("click", () => {
  const frame0Input = document.getElementById("frame-input-0");
  if (frame0Input)
    frame0Input.value = `<svg viewBox="0 0 100 100"><circle id="shape" cx="50" cy="50" r="20" fill="#4361ee"></circle></svg>`;

  if (frameCounter < 2) addFrameBtn.click();

  setTimeout(() => {
    const frame1Input = document.getElementById("frame-input-1");
    if (frame1Input)
      frame1Input.value = `<svg viewBox="0 0 100 100"><rect id="shape" x="30" y="30" width="40" height="40" fill="#f72585"></rect></svg>`;
    showStatus(
      'Пример "Круг в квадрат" с изменением цвета загружен. Нажмите "Загрузить" для каждого кадра.',
      "success"
    );
  }, 100);
});

document.getElementById("example2").addEventListener("click", () => {
  const frame0Input = document.getElementById("frame-input-0");
  if (frame0Input)
    frame0Input.value = `<svg viewBox="0 0 100 100"><path id="shape" d="M50,15 L61,40 L88,40 L65,55 L75,85 L50,70 L25,85 L35,55 L12,40 L39,40 Z" fill="#f72585"></path></svg>`;

  if (frameCounter < 2) addFrameBtn.click();

  setTimeout(() => {
    const frame1Input = document.getElementById("frame-input-1");
    if (frame1Input)
      frame1Input.value = `<svg viewBox="0 0 100 100"><path id="shape" d="M50,15 C60,25 75,20 80,30 C85,40 95,45 85,55 C75,65 80,80 70,85 C60,90 50,75 50,65 C50,75 40,90 30,85 C20,80 25,65 15,55 C5,45 15,40 20,30 C25,20 40,25 50,15 Z" fill="#4cc9f0"></path></svg>`;
    showStatus(
      'Пример "Звезда в сердце" с изменением цвета загружен. Нажмите "Загрузить" для каждого кадра.',
      "success"
    );
  }, 100);
});

document.getElementById("example3").addEventListener("click", () => {
  const frame0Input = document.getElementById("frame-input-0");
  if (frame0Input)
    frame0Input.value = `<svg viewBox="0 0 100 100"><rect id="shape" x="10" y="10" width="80" height="80" rx="5" fill="#4cc9f0"></rect></svg>`;

  if (frameCounter < 2) addFrameBtn.click();

  setTimeout(() => {
    const frame1Input = document.getElementById("frame-input-1");
    if (frame1Input)
      frame1Input.value = `<svg viewBox="0 0 100 100"><path id="shape" d="M50,10 L80,30 L80,70 L50,90 L20,70 L20,30 Z" fill="#3a0ca3"></path></svg>`;
    showStatus(
      'Пример "Анимация логотипа" с изменением цвета загружен. Нажмите "Загрузить" для каждого кадра.',
      "success"
    );
  }, 100);
});

const initialInput = document.getElementById("frame-input-0");
if (initialInput)
  initialInput.value = `<svg viewBox="0 0 100 100"><circle id="demo-circle" cx="50" cy="50" r="20" fill="#4361ee"></circle></svg>`;
showStatus(
  "Демонстрационный пример загружен в Кадр 1. Добавьте второй кадр и загрузите в него SVG.",
  "success"
);

function updateProgress(percent, text) {
  progressContainer.style.display = "block";
  progressFill.style.width = `${percent}%`;
  progressText.textContent = text;
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
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

document.getElementById("export-svg").addEventListener("click", async () => {
  if (!animationResult.firstChild) {
    showStatus("Сначала создайте анимацию", "error");
    return;
  }

  updateProgress(20, "Подготовка данных для экспорта...");

  const validFrames = framesData.filter((f) => f);
  const pathSequences = {};

  validFrames[0].svg.querySelectorAll("path").forEach((path) => {
    if (path.id) {
      pathSequences[path.id] = [];
    }
  });

  const attrsToAnimate = ["d", "fill", "stroke", "stroke-width", "opacity"];

  validFrames.forEach((frame) => {
    Object.keys(pathSequences).forEach((id) => {
      const path = frame.svg.querySelector(`#${id}`);
      if (path) {
        const frameAttrs = {};
        attrsToAnimate.forEach((attr) => {
          const value = path.getAttribute(attr);
          if (value !== null) {
            frameAttrs[attr] = value;
          }
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

async function waitTwoFrames() {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function renderSvgOnCanvas(
  svgElement,
  targetWidth,
  targetHeight,
  backgroundColor = null
) {
  return new Promise((resolve, reject) => {
    const svgClone = svgElement.cloneNode(true);

    svgClone.style.scale = "1";

    svgClone.setAttribute("width", targetWidth);
    svgClone.setAttribute("height", targetHeight);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);

    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Не удалось загрузить SVG в объект Image: " + JSON.stringify(err)
        )
      );
    };

    img.src = url;
  });
}

document.getElementById("export-gif").addEventListener("click", async () => {
  if (!currentAnimation) {
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

  const duration = currentAnimation.duration();
  const fps = 25;
  const frameCount = Math.floor(duration * fps);
  const delay = 1000 / fps;

  currentAnimation.pause(0);

  try {
    const viewBox = svgElement.viewBox.baseVal;
    const aspectRatio = viewBox.width / viewBox.height;
    const quality = Number(document.querySelector(".quality__input").value);
    const targetWidth = quality;
    const targetHeight = Math.round(targetWidth / aspectRatio);

    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      currentAnimation.progress(progress);
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
    currentAnimation.play(0);
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
  if (!currentAnimation) {
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

    const duration = currentAnimation.duration();
    const fps = 30;
    const frameCount = Math.floor(duration * fps);

    currentAnimation.pause(0);

    const viewBox = svgElement.viewBox.baseVal;
    const aspectRatio = viewBox.width / viewBox.height;
    const quality = Number(document.querySelector(".quality__input").value);
    const targetWidth = quality;
    const targetHeight =
      Math.floor(Math.round(targetWidth / aspectRatio) / 2) * 2;

    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      currentAnimation.progress(progress);
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
    currentAnimation.play(0);
    if (ffmpeg.isLoaded()) {
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
