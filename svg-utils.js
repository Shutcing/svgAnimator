function parseSvgString(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg || svg.getElementsByTagName("parsererror").length) {
    throw new Error("Некорректный SVG");
  }
  return svg.cloneNode(true);
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
      const points = (el.getAttribute("points") || "").trim();
      d = `M${points.replace(/\s+/g, " L")}`;
    } else if (el.tagName === "polygon") {
      const points = (el.getAttribute("points") || "").trim();
      d = `M${points.replace(/\s+/g, " L")} Z`;
    }
    if (d) {
      const path = createPathFromElement(el, d);
      newPaths.push(path);
    }
  });
  shapes.forEach((el) => el.remove());
  newPaths.forEach((path) => svg.appendChild(path));
  return svg;
}

function createPathFromElement(el, d) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  for (const attr of Array.from(el.attributes)) {
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

function waitTwoFrames() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
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
