import * as d3 from "d3";
import { initBackdrop, resizeBackdrop } from "./backdrop.js";

const CONFIG_URL = "config.json";
const MANIFEST_URL = "images/manifest.json";

let config = {};
let manifest = [];
let nodes = [];
let simulation = null;
let zoomBehavior = null;
let currentTransform = d3.zoomIdentity;
let cycleIndex = 0;
let cycleOrder = [];
let holdTimeout = null;
let isPaused = false;
let svgEl = null;
let zoomGroup = null;
let photosGroup = null;
let width = 0;
let height = 0;
let focusedViewRotation = 0;
const PADDING = 80;
const POLAROID_TOP = 6;
const POLAROID_SIDES = 6;
const POLAROID_BOTTOM = 22;

function getViewportSize() {
  const el = document.getElementById("canvas");
  return { width: el.clientWidth, height: el.clientHeight };
}

async function loadConfig() {
  const res = await fetch(CONFIG_URL);
  config = await res.json();
}

async function loadManifest() {
  const res = await fetch(MANIFEST_URL);
  manifest = await res.json();
  if (config.shuffleOrder) {
    manifest = [...manifest].sort(() => Math.random() - 0.5);
  }
}

function computeDisplaySizeForCount(viewportWidth, viewportHeight, imageCount) {
  const planeW = Math.max(viewportWidth * 2.5, 1200);
  const planeH = Math.max(viewportHeight * 2.5, 800);
  const planeArea = planeW * planeH;
  const n = Math.max(imageCount, 1);
  const size = Math.sqrt(planeArea / n) * 0.38;
  return Math.max(70, Math.min(260, size));
}

function loadImageDimensions(entries, maxDisplaySize) {
  const maxSize = maxDisplaySize ?? config.imageDisplaySize ?? 180;
  return Promise.all(
    entries.map((entry, i) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const scale = maxSize / Math.max(w, h);
          const displayW = w * scale;
          const displayH = h * scale;
          resolve({
            id: i,
            src: entry.src,
            caption: entry.caption || "",
            width: displayW,
            height: displayH,
            naturalWidth: w,
            naturalHeight: h,
          });
        };
        img.onerror = () =>
          resolve({
            id: i,
            src: entry.src,
            caption: entry.caption || "",
            width: 120,
            height: 90,
            naturalWidth: 120,
            naturalHeight: 90,
          });
        img.src = entry.src;
      });
    })
  );
}

function runForceLayout(items) {
  const { width: vw, height: vh } = getViewportSize();
  const planeW = Math.max(vw * 2.5, 1200);
  const planeH = Math.max(vh * 2.5, 800);
  const centerX = planeW / 2;
  const centerY = planeH / 2;
  const padding = 60;

  const nodes = items.map((item, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * Math.random() * Math.min(planeW, planeH) * 0.48;
    const x = centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * planeW * 0.2;
    const y = centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * planeH * 0.2;
    const rotation = (Math.random() - 0.5) * 90;
    const layer = Math.floor(Math.random() * 1000);
    return {
      ...item,
      x: Math.max(padding, Math.min(planeW - padding, x)),
      y: Math.max(padding, Math.min(planeH - padding, y)),
      rotation,
      layer,
    };
  });

  const radius = (d) => {
    const r = Math.sqrt(d.width * d.width + d.height * d.height) / 2;
    return r * 0.5 + 2;
  };

  simulation = d3
    .forceSimulation(nodes)
    .force("collide", d3.forceCollide(radius).strength(0.6).iterations(3))
    .force("x", d3.forceX(centerX).strength(0.003))
    .force("y", d3.forceY(centerY).strength(0.003))
    .stop();

  for (let i = 0; i < 200; i++) simulation.tick();

  nodes.sort((a, b) => a.layer - b.layer);
  return nodes;
}

function render(nodes) {
  const photos = photosGroup
    .selectAll("g.photo-wrap")
    .data(nodes, (d) => d.id);

  const enter = photos
    .enter()
    .append("g")
    .attr("class", "photo-wrap")
    .attr("data-id", (d) => d.id);

  enter.each(function (d) {
    const g = d3.select(this);
    const frameW = d.width + POLAROID_SIDES * 2;
    const frameH = d.height + POLAROID_TOP + POLAROID_BOTTOM;
    const frameX = -d.width / 2 - POLAROID_SIDES;
    const frameY = -d.height / 2 - POLAROID_TOP;
    const clipId = `photo-clip-${d.id}`;
    g.append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", -d.width / 2)
      .attr("y", -d.height / 2)
      .attr("width", d.width)
      .attr("height", d.height)
      .attr("rx", 2)
      .attr("ry", 2);
    g.append("rect")
      .attr("class", "photo-frame")
      .attr("width", frameW)
      .attr("height", frameH)
      .attr("x", frameX)
      .attr("y", frameY)
      .attr("rx", 3)
      .attr("ry", 3);
    g.append("image")
      .attr("class", "photo-image")
      .attr("clip-path", `url(#${clipId})`)
      .attr("href", d.src)
      .attr("width", d.width)
      .attr("height", d.height)
      .attr("x", -d.width / 2)
      .attr("y", -d.height / 2)
      .attr("preserveAspectRatio", "xMidYMid slice");

    const caption = (d.caption && String(d.caption).trim()) || "";
    const captionClipId = `photo-caption-clip-${d.id}`;
    const lipX = -d.width / 2 - POLAROID_SIDES;
    const lipY = d.height / 2;
    const lipW = d.width + POLAROID_SIDES * 2;
    const padding = 16;
    const maxLipWidth = Math.max(20, lipW - padding * 2);
    const minFont = 2;
    const maxFont = 7;
    const avgCharWidthRatio = 0.8;
    const lineHeight = 1.35;
    let fontSize = maxFont;
    let lines = [caption];
    if (caption.length > 0) {
      const charsPerLineAtMin = Math.floor(maxLipWidth / (minFont * avgCharWidthRatio));
      if (caption.length > charsPerLineAtMin) {
        const mid = Math.floor(caption.length / 2);
        const spaceNearMid = caption.indexOf(" ", mid);
        const splitAt = spaceNearMid >= 0 ? spaceNearMid : caption.lastIndexOf(" ") >= 0 ? caption.lastIndexOf(" ") : mid;
        const line1 = caption.slice(0, splitAt).trim();
        const line2 = caption.slice(splitAt).trim();
        lines = line2 ? [line1, line2] : [line1];
        const maxLineLen = Math.max(...lines.map((l) => l.length));
        const idealFont = maxLipWidth / (maxLineLen * avgCharWidthRatio);
        fontSize = Math.min(maxFont, Math.max(minFont, Math.round(idealFont * 10) / 10));
      } else {
        const idealFont = maxLipWidth / (caption.length * avgCharWidthRatio);
        fontSize = Math.min(maxFont, Math.max(minFont, Math.round(idealFont * 10) / 10));
      }
    }
    g.append("clipPath")
      .attr("id", captionClipId)
      .append("rect")
      .attr("x", lipX)
      .attr("y", lipY)
      .attr("width", lipW)
      .attr("height", POLAROID_BOTTOM)
      .attr("rx", 2)
      .attr("ry", 2);
    const captionY = lipY + POLAROID_BOTTOM / 2;
    const textEl = g
      .append("text")
      .attr("class", "photo-caption-inline")
      .attr("clip-path", `url(#${captionClipId})`)
      .attr("x", 0)
      .attr("y", captionY)
      .attr("text-anchor", "middle")
      .attr("font-size", `${fontSize}px`);
    if (lines.length === 1) {
      textEl.attr("dy", "0.35em").text(caption);
    } else {
      const firstLineOffset = -((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => {
        textEl
          .append("tspan")
          .attr("x", 0)
          .attr("dy", i === 0 ? `${firstLineOffset + 0.35}em` : `${lineHeight}em`)
          .attr("text-anchor", "middle")
          .text(line);
      });
    }
  });

  photos
    .merge(enter)
    .attr(
      "transform",
      (d) =>
        `translate(${d.x},${d.y}) rotate(${d.rotation})`
    );

  photos.exit().remove();
}

function applyZoomTransform(transform) {
  currentTransform = transform;
  const { width: vw, height: vh } = getViewportSize();
  const cx = vw / 2;
  const cy = vh / 2;
  const rot =
    focusedViewRotation !== 0
      ? `rotate(${focusedViewRotation} ${cx} ${cy}) `
      : "";
  zoomGroup.attr("transform", rot + transform.toString());
}

function getContentCenter() {
  if (nodes.length === 0) return { x: 0, y: 0 };
  return {
    x: d3.mean(nodes, (d) => d.x),
    y: d3.mean(nodes, (d) => d.y),
  };
}

function setupZoom() {
  const [minScale, maxScale] = config.scaleExtent || [0.5, 3];
  const { width: vw, height: vh } = getViewportSize();
  const margin = 3000;
  const extent = [
    [-margin, -margin],
    [vw + margin, vh + margin],
  ];

  zoomBehavior = d3
    .zoom()
    .scaleExtent([minScale, maxScale])
    .translateExtent(extent)
    .on("zoom", (event) => {
      if (event.sourceEvent) focusedViewRotation = 0;
      applyZoomTransform(event.transform);
    });

  svgEl.call(zoomBehavior);

  const center = getContentCenter();
  const initialTx = vw / 2 - center.x;
  const initialTy = vh / 2 - center.y;
  const initialTransform = d3.zoomIdentity.translate(initialTx, initialTy);
  svgEl.call(zoomBehavior.transform, initialTransform);
  applyZoomTransform(initialTransform);
}

function focusOnImage(nodeIndexOrId) {
  const index = typeof nodeIndexOrId === "number" && nodeIndexOrId < nodes.length
    ? nodeIndexOrId
    : nodes.findIndex((n) => n.id === nodeIndexOrId);
  if (index < 0 || index >= nodes.length) return;
  const node = nodes[index];
  const { width: vw, height: vh } = getViewportSize();
  const centerX = vw / 2;
  const centerY = vh / 2;
  const imageSize = Math.max(node.width, node.height) + POLAROID_TOP + POLAROID_BOTTOM + POLAROID_SIDES;
  const targetScale = (0.98 * Math.min(vw, vh)) / imageSize;
  const k = Math.min(
    Math.max(targetScale, config.scaleExtent[0]),
    config.scaleExtent[1]
  );
  const tx = centerX - k * node.x;
  const ty = centerY - k * node.y;
  const targetTransform = d3.zoomIdentity.translate(tx, ty).scale(k);

  photosGroup.selectAll("g.photo-wrap").classed("focused", false);
  const focusedEl = photosGroup.select(`g.photo-wrap[data-id="${node.id}"]`);
  focusedEl.classed("focused", true);
  photosGroup.node().appendChild(focusedEl.node());

  const duration = config.transitionDurationMs || 1500;
  const targetRotation = -node.rotation;
  const contentCenter = getContentCenter();
  const zoomOutTransform = d3
    .zoomIdentity
    .translate(centerX - contentCenter.x, centerY - contentCenter.y)
    .scale(1);
  const phase1Duration = duration * 0.45;
  const phase2Duration = duration * 0.55;

  svgEl
    .transition()
    .duration(phase1Duration)
    .ease(d3.easeCubicInOut)
    .tween("zoomOut", function () {
      const interpTx = d3.interpolateNumber(currentTransform.x, zoomOutTransform.x);
      const interpTy = d3.interpolateNumber(currentTransform.y, zoomOutTransform.y);
      const interpK = d3.interpolateNumber(currentTransform.k, zoomOutTransform.k);
      const interpRot = d3.interpolateNumber(focusedViewRotation, 0);
      return function (t) {
        currentTransform = d3
          .zoomIdentity
          .translate(interpTx(t), interpTy(t))
          .scale(interpK(t));
        focusedViewRotation = interpRot(t);
        applyZoomTransform(currentTransform);
      };
    })
    .on("end", () => {
      currentTransform = zoomOutTransform;
      focusedViewRotation = 0;
      svgEl
        .transition()
        .duration(phase2Duration)
        .ease(d3.easeCubicInOut)
        .tween("zoomIn", function () {
          const interpTx = d3.interpolateNumber(currentTransform.x, targetTransform.x);
          const interpTy = d3.interpolateNumber(currentTransform.y, targetTransform.y);
          const interpK = d3.interpolateNumber(currentTransform.k, targetTransform.k);
          const interpRot = d3.interpolateNumber(0, targetRotation);
          return function (t) {
            currentTransform = d3
              .zoomIdentity
              .translate(interpTx(t), interpTy(t))
              .scale(interpK(t));
            focusedViewRotation = interpRot(t);
            applyZoomTransform(currentTransform);
          };
        })
        .on("end", () => {
          focusedViewRotation = targetRotation;
          svgEl.call(zoomBehavior.transform, targetTransform);
          scheduleNext();
        });
    });
}

function scheduleNext() {
  if (isPaused) return;
  holdTimeout = setTimeout(() => {
    if (isPaused) return;
    cycleIndex = (cycleIndex + 1) % cycleOrder.length;
    focusOnImage(nodes.findIndex((n) => n.id === cycleOrder[cycleIndex]));
  }, config.holdDurationMs || 5000);
}

function startCycle() {
  if (cycleOrder.length === 0) return;
  cycleIndex = 0;
  focusOnImage(nodes.findIndex((n) => n.id === cycleOrder[cycleIndex]));
}

function pauseCycle() {
  isPaused = true;
  if (holdTimeout) {
    clearTimeout(holdTimeout);
    holdTimeout = null;
  }
  document.getElementById("btn-pause").style.display = "none";
  document.getElementById("btn-play").style.display = "block";
}

function playCycle() {
  isPaused = false;
  document.getElementById("btn-play").style.display = "none";
  document.getElementById("btn-pause").style.display = "block";
  scheduleNext();
}

function setupControls() {
  document.getElementById("btn-pause").addEventListener("click", pauseCycle);
  document.getElementById("btn-play").addEventListener("click", () => {
    playCycle();
    if (!holdTimeout) scheduleNext();
  });
}

async function init() {
  width = getViewportSize().width;
  height = getViewportSize().height;
  svgEl = d3.select("#canvas");
  zoomGroup = d3.select("#zoom-group");
  photosGroup = d3.select("#photos");

  await loadConfig();
  await loadManifest();
  const displaySize = computeDisplaySizeForCount(width, height, manifest.length);
  const items = await loadImageDimensions(manifest, displaySize);
  nodes = runForceLayout(items);
  cycleOrder = nodes.map((d) => d.id);

  render(nodes);
  setupZoom();
  setupControls();
  initBackdrop(width, height);
  startCycle();

  window.addEventListener("resize", () => {
    const { width: w, height: h } = getViewportSize();
    width = w;
    height = h;
    resizeBackdrop(w, h);
  });
}

init().catch((err) => console.error("Init failed:", err));
