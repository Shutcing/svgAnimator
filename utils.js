function addFrame(framesContainer) {
  const newFrameIndex = state.frameCounter++;
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
}
