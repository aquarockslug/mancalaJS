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
let cpuDelay = new Timer(1.5);
let gameOver = false;
let animatingMarbles = [];
let animationSpeed = 0.15;
let captureAnimation = null;
let highScore = localStorage.getItem("mancalaHighScore") || 0;

// sound effects
marbleDropSound = new Sound([0.1, , 200, 0.01, 0.01, 0.05, 1, 1.5, , , , , , 0.3, , , , 0.6, 0.05, 0.1, 300]);
marblePickupSound = new Sound([0.12, , 150, 0.01, 0.01, 0.04, 2, 1, , , , , , 0.4, , , , 0.5, 0.08, 0.08, 400]);
captureSound = new Sound([0.15, , 100, 0.01, 0.01, 0.08, 3, 1.8, , , , , , 0.6, , , , 0.7, 0.1, 0.15, 500]);
goAgainSound = new Sound([0.14, , 300, 0.01, 0.01, 0.06, 2, 2, , , , , , 0.7, , , , 0.6, 0.08, 0.12, 600]);
winSound = new Sound([0.2, , 400, 0.02, 0.02, 0.15, 4, 2.5, , , , , , 0.8, , , , 0.8, 0.15, 0.2, 800]);
loseSound = new Sound([0.12, , 80, 0.02, 0.02, 0.2, 1, 0.8, , , , , , 0.2, , , , 0.4, 0.2, 0.25, 200]);
buttonClickSound = new Sound([0.08, , 250, 0.01, 0.01, 0.02, 1, 0.8, , , , , , 0.3, , , , 0.3, 0.04, 0.05, 350]);
hoverSound = new Sound([0.05, , 600, 0.005, 0.005, 0.01, 0.5, 0.4, , , , , , 0.2, , , , 0.2, 0.02, 0.04, 700]);
let lastHoveredPocket = -1;

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 1.5;
	initBoard();
	winSound.play();
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
		const playerScore = state[7].count;
		const cpuScore = state[0].count;
		const won = playerScore > cpuScore;
		if (won) winSound.play();
		else loseSound.play();
		if (won && playerScore > highScore) {
			highScore = playerScore;
			localStorage.setItem("mancalaHighScore", highScore);
			alert(`NEW HIGH SCORE! You win with ${playerScore} marbles!`);
		} else {
			alert(won ? `YOU WIN! Score: ${playerScore}` : `YOU LOSE! Score: ${playerScore}`);
		}
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
		cpuDelay.set(1.5);
	} else {
		let movesAvaliable = false;
		state = getBoardState();
		for (let i = 1; i < 7; i++) if (state[i].count > 0) movesAvaliable = true;
		if (!movesAvaliable) {
			currentPlayer = currentPlayer === PLAYERA ? PLAYERB : PLAYERA;
			return;
		}
	}
	// check for hover sound
	let currentHoveredPocket = -1;
	if (currentPlayer === PLAYERB && !gameOver) {
		for (const pos of getPocketPos()) {
			if (isMouseOverValidPocket(pos)) {
				currentHoveredPocket = pos.index;
				break;
			}
		}
	}
	if (currentHoveredPocket !== lastHoveredPocket && currentHoveredPocket !== -1) {
		hoverSound.play();
		lastHoveredPocket = currentHoveredPocket;
	} else if (currentHoveredPocket === -1) {
		lastHoveredPocket = -1;
	}
	if (!mouseWasPressed(0)) return;
	if (rewindButton()) {
		buttonClickSound.play();
		gameMoves = gameMoves.slice(0, -1);
		gameInfo = gameInfo.slice(0, -1);
	} else {
		if (currentPlayer === PLAYERB) for (const pos of getPocketPos()) if (isMouseOverValidPocket(pos)) playTurn(pos);
		cpuDelay.set(1.5);
	}
}

function playTurn(pos) {
	let pocket = getPocketAt(pos);
	if (pocket.count === 0) return null;
	marblePickupSound.play();
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
	currentPlayer = PLAYERB;
	gameInfo[({ captureCount: 0, goAgain: false }, { captureCount: 0, goAgain: false })];
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
	// Create a single animation group for all marbles
	animatingMarbles.push({
		currentPos: startPos.value.copy(),
		targetIndex: path[0],
		path: path,
		pathIndex: 0,
		progress: 0,
		marbleCount: marbleCount,
		startingIndex: startingPocketIndex,
	});
}

function updateSingleMarble(marble, positions) {
	// If this is the marble's final destination, stop it at the pocket center
	if (marble.pathIndex === marble.path.length - 1) {
		const finalPos = positions.find((p) => p.index === marble.path[marble.pathIndex]);
		if (finalPos) {
			marble.currentPos = finalPos.value;
		}
		return true;
	}

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
	marbleDropSound.play();
	if (moveResult.captureCount > 0) {
		captureSound.play();
		startCaptureAnimation(moveResult, currentPlayer);
	} else if (moveResult.goAgain) {
		goAgainSound.play();
	} else {
		currentPlayer = currentPlayer === PLAYERA ? PLAYERB : PLAYERA;
	}
}

function updateCaptureAnimation() {
	if (!captureAnimation) return;
	captureAnimation.progress += timeDelta / animationSpeed;
	if (captureAnimation.progress >= 1) {
		captureAnimation = null;
		marbleDropSound.play();
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
			marblesToSkip += marble.marbleCount;
		}
	}
	for (let i = 0; i < count - marblesToSkip; i++) {
		const marblePos = pos.add(getOffset(i));
		// Draw shadow for 3D effect
		drawCircle(marblePos.add(vec2(0.02, 0.02)), MARBLESIZE, new Color(0.4, 0.15, 0.02));
		// Draw main marble
		drawCircle(marblePos, MARBLESIZE, MARBLECOLOR);
		// Add highlight for 3D appearance
		drawCircle(marblePos.add(vec2(-0.08, -0.08)), MARBLESIZE * 0.3, new Color(0.95, 0.7, 0.4));
	}
}

function drawAnimatingMarbles() {
	for (const marble of animatingMarbles) {
		// Draw multiple marbles together as a group
		const getOffset = (i) => {
			if (marble.marbleCount === 1) return vec2(0, 0);
			if (i < 7) return vec2(0).setAngle(1 + (Math.PI / 3) * i, i === 0 ? 0 : MARBLESIZE * 1.25);
			return vec2(0).setAngle((Math.PI / 6) * i, MARBLESIZE * 2.5);
		};
		for (let i = 0; i < marble.marbleCount; i++) {
			const marblePos = marble.currentPos.add(getOffset(i));
			// Draw shadow for 3D effect
			drawCircle(marblePos.add(vec2(0.02, 0.02)), MARBLESIZE, new Color(0.4, 0.15, 0.02));
			// Draw main marble
			drawCircle(marblePos, MARBLESIZE, MARBLECOLOR);
			// Add highlight for 3D appearance
			drawCircle(marblePos.add(vec2(-0.08, -0.08)), MARBLESIZE * 0.3, new Color(0.95, 0.7, 0.4));
		}
	}
	if (captureAnimation) {
		const currentPos = captureAnimation.fromPos.lerp(captureAnimation.toPos, captureAnimation.progress);
		const getCaptureOffset = (i) => {
			if (i === 0) return vec2(0, 0);
			const angle = (Math.PI * 2 * i) / captureAnimation.marbleCount;
			return vec2(0).setAngle(angle, MARBLESIZE * 2.2);
		};
		for (let i = 0; i < captureAnimation.marbleCount; i++) {
			const marblePos = currentPos.add(getCaptureOffset(i));
			// Draw shadow for 3D effect
			drawCircle(marblePos.add(vec2(0.02, 0.02)), MARBLESIZE, new Color(0.4, 0.15, 0.02));
			// Draw main marble
			drawCircle(marblePos, MARBLESIZE, MARBLECOLOR);
			// Add highlight for 3D appearance
			drawCircle(marblePos.add(vec2(-0.08, -0.08)), MARBLESIZE * 0.3, new Color(0.95, 0.7, 0.4));
		}
	}
}

function drawBackground() {
	// Draw base board with depth
	drawRect(vec2(0, -0.3), vec2(32), SANDLIGHTBROWN);

	// Draw main board surface with gradient effect
	drawRect(vec2(0, 0.15), vec2(31.5, 7), SANDRED);
	drawRect(vec2(0, 0.25), vec2(31, 6.75), new Color(0.82, 0.32, 0.07));

	// Add side rails for 3D effect
	drawRect(vec2(-15.75, 0.25), vec2(0.5, 6.3), new Color(0.65, 0.2, 0.02));
	drawRect(vec2(15.75, 0.25), vec2(0.5, 6.3), new Color(0.65, 0.2, 0.02));

	// Draw black border around the board
	drawRect(vec2(0, 0.25), vec2(32, 6.3), BLACK);
	drawRect(vec2(0, 0.25), vec2(31.8, 6.1), SANDRED);
	drawRect(vec2(0, 0.25), vec2(31, 6.3), new Color(0.82, 0.32, 0.07));

	// Draw bottom shadow/edge
	drawRect(vec2(0, -2.35), vec2(32, 0.15), new Color(0.4, 0.15, 0.02));
	drawRect(vec2(0, -2.425), vec2(32, 0.05), BLACK);
}

function drawButton() {
	const isHovered = BUTTONPOS.distance(mousePos) < BUTTONSIZE / 2;
	drawCircle(BUTTONPOS.add(vec2(0.05, -0.05)), BUTTONSIZE, new Color(0.3, 0.1, 0.01));
	drawCircle(BUTTONPOS, BUTTONSIZE, BLACK);
	drawCircle(BUTTONPOS, isHovered ? BUTTONSIZE - 0.1 : BUTTONSIZE, SANDRED);
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
