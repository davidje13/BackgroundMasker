window.addEventListener('DOMContentLoaded', () => {
  const layers = document.getElementById('layers');
  const backgroundContainer = document.getElementById('background');
  const roundingInput = document.getElementById('rounding');
  const frame = document.getElementById('frame');
  const save = document.getElementById('save');
  const drop = document.getElementById('drop');
  const info = document.getElementById('info');

  const dpr = window.devicePixelRatio;
  const w = screen.width * dpr;
  const h = screen.height * dpr;
  const visW = screen.availWidth * dpr;
  const visH = screen.availHeight * dpr;
  const x1 = (w - visW) / 2;
  const y1 = h - visH;
  const x2 = x1 + visW;
  const y2 = y1 + visH;
  let rounding = 10 * dpr;
  let scale = 0;

  info.textContent = `${w} \u00D7 ${h} (${visW} \u00D7 ${visH} visible + ${h - visH}px status bar)`;

  frame.width = w;
  frame.height = h;

  let mask;

  const frameCtx = frame.getContext('2d');

  let filename = '';
  let aspect = 1;
  let img = null;
  let imgW = 0;
  let imgH = 0;
  let imgX = 0;
  let imgY = 0;
  let dragX = null;
  let dragY = null;

  roundingInput.value = String(rounding);
  roundingInput.addEventListener('input', redrawBoundary, { passive: true });

  function redrawBoundary() {
    rounding = Math.max(0, Math.min(visW / 2, visH / 2, Number(roundingInput.value)));
    const rtl = rounding;
    const rtr = rounding;
    const rbl = rounding;
    const rbr = rounding;

    mask = new Path2D();
    mask.moveTo(0, 0);
    mask.lineTo(w, 0);
    mask.lineTo(w, h);
    mask.lineTo(0, h);
    mask.closePath();
    mask.moveTo(x2 - rtr, y1);
    mask.arcTo(x1, y1, x1, y2 - rbl, rtl);
    mask.arcTo(x1, y2, x2 - rbr, y2, rbl);
    mask.arcTo(x2, y2, x2, y1 + rtr, rbr);
    mask.arcTo(x2, y1, x1 + rtl, y1, rtr);
    mask.closePath();

    frameCtx.clearRect(0, 0, w, h);
    frameCtx.fillStyle = '#000000';
    frameCtx.fill(mask, 'evenodd');
  }

  function rescale() {
    scale = Math.min((window.innerWidth - 40) / w, (window.innerHeight - 80) / h);
    layers.style.width = w * scale + 'px';
    layers.style.height = h * scale + 'px';
    redisplay();
  }

  function redisplay() {
    backgroundContainer.style.width = (imgW * scale) + 'px';
    backgroundContainer.style.height = (imgH * scale) + 'px';
    backgroundContainer.style.left = (imgX * scale) + 'px';
    backgroundContainer.style.top = (imgY * scale) + 'px';
  }

  function getCoord(e) {
    return {
      x: e.pageX / scale,
      y: e.pageY / scale,
    };
  }

  setupDropTarget(drop, handleImage((newImg, name) => {
    filename = name.split('.')[0];
    drop.style.display = 'none';
    if (img) {
      img.remove();
    }
    img = newImg;
    aspect = img.height / img.width;
    backgroundContainer.append(img);
    imgW = Math.max(visW, visH / aspect);
    imgH = imgW * aspect;
    imgX = x1 + (visW - imgW) / 2;
    imgY = y1 + (visH - imgH) / 2;
    redisplay();
  }));

  const mm = (e) => {
    e.preventDefault();
    const p = getCoord(e);
    imgX = Math.min(x1, Math.max(x2 - imgW, p.x - dragX));
    imgY = Math.min(y1, Math.max(y2 - imgH, p.y - dragY));
    redisplay();
  };
  const mu = (e) => {
    mm(e);
    window.removeEventListener('mousemove', mm);
    window.removeEventListener('mouseup', mu);
  };

  backgroundContainer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const p = getCoord(e);
    dragX = p.x - imgX;
    dragY = p.y - imgY;
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
  });

  save.addEventListener('click', () => {
    const outC = document.createElement('canvas');
    outC.width = w;
    outC.height = h;
    const outCtx = outC.getContext('2d');
    outCtx.drawImage(img, imgX, imgY, imgW, imgH);
    outCtx.fillStyle = '#000000';
    outCtx.fill(mask, 'evenodd');
    outC.toBlob((blob) => {
      const f = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('download', `${filename}.jpg`);
      link.href = f;
      link.click();
      URL.revokeObjectURL(f);
    }, 'image/jpeg', 0.8);
  });

  window.addEventListener('resize', rescale);

  redrawBoundary();
  rescale();
});

function handleImage(callback) {
  return (file) => {
    const f = URL.createObjectURL(file);
    const img = new Image();
    img.addEventListener('load', () => {
      URL.revokeObjectURL(f);
      callback(img, file.name);
    });
    img.addEventListener('error', () => {
      URL.revokeObjectURL(f);
    });
    img.src = f;
  };
}

function setupDropTarget(indicator, callback) {
  let dragc = 0;
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  window.addEventListener('dragenter', () => {
    ++dragc;
    indicator.classList.add('active');
  });
  window.addEventListener('dragleave', () => {
    if (!--dragc) {
      indicator.classList.remove('active');
    }
  });
  window.addEventListener('dragend', () => {
    dragc = 0;
    indicator.classList.remove('active');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragc = 0;
    indicator.classList.remove('active');

    let any = false;
    if (e.dataTransfer?.items) {
      for (let i = 0; i < e.dataTransfer.items.length; ++i) {
        const file = e.dataTransfer.items[i].getAsFile();
        if (file) {
          callback(file);
          any = true;
        }
      }
    }
    if (!any) {
      callback(null);
    }
  });
}
