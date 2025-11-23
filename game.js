// mancalaJS by aquarock
// TODO curry go again moves into one gameMove so they can be undone together

Pocket = (index, count, home) => ({ index, count, home });

const SANDRED = new Color(0.78, 0.28, 0.03),
	SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63),
	SANDORANGE = new Color(0.97, 0.6, 0.22);
const INITMARBLECOUNT = 4,
	MARBLECOLOR = SANDRED,
	MARBLESIZE = 0.35;
const POCKETPOS = vec2(-10.4, -2.25),
	POCKETSIZE = vec2(2.6);
const BOARDWIDTH = 8,
	BOARDHEIGHT = 2;
const BUTTONPOS = screenToWorld(vec2(-310, -155)),
	BUTTONSIZE = 1.25;
const PLAYERA = "playerA",
	PLAYERB = "playerB";
const MULTIPLAYER = false;

let gameMoves = [];
let gameInfo = [];
let currentPlayer = PLAYERB;
let cpuDelay = new Timer(1);
let gameOver = false;
let animatingMarbles = [];
let animationSpeed = 0.15;
let captureAnimation = null;

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 1.5;
	initBoard();
}

const playerHome = (player) => (player === PLAYERA ? 0 : 7);

function pocketsEmpty() {
	const state = getBoardState();
	for (const pocket of state) {
		if (pocket && !pocket.home && pocket.count > 0) {
			return false;
		}
	}
	return true;
}

const isMouseOverValidPocket = (pocketPos) =>
	mousePos.distance(pocketPos.value) < POCKETSIZE.x / 2 &&
	((pocketPos.index > 7 && currentPlayer === PLAYERA) || (pocketPos.index < 7 && currentPlayer === PLAYERB)) &&
	pocketPos.index > 0 &&
	pocketPos.index !== 7 &&
	pocketPos.index !== 16;

const rewindButton = () => gameMoves.length > 2 && mousePos.distance(BUTTONPOS) < POCKETSIZE.x / 2;

function gameUpdate() {
	if (pocketsEmpty() && !gameOver) {
		gameOver = true;
		state = getBoardState();
		let currentPlayer = PLAYERA;
		alert(state[0].count < state[7].count ? "YOU WIN" : "YOU LOSE");
	}
	if (gameOver && mouseWasPressed(0) && rewindButton()) {
		gameOver = false;
		initBoard();
	}
	if (gameOver) return;
	updateRegularMarbleAnimations();
	updateCaptureAnimation();
	if (animatingMarbles.length > 0 || captureAnimation) return;
	if (cpuDelay.elapsed() && currentPlayer === PLAYERA && !MULTIPLAYER) {
		let movesAvaliable = false;
		state = getBoardState();
		for (let i = 8; i < 14; i++) if (state[i].count > 0) movesAvaliable = true;
		if (!movesAvaliable) {
			currentPlayer = currentPlayer === PLAYERA ? PLAYERB : PLAYERA;
			return;
		}
		cpuTurn(PLAYERA);
		cpuDelay.set(1);
	} else {
		let movesAvaliable = false;
		state = getBoardState();
		for (let i = 1; i < 7; i++) if (state[i].count > 0) movesAvaliable = true;
		if (!movesAvaliable) {
			currentPlayer = currentPlayer === PLAYERA ? PLAYERB : PLAYERA;
			return;
		}
	}
	if (!mouseWasPressed(0)) return;
	if (rewindButton()) {
		gameMoves = gameMoves.slice(0, -1);
		gameInfo = gameInfo.slice(0, -1);
	} else {
		if (currentPlayer === PLAYERB) for (const pos of getPocketPos()) if (isMouseOverValidPocket(pos)) playTurn(pos);
		cpuDelay.set(1);
	}
}

function playTurn(pos) {
	let pocket = getPocketAt(pos);
	if (pocket.count === 0) return null;
	startMarbleAnimation(pocket, currentPlayer, pos.index);
}

function cpuTurn(player) {
	if (player !== currentPlayer) return;
	const state = getBoardState();
	const isPlayerA = player === PLAYERA;
	const startIndex = isPlayerA ? 8 : 1;
	const endIndex = isPlayerA ? 15 : 6;
	let bestMove = null,
		bestScore = -1;
	for (let i = startIndex; i <= endIndex; i++) {
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
		if (targetPos) playTurn(targetPos);
	}
}

// ==================== board logic ====================
const getPocketAt = (location) =>
	typeof location === "object" ? getBoardState()[location.index] : getBoardState()[location];
const getOppositePocket = (pocket) => getBoardState()[pocket.index < 7 ? -pocket.index + 14 : -(pocket.index - 14)];
const getOppositeIndex = (index) => (index < 7 ? -index + 14 : -(index - 14));
const moveMarbles = function* (state, move) {
	for (let i = 0; i < BOARDHEIGHT * BOARDWIDTH - 2; i++) yield move(i, state[i], state);
};
function getBoardState() {
	const calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return gameMoves.reduce(calcBoard, []);
}

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
}

// ==================== animations ====================

// add marbles to the animatingMarbles list
function startMarbleAnimation(pocket, player, startingPocketIndex) {
	const positions = getPocketPos();
	const startPos = positions.find((p) => p.index === startingPocketIndex);
	const marbleCount = pocket.count;
	const path = [];
	let currentIndex = startingPocketIndex;
	for (let i = 0; i < marbleCount; i++) {
		currentIndex = (currentIndex + 1) % 14;
		if ((player === PLAYERA && currentIndex === 7) || (player === PLAYERB && currentIndex === 0)) {
			currentIndex = (currentIndex + 1) % 14;
		}
		path.push(currentIndex);
	}
	for (let i = 0; i < marbleCount; i++) {
		const marblePath = path.slice(i);
		animatingMarbles.push({
			currentPos: startPos.value.copy(),
			targetIndex: marblePath[0],
			path: marblePath,
			pathIndex: 0,
			progress: 0,
			marbleIndex: i,
			startingIndex: startingPocketIndex,
		});
	}
}

function updateSingleMarble(marble, positions) {
	marble.progress += timeDelta / animationSpeed;
	if (marble.progress >= 1) {
		marble.pathIndex++;
		if (marble.pathIndex < marble.path.length) {
			marble.targetIndex = marble.path[marble.pathIndex];
			marble.progress = 0;
			return false;
		}
		return true;
	}
	return false;
}

function updateMarblePosition(marble, positions) {
	if (marble.pathIndex < marble.path.length) {
		const targetPos = positions.find((p) => p.index === marble.path[marble.pathIndex]);
		if (targetPos) {
			const currentPos =
				marble.pathIndex > 0
					? positions.find((p) => p.index === marble.path[marble.pathIndex - 1])?.value
					: positions.find((p) => p.index === marble.startingIndex)?.value;
			if (currentPos) {
				marble.currentPos = currentPos.lerp(targetPos.value, marble.progress);
			}
		}
	}
}

function updateRegularMarbleAnimations() {
	if (animatingMarbles.length === 0) return;
	const positions = getPocketPos();
	let allComplete = true;
	for (const marble of animatingMarbles) {
		const isComplete = updateSingleMarble(marble, positions);
		if (!isComplete) {
			allComplete = false;
		}
		updateMarblePosition(marble, positions);
	}
	if (allComplete) completeMarbleAnimation();
}

function completeMarbleAnimation() {
	const firstMarble = animatingMarbles[0];
	const pocket = getPocketAt(firstMarble.startingIndex);
	const moveResult = playMove(pocket, currentPlayer, firstMarble.startingIndex);
	gameInfo.push(moveResult);
	animatingMarbles = [];
	if (moveResult.captureCount > 0) {
		startCaptureAnimation(moveResult, currentPlayer);
	} else if (!moveResult.goAgain) {
		currentPlayer = currentPlayer === PLAYERA ? PLAYERB : PLAYERA;
	}
}

function updateCaptureAnimation() {
	if (!captureAnimation) return;
	captureAnimation.progress += timeDelta / animationSpeed;
	if (captureAnimation.progress >= 1) {
		captureAnimation = null;
		if (gameInfo.length > 0 && !gameInfo[gameInfo.length - 1].goAgain) {
			currentPlayer = currentPlayer === PLAYERA ? PLAYERB : PLAYERA;
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
	const oppositeIndex = getOppositeIndex(finalPocketIndex);
	const oppositePos = positions.find((p) => p.index === oppositeIndex);
	const homePos = positions.find((p) => p.index === playerHome(player));
	if (oppositePos && homePos) {
		captureAnimation = {
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

function drawMarbles(pos, count, pocketIndex) {
	const getOffset = (i) =>
		i < 7
			? vec2(0).setAngle(1 + (Math.PI / 3) * i, i === 0 ? 0 : MARBLESIZE * 1.25)
			: vec2(0).setAngle((Math.PI / 6) * i, MARBLESIZE * 2.5);
	let marblesToSkip = 0;
	for (const marble of animatingMarbles) {
		if (marble.startingIndex === pocketIndex && marble.pathIndex === 0) {
			marblesToSkip++;
		}
	}
	for (let i = 0; i < count - marblesToSkip; i++) drawCircle(pos.add(getOffset(i)), MARBLESIZE, MARBLECOLOR);
}

function drawAnimatingMarbles() {
	for (const marble of animatingMarbles) {
		drawCircle(marble.currentPos, MARBLESIZE, MARBLECOLOR);
	}
	if (captureAnimation) {
		const currentPos = captureAnimation.fromPos.lerp(captureAnimation.toPos, captureAnimation.progress);
		const getCaptureOffset = (i) => {
			if (i === 0) return vec2(0, 0);
			const angle = (Math.PI * 2 * i) / captureAnimation.marbleCount;
			return vec2(0).setAngle(angle, MARBLESIZE * 2.2);
		};
		for (let i = 0; i < captureAnimation.marbleCount; i++) {
			drawCircle(currentPos.add(getCaptureOffset(i)), MARBLESIZE, MARBLECOLOR);
		}
	}
}

function drawBackground() {
	drawRect(vec2(0), vec2(32), SANDLIGHTBROWN);
	drawRect(vec2(0, 0.25), vec2(32, 7), SANDRED);
	drawRect(vec2(0, -2.425), vec2(32, 0.05), BLACK);
}

function drawButton() {
	const isHovered = BUTTONPOS.distance(mousePos) < BUTTONSIZE / 2;
	drawCircle(BUTTONPOS, BUTTONSIZE, BLACK);
	drawCircle(BUTTONPOS, isHovered ? BUTTONSIZE - 0.2 : BUTTONSIZE, SANDRED);
	drawTextScreen("\u20D4", worldToScreen(BUTTONPOS.add(vec2(0.35, -0.5))), 32, BLACK);
}

function gameRender() {
	const state = getBoardState();
	const positions = getPocketPos();
	drawBackground();
	drawButton();
	for (const pos of positions) {
		if (pos.index < 0) continue;
		const pocket = getPocketAt(pos);
		if (pocket.index === 0 || pocket.index === 7) drawHomePocket(pos, pocket.count);
		else {
			if (isMouseOverValidPocket(pos) && !gameOver) drawCircle(pos.value, 2.5, BLACK);
			drawCircle(pos.value, 2.3, SANDORANGE);
		}
		drawMarbles(pos.value, pocket.count, pos.index);
	}
}
function postGameRender() {
	drawAnimatingMarbles();
	if (gameInfo.length > 0 && gameInfo[gameInfo.length - 1].goAgain && currentPlayer === PLAYERB && !gameOver) {
		drawTextScreen("GO AGAIN!", vec2(320, 35), 36, SANDRED, 2, BLACK);
	}
	const rulesText =
		"Click a pocket to place marbles counter-clockwise. \nCapture if last marble lands in an empty pocket. \nGo again if last marble lands in your home.";
	drawTextScreen(rulesText, vec2(320, 320), 18, BLACK, 0.5);
}
