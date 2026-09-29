let video;
let handpose;
let predictions = [];
let handControlOn = false;  // toggle on/off with H key
let handX = 0;
let handY = 0;
let handReady = false;
let frameSkip = 0;
// ===== GLOBALS =====
let duckForward, duckBack, duckSide, duckSwim, duckFly;
let duck;
let duckFacingRight = true;
let scrollY = 0;        
let totalScroll = 2000;  
let t = 0; 
let fishies = [];
let turtles = [];
let lilyPads = [];
let splashes = [];
let flowField = [];
let cols, rows;
const FIELD_SIZE = 40; 
let pane;          
let paneVisible = true;
let lockY = 200;
let duckSurface = 'grass';
let duckHealth = 3;       
let maxHealth = 3;
let invincible = false;    
let invincibleTimer = 0;
let healTimer = 0;
let params = {
  fishCount: 8,
  fishMaxSpeed: 2.5,
  fishSize: 8,
  flowStrength: 0.5,
  flowChangeSpeed: 0.3,
  waveAmplitudeBig: 12,
  waveAmplitudeSmall: 6,
  waveSpeed: 1.5,
  sparkleCount: 30,
  duckSpeed: 5,
  parallaxStrength: 0.3,
  turtleCount: 2,
  turtleMaxSpeed: 1.8,
  turtleSenseRadius: 200,
  handDeadZone: 25,
  handHopThreshold: 0.05,
};
let gameWon = false;

// ===== PRELOAD =====
function preload() {
  duckForward = loadImage('DuckForward.png');
  duckBack    = loadImage('DuckBackward.png');
  duckSide    = loadImage('DuckSide.png');
  duckSwim    = loadImage('SwimFly.png');
  duckFly     = loadImage('Fly.png');
}

// ===== SETUP =====
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  duck = {
    x: width / 2 - 56,
    y: height - 180,       
    w: 112,
    h: 136,
    speed: 5,
    dir: 'forward',
    moving: false,
    frame: 0,
    frameCount: 0,
    state: 'walking',
    vy: 0,
    hopHeight: 0
  };

  cols = floor(width / FIELD_SIZE);
  rows = floor(height / FIELD_SIZE);
  for (let i = 0; i < cols * rows; i++) {
    flowField.push(createVector(0, 0));
  }

  for (let i = 0; i < params.fishCount; i++) {
    fishies.push(new Fish(random(width), random(height), random(6, 10)));
  }

  for (let i = 0; i < params.turtleCount; i++) {
    turtles.push(new Turtle(random(width), random(height)));
  }

  // two lily pads in the world
  lilyPads.push(new LilyPad(width * 0.3, height - 700));
  lilyPads.push(new LilyPad(width * 0.65, height - 1400));
  
  setupPane();
  // hand tracking setup
video = createCapture(VIDEO);
video.size(160, 120);
video.hide();

handpose = ml5.handpose(video, { flipHorizontal: true }, () => {
  console.log('Hand model ready!');
  handReady = true;
});

handpose.on('predict', (results) => {
  predictions = results;
});
}

// ===== TWEAKPANE =====
function setupPane() {
  pane = new Tweakpane.Pane({ title: 'Duck Pond Controls' });
  
  const fishFolder = pane.addFolder({ title: 'Fish' });
  fishFolder.addInput(params, 'fishCount', { min: 0, max: 30, step: 1 })
    .on('change', (e) => updateFishCount(e.value));
  fishFolder.addInput(params, 'fishMaxSpeed', { min: 0.5, max: 6, step: 0.1 });
  fishFolder.addInput(params, 'fishSize', { min: 3, max: 20, step: 1 });
  
  const flowFolder = pane.addFolder({ title: 'Flow Field' });
  flowFolder.addInput(params, 'flowStrength', { min: 0, max: 2, step: 0.1 });
  flowFolder.addInput(params, 'flowChangeSpeed', { min: 0, max: 1.5, step: 0.05 });
  
  const waterFolder = pane.addFolder({ title: 'Water' });
  waterFolder.addInput(params, 'waveAmplitudeBig', { min: 0, max: 30, step: 1 });
  waterFolder.addInput(params, 'waveAmplitudeSmall', { min: 0, max: 20, step: 1 });
  waterFolder.addInput(params, 'waveSpeed', { min: 0, max: 5, step: 0.1 });
  waterFolder.addInput(params, 'sparkleCount', { min: 0, max: 80, step: 1 });
  
  const duckFolder = pane.addFolder({ title: 'Duck' });
  duckFolder.addInput(params, 'duckSpeed', { min: 1, max: 12, step: 0.5 });
  duckFolder.addInput(params, 'parallaxStrength', { min: 0, max: 1, step: 0.05 });

  const turtleFolder = pane.addFolder({ title: 'Turtles' });
  turtleFolder.addInput(params, 'turtleCount', { min: 0, max: 6, step: 1 })
    .on('change', (e) => updateTurtleCount(e.value));
  turtleFolder.addInput(params, 'turtleMaxSpeed', { min: 0.5, max: 4, step: 0.1 });
  turtleFolder.addInput(params, 'turtleSenseRadius', { min: 50, max: 400, step: 10 });
  const handFolder = pane.addFolder({ title: 'Hand Control' });
handFolder.addInput(params, 'handDeadZone', { min: 5, max: 60, step: 1 });
}

function updateFishCount(newCount) {
  while (fishies.length < newCount) {
    fishies.push(new Fish(random(width), random(height), random(6, 10)));
  }
  while (fishies.length > newCount) {
    fishies.pop();
  }
}

function updateTurtleCount(newCount) {
  while (turtles.length < newCount) {
    turtles.push(new Turtle(random(width), random(height)));
  }
  while (turtles.length > newCount) {
    turtles.pop();
  }
}

// ===== KEY HANDLERS =====
function keyPressed() {
  if (key === 't' || key === 'T') {
    paneVisible = !paneVisible;
    pane.element.style.display = paneVisible ? 'block' : 'none';
  }
  if (key === ' ') {
    startHop();
  }
  if (key === 'r' || key === 'R') {
    if (gameWon) {
      restartGame();
    }
  }
  if (key === 'h' || key === 'H') {
    handControlOn = !handControlOn;
  }
}

function restartGame() {
  gameWon = false;
  duckHealth = maxHealth;
  scrollY = 0;
  duck.x = width / 2 - 56;
  duck.y = height - 180;
  duck.state = 'walking';
  duck.hopHeight = 0;
  duck.vy = 0;
  duckSurface = 'grass';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cols = floor(width / FIELD_SIZE);
  rows = floor(height / FIELD_SIZE);
  flowField = [];
  for (let i = 0; i < cols * rows; i++) {
    flowField.push(createVector(0, 0));
  }
  duck.x = constrain(duck.x, 0, width - duck.w);
  duck.y = constrain(duck.y, 0, height - duck.h);
}

// ===== DRAW =====
function draw() {
  background(20, 80, 160);

  updateFlowField();
  if (invincible) {
  invincibleTimer = invincibleTimer - 1;
  if (invincibleTimer <= 0) {
    invincible = false;
  }
}
  
  for (let f of fishies) {
    f.follow(flowField);
    f.reappear();
    f.update();
    f.display();
  }
  
  for (let tt of turtles) {
    tt.hunt(duck);
    tt.reappear();
    tt.update();
    tt.display();
  }
  
  drawWater(); 
  
  // splash particles
  for (let i = splashes.length - 1; i >= 0; i--) {
    splashes[i].update();
    splashes[i].display();
    if (splashes[i].isDone()) {
      splashes.splice(i, 1);
    }
  }
  
  handleKeyboard();
  handleHandControl(); 
  updateDuck();
  checkTurtleHits();
checkLilyPadHeal();
  checkWin();
  
  let newSurface = getDuckSurface();
  if (newSurface !== duckSurface) {
    if (newSurface === 'water' || duckSurface === 'water') {
      let isHeal = newSurface === 'lilypad' || duckSurface === 'lilypad';
      makeSplash(duck.x + duck.w / 2, duck.y + duck.h, isHeal);
    }
    
    if (newSurface === 'water' && (duckSurface === 'grass' || duckSurface === 'lilypad')) {
      startHop();
    }
    
    duckSurface = newSurface;
  }

  push();
  translate(0, scrollY);
  drawGround();      
  drawHome();
  for (let lp of lilyPads) {
    lp.display();
  }
  pop();

  drawDuck();
  drawHearts();
  if (gameWon) {
  drawWinScreen();
}
  drawHandControlUI();
  t += 0.01; 
}

// ===== WATER =====
function drawWater() {
  for (let y = 0; y < height + 100; y += 40) {
    noFill();
    stroke(60, 130, 200, 100);
    strokeWeight(3);
    
    beginShape();
    for (let x = 0; x <= width; x += 10) {
      let wave = sin(x * 0.02 + t * params.waveSpeed + y * 0.05) * params.waveAmplitudeBig;
      let drawY = (y + scrollY * 0.2) % (height + 100);
      vertex(x, drawY + wave);
    }
    endShape();
  }
  for (let y = 0; y < height + 100; y += 25) {
    noFill();
    stroke(150, 210, 240, 130);
    strokeWeight(2);
    
    beginShape();
    for (let x = 0; x <= width; x += 8) {
      let wave = sin(x * 0.04 + t * (params.waveSpeed * 2) + y * 0.1) * params.waveAmplitudeSmall;
      let wobble = noise(x * 0.02, y * 0.02, t * 0.5) * 4;
      let drawY = (y + scrollY * 0.4) % (height + 100);
      vertex(x, drawY + wave + wobble);
    }
    endShape();
  }
  for (let i = 0; i < params.sparkleCount; i++) {
    let sx = (noise(i, t * 0.3) * width);
    let sy = (noise(i + 100, t * 0.3) * height + scrollY * 0.5) % height;
    let twinkle = sin(t * 4 + i) * 0.5 + 0.5;
    
    fill(255, 255, 255, twinkle * 200);
    noStroke();
    ellipse(sx, sy, 3, 1.5);
  }
}

// ===== GROUND / HOME =====
function drawGround() {
  fill(100, 180, 60);
  noStroke();
  rect(0, height - 60, width, 60);
}
function drawHome() {
  let hx = width / 2;
  
  // grass starts at the water edge
  let grassTopY = height - 60 - totalScroll - 200 + 170;
  
  // house sits 300px above the water edge (deeper into grass)
  let houseY = grassTopY - 300;

  // BIG GRASS LANDING ZONE - rooted at the water edge so water doesn't shrink
  fill(120, 190, 80);
  noStroke();
  rect(0, grassTopY - 1500, width, 1530);
  
  // grass blade textures
  stroke(90, 160, 60);
  strokeWeight(1.5);
  for (let i = 0; i < 80; i++) {
    let gx = (i * 53 + 17) % width;
    let gy = grassTopY - ((i * 71) % 800) - 20;
    line(gx, gy, gx - 2, gy - 5);
    line(gx, gy, gx + 2, gy - 5);
  }
  
  // small bushes scattered
  noStroke();
  for (let i = 0; i < 6; i++) {
    let bx = 80 + i * (width - 160) / 5;
    let by = grassTopY - 70 - (i % 2) * 40;
    fill(70, 140, 60);
    ellipse(bx, by, 40, 25);
    fill(90, 170, 75);
    ellipse(bx - 5, by - 5, 30, 18);
  }

  // little flowers
  for (let i = 0; i < 20; i++) {
    let fx = (i * 89 + 30) % width;
    let fy = grassTopY - 70 - ((i * 101) % 700);
    let fcol = i % 3;
    if (fcol === 0) fill(255, 130, 160);
    else if (fcol === 1) fill(255, 230, 100);
    else fill(200, 150, 230);
    
    ellipse(fx - 3, fy, 4, 4);
    ellipse(fx + 3, fy, 4, 4);
    ellipse(fx, fy - 3, 4, 4);
    ellipse(fx, fy + 3, 4, 4);
    fill(255, 240, 80);
    ellipse(fx, fy, 3, 3);
  }

  // PATH from water edge up to house door
  for (let i = 0; i < 8; i++) {
    let py = grassTopY - 20 - i * 35;
    fill(200, 190, 170);
    stroke(150, 140, 120);
    strokeWeight(1.5);
    ellipse(hx, py, 28, 16);
  }

  // ===== COZY COTTAGE - drawn at houseY =====
  // ground shadow
  noStroke();
  fill(0, 50);
  ellipse(hx, houseY + 200, 220, 25);

  // house body
  fill(255, 220, 170);
  stroke(120, 80, 50);
  strokeWeight(3);
  rect(hx - 80, houseY + 60, 160, 130);

  // round window
  fill(140, 200, 230);
  stroke(120, 80, 50);
  strokeWeight(3);
  ellipse(hx, houseY + 100, 50, 50);
  
  strokeWeight(2);
  line(hx - 25, houseY + 100, hx + 25, houseY + 100);
  line(hx, houseY + 75, hx, houseY + 125);

  noStroke();
  fill(255, 255, 255, 150);
  ellipse(hx - 8, houseY + 92, 12, 8);

  // DOOR
  fill(150, 90, 50);
  stroke(80, 50, 25);
  strokeWeight(3);
  rect(hx - 18, houseY + 150, 36, 40);
  arc(hx, houseY + 150, 36, 30, PI, TWO_PI);
  
  noStroke();
  fill(255, 220, 100);
  ellipse(hx + 11, houseY + 168, 4, 4);

  stroke(80, 50, 25);
  strokeWeight(1);
  line(hx - 6, houseY + 145, hx - 6, houseY + 190);
  line(hx + 6, houseY + 145, hx + 6, houseY + 190);

  // ROOF
  noStroke();
  fill(160, 80, 60);
  triangle(hx - 95, houseY + 60, hx, houseY - 10, hx + 95, houseY + 60);
  
  fill(120, 60, 45);
  triangle(hx - 95, houseY + 60, hx - 80, houseY + 60, hx - 50, houseY + 25);

  stroke(70, 35, 25);
  strokeWeight(3);
  noFill();
  triangle(hx - 95, houseY + 60, hx, houseY - 10, hx + 95, houseY + 60);

  // CHIMNEY
  noStroke();
  fill(150, 90, 70);
  rect(hx + 35, houseY - 5, 16, 30);
  fill(100, 60, 50);
  rect(hx + 33, houseY - 9, 20, 6);
  
  // smoke
  fill(240, 240, 240, 200);
  ellipse(hx + 43, houseY - 15 + sin(t * 2) * 2, 12, 12);
  fill(245, 245, 245, 150);
  ellipse(hx + 48 + sin(t * 1.3) * 3, houseY - 35 + sin(t * 2.2) * 2, 16, 16);
  fill(250, 250, 250, 100);
  ellipse(hx + 53 + sin(t) * 4, houseY - 55, 20, 20);

  // heart on door
  noStroke();
  fill(220, 80, 100);
  ellipse(hx - 4, houseY + 168, 5, 5);
  ellipse(hx + 4, houseY + 168, 5, 5);
  triangle(hx - 7, houseY + 169, hx + 7, houseY + 169, hx, houseY + 175);

  // TREES around house
  drawCuteTree(hx - 160, houseY + 130, 1);
  drawCuteTree(hx + 160, houseY + 140, 0.9);
  drawCuteTree(hx - 240, houseY + 110, 1.1);
  drawCuteTree(hx + 230, houseY + 100, 0.95);
  drawCuteTree(hx - 320, houseY + 150, 0.85);
  drawCuteTree(hx + 310, houseY + 160, 1.05);
}

function drawCuteTree(tx, ty, scl) {
  push();
  translate(tx, ty);
  scale(scl);
  
  // trunk
  noStroke();
  fill(110, 70, 40);
  rect(-6, 0, 12, 35);
  
  // leaves - puffy bubble shape
  fill(60, 130, 50);
  ellipse(0, -5, 60, 55);
  
  fill(85, 160, 65);
  ellipse(-10, -15, 35, 30);
  ellipse(12, -10, 30, 28);
  ellipse(0, -25, 25, 22);
  
  // little highlight
  fill(120, 200, 90);
  ellipse(-8, -22, 10, 8);
  
  pop();
}

// ===== DUCK CONTROL =====
function handleKeyboard() {
  duck.moving = false;

  if (duck.state === 'hopping') {
    updateHop();
    return;
  }

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    duck.x = max(0, duck.x - params.duckSpeed);
    duck.dir = 'side';
    duckFacingRight = false;
    duck.moving = true;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    duck.x = min(width - duck.w, duck.x + params.duckSpeed);
    duck.dir = 'side';
    duckFacingRight = true;
    duck.moving = true;
  }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
    duck.dir = 'forward';
    duck.moving = true;
    if (duck.y > lockY) {
      duck.y -= params.duckSpeed;
    } else {
      if (scrollY < totalScroll) {
        scrollY += params.duckSpeed;
      } else {
        duck.y = max(0, duck.y - params.duckSpeed);
      }
    }
  }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
    duck.dir = 'back';
    duck.moving = true;
    if (scrollY > 0) {
      scrollY -= params.duckSpeed;
    } else {
      duck.y = min(height - duck.h, duck.y + params.duckSpeed);
    }
  }
}

function startHop() {
  if (duck.state !== 'walking') return;
  duck.state = 'hopping';
  duck.vy = -8;
  duck.hopHeight = 0;
  duck.dir = 'forward';
}

function updateHop() {
  let gravity = 0.5;
  duck.vy += gravity;
  duck.hopHeight += duck.vy;

  if (scrollY < totalScroll) {
    scrollY += 4;
  } else {
    duck.y = max(0, duck.y - 4);
  }

  if (duck.hopHeight >= 0) {
    duck.hopHeight = 0;
    duck.vy = 0;
    duck.state = 'walking';
  }
}

function updateDuck() {
  if (duck.moving || duck.state === 'hopping') {
    duck.frameCount++;
    let speed = duck.state === 'hopping' ? 6 : 10;
    if (duck.frameCount % speed === 0) duck.frame++;
  } else {
    duck.frame = 0;
    duck.frameCount = 0;
  }
}

function getDuckSurface() {
  if (!duck) return 'grass';
  
  let dx = duck.x + duck.w / 2;
  let dyBottom = duck.y + duck.h;
  
  for (let lp of lilyPads) {
    if (lp.isDuckOver(duck)) return 'lilypad';
  }
  
  // bottom grass strip
  let groundScreenY = (height - 60) + scrollY;
  if (dyBottom > groundScreenY) return 'grass';
  
  // home grass area - now BIG (everything above the home grass line is grass)
  let homeGrassY = (height - 60 - totalScroll - 200 + 170) + scrollY;
  if (dyBottom < homeGrassY + 30) return 'grass';
  
  return 'water';
}

function drawDuck() {
  // flicker when invincible - skip drawing every other frame
  if (invincible && frameCount % 6 < 3) {
    return;
  }
  
  let img, sx, sw, sh, sy = 0;
  const f = duck.frame;

  if (duck.state === 'hopping') {
    img = duckFly;
    sx = 0;
    sy = (f % 5) * 595;
    sw = 748;
    sh = 595;
  }
  else if (duck.dir === 'forward')   { img = duckForward; sx = (f % 11) * 278; sw = 278; sh = 332; }
  else if (duck.dir === 'back')      { img = duckBack;    sx = ((f % 12) + 1) * 276; sw = 276; sh = 332; }
  else                                { img = duckSide;    sx = (f % 10) * 296; sw = 296; sh = 332; }

  let drawY = duck.y + duck.hopHeight;

  if (duck.dir === 'side' && duck.state !== 'hopping') {
    push();
    const dW = sw * 0.5, dH = sh * 0.5;
    translate(duck.x + dW / 2, drawY + dH / 2);
    scale(duckFacingRight ? 1 : -1, 1);
    image(img, -dW / 2, -dH / 2, dW, dH, sx, sy, sw, sh);
    pop();
  } else {
    if (duck.state === 'hopping') {
      let scaleFactor = 0.30;
      let displayW = sw * scaleFactor;
      let displayH = sh * scaleFactor;
      let normalW = 278 * 0.5;
      let normalH = 332 * 0.5;
      let offsetX = (normalW - displayW) / 2;
      let offsetY = (normalH - displayH) / 2;
      image(img, duck.x + offsetX, drawY + offsetY, displayW, displayH, sx, sy, sw, sh);
    } else {
      image(img, duck.x, drawY, sw * 0.5, sh * 0.5, sx, sy, sw, sh);
    }
  }
}

// ===== FLOW FIELD =====
function updateFlowField() {
  let yoff = 0;
  for (let y = 0; y < rows; y++) {
    let xoff = 0;
    for (let x = 0; x < cols; x++) {
      let angle = noise(xoff, yoff, t * params.flowChangeSpeed) * TWO_PI * 2;
      let v = p5.Vector.fromAngle(angle);
      v.setMag(params.flowStrength);
      let index = x + y * cols;
      flowField[index] = v;
      xoff += 0.1;
    }
    yoff += 0.1;
  }
}

// ===== FISH CLASS =====
class Fish {
  constructor(x, y, size) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(-1, 1));
    this.acc = createVector(0, 0);
    this.size = size;
    this.mass = 1;
    this.angle = 0;
    this.maxSpeed = params.fishMaxSpeed;
    this.maxSteerForce = 0.1;
    this.color = color(random([
      [255, 140, 80],
      [220, 100, 100],
      [255, 220, 100],
      [180, 220, 255]
    ]));
  }

  follow(field) {
    let x = floor(this.pos.x / FIELD_SIZE);
    let y = floor(this.pos.y / FIELD_SIZE);
    x = constrain(x, 0, cols - 1);
    y = constrain(y, 0, rows - 1);
    let index = x + y * cols;
    let force = field[index];

    let desired = force.copy();
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxSteerForce);
    this.applyForce(steer);
  }

  reappear() {
    if (this.pos.x < 0) this.pos.x = width;
    else if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    else if (this.pos.y > height) this.pos.y = 0;
  }

  applyForce(f) {
    let force = p5.Vector.div(f, this.mass);
    this.acc.add(force);
  }

  update() {
    this.maxSpeed = params.fishMaxSpeed;
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.angle = this.vel.heading();
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), 160);
    ellipse(0, 0, params.fishSize * 2, params.fishSize);
    
    let tailWag = sin(t * 8 + this.pos.x * 0.1) * 3;
    fill(red(this.color), green(this.color), blue(this.color), 140);
    triangle(
      -params.fishSize, 0,
      -params.fishSize - 6, -3 + tailWag,
      -params.fishSize - 6, 3 + tailWag
    );
    
    fill(0, 180);
    ellipse(params.fishSize * 0.5, -1, 1.5, 1.5);
    
    pop();
  }
}
class Turtle extends Fish { 
  constructor(x, y) {
    super(x, y, 20);
    this.maxSpeed = params.turtleMaxSpeed;
    this.maxSteerForce = 0.05;
    this.senseRadius = params.turtleSenseRadius;
    this.color = color(60, 110, 70);
    this.wanderAngle = random(TWO_PI);
  }

  hunt(duck) {
  this.maxSpeed = params.turtleMaxSpeed;
  this.senseRadius = params.turtleSenseRadius;

  // avoid lily pads
  for (let lp of lilyPads) {
    let lpScreenPos = createVector(lp.x, lp.worldY + scrollY);
    this.avoid(lpScreenPos, lp.size * 0.9);
  }

 
  let bottomGrassY = (height - 60) + scrollY;
  if (this.pos.y > bottomGrassY - 130) {
    let pushUp = createVector(0, -1);
    pushUp.mult(this.maxSpeed);
    let steer = p5.Vector.sub(pushUp, this.vel);
    steer.limit(this.maxSteerForce * 5);
    this.applyForce(steer);
  }

  
  let homeGrassY = (height - 60 - totalScroll - 200 + 170) + scrollY;
  if (this.pos.y < homeGrassY + 130 && this.pos.y > homeGrassY - 100) {
    let pushDown = createVector(0, 1);
    pushDown.mult(this.maxSpeed);
    let steer = p5.Vector.sub(pushDown, this.vel);
    steer.limit(this.maxSteerForce * 5);
    this.applyForce(steer);
  }


  let duckPos = createVector(duck.x + duck.w / 2, duck.y + duck.h / 2);
  let distance = p5.Vector.dist(this.pos, duckPos);

  let duckSafe = false;
  for (let lp of lilyPads) {
    if (lp.isDuckOver(duck)) {
      duckSafe = true;
      break;
    }
  }

  if (distance < this.senseRadius && !duckSafe) {
    this.seek(duckPos);
  } else {
    this.wander();
  }
}

  seek(targetPos) {
    let desired = p5.Vector.sub(targetPos, this.pos);
    desired.normalize();
    desired.mult(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxSteerForce);
    this.applyForce(steer);
  }

  avoid(targetPos, radius) {
    let desired = p5.Vector.sub(targetPos, this.pos);
    let distance = desired.mag();
    
    if (distance < radius) {
      desired.normalize();
      desired.mult(this.maxSpeed);
      desired.mult(-1);
      
      let steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxSteerForce * 3);
      this.applyForce(steer);
    }
  }

  wander() {
    let desired = this.vel.copy();
    if (desired.mag() < 0.1) desired = p5.Vector.fromAngle(random(TWO_PI));
    desired.normalize();
    desired.rotate((random(-1, 1) * PI) / 4);
    desired.mult(this.maxSpeed * 0.5);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxSteerForce);
    this.applyForce(steer);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    noStroke();
    fill(0, 50);
    ellipse(0, 4, 50, 38);

    fill(this.color);
    ellipse(0, 0, 46, 34);

    fill(40, 80, 50);
    ellipse(-8, -4, 10, 9);
    ellipse(8, -4, 10, 9);
    ellipse(0, 4, 10, 9);
    ellipse(-10, 6, 8, 7);
    ellipse(10, 6, 8, 7);

    fill(90, 140, 90);
    ellipse(20, 0, 14, 12);

    fill(0);
    ellipse(23, -2, 2, 2);

    fill(80, 130, 80);
    triangle(-23, 0, -28, -3, -28, 3);

    let paddle = sin(t * 6) * 3;
    fill(90, 140, 90);
    ellipse(-10, -16 + paddle, 9, 7);
    ellipse(10, -16 - paddle, 9, 7);
    ellipse(-10, 16 - paddle, 9, 7);
    ellipse(10, 16 + paddle, 9, 7);

    let duckPos = createVector(duck.x + duck.w / 2, duck.y + duck.h / 2);
    let distToDuck = p5.Vector.dist(this.pos, duckPos);
    if (distToDuck < this.senseRadius) {
      noFill();
      stroke(255, 80, 80, 100);
      strokeWeight(2);
      ellipse(0, 0, 60 + sin(t * 8) * 6);
    }

    pop();
  }

  hitsDuck(duck) {
    let duckPos = createVector(duck.x + duck.w / 2, duck.y + duck.h / 2);
    return p5.Vector.dist(this.pos, duckPos) < 30;
  }
}

// ===== LILY PAD CLASS =====
class LilyPad {
  constructor(x, worldY) {
    this.x = x;
    this.worldY = worldY;
    this.size = 180;
    this.bobOffset = random(TWO_PI);
  }

  display() {
    let bob = sin(t * 1.5 + this.bobOffset) * 4;
    let drawY = this.worldY + bob;

    push();
    translate(this.x, drawY);

    noStroke();
    fill(0, 40);
    ellipse(0, 6, this.size * 1.1, this.size * 0.4);

    fill(70, 130, 50);
    ellipse(0, 0, this.size, this.size * 0.7);

    fill(110, 170, 70);
    ellipse(0, -2, this.size * 0.85, this.size * 0.55);

    fill(20, 80, 160);
    triangle(0, 0, this.size * 0.45, -this.size * 0.1, this.size * 0.45, this.size * 0.1);

    fill(255, 200, 220);
    ellipse(-this.size * 0.15, -this.size * 0.1, 14, 10);
    fill(255, 230, 240);
    ellipse(-this.size * 0.15, -this.size * 0.1, 6, 4);

    pop();
  }

  isDuckOver(duck) {
    let bob = sin(t * 1.5 + this.bobOffset) * 4;
    let drawY = this.worldY + bob + scrollY;
    let d = dist(duck.x + duck.w / 2, duck.y + duck.h / 2, this.x, drawY);
    return d < this.size * 0.5;
  }
}

// ===== SPLASH PARTICLE =====
class SplashParticle {
  constructor(x, y, isHealSplash = false) {
    this.pos = createVector(x, y);
    
    // FAN OUTWARD - angle is mostly upward but spread sideways
    // narrower angle range = more directional/swoosh
    let angle = random(-PI * 0.85, -PI * 0.15);  // upward arc, not full circle
    let speed = random(4, 9);  // faster = more dramatic swoosh
    this.vel = p5.Vector.fromAngle(angle).mult(speed);
    
    this.acc = createVector(0, 0);
    this.lifespan = 255;
    this.size = random(3, 7);
    this.length = random(8, 16);  // how stretched out the droplet is
    this.isHeal = isHealSplash;
  }

  applyForce(f) {
    this.acc.add(f);
  }

  update() {
    let gravity = createVector(0, 0.4); // bit stronger so it falls quick
    this.applyForce(gravity);
    
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
    
    this.lifespan -= 5;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // rotate to face direction of motion - this is what gives it the swoosh
    let angle = this.vel.heading();
    rotate(angle);
    
    noStroke();
    if (this.isHeal) {
      fill(180, 255, 200, this.lifespan);
    } else {
      fill(180, 220, 255, this.lifespan);
    }
    
    ellipse(0, 0, this.length, this.size);

    if (this.isHeal) {
      fill(220, 255, 220, this.lifespan * 0.8);
    } else {
      fill(230, 245, 255, this.lifespan * 0.8);
    }
    ellipse(this.length * 0.3, 0, this.size * 0.7, this.size * 0.5);
    
    pop();
  }

  isDone() {
    return this.lifespan <= 0;
  }
}

function checkTurtleHits() {
  if (invincible) return;
  
  // duck is safe on grass or lily pad - turtles can't hit
  if (duckSurface === 'grass' || duckSurface === 'lilypad') return;
  
  for (let i = 0; i < turtles.length; i++) {
    if (turtles[i].hitsDuck(duck)) {
      duckHealth = duckHealth - 1;
      invincible = true;
      invincibleTimer = 60;
      break;
    }
  }
}

function checkLilyPadHeal() {
  if (duckSurface === 'lilypad') {
    healTimer = healTimer + 1;
    
    // every 90 frames (about 1.5 seconds), gain a heart
    if (healTimer > 90 && duckHealth < maxHealth) {
      duckHealth = duckHealth + 1;
      healTimer = 0;
      // green sparkle splash to show heal!
      makeSplash(duck.x + duck.w / 2, duck.y + duck.h / 2, true);
    }
  } else {
    healTimer = 0; // reset if not on lily pad
  }
}


function drawHearts() {
  for (let i = 0; i < maxHealth; i++) {
    let x = 20 + i * 40;
    let y = 30;
    
    if (i < duckHealth) {
      fill(220, 50, 80); // red filled heart
    } else {
      fill(80, 80, 80, 150); // grey empty heart
    }
    
    noStroke();
    // simple heart shape from 2 circles + triangle
    ellipse(x - 7, y, 16, 16);
    ellipse(x + 7, y, 16, 16);
    triangle(x - 14, y + 4, x + 14, y + 4, x, y + 18);
  }
}

function makeSplash(x, y, isHeal = false) {
  for (let i = 0; i < 15; i++) {
    splashes.push(new SplashParticle(x, y, isHeal));
  }
}

function checkWin() {
  if (gameWon) return;
  
  // house is at houseY = grassTopY - 300, where grassTopY = (height - 60 - totalScroll - 200 + 170)
  // duck wins when it gets close to the house's center on screen
  let grassTopY = (height - 60 - totalScroll - 200 + 170) + scrollY;
  let houseY = grassTopY - 300;
  let houseCenterX = width / 2;
  let houseCenterY = houseY + 100;
  
  let dx = duck.x + duck.w / 2;
  let dy = duck.y + duck.h / 2;
  
  let d = dist(dx, dy, houseCenterX, houseCenterY);
  
  if (d < 100) {
    gameWon = true;
  }
}

function drawWinScreen() {
  // semi-transparent yellow celebration overlay
  fill(255, 240, 100, 180);
  noStroke();
  rect(0, 0, width, height);
  
  // big YAY text - bouncing
  let bounce = sin(t * 4) * 15;
  
  push();
  translate(width / 2, height / 2 + bounce);
  
  // shadow
  fill(0, 100);
  textAlign(CENTER, CENTER);
  textSize(180);
  textStyle(BOLD);
  text('YAY!', 6, 6);
  
  // main yay text - rainbow-ish using sin
  fill(255, 100 + sin(t * 3) * 50, 50);
  text('YAY!', 0, 0);
  
  pop();
  
  // subtitle
  push();
  translate(width / 2, height / 2 + 130);
  fill(80, 50, 30);
  textAlign(CENTER, CENTER);
  textSize(36);
  textStyle(NORMAL);
  text('Duckie made it home!', 0, 0);
  
  textSize(20);
  fill(120, 80, 60);
  text('Press R to play again', 0, 50);
  pop();
  
  // confetti particles using sin/cos
  for (let i = 0; i < 40; i++) {
    let cx = (i * 87 + t * 50) % width;
    let cy = ((t * 80 + i * 40) % (height + 100)) - 50;
    let cs = sin(t * 5 + i) * 0.5 + 0.5;
    
    let colorPick = i % 4;
    if (colorPick === 0) fill(255, 100, 130);
    else if (colorPick === 1) fill(100, 200, 255);
    else if (colorPick === 2) fill(255, 220, 80);
    else fill(180, 255, 150);
    
    noStroke();
    push();
    translate(cx, cy);
    rotate(t * 2 + i);
    rect(-5, -5, 10, 10);
    pop();
  }
}

function handleHandControl() {
  if (!handControlOn || !handReady) return;
  if (predictions.length === 0) return;
  
  // throttle to every 4 frames so it doesn't hog cpu
  frameSkip++;
  if (frameSkip % 4 !== 0) return;

  let hand = predictions[0];
  let palm = hand.landmarks[9];
  let wrist = hand.landmarks[0];
  
  let hx = palm[0];
  let hy = palm[1];
  
  let centerX = 80;
  let centerY = 60;
  
  let dx = hx - centerX;
  let dy = hy - centerY;
  
  duck.moving = false;
  if (duck.state === 'hopping') return;

  if (dx < -params.handDeadZone) {
    duck.x = max(0, duck.x - params.duckSpeed);
    duck.dir = 'side';
    duckFacingRight = false;
    duck.moving = true;
  } else if (dx > params.handDeadZone) {
    duck.x = min(width - duck.w, duck.x + params.duckSpeed);
    duck.dir = 'side';
    duckFacingRight = true;
    duck.moving = true;
  }
  
  if (dy < -params.handDeadZone / 2) {
    duck.dir = 'forward';
    duck.moving = true;
    if (duck.y > lockY) {
      duck.y -= params.duckSpeed;
    } else {
      if (scrollY < totalScroll) {
        scrollY += params.duckSpeed;
      } else {
        duck.y = max(0, duck.y - params.duckSpeed);
      }
    }
  } else if (dy > params.handDeadZone / 2) {
    duck.dir = 'back';
    duck.moving = true;
    if (scrollY > 0) {
      scrollY -= params.duckSpeed;
    } else {
      duck.y = min(height - duck.h, duck.y + params.duckSpeed);
    }
  }
  
  // FIST detection - measure how far fingertips are from wrist
  // open hand = big distance, fist = small distance
  let middleTip = hand.landmarks[12];   // middle finger tip
  let fingerToWrist = dist(middleTip[0], middleTip[1], wrist[0], wrist[1]);
  
  // when fingertips close to wrist (fist) → hop
  if (fingerToWrist < 50) {
    startHop();
  }
}
function drawHandControlUI() {
  textFont('monospace');
  textSize(14);
  textAlign(RIGHT, TOP);
  noStroke();
  
  if (handControlOn) {
    if (handReady) {
      fill(100, 220, 100);
      text('HAND CONTROL ON', width - 20, 20);
      
      // camera preview position
      let camX = width - 180;
      let camY = 50;
      let camW = 160;
      let camH = 120;
      
      // camera preview (mirrored)
      push();
      translate(camX + camW, camY);
      tint(255, 200);
      scale(-1, 1);
      image(video, 0, 0, camW, camH);
      pop();
      noTint();
      
      // GRID overlay - 3x3 tic-tac-toe
      stroke(255, 255, 255, 180);
      strokeWeight(1.5);
      // vertical lines
      line(camX + camW/3, camY, camX + camW/3, camY + camH);
      line(camX + 2*camW/3, camY, camX + 2*camW/3, camY + camH);
      // horizontal lines
      line(camX, camY + camH/3, camX + camW, camY + camH/3);
      line(camX, camY + 2*camH/3, camX + camW, camY + 2*camH/3);
      
      // highlight the center "rest zone"
      noFill();
      stroke(100, 255, 100, 200);
      strokeWeight(2);
      rect(camX + camW/3, camY + camH/3, camW/3, camH/3);
      
      // arrows in each outer cell
      noStroke();
      fill(255, 255, 255, 150);
      textSize(16);
      textAlign(CENTER, CENTER);
      text('↑', camX + camW/2, camY + camH/6);
      text('↓', camX + camW/2, camY + 5*camH/6);
      text('←', camX + camW/6, camY + camH/2);
      text('→', camX + 5*camW/6, camY + camH/2);
      
      // border around preview
      noFill();
      stroke(100, 220, 100);
      strokeWeight(2);
      rect(camX, camY, camW, camH);
      
      // dot showing hand position
      if (predictions.length > 0) {
        let palm = predictions[0].landmarks[9];
        let dotX = camX + (camW - palm[0]);  // mirrored
        let dotY = camY + palm[1];
        fill(255, 255, 100);
        noStroke();
        ellipse(dotX, dotY, 14, 14);
        // outline
        stroke(0);
        strokeWeight(1.5);
        noFill();
        ellipse(dotX, dotY, 14, 14);
      }
      
      // helper text below
      noStroke();
      fill(255);
      textSize(11);
      textAlign(RIGHT, TOP);
      text('keep hand in green box = no move', width - 20, camY + camH + 8);
      text('move hand to grid edge = direction', width - 20, camY + camH + 22);
      text('make a FIST = hop', width - 20, camY + camH + 36);
    } else {
      fill(255, 200, 100);
      text('Loading hand model...', width - 20, 20);
    }
  } else {
    fill(150);
    text('Press H for hand control', width - 20, 20);
  }
}