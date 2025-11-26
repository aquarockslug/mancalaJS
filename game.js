// mancalaJS by aquarock

Pocket = (index, count, home) => ({ index, count, home });

const SANDRED = new Color(0.78, 0.28, 0.03),
	SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63),
	SANDORANGE = new Color(0.97, 0.6, 0.22);
const INITMARBLECOUNT = 4,
	MARBLECOLOR = SANDRED,
	MARBLESIZE = 0.35;
const POCKETPOS = vec2(-10.4, -2.65),
	POCKETSIZE = vec2(2.6);
const BOARDWIDTH = 8,
	BOARDHEIGHT = 2;
const BUTTONPOS = screenToWorld(vec2(-310, -155)),
	BUTTONSIZE = 1.25;
const CPUPLAYER = "cpu player",
	PLAYER = "player";

let gameMoves = [];
let gameInfo = [];
let currentPlayer = PLAYER;
let cpuDelay = new Timer(1.5);
let gameOver = false;
let animationSpeed = 0.15;
let movingMarbles = null;
let capturedMarbles = null;

const marbleDropSound = new Sound([0.1, , 200, 0.01, 0.01, 0.05, 1, 1.5, , , , , , 0.3, , , , 0.6, 0.05, 0.1, 300]);
const marblePickupSound = new Sound([0.12, , 150, 0.01, 0.01, 0.04, 2, 1, , , , , , 0.4, , , , 0.5, 0.08, 0.08, 400]);
const captureSound = new Sound([0.15, , 100, 0.01, 0.01, 0.08, 3, 1.8, , , , , , 0.6, , , , 0.7, 0.1, 0.15, 500]);
const goAgainSound = new Sound([0.14, , 300, 0.01, 0.01, 0.06, 2, 2, , , , , , 0.7, , , , 0.6, 0.08, 0.12, 600]);
const winSound = new Sound([0.2, , 400, 0.02, 0.02, 0.15, 4, 2.5, , , , , , 0.8, , , , 0.8, 0.15, 0.2, 800]);
const loseSound = new Sound([0.12, , 80, 0.02, 0.02, 0.2, 1, 0.8, , , , , , 0.2, , , , 0.4, 0.2, 0.25, 200]);
const buttonClickSound = new Sound([0.08, , 250, 0.01, 0.01, 0.02, 1, 0.8, , , , , , 0.3, , , , 0.3, 0.04, 0.05, 350]);

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 3;
	initBoard();
	winSound.play();
}

const rewindButton = () => gameMoves.length > 2 && mousePos.distance(BUTTONPOS) < POCKETSIZE.x / 2;
const pocketsEmpty = (player = null) => {
	const state = getBoardState();
	if (player === null) {
		return !state.find((pocket) => pocket && !pocket.home && pocket.count > 0);
	} else if (player === PLAYER) {
		return !state.find((pocket) => pocket && !pocket.home && pocket.index > 0 && pocket.index < 7 && pocket.count > 0);
	} else if (player === CPUPLAYER) {
		return !state.find((pocket) => pocket && !pocket.home && pocket.index > 7 && pocket.index < 14 && pocket.count > 0);
	}
	return false;
};
const isMouseOverValidPocket = (pocketPos) =>
	mousePos.distance(pocketPos.value) < POCKETSIZE.x / 2 &&
	((pocketPos.index > 7 && currentPlayer === CPUPLAYER) || (pocketPos.index < 7 && currentPlayer === PLAYER)) &&
	pocketPos.index > 0 &&
	pocketPos.index !== 7 &&
	pocketPos.index !== 16;

function gameUpdate() {
	if (pocketsEmpty() && !gameOver) {
		gameOver = true;
		const state = getBoardState();
		let currentPlayer = CPUPLAYER;
		const playerScore = state[7].count;
		const cpuScore = state[0].count;
		const won = playerScore > cpuScore;
		if (won) winSound.play();
		else loseSound.play();
		alert(won ? `YOU WIN! Score: ${playerScore}` : `YOU LOSE! Score: ${playerScore}`);
	}
	if (gameOver) {
		if (mouseWasPressed(0) && rewindButton()) {
			gameOver = false;
			initBoard();
		}
		return;
	}

	updateMovingMarbles();
	updateCaptureAnimation();
	if (movingMarbles || capturedMarbles) return;

	const state = getBoardState();
	if (cpuDelay.elapsed() && currentPlayer === CPUPLAYER) {
		if (pocketsEmpty(CPUPLAYER)) {
			currentPlayer = PLAYER;
		} else {
			playTurn(findTurn(CPUPLAYER));
			cpuDelay.set(1.5);
		}
		return;
	}

	if (mouseWasPressed(0) && currentPlayer === PLAYER) {
		if (rewindButton()) {
			buttonClickSound.play();
			[gameMoves, gameInfo] = [gameMoves.slice(0, -1), gameInfo.slice(0, -1)];
		} else {
			for (const pos of getPocketPos()) if (isMouseOverValidPocket(pos)) playTurn(pos);
			cpuDelay.set(1.5);
		}
	}
}

function playTurn(pos) {
	let pocket = getPocketAt(pos);
	if (pocket.count === 0) return null;
	marblePickupSound.play();
	movingMarbles = getMarbleAnimation(pocket, currentPlayer, pos.index);
}

function findTurn(player) {
	if (player !== currentPlayer) return;
	const state = getBoardState();
	let bestMove = null,
		bestScore = -1;
	for (let i = 8; i <= 15; i++) {
		if (state[i] && state[i].count > 0) {
			const pocket = state[i];
			const finalPocketIndex = (pocket.count + pocket.index) % 14;
			const finalPocket = state[finalPocketIndex];
			let score = 0;
			if (finalPocket.home) score += 10;
			if (finalPocket.count === 0 && !finalPocket.home) {
				const oppositePocket = state[getOppositeIndex(finalPocketIndex)];
				if (oppositePocket && oppositePocket.count > 0) score += oppositePocket.count;
			}
			score += Math.random() * 0.5;
			if (score > bestScore) {
				bestScore = score;
				bestMove = i;
			}
		}
	}
	if (bestMove !== null) {
		const positions = getPocketPos();
		const targetPos = positions.find((pos) => pos.index === bestMove);
		if (targetPos) return targetPos;
	}
}

// ==================== board logic ====================
const getBoardState = () => gameMoves.reduce((acc, curr) => Array.from(moveMarbles(acc, curr)), []);
const getPocketAt = (location) =>
	typeof location === "object" ? getBoardState()[location.index] : getBoardState()[location];
const playerHome = (player) => (player === CPUPLAYER ? 0 : 7);
const getOppositePocket = (pocket) => getBoardState()[pocket.index < 7 ? -pocket.index + 14 : -(pocket.index - 14)];
const getOppositeIndex = (index) => (index < 7 ? -index + 14 : -(index - 14));
const moveMarbles = function* (state, move) {
	for (let i = 0; i < BOARDHEIGHT * BOARDWIDTH - 2; i++) yield move(i, state[i], state);
};

function playMove(pocket, player, startingPocketIndex) {
	let finalPocket = getPocketAt((pocket.count + pocket.index) % 14);
	let doCapture = finalPocket.count === 0 && !finalPocket.home;
	const move = (i, p, state) => {
		const start = state[startingPocketIndex];
		const crossing = start.index % 15 > (start.index + start.count) % 14;
		const shouldUpdate =
			(i >= start.index && i <= start.index + start.count) || (crossing && i <= (start.index + start.count) % 14);
		return shouldUpdate ? Pocket(i, i === start.index ? 0 : p.count + 1, p.home) : Pocket(i, p.count, p.home);
	};
	gameMoves.push(move);
	if (!doCapture) return { captureCount: 0, goAgain: finalPocket.home };
	let targetPocket = getOppositePocket(finalPocket);
	gameMoves.pop();
	const removeMarbles = (p) => (p.index === targetPocket.index ? Pocket(p.index, 0, p.home) : p);
	const addMarbles = (p) =>
		playerHome(player) === p.index ? Pocket(p.index, p.count + targetPocket.count, p.home) : p;
	gameMoves.push((i, p, state) => addMarbles(removeMarbles(move(i, p, state))));
	return { captureCount: targetPocket.count, goAgain: finalPocket.home };
}

function initBoard() {
	gameMoves = [
		(i, _) => Pocket(i, null, false),
		(i, m) => (m?.index === 0 || m?.index === 7 ? Pocket(i, 0, true) : Pocket(i, INITMARBLECOUNT, false)),
	];
	currentPlayer = PLAYER;
	gameInfo = [
		{ captureCount: 0, goAgain: false },
		{ captureCount: 0, goAgain: false },
	];
}

// ==================== animations ====================

function getMarbleAnimation(pocket, player, startingPocketIndex) {
	const startPos = getPocketPos().find((p) => p.index === startingPocketIndex);
	const path = [];
	let currentIndex = startingPocketIndex;
	for (let i = 0; i < pocket.count; i++) {
		currentIndex = (currentIndex + 1) % 14;
		if ((player === CPUPLAYER && currentIndex === 7) || (player === PLAYER && currentIndex === 0))
			currentIndex = (currentIndex + 1) % 14;
		path.push(currentIndex);
	}
	return {
		currentPos: startPos.value.copy(),
		targetIndex: path[0],
		path,
		pathIndex: 0,
		progress: 0,
		marbleCount: pocket.count,
		startingIndex: startingPocketIndex,
	};
}

function updateMovingMarbles() {
	if (!movingMarbles) return;
	let isComplete = false;
	movingMarbles.progress += timeDelta / animationSpeed;
	if (movingMarbles.progress >= 1) {
		movingMarbles.pathIndex++;
		// reset the progress if not at the target position
		if (movingMarbles.pathIndex < movingMarbles.path.length) {
			movingMarbles.targetIndex = movingMarbles.path[movingMarbles.pathIndex];
			movingMarbles.progress = 0;
			isComplete = false;
		} else isComplete = true;
	}
	isComplete ? completeMarbleAnimation() : updateMarbleAnimation();
}

function updateMarbleAnimation(marble) {
	if (movingMarbles.pathIndex < movingMarbles.path.length) {
		const targetPos = getPocketPos().find((p) => p.index === movingMarbles.path[movingMarbles.pathIndex]);
		if (targetPos) {
			const currentPos =
				movingMarbles.pathIndex > 0
					? getPocketPos().find((p) => p.index === movingMarbles.path[movingMarbles.pathIndex - 1])?.value
					: getPocketPos().find((p) => p.index === movingMarbles.startingIndex)?.value;
			if (currentPos) movingMarbles.currentPos = currentPos.lerp(targetPos.value, movingMarbles.progress);
		}
	}
}

// actually play the move after the animation has completed
function completeMarbleAnimation() {
	const pocket = getPocketAt(movingMarbles.startingIndex);
	const moveResult = playMove(pocket, currentPlayer, movingMarbles.startingIndex);
	movingMarbles = null;
	gameInfo.push(moveResult);
	marbleDropSound.play();
	if (moveResult.captureCount > 0) {
		captureSound.play();
		startCaptureAnimation(moveResult, currentPlayer);
	} else if (moveResult.goAgain) {
		goAgainSound.play();
	} else {
		currentPlayer = currentPlayer === CPUPLAYER ? PLAYER : CPUPLAYER;
	}
}

function updateCaptureAnimation() {
	if (!capturedMarbles) return;
	capturedMarbles.progress += timeDelta / animationSpeed;
	if (capturedMarbles.progress >= 1) {
		capturedMarbles = null;
		marbleDropSound.play();
		if (gameInfo.length > 0 && !gameInfo[gameInfo.length - 1].goAgain) {
			currentPlayer = currentPlayer === CPUPLAYER ? PLAYER : CPUPLAYER;
		}
	}
}

function startCaptureAnimation(moveResult, player) {
	const positions = getPocketPos();
	const state = getBoardState();
	const lastMove = gameMoves[gameMoves.length - 1];
	let finalPocketIndex = -1;
	for (let i = 0; i < 14; i++) {
		const pocket = state[i];
		if (pocket && !pocket.home && pocket.count === 1) {
			finalPocketIndex = i;
			break;
		}
	}
	if (finalPocketIndex === -1) return;
	const oppositePos = positions.find((p) => p.index === getOppositeIndex(finalPocketIndex));
	const homePos = positions.find((p) => p.index === playerHome(player));
	if (oppositePos && homePos) {
		capturedMarbles = {
			fromPos: oppositePos.value.copy(),
			toPos: homePos.value.add(vec2(0, 1.625)),
			progress: 0,
			marbleCount: moveResult.captureCount,
		};
	}
}

// ==================== rendering ====================

function getPocketPos() {
	const positions = [];
	let i = 0;
	for (let x = 0.5; x <= BOARDWIDTH; x++) {
		i++;
		positions.push({ index: i - 1, value: vec2(x, 0.55).multiply(POCKETSIZE).add(POCKETPOS) });
	}
	for (let x = BOARDWIDTH - 0.5; x >= 0; x--) {
		i++;
		const pocketIndex = i === 9 || i === 16 ? -1 : i - 2;
		positions.push({ index: pocketIndex, value: vec2(x, 1.7).multiply(POCKETSIZE).add(POCKETPOS) });
	}
	return positions;
}

function drawHomePocket(pos, count) {
	const center = pos.value.add(vec2(0, 1.625));
	if (playerHome(currentPlayer) === pos.index) {
		drawCircle(pos.value, 2.6, BLACK);
		drawCircle(pos.value.add(vec2(0, 3)), 2.6, BLACK);
		drawRect(center, vec2(2.6, 3), BLACK);
	}
	drawCircle(pos.value, 2.4, SANDORANGE);
	drawCircle(pos.value.add(vec2(0, 3)), 2.4, SANDORANGE);
	drawRect(center, vec2(2.4, 3), SANDORANGE);
	drawTextScreen(String(count), worldToScreen(center), 32, SANDORANGE, 2, BLACK);
}

function drawMarbles(pos, count) {
	const getOffset = (i) =>
		i < 7
			? vec2(0).setAngle(1 + (Math.PI / 3) * i, i === 0 ? 0 : MARBLESIZE * 1.25)
			: vec2(0).setAngle((Math.PI / 6) * i, MARBLESIZE * 2.5);
	for (let i = 0; i < count; i++) {
		const marblePos = pos.add(getOffset(i));
		drawCircle(marblePos.add(vec2(0.02, 0.02)), MARBLESIZE, new Color(0.4, 0.15, 0.02));
		drawCircle(marblePos, MARBLESIZE, MARBLECOLOR);
		drawCircle(marblePos.add(vec2(-0.08, -0.08)), MARBLESIZE * 0.3, new Color(0.95, 0.7, 0.4));
	}
}

function drawMovingMarbles() {
	if (movingMarbles) drawMarbles(movingMarbles.currentPos, movingMarbles.marbleCount);
	if (capturedMarbles) {
		const currentPos = capturedMarbles.fromPos.lerp(capturedMarbles.toPos, capturedMarbles.progress);
		const getCaptureOffset = (i) => {
			if (i === 0) return vec2(0, 0);
			const angle = (Math.PI * 2 * i) / capturedMarbles.marbleCount;
			return vec2(0).setAngle(angle, MARBLESIZE * 2.2);
		};
		for (let i = 0; i < capturedMarbles.marbleCount; i++) {
			const marblePos = currentPos.add(getCaptureOffset(i));
			drawCircle(marblePos.add(vec2(0.02, 0.02)), MARBLESIZE, new Color(0.4, 0.15, 0.02));
			drawCircle(marblePos, MARBLESIZE, MARBLECOLOR);
			drawCircle(marblePos.add(vec2(-0.08, -0.08)), MARBLESIZE * 0.3, new Color(0.95, 0.7, 0.4));
		}
	}
}

function drawBackground() {
	drawRect(vec2(0, 0), vec2(32), SANDLIGHTBROWN);
	// sides
	drawRect(vec2(-11, 0.15), vec2(1.2, 7), new Color(0.55, 0.18, 0.02));
	drawRect(vec2(-11.1, 0.15), vec2(0.3, 7), new Color(0.4, 0.12, 0.01));
	drawRect(vec2(11, 0.15), vec2(1.2, 7), new Color(0.55, 0.18, 0.02));
	drawRect(vec2(11.1, 0.15), vec2(0.3, 7), new Color(0.4, 0.12, 0.01));
	// main board
	drawRect(vec2(0, 0.15), vec2(21.5, 7), SANDRED);
	drawRect(vec2(0, 0.25), vec2(21.5, 6.75), new Color(0.82, 0.32, 0.07));
	// top edge
	drawRect(vec2(0, 3.4), vec2(21.5, 0.4), new Color(0.65, 0.22, 0.04));
	drawRect(vec2(0, 3.5), vec2(21.5, 0.2), new Color(0.72, 0.28, 0.06));
	// bottom edge
	drawRect(vec2(0, -2.9), vec2(21.5, 0.4), new Color(0.65, 0.22, 0.04));
	drawRect(vec2(0, -3), vec2(21.5, 0.2), new Color(0.72, 0.28, 0.06));
}

function drawButton() {
	const isHovered = BUTTONPOS.distance(mousePos) < BUTTONSIZE / 2;
	drawCircle(BUTTONPOS.add(vec2(0.05, -0.05)), BUTTONSIZE, new Color(0.3, 0.1, 0.01));
	drawCircle(BUTTONPOS, BUTTONSIZE, BLACK);
	drawCircle(BUTTONPOS, isHovered ? BUTTONSIZE - 0.1 : BUTTONSIZE, SANDRED);
	drawTextScreen("\u20D4", worldToScreen(BUTTONPOS.add(vec2(0.35, -0.5))), 32, BLACK);
}

function gameRender() {
	drawBackground();
	const state = getBoardState();
	const positions = getPocketPos();
	for (const pos of positions) {
		if (pos.index < 0) continue;
		const pocket = getPocketAt(pos);
		if (pocket.index === 0 || pocket.index === 7) drawHomePocket(pos, pocket.count);
		else {
			if (isMouseOverValidPocket(pos) && !gameOver) drawCircle(pos.value, 2.5, BLACK);
			drawCircle(pos.value, 2.3, SANDORANGE);
		}

		drawMarbles(pos.value, pocket.count);
	}
}
function postGameRender() {
	drawMovingMarbles();
	drawButton();
	if (gameInfo.length > 0 && gameInfo[gameInfo.length - 1].goAgain && currentPlayer === PLAYER && !gameOver)
		drawTextScreen("GO AGAIN!", vec2(320, 35), 36, SANDRED, 2, BLACK);
	const rulesText =
		"Click a pocket to place marbles counter-clockwise. \nCapture if last marble lands in an empty pocket. \nGo again if last marble lands in your home.";
	drawTextScreen(rulesText, vec2(320, 320), 18, BLACK, 0.5);
}
