import * as d3 from "d3";

const BACKDROP_COLORS = {
  flowerCenters: ["#f5e6e8", "#f0e4e0", "#ebe0e4"],
  flowerPetals: [
    "rgba(255, 210, 220, 0.52)",
    "rgba(255, 225, 215, 0.48)",
    "rgba(235, 215, 225, 0.45)",
    "rgba(245, 218, 218, 0.42)",
  ],
  rose: {
    inner: ["rgba(255, 180, 195, 0.58)", "rgba(255, 165, 185, 0.55)", "rgba(240, 170, 190, 0.52)"],
    outer: ["rgba(255, 200, 210, 0.52)", "rgba(250, 190, 205, 0.48)", "rgba(245, 185, 200, 0.45)"],
    center: ["rgba(255, 220, 225, 0.65)", "rgba(250, 210, 218, 0.6)"],
  },
  daisy: {
    petals: ["rgba(255, 252, 248, 0.62)", "rgba(255, 250, 245, 0.58)", "rgba(252, 248, 245, 0.6)"],
    center: ["rgba(255, 235, 200, 0.72)", "rgba(255, 240, 210, 0.68)", "rgba(252, 238, 218, 0.7)"],
  },
  leaves: [
    "rgba(175, 190, 168, 0.42)",
    "rgba(165, 182, 155, 0.38)",
    "rgba(185, 195, 172, 0.35)",
  ],
  loosePetals: [
    "rgba(255, 230, 225, 0.4)",
    "rgba(245, 220, 215, 0.36)",
    "rgba(235, 225, 230, 0.34)",
  ],
};

let backdropGroup = null;
let breezeTimer = null;
const TWO_PI = Math.PI * 2;

function petalPath(cx, cy, radius, petalIndex, petalCount = 5) {
  const angle = (petalIndex / petalCount) * Math.PI * 2 - Math.PI / 2;
  const tipX = cx + Math.cos(angle) * radius;
  const tipY = cy + Math.sin(angle) * radius;
  const width = radius * 0.6;
  const leftAngle = angle - Math.PI / 2;
  const rightAngle = angle + Math.PI / 2;
  const x1 = cx + Math.cos(leftAngle) * width;
  const y1 = cy + Math.sin(leftAngle) * width;
  const x2 = cx + Math.cos(rightAngle) * width;
  const y2 = cy + Math.sin(rightAngle) * width;
  return `M ${cx} ${cy} Q ${x1} ${y1} ${tipX} ${tipY} Q ${x2} ${y2} ${cx} ${cy}`;
}

function leafPath(x, y, length, tilt) {
  const w = length * 0.4;
  return `M ${x} ${y} C ${x + w} ${y - length * 0.3} ${x + w} ${y + length * 0.7} ${x} ${y + length} C ${x - w} ${y + length * 0.7} ${x - w} ${y - length * 0.3} ${x} ${y}`;
}

/** Single rose petal path: base at origin, tip along +y. Width and length in units. */
function rosePetalPath(width, length) {
  const w = width / 2;
  return `M 0 0 C ${w} ${length * 0.15} ${w} ${length * 0.85} 0 ${length} C ${-w} ${length * 0.85} ${-w} ${length * 0.15} 0 0`;
}

function drawRose(g, x, y, size, seed) {
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const innerColor = BACKDROP_COLORS.rose.inner[Math.floor(rng() * BACKDROP_COLORS.rose.inner.length)];
  const outerColor = BACKDROP_COLORS.rose.outer[Math.floor(rng() * BACKDROP_COLORS.rose.outer.length)];
  const centerColor = BACKDROP_COLORS.rose.center[Math.floor(rng() * BACKDROP_COLORS.rose.center.length)];

  const rose = g.append("g").attr("class", "backdrop-rose").attr("transform", `translate(${x},${y})`);

  const innerCount = 5;
  const outerCount = 8;
  const innerR = size * 0.35;
  const outerR = size * 0.7;
  const innerPetalLen = size * 0.4;
  const outerPetalLen = size * 0.55;
  const innerPetalW = size * 0.25;
  const outerPetalW = size * 0.32;

  for (let i = 0; i < outerCount; i++) {
    const a = (i / outerCount) * Math.PI * 2 - Math.PI / 2;
    rose
      .append("path")
      .attr("d", rosePetalPath(outerPetalW, outerPetalLen))
      .attr("fill", outerColor)
      .attr("stroke", "none")
      .attr("transform", `rotate(${(a * 180) / Math.PI}) translate(0,${-outerR * 0.4})`);
  }
  for (let i = 0; i < innerCount; i++) {
    const a = (i / innerCount) * Math.PI * 2 - Math.PI / 2 + 0.2;
    rose
      .append("path")
      .attr("d", rosePetalPath(innerPetalW, innerPetalLen))
      .attr("fill", innerColor)
      .attr("stroke", "none")
      .attr("transform", `rotate(${(a * 180) / Math.PI}) translate(0,${-innerR * 0.5})`);
  }
  rose.append("circle").attr("r", size * 0.12).attr("fill", centerColor).attr("stroke", "none");

  return rose;
}

/** Daisy: radiating oval petals + center circle */
function drawDaisy(g, x, y, size, seed) {
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const petalColor = BACKDROP_COLORS.daisy.petals[Math.floor(rng() * BACKDROP_COLORS.daisy.petals.length)];
  const centerColor = BACKDROP_COLORS.daisy.center[Math.floor(rng() * BACKDROP_COLORS.daisy.center.length)];

  const daisy = g.append("g").attr("class", "backdrop-daisy").attr("transform", `translate(${x},${y})`);

  const petalCount = 12 + Math.floor(rng() * 4);
  const petalLength = size * 0.55;
  const petalWidth = size * 0.12;

  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const deg = (a * 180) / Math.PI;
    daisy
      .append("ellipse")
      .attr("rx", petalWidth)
      .attr("ry", petalLength)
      .attr("fill", petalColor)
      .attr("stroke", "none")
      .attr("transform", `rotate(${deg}) translate(0,${-petalLength * 0.6})`);
  }
  daisy.append("circle").attr("r", size * 0.2).attr("fill", centerColor).attr("stroke", "none");

  return daisy;
}

function drawFlower(g, x, y, size, seed) {
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const petalCount = 5 + Math.floor(rng() * 2);
  const centerR = size * 0.2;
  const petalR = size * 0.5;
  const centerColor =
    BACKDROP_COLORS.flowerCenters[Math.floor(rng() * BACKDROP_COLORS.flowerCenters.length)];
  const petalColor =
    BACKDROP_COLORS.flowerPetals[Math.floor(rng() * BACKDROP_COLORS.flowerPetals.length)];

  const flower = g.append("g").attr("class", "backdrop-flower").attr("transform", `translate(${x},${y})`);

  for (let i = 0; i < petalCount; i++) {
    flower
      .append("path")
      .attr("d", petalPath(0, 0, petalR, i, petalCount))
      .attr("fill", petalColor)
      .attr("stroke", "none");
  }
  flower.append("circle").attr("r", centerR).attr("fill", centerColor).attr("stroke", "none");

  return flower;
}

function drawLeaf(g, x, y, length, tilt, seed) {
  const color =
    BACKDROP_COLORS.leaves[Math.floor((seed % 1000) / 334) % BACKDROP_COLORS.leaves.length];
  return g
    .append("path")
    .attr("class", "backdrop-leaf")
    .attr("d", leafPath(0, 0, length, tilt))
    .attr("fill", color)
    .attr("stroke", "none")
    .attr("transform", `translate(${x},${y}) rotate(${tilt})`);
}

function drawLoosePetal(g, x, y, w, h, rotation) {
  const color =
    BACKDROP_COLORS.loosePetals[Math.floor(Math.random() * BACKDROP_COLORS.loosePetals.length)];
  return g
    .append("ellipse")
    .attr("class", "backdrop-petal")
    .attr("cx", x)
    .attr("cy", y)
    .attr("rx", w)
    .attr("ry", h)
    .attr("fill", color)
    .attr("transform", `rotate(${rotation} ${x} ${y})`);
}

/** Breeze params: phase (0–2π), drift (px), sway (deg). Applied in a single timer. */
function attachBreeze(el, driftAmt, swayAmt, phaseOffset = 0) {
  const g = d3.select(el.node());
  const base = g.attr("transform") || "";
  g.attr("data-base-transform", base)
    .attr("data-phase", typeof phaseOffset === "number" ? phaseOffset : Math.random() * TWO_PI)
    .attr("data-drift", driftAmt)
    .attr("data-sway", swayAmt);
}

function startBreezeLoop() {
  const start = performance.now();
  if (breezeTimer) breezeTimer.stop();
  breezeTimer = d3.timer((elapsed) => {
    const t = (elapsed + start) * 0.001;
    const windWave = Math.sin(t * 0.15) * 0.4 + 0.6;
    const windDirX = Math.sin(t * 0.07) * 0.5 + 0.5;
    const windDirY = Math.cos(t * 0.09 + 1) * 0.5 + 0.5;

    backdropGroup.selectAll(".backdrop-flower, .backdrop-rose, .backdrop-daisy, .backdrop-leaf, .backdrop-petal").each(function () {
      const g = d3.select(this);
      const base = g.attr("data-base-transform");
      if (base == null) return;
      const phase = parseFloat(g.attr("data-phase")) || 0;
      const drift = parseFloat(g.attr("data-drift")) || 6;
      const sway = parseFloat(g.attr("data-sway")) || 4;

      const dx =
        (Math.sin(t * 0.8 + phase) * windDirX + Math.sin(t * 0.5 + phase * 1.7) * 0.5) *
        drift *
        windWave;
      const dy =
        (Math.cos(t * 0.7 + phase + 2) * windDirY + Math.cos(t * 0.45 + phase * 0.9) * 0.5) *
        drift *
        windWave;
      const drot = (Math.sin(t * 0.9 + phase * 1.2) * sway + Math.sin(t * 0.6 + phase * 0.5) * sway * 0.4) * windWave;

      g.attr("transform", `${base} translate(${dx},${dy}) rotate(${drot})`);
    });
  });
}

export function initBackdrop(width, height) {
  const container = document.getElementById("backdrop");
  if (!container) return;
  if (breezeTimer) breezeTimer.stop();
  d3.select(container).selectAll("*").remove();

  backdropGroup = d3.select("#backdrop");
  const padding = 80;
  const seedBase = Date.now() % 100000;

  const flowers = [];
  for (let i = 0; i < 12; i++) {
    flowers.push({
      x: padding + Math.random() * (width - 2 * padding),
      y: padding + Math.random() * (height - 2 * padding),
      size: 12 + Math.random() * 20,
      seed: seedBase + i * 7919,
    });
  }

  const roses = [];
  for (let i = 0; i < 10; i++) {
    roses.push({
      x: padding + Math.random() * (width - 2 * padding),
      y: padding + Math.random() * (height - 2 * padding),
      size: 14 + Math.random() * 18,
      seed: seedBase + i * 5023 + 1000,
    });
  }

  const daisies = [];
  for (let i = 0; i < 10; i++) {
    daisies.push({
      x: padding + Math.random() * (width - 2 * padding),
      y: padding + Math.random() * (height - 2 * padding),
      size: 10 + Math.random() * 16,
      seed: seedBase + i * 6007 + 2000,
    });
  }

  const leavesData = [];
  for (let i = 0; i < 35; i++) {
    leavesData.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 25 + Math.random() * 45,
      tilt: Math.random() * 360,
      seed: seedBase + i * 6317,
    });
  }

  const petalsData = [];
  for (let i = 0; i < 22; i++) {
    petalsData.push({
      x: Math.random() * width,
      y: Math.random() * height,
      w: 8 + Math.random() * 14,
      h: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
    });
  }

  const flowersG = backdropGroup.append("g").attr("class", "backdrop-flowers");
  const rosesG = backdropGroup.append("g").attr("class", "backdrop-roses");
  const daisiesG = backdropGroup.append("g").attr("class", "backdrop-daisies");
  const leavesG = backdropGroup.append("g").attr("class", "backdrop-leaves");
  const petalsG = backdropGroup.append("g").attr("class", "backdrop-petals");

  flowers.forEach((f) => {
    const flower = drawFlower(flowersG, f.x, f.y, f.size, f.seed);
    attachBreeze(flower, 5 + Math.random() * 5, 3 + Math.random() * 4, (f.seed % 1000) / 1000 * TWO_PI);
  });

  roses.forEach((f) => {
    const rose = drawRose(rosesG, f.x, f.y, f.size, f.seed);
    attachBreeze(rose, 4 + Math.random() * 4, 2 + Math.random() * 3, (f.seed % 1000) / 1000 * TWO_PI);
  });

  daisies.forEach((f) => {
    const daisy = drawDaisy(daisiesG, f.x, f.y, f.size, f.seed);
    attachBreeze(daisy, 6 + Math.random() * 5, 4 + Math.random() * 4, (f.seed % 1000) / 1000 * TWO_PI);
  });

  leavesData.forEach((d) => {
    const leaf = drawLeaf(leavesG, d.x, d.y, d.length, d.tilt, d.seed);
    attachBreeze(leaf, 8 + Math.random() * 8, 6 + Math.random() * 8, (d.seed % 1000) / 1000 * TWO_PI);
  });

  petalsData.forEach((d) => {
    const petal = drawLoosePetal(petalsG, d.x, d.y, d.w, d.h, d.rotation);
    attachBreeze(petal, 12 + Math.random() * 14, 8 + Math.random() * 10, Math.random() * TWO_PI);
  });

  startBreezeLoop();
}

export function resizeBackdrop(width, height) {
  initBackdrop(width, height);
}
