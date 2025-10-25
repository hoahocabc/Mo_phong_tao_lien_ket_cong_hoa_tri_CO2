let fontRegular;
let playButton, resetButton, instructionsButton, overlapButton, sphereButton, labelButton, spinButton;
let titleDiv, footerDiv, instructionsPopup;
let atoms = [];
let state = "idle";
let progress = 0;
let bondingProgress = 0;
let cloudRotationAngle = 0;
let showLabels = true; // Đặt true để nhãn hiển thị từ đầu
let isSpinning = true; // Đặt true để electron quay từ đầu

let showFixedLights = true; // nếu true thì hiển thị các nguồn sáng cố định (pointLight...), khi sphere bật => false

const slowSpinSpeed = 0.025;
const fastSpinSpeed = 0.15;
const sphereRotationSpeed = 0.02;

const cOuterRadius = 50 + 40;
const oOuterRadius = 50 + 40;
const initialShellGap = 100;
const bondedShellOverlap = 28;
const bondDistance = (cOuterRadius + oOuterRadius) - bondedShellOverlap;

const initialDistance = cOuterRadius + oOuterRadius + initialShellGap;

let panX = 0;
let panY = 0;

function preload() {
    fontRegular = loadFont('https://fonts.gstatic.com/s/opensans/v27/mem8YaGs126MiZpBA-UFVZ0e.ttf');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    background(0);
    perspective(PI / 3, width / height, 0.1, 4000);

    smooth();
    textFont(fontRegular);
    textAlign(CENTER, CENTER);
    noStroke();

    titleDiv = createDiv("MÔ PHỎNG LIÊN KẾT CỘNG HOÁ TRỊ TRONG PHÂN TỬ CO₂");
    titleDiv.style("position", "absolute");
    titleDiv.style("top", "10px");
    titleDiv.style("width", "100%");
    titleDiv.style("text-align", "center");
    titleDiv.style("font-size", "18px");
    titleDiv.style("color", "#fff");
    titleDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
    titleDiv.style("font-family", "Arial");

    footerDiv = createDiv("© HÓA HỌC ABC");
    footerDiv.style("position", "absolute");
    footerDiv.style("bottom", "10px");
    footerDiv.style("width", "100%");
    footerDiv.style("text-align", "center");
    footerDiv.style("font-size", "16px");
    footerDiv.style("color", "#fff");
    footerDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
    footerDiv.style("font-family", "Arial");

    createUI();
    resetSimulation();
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function createUI() {
    playButton = createButton("▶ Play");
    styleButton(playButton);
    playButton.mousePressed(() => {
        if (state === "idle" || state === "sphere_spinning_initial") {
            state = "animating";
        }
    });

    spinButton = createButton("Tắt quay electron");
    styleButton(spinButton);
    spinButton.mousePressed(() => {
        isSpinning = !isSpinning;
        if (isSpinning) {
            spinButton.html("Tắt quay electron");
        } else {
            spinButton.html("Bật quay electron");
        }
    });

    resetButton = createButton("↺ Reset");
    styleButton(resetButton);
    resetButton.mousePressed(() => {
        window.location.reload();
    });

    overlapButton = createButton("Bật xen phủ");
    styleButton(overlapButton);
    overlapButton.mousePressed(() => {
        if (state === "done" || state === "sphere_spinning") {
            state = "overlap_spinning";
            overlapButton.html("Tắt xen phủ");
            sphereButton.html("Bật lớp cầu");
        } else if (state === "overlap_spinning") {
            state = "done";
            overlapButton.html("Bật xen phủ");
        }
    });

    sphereButton = createButton("Bật lớp cầu");
    styleButton(sphereButton);
    sphereButton.mousePressed(() => {
        // Khi bật lớp cầu => tắt các nguồn sáng cố định (showFixedLights = false)
        // Khi tắt lớp cầu => bật lại các nguồn sáng cố định (showFixedLights = true)
        if (state === "done" || state === "overlap_spinning") {
            state = "sphere_spinning";
            sphereButton.html("Tắt lớp cầu");
            overlapButton.html("Bật xen phủ");
            showFixedLights = false;
        } else if (state === "sphere_spinning") {
            state = "done";
            sphereButton.html("Bật lớp cầu");
            showFixedLights = true;
        } else if (state === "idle") {
            state = "sphere_spinning_initial";
            sphereButton.html("Tắt lớp cầu");
            showFixedLights = false;
        } else if (state === "sphere_spinning_initial") {
            state = "idle";
            sphereButton.html("Bật lớp cầu");
            showFixedLights = true;
        }
    });

    labelButton = createButton("Tắt nhãn");
    styleButton(labelButton);
    labelButton.mousePressed(() => {
        showLabels = !showLabels;
        if (showLabels) {
            labelButton.html("Tắt nhãn");
        } else {
            labelButton.html("Bật nhãn");
        }
    });

    instructionsButton = createButton("Hướng dẫn");
    styleButton(instructionsButton, true);
    instructionsButton.mousePressed(() => {
        instructionsPopup.style('display', 'block');
    });

    instructionsPopup = createDiv();
    instructionsPopup.id('instructions-popup');
    instructionsPopup.style('position', 'fixed');
    instructionsPopup.style('top', '50%');
    instructionsPopup.style('left', '50%');
    instructionsPopup.style('transform', 'translate(-50%, -50%)');
    instructionsPopup.style('background-color', 'rgba(0, 0, 0, 0.85)');
    instructionsPopup.style('border-radius', '12px');
    instructionsPopup.style('padding', '20px');
    instructionsPopup.style('color', '#fff');
    instructionsPopup.style('font-family', 'Arial');
    instructionsPopup.style('z-index', '1000');
    instructionsPopup.style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.2)');
    instructionsPopup.style('display', 'none');

    let popupContent = `
        <h2 style="font-size: 24px; margin-bottom: 15px; text-align: center;">Hướng dẫn sử dụng</h2>
        <ul style="list-style-type: none; padding: 0;">
            <li style="margin-bottom: 10px;">• Nhấn nút "**Play**" để bắt đầu quá trình mô phỏng liên kết cộng hóa trị.</li>
            <li style="margin-bottom: 10px;">• Sau khi mô phỏng hoàn tất, bạn có thể sử dụng chuột để xoay và xem mô hình từ các góc khác nhau.</li>
            <li style="margin-bottom: 10px;">• Giữ phím **Ctrl** và kéo chuột trái để di chuyển toàn bộ mô hình trên màn hình.</li>
            <li style="margin-bottom: 10px;">• Sử dụng con lăn chuột để phóng to hoặc thu nhỏ.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "**Reset**" để quay lại trạng thái ban đầu.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "**Bật xen phủ**" để hiển thị đám mây electron liên kết.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "**Bật lớp cầu**" để hiển thị lớp electron hóa trị dưới dạng mặt cầu. Nút này hoạt động ngay cả khi chưa nhấn Play.</li>
            <li style="margin-bottom: 10px;">• Nhấn nút "**Bật nhãn**" để hiển thị/ẩn tên nguyên tử (C, O).</li>
            <li style="margin-bottom: 10px;">• Nhãn "-" của các electron luôn hiển thị.</li>
        </ul>
        <button id="closePopup" style="display: block; width: 100%; padding: 10px; margin-top: 20px; font-size: 16px; border: none; border-radius: 6px; background-color: #36d1dc; color: #fff; cursor: pointer;">Đóng</button>
    `;
    instructionsPopup.html(popupContent);

    document.getElementById('closePopup').addEventListener('click', () => {
        instructionsPopup.style('display', 'none');
    });

    positionButtons();
}

function styleButton(btn, isTransparent = false) {
    btn.style("width", "130px");
    btn.style("height", "30px");
    btn.style("padding", "0px");
    btn.style("font-size", "12px");
    btn.style("border-radius", "6px");
    btn.style("color", "#fff");
    btn.style("cursor", "pointer");
    btn.style("transition", "all 0.2s ease-in-out");
    btn.style("font-family", "Arial");
    btn.style("transform", "scale(1)");

    if (isTransparent) {
        btn.style("background", "rgba(0,0,0,0)");
        btn.style("border", "1px solid #fff");
        btn.style("box-shadow", "none");
    } else {
        btn.style("border", "none");
        btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
        btn.style("box-shadow", "3px 3px 6px rgba(0,0,0,0.4)");

        btn.mouseOver(() => {
            btn.style("background", "linear-gradient(145deg, #fc5c7d, #6a82fb)");
        });
        btn.mouseOut(() => {
            btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
        });
        btn.mousePressed(() => {
            btn.style("background", "linear-gradient(145deg, #8a2be2, #00ffff)");
        });
        btn.mouseReleased(() => {
            btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
        });
    }
}

function positionButtons() {
    playButton.position(20, 20);
    spinButton.position(20, 60);
    overlapButton.position(20, 100);
    sphereButton.position(20, 140);
    labelButton.position(20, 180);
    resetButton.position(20, 220);
    instructionsButton.position(20, 260);
}

function resetSimulation() {
    atoms = [];
    const carbonColor = color(255, 165, 0);
    const oxygenColor1 = color(100, 255, 255);
    const oxygenColor2 = color(100, 255, 255);

    atoms.push(new Atom(-initialDistance, 0, "O", 8, [2, 6], oxygenColor1, cOuterRadius));
    atoms.push(new Atom(0, 0, "C", 6, [2, 4], carbonColor, cOuterRadius));
    atoms.push(new Atom(initialDistance, 0, "O", 8, [2, 6], oxygenColor2, cOuterRadius));

    state = "idle";
    progress = 0;
    bondingProgress = 0;
    cloudRotationAngle = 0;
    panX = 0;
    panY = 0;
    overlapButton.html("Bật xen phủ");
    sphereButton.html("Bật lớp cầu");
    showFixedLights = true; // reset lại để hiển thị nguồn sáng cố định theo mặc định
    if (showLabels) {
        labelButton.html("Tắt nhãn");
    } else {
        labelButton.html("Bật nhãn");
    }
    if (isSpinning) {
        spinButton.html("Tắt quay electron");
    } else {
        spinButton.html("Bật quay electron");
    }
}

function drawBillboardText(textStr, x, y, z, size) {
    push();
    translate(x, y, z);
    textSize(size);
    text(textStr, 0, 0);
    pop();
}

function draw() {
    background(0);

    if (atoms.length < 3 || !atoms[0] || !atoms[1] || !atoms[2]) {
        resetSimulation();
    }

    if (keyIsDown(17) && mouseIsPressed) {
        panX += (mouseX - pmouseX);
        panY += (mouseY - pmouseY);
    } else {
        orbitControl();
    }

    translate(panX, panY);

    // Ambient base luôn có (tăng sáng nhẹ)
    ambientLight(110);

    // Các nguồn sáng cố định (ví dụ pointLight) chỉ hiển thị nếu showFixedLights === true
    if (showFixedLights) {
        // point light phía trên / trước để làm sáng cơ bản khi không bật lớp cầu
        pointLight(255, 255, 255, 0, 0, 300);
        // Thêm một pointLight phụ để tăng độ sáng nền nhẹ nhàng
        pointLight(140, 140, 140, 0, -200, 200);
    }

    if (state === "animating") {
        progress += 0.005;
        let t_move = easeInOutQuad(progress);
        let currentDist = lerp(initialDistance + bondDistance, bondDistance, t_move);

        if (progress >= 1) {
            progress = 1;
            state = "bonding";
        }

        atoms[0].pos.x = -currentDist;
        atoms[1].pos.x = 0;
        atoms[2].pos.x = currentDist;

    } else if (state === "bonding") {
        bondingProgress += 0.02;
        if (bondingProgress >= 1) {
            bondingProgress = 1;
            state = "done";
        }
        atoms[0].pos.x = -bondDistance;
        atoms[1].pos.x = 0;
        atoms[2].pos.x = bondDistance;

    } else if (state === "idle" || state === "sphere_spinning_initial") {
        atoms[0].pos.x = -(initialDistance + bondDistance);
        atoms[1].pos.x = 0;
        atoms[2].pos.x = (initialDistance + bondDistance);
    } else {
        atoms[0].pos.x = -bondDistance;
        atoms[1].pos.x = 0;
        atoms[2].pos.x = bondDistance;
    }

    for (let atom of atoms) {
        push();
        translate(atom.pos.x, atom.pos.y, 0);
        atom.show();
        pop();
    }

    if (state === "overlap_spinning") {
        drawElectronClouds();
        cloudRotationAngle += fastSpinSpeed;
    } else if (state === "sphere_spinning" || state === "sphere_spinning_initial") {
        drawElectronSpheres();
        cloudRotationAngle += sphereRotationSpeed;
    }
}

function drawElectronClouds() {
    if (atoms.length < 3 || !atoms[0] || !atoms[1] || !atoms[2]) return;

    const oOuterRadius = atoms[0].shellRadii[1] - 9;
    const cOuterRadius = atoms[1].shellRadii[1] - 9;
    const cloudWidth = 15;

    const mixedColor = lerpColor(atoms[1].electronCol, atoms[0].electronCol, 0.5);
    mixedColor.setAlpha(255);
    
    noStroke();
    fill(mixedColor);

    push();
    translate(atoms[0].pos.x, 0, 0);
    rotateZ(cloudRotationAngle);
    torus(oOuterRadius, cloudWidth, 12, 12);
    pop();

    push();
    translate(atoms[1].pos.x, 0, 0);
    rotateZ(cloudRotationAngle);
    torus(cOuterRadius, cloudWidth, 12, 12);
    pop();
    
    push();
    translate(atoms[2].pos.x, 0, 0);
    rotateZ(cloudRotationAngle);
    torus(oOuterRadius, cloudWidth, 12, 12);
    pop();
}

function drawElectronSpheres() {
    if (atoms.length < 3 || !atoms[0] || !atoms[1] || !atoms[2]) return;

    // Apply lighting approach learned from File 1:
    // - Slight ambient base (đã đặt trong draw())
    // - Two moving directional lights with dynamic positions (độ sáng đã điều chỉnh nhẹ)
    // - Use ambientMaterial and specularMaterial per-atom so the base color remains consistent

    // TWO MOVING LIGHTS (dynamic highlights) - tăng nhẹ độ sáng so với lần trước
    let aA = frameCount * 0.010;
    let LAx = cos(aA) * 380;
    let LAy = sin(aA) * 240;
    directionalLight(155, 155, 155, LAx, LAy, -0.25); // tăng nhẹ hơn

    let aB = frameCount * 0.018 + PI / 4;
    let LBx = cos(aB) * 210;
    let LBy = sin(aB) * 170;
    directionalLight(115, 115, 115, -LBx, -LBy, 0.2); // tăng nhẹ hơn

    // Higher shininess so highlights are visible but colors remain dominated by ambientMaterial
    shininess(110);

    const cOrbitalRadius = cOuterRadius + 6;
    const oOrbitalRadius = oOuterRadius + 6;
    
    // Lớp cầu Oxygen bên trái
    push();
    translate(atoms[0].pos.x, atoms[0].pos.y, 0);
    rotateY(cloudRotationAngle);
    noStroke();
    // preserve the existing color of the sphere (atoms[0].electronCol)
    const r0 = red(atoms[0].electronCol);
    const g0 = green(atoms[0].electronCol);
    const b0 = blue(atoms[0].electronCol);
    ambientMaterial(r0, g0, b0);
    specularMaterial(min(255, r0 + 45), min(255, g0 + 45), min(255, b0 + 45));
    sphere(oOrbitalRadius, 60, 60);
    pop();

    // Lớp cầu Carbon ở giữa
    push();
    translate(atoms[1].pos.x, atoms[1].pos.y, 0);
    rotateY(cloudRotationAngle);
    noStroke();
    const r1 = red(atoms[1].electronCol);
    const g1 = green(atoms[1].electronCol);
    const b1 = blue(atoms[1].electronCol);
    ambientMaterial(r1, g1, b1);
    specularMaterial(min(255, r1 + 45), min(255, g1 + 45), min(255, b1 + 45));
    sphere(cOrbitalRadius, 60, 60);
    pop();

    // Lớp cầu Oxygen bên phải
    push();
    translate(atoms[2].pos.x, atoms[2].pos.y, 0);
    rotateY(cloudRotationAngle);
    noStroke();
    const r2 = red(atoms[2].electronCol);
    const g2 = green(atoms[2].electronCol);
    const b2 = blue(atoms[2].electronCol);
    ambientMaterial(r2, g2, b2);
    specularMaterial(min(255, r2 + 45), min(255, g2 + 45), min(255, b2 + 45));
    sphere(oOrbitalRadius, 60, 60);
    pop();
}

class Atom {
    constructor(x, y, label, protons, shellCounts, electronCol, otherAtomRadius) {
        this.pos = createVector(x, y, 0);
        this.label = label;
        this.protons = protons;
        this.shells = [];
        this.shellRadii = [];
        this.electronCol = electronCol;

        this.electronSpinSpeeds = [];

        let baseR = 50;
        let increment = 40;

        for (let i = 0; i < shellCounts.length; i++) {
            let radius = baseR + i * increment;
            this.shellRadii.push(radius);
            let shellElectrons = [];
            
            if (this.label === "C" && i === shellCounts.length - 1) {
                for (let j = 0; j < 4; j++) {
                    shellElectrons.push({
                        angle: (TWO_PI / 4) * j,
                        col: this.electronCol,
                        isValence: true,
                        isBonding: true,
                        isLonePair: false,
                        originalAtom: this.label
                    });
                }
            } else if (this.label === "O" && i === shellCounts.length - 1) {
                for (let j = 0; j < 6; j++) {
                    shellElectrons.push({
                        angle: (TWO_PI / 6) * j,
                        col: this.electronCol,
                        isValence: true,
                        isBonding: j >= 4 ? true : false,
                        isLonePair: j < 4 ? true : false,
                        originalAtom: this.label
                    });
                }
            } else {
                for (let j = 0; j < shellCounts[i]; j++) {
                    shellElectrons.push({
                        angle: (TWO_PI / shellCounts[i]) * j,
                        col: this.electronCol,
                        isValence: false,
                        isBonding: false,
                        isLonePair: false,
                        originalAtom: this.label
                    });
                }
            }
            this.shells.push(shellElectrons);
            this.electronSpinSpeeds.push(slowSpinSpeed);
        }
    }

    show() {
        push();
        noStroke();
        fill(255, 0, 0);
        sphere(20);
        
        fill(255, 255, 0);
        textSize(16);
        let xOffset = 0;
        if (this.pos.x < 0) {
            xOffset = 7;
        } else if (this.pos.x > 0) {
            xOffset = -7;
        }
        translate(xOffset, 0, 21);
        text("+" + this.protons, 0, 0);
        pop();
        
        if (showLabels) {
            push();
            let labelOffset = this.shellRadii[this.shells.length - 1] + 30;
            fill(255);
            noStroke();
            textSize(28);
            translate(0, labelOffset, 0);
            text(this.label, 0, 0);
            pop();
        }

        for (let i = 0; i < this.shells.length; i++) {
            let radius = this.shellRadii[i];
            
            if ((state === "overlap_spinning" || state === "sphere_spinning" || state === "sphere_spinning_initial") && i === this.shells.length - 1) {
                continue;
            }
            
            push();
            noFill();
            stroke(255);
            strokeWeight(1);
            drawSmoothCircle(radius);
            pop();
        }
        
        const electronSize = 6;
        const verticalOffset = 12;
        const bondElectronOffset = 12;
        const lonePairDistance = 25;

        for (let i = 0; i < this.shells.length; i++) {
            let radius = this.shellRadii[i];
            
            if (i === this.shells.length - 1 && (state === "overlap_spinning" || state === "sphere_spinning" || state === "sphere_spinning_initial")) {
                continue;
            }
            
            for (let j = 0; j < this.shells[i].length; j++) {
                let e = this.shells[i][j];
                
                push();
                let ex, ey;
                
                let electronColor = this.electronCol;
                
                if (e.isValence && e.isBonding) {
                    if (state === "done" || state === "overlap_spinning" || state === "sphere_spinning") {
                        if (e.originalAtom === "C") {
                            electronColor = atoms[0].electronCol;
                        } else if (e.originalAtom === "O") {
                            electronColor = atoms[1].electronCol;
                        }
                    } else {
                        electronColor = this.electronCol;
                    }
                }
                
                fill(electronColor);
                noStroke();

                if (state === "idle" || state === "animating") {
                    if (isSpinning) {
                        e.angle += slowSpinSpeed;
                    }
                    ex = cos(e.angle) * radius;
                    ey = sin(e.angle) * radius;
                } else if (state === "sphere_spinning_initial") {
                    if (isSpinning) {
                        e.angle += slowSpinSpeed;
                    }
                    ex = cos(e.angle) * radius;
                    ey = sin(e.angle) * radius;
                } else {
                    let t_bonding = easeInOutQuad(bondingProgress);
                    if (e.isValence) {
                        let initialAngle = (TWO_PI / this.shells[i].length) * j;
                        let initialX = cos(initialAngle) * radius;
                        let initialY = sin(initialAngle) * radius;

                        if (this.label === "C") {
                            let finalX, finalY;
                            if (j < 2) {
                                let sharedOffset = (j === 0) ? -verticalOffset : verticalOffset;
                                finalX = -bondDistance / 2 - bondElectronOffset / 2;
                                finalY = sharedOffset;
                            } else {
                                let sharedOffset = (j === 2) ? -verticalOffset : verticalOffset;
                                finalX = bondDistance / 2 + bondElectronOffset / 2;
                                finalY = sharedOffset;
                            }
                            ex = lerp(initialX, finalX, t_bonding);
                            ey = lerp(initialY, finalY, t_bonding);
                        } else if (this.label === "O") {
                            if (e.isLonePair) {
                                let finalX, finalY;
                                let outerRadius = this.shellRadii[1];
                                
                                let angle_top_1 = PI / 2 - asin(lonePairDistance / (2 * outerRadius));
                                let angle_top_2 = PI / 2 + asin(lonePairDistance / (2 * outerRadius));
                                let angle_bottom_1 = 3 * PI / 2 - asin(lonePairDistance / (2 * outerRadius));
                                let angle_bottom_2 = 3 * PI / 2 + asin(lonePairDistance / (2 * outerRadius));

                                if (this.pos.x < 0) {
                                    if (j === 0) {
                                        finalX = -outerRadius * cos(angle_top_1);
                                        finalY = outerRadius * sin(angle_top_1);
                                    } else if (j === 1) {
                                        finalX = -outerRadius * cos(angle_top_2);
                                        finalY = outerRadius * sin(angle_top_2);
                                    } else if (j === 2) {
                                        finalX = -outerRadius * cos(angle_bottom_1);
                                        finalY = outerRadius * sin(angle_bottom_1);
                                    } else if (j === 3) {
                                        finalX = -outerRadius * cos(angle_bottom_2);
                                        finalY = outerRadius * sin(angle_bottom_2);
                                    }
                                } else {
                                    if (j === 0) {
                                        finalX = outerRadius * cos(angle_top_1);
                                        finalY = outerRadius * sin(angle_top_1);
                                    } else if (j === 1) {
                                        finalX = outerRadius * cos(angle_top_2);
                                        finalY = outerRadius * sin(angle_top_2);
                                    } else if (j === 2) {
                                        finalX = outerRadius * cos(angle_bottom_1);
                                        finalY = outerRadius * sin(angle_bottom_1);
                                    } else if (j === 3) {
                                        finalX = outerRadius * cos(angle_bottom_2);
                                        finalY = outerRadius * sin(angle_bottom_2);
                                    }
                                }
                                ex = lerp(initialX, finalX, t_bonding);
                                ey = lerp(initialY, finalY, t_bonding);
                            } else {
                                let finalX, finalY;
                                let sharedOffset = (j === 4) ? -verticalOffset : verticalOffset;
                                if (this.pos.x < 0) {
                                    finalX = bondDistance / 2 + bondElectronOffset / 2;
                                } else {
                                    finalX = -bondDistance / 2 - bondElectronOffset / 2;
                                }
                                finalY = sharedOffset;
                                ex = lerp(initialX, finalX, t_bonding);
                                ey = lerp(initialY, finalY, t_bonding);
                            }
                        }
                    } else {
                        if (isSpinning) {
                            e.angle += this.electronSpinSpeeds[i];
                        }
                        ex = cos(e.angle) * radius;
                        ey = sin(e.angle) * radius;
                    }
                }
                
                translate(ex, ey, 0);
                sphere(electronSize);

                push();
                fill(255);
                noStroke();
                textSize(12);
                translate(0, -electronSize - 4, 0); // Đặt nhãn phía trên electron
                text("-", 0, 0);
                pop();

                pop();
            }
        }
    }
}

function drawSmoothCircle(radius) {
    let numPoints = 200;
    beginShape();
    for (let i = 0; i < numPoints; i++) {
        let angle = map(i, 0, numPoints, 0, TWO_PI);
        let x = radius * cos(angle);
        let y = radius * sin(angle);
        vertex(x, y);
    }
    endShape(CLOSE);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    perspective(PI / 3, windowWidth / windowHeight, 0.1, 4000);
    positionButtons();
}