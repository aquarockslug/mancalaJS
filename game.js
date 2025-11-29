// mancalaJS by aquarock
// gameMoves[] stores move history, gameInfo[] stores turn results, movingMarbles/capturedMarbles handle animations

const MARBLEDROPSOUND = new Sound([0.1, , 200, 0.01, 0.01, 0.05, 1, 1.5, , , , , , 0.3, , , , 0.6, 0.05, 0.1, 300]);
const MARBLEPICKUPSOUND = new Sound([0.12, , 150, 0.01, 0.01, 0.04, 2, 1, , , , , , 0.4, , , , 0.5, 0.08, 0.08, 400]);
const CAPTURESOUND = new Sound([0.15, , 100, 0.01, 0.01, 0.08, 3, 1.8, , , , , , 0.6, , , , 0.7, 0.1, 0.15, 500]);
const GOAGAINSOUND = new Sound([0.14, , 300, 0.01, 0.01, 0.06, 2, 2, , , , , , 0.7, , , , 0.6, 0.08, 0.12, 600]);
const WINSOUND = new Sound([0.2, , 400, 0.02, 0.02, 0.15, 4, 2.5, , , , , , 0.8, , , , 0.8, 0.15, 0.2, 800]);
const LOSESOUND = new Sound([0.12, , 80, 0.02, 0.02, 0.2, 1, 0.8, , , , , , 0.2, , , , 0.4, 0.2, 0.25, 200]);
const BUTTONCLICKSOUND = new Sound([0.08, , 250, 0.01, 0.01, 0.02, 1, 0.8, , , , , , 0.3, , , , 0.3, 0.04, 0.05, 350]);

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);
const SANDORANGE = new Color(0.97, 0.6, 0.22);

const INITMARBLECOUNT = 4;
const MARBLECOLOR = SANDRED;
const MARBLESIZE = 0.3;
const POCKETPOS = vec2(-10.4, -2.6);
const POCKETSIZE = vec2(2.6);
const BOARDWIDTH = 8;
const BOARDHEIGHT = 2;
const BUTTONPOS = screenToWorld(vec2(-290, -160));
const BUTTONSIZE = 1.25;
const CPUDELAY = 1.5;

const CPUPLAYER = "cpu player";
const PLAYER = "player";

// Game state
gameMoves = [];
gameInfo = [];
movingMarbles = capturedMarbles = null;
currentPlayer = PLAYER;
cpuDelay = new Timer(CPUDELAY);
gameOver = false;
animationSpeed = 0.15;

const Pocket = (index, count, home) => ({ index, count, home });

// Check if rewind button is clickable
const rewindButton = () => gameMoves.length > 2 && mousePos.distance(BUTTONPOS) < POCKETSIZE.x / 2;
// Check if all pockets are empty for a player
const pocketsEmpty = (player) =>
	player === PLAYER
		? !getBoardState().find(
				(pocket) => pocket && !pocket.home && pocket.index > 0 && pocket.index < 7 && pocket.count > 0,
			)
		: !getBoardState().find(
				(pocket) => pocket && !pocket.home && pocket.index > 7 && pocket.index < 14 && pocket.count > 0,
			);
// Check if mouse is over a valid pocket for current player
const isMouseOverValidPocket = (pocketPos) =>
	Math.abs(mousePos.x - pocketPos.value.x) < POCKETSIZE.x / 2 &&
	Math.abs(mousePos.y - pocketPos.value.y) < POCKETSIZE.y / 2.5 &&
	((pocketPos.index > 7 && currentPlayer === CPUPLAYER) || (pocketPos.index < 7 && currentPlayer === PLAYER)) &&
	pocketPos.index > 0 &&
	pocketPos.index !== 7 &&
	pocketPos.index !== 16;
// Initialize game
function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 3;
	initBoard();
}
// Main game loop
function gameUpdate() {
	// Check for game over
	if (pocketsEmpty(PLAYER) && pocketsEmpty(CPUPLAYER) && !gameOver) {
		gameOver = true;
		let won = getBoardState()[7].count > getBoardState()[0].count;
		won ? WINSOUND.play() : LOSESOUND.play();
		alert(won ? `YOU WIN! Score: ${getBoardState()[7].count}` : `YOU LOSE! Score: ${getBoardState()[7].count}`);
	} else if (gameOver && mouseWasPressed(0) && rewindButton()) initBoard();

	// Handle animations
	if (updateMovingMarbles() || updateCapturedMarbles()) return;
	if (pocketsEmpty(CPUPLAYER)) currentPlayer = PLAYER;
	if (pocketsEmpty(PLAYER)) currentPlayer = CPUPLAYER;
	if (cpuDelay.elapsed() && currentPlayer === CPUPLAYER) {
		playTurn(findTurn(CPUPLAYER));
		cpuDelay.set(CPUDELAY);
	}

	// Handle mouse input
	if (mouseWasPressed(0)) {
		if (rewindButton()) {
			BUTTONCLICKSOUND.play();
			movingMarbles = capturedMarbles = null;
			[gameMoves, gameInfo] = [gameMoves.slice(0, -1), gameInfo.slice(0, -1)];
		}
		if (currentPlayer === PLAYER) {
			for (const pos of getPocketPos()) if (isMouseOverValidPocket(pos)) playTurn(pos);
			cpuDelay.set(CPUDELAY);
		}
	}
}
// Start a turn by playing the pocket at the given position
function playTurn(pos) {
	if (gameOver || getPocketAt(pos)?.count === 0) return;
	MARBLEPICKUPSOUND.play();
	movingMarbles = getMarbleAnimation(getPocketAt(pos), currentPlayer, pos.index);
}
// find the best move for the given player using simple scoring
function findTurn(player) {
	if (player !== currentPlayer) return;
	const state = getBoardState();
	let [bestMove, bestScore] = [null, -1];
	for (let i = 8; i <= 15; i++) {
		if (!state[i] || state[i].count <= 0) continue;
		const finalPocketIndex = (state[i].count + state[i].index) % 14;
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
	if (bestMove !== null) return getPocketPos().find((pos) => pos.index === bestMove);
}
// Get current board state by applying all moves
const getBoardState = () => gameMoves.reduce((acc, curr) => Array.from(moveMarbles(acc, curr)), []);

// Get pocket at index or position
const getPocketAt = (location) =>
	typeof location === "object" ? getBoardState()[location.index] : getBoardState()[location];

// Get home pocket index for player
const playerHome = (player) => (player === CPUPLAYER ? 0 : 7);

// Get opposite pocket index across the board
const getOppositeIndex = (index) => (index < 7 ? -index + 14 : -(index - 14));

// Generator for applying move to board state
const moveMarbles = function* (state, move) {
	for (let i = 0; i < BOARDHEIGHT * BOARDWIDTH - 2; i++) yield move(i, state[i], state);
};
// Execute a move and handle captures
function playMove(pocket, player, startingPocketIndex) {
	let finalPocket = getPocketAt((pocket.count + pocket.index) % 14);
	let doCapture = finalPocket.count === 0 && !finalPocket.home;
	const move = (i, p, state) => {
		const start = state[startingPocketIndex];
		const crossing = start.index % 15 > (start.index + start.count) % 14;
		const shouldIncrement =
			(i >= start.index && i <= start.index + start.count) || (crossing && i <= (start.index + start.count) % 14);
		return shouldIncrement ? Pocket(i, i === start.index ? 0 : p.count + 1, p.home) : Pocket(i, p.count, p.home);
	};

	gameMoves.push(move);
	if (!doCapture) return { player, captureCount: 0, goAgain: finalPocket.home };

	// Handle capture: remove from opposite pocket and add to home
	let targetPocket = getBoardState()[getOppositeIndex(finalPocket.index)];
	gameMoves.pop();
	const removeMarbles = (p) =>
		p.index === targetPocket.index || p.index === startingPocketIndex ? Pocket(p.index, 0, p.home) : p;
	const addMarbles = (p) =>
		playerHome(player) === p.index ? Pocket(p.index, p.count + targetPocket.count, p.home) : p;
	gameMoves.push((i, p, state) => addMarbles(removeMarbles(move(i, p, state))));
	return { player, captureCount: targetPocket.count, goAgain: finalPocket.home };
}
// Initialize board with starting configuration
function initBoard() {
	gameOver = false;
	currentPlayer = PLAYER;
	gameMoves = [
		(i, _) => Pocket(i, null, false),
		(i, m) => (m?.index === 0 || m?.index === 7 ? Pocket(i, 0, true) : Pocket(i, INITMARBLECOUNT, false)),
	];
	gameInfo = [
		{ player: null, captureCount: 0, goAgain: false },
		{ player: null, captureCount: 0, goAgain: false },
	];
}
// Update marble movement animation
function updateMovingMarbles() {
	if (!movingMarbles) return;
	let isComplete = false;
	movingMarbles.progress += timeDelta / animationSpeed;

	if (movingMarbles.progress >= 1) {
		movingMarbles.pathIndex++;
		if (movingMarbles.pathIndex < movingMarbles.path.length - 1) {
			movingMarbles.targetIndex = movingMarbles.path[movingMarbles.pathIndex];
			movingMarbles.progress = 0;
			isComplete = false;
		} else isComplete = true;
	}
	if (movingMarbles.path.length >= 14) isComplete = true;
	isComplete ? completeMarbleAnimation() : updateMarbleAnimation();
}
// Update capture animation
function updateCapturedMarbles() {
	if (!capturedMarbles) return;
	capturedMarbles.progress += timeDelta / animationSpeed;
	if (capturedMarbles.progress >= 1) {
		capturedMarbles = null;
		MARBLEDROPSOUND.play();
		if (gameInfo.length > 0 && !gameInfo[gameInfo.length - 1].goAgain)
			currentPlayer = currentPlayer === CPUPLAYER ? PLAYER : CPUPLAYER;
	}
	return capturedMarbles;
}
// Update marble position during animation
function updateMarbleAnimation() {
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
	return movingMarbles;
}
// Complete marble animation and process move results
function completeMarbleAnimation() {
	const moveResult = playMove(getPocketAt(movingMarbles.startingIndex), currentPlayer, movingMarbles.startingIndex);
	movingMarbles = null;
	gameInfo.push(moveResult);
	MARBLEDROPSOUND.play();

	if (moveResult.captureCount > 0) {
		CAPTURESOUND.play();
		capturedMarbles = getCaptureAnimation(moveResult, currentPlayer);
	} else if (moveResult.goAgain) GOAGAINSOUND.play();
	else currentPlayer = currentPlayer === CPUPLAYER ? PLAYER : CPUPLAYER;
}
// Create marble movement animation data
function getMarbleAnimation(pocket, player, startingPocketIndex) {
	const startPos = getPocketPos().find((p) => p.index === startingPocketIndex);
	const path = [];
	let currentIndex = startingPocketIndex;

	// Calculate path for marble distribution
	for (let i = 0; i < pocket.count; i++) {
		currentIndex = (currentIndex + 1) % 14;
		// Skip opponent's home pocket
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
// Create capture animation data
function getCaptureAnimation(moveResult, player) {
	finalPocketIndex = getBoardState().find((pocket) => pocket && !pocket.home && pocket.count === 1)?.index;
	if (!finalPocketIndex) return;
	const oppositePos = getPocketPos().find((p) => p.index === getOppositeIndex(finalPocketIndex));
	const homePos = getPocketPos().find((p) => p.index === playerHome(player));
	if (oppositePos && homePos)
		return {
			fromPos: oppositePos.value.copy(),
			toPos: homePos.value.add(vec2(0, 1.625)),
			progress: 0,
			marbleCount: moveResult.captureCount,
		};
	else return null;
}
// Calculate pocket positions on the board
function getPocketPos() {
	const positions = [];
	let i = 1;

	// Bottom row (player pockets)
	for (let x = 0.5; x <= BOARDWIDTH; i++, x++) {
		positions.push({ index: i - 1, value: vec2(x, 0.55).multiply(POCKETSIZE).add(POCKETPOS) });
	}

	// Top row (CPU pockets)
	for (let x = BOARDWIDTH - 0.5; x >= 0; i++, x--) {
		const pocketIndex = i === 9 || i === 16 ? -1 : i - 2;
		positions.push({ index: pocketIndex, value: vec2(x, 1.7).multiply(POCKETSIZE).add(POCKETPOS) });
	}
	return positions;
}
// Draw home pocket (larger, rectangular)
function drawHomePocket(pos, count) {
	const center = pos.value.add(vec2(0, 1.625));

	// Highlight current player's home
	if (playerHome(currentPlayer) === pos.index) {
		drawEllipse(pos.value, vec2(2.6, 2.1), BLACK);
		drawEllipse(pos.value.add(vec2(0, 3)), vec2(2.6, 2.1), BLACK);
		drawRect(center, vec2(2.6, 3), BLACK);
	}

	drawEllipse(pos.value, vec2(2.4, 1.9), SANDORANGE);
	drawEllipse(pos.value.add(vec2(0, 3)), vec2(2.4, 1.9), SANDORANGE);
	drawRect(center, vec2(2.4, 3), SANDORANGE);
	drawTextScreen(String(count), worldToScreen(center), 32, SANDORANGE, 2, BLACK);
}
// Draw single marble with shading
function drawMarble(pos) {
	drawCircle(pos.add(vec2(0.02, 0.02)), MARBLESIZE, new Color(0.4, 0.15, 0.02));
	drawCircle(pos, MARBLESIZE, MARBLECOLOR);
	drawCircle(pos.add(vec2(-0.05, -0.05)), MARBLESIZE * 0.3, new Color(0.95, 0.7, 0.4));
}
// Draw multiple marbles in a pocket
function drawMarbles(pos, count) {
	const getOffset = (i) =>
		i < 7
			? vec2(0).setAngle(1 + (Math.PI / 3) * i, i === 0 ? 0 : MARBLESIZE * 1.25)
			: vec2(0).setAngle((Math.PI / 6) * i, MARBLESIZE * 2.5);
	for (let i = 0; i < count; i++) drawMarble(pos.add(getOffset(i)));
}
// Draw animated marbles (moving and captured)
function drawAnimatedMarbles() {
	if (movingMarbles) drawMarbles(movingMarbles.currentPos, movingMarbles.marbleCount - movingMarbles.pathIndex);
	if (capturedMarbles)
		drawMarbles(
			capturedMarbles.fromPos.lerp(capturedMarbles.toPos, capturedMarbles.progress),
			capturedMarbles.marbleCount,
		);
}
// Draw wooden board background
function drawBackground() {
	drawRect(vec2(0, 0), vec2(32), SANDLIGHTBROWN);
	drawRect(vec2(-11, 0.15), vec2(1.2, 7), new Color(0.55, 0.18, 0.02));
	drawRect(vec2(-11.1, 0.15), vec2(0.3, 7), new Color(0.4, 0.12, 0.01));
	drawRect(vec2(11, 0.15), vec2(1.2, 7), new Color(0.55, 0.18, 0.02));
	drawRect(vec2(11.1, 0.15), vec2(0.3, 7), new Color(0.4, 0.12, 0.01));
	drawRect(vec2(0, 0.15), vec2(21.5, 7), SANDRED);
	drawRect(vec2(0, 0.25), vec2(21.5, 6.75), new Color(0.82, 0.32, 0.07));
	drawRect(vec2(0, 3.4), vec2(21.5, 0.4), new Color(0.65, 0.22, 0.04));
	drawRect(vec2(0, 3.5), vec2(21.5, 0.2), new Color(0.72, 0.28, 0.06));
	drawRect(vec2(0, -2.9), vec2(21.5, 0.4), new Color(0.65, 0.22, 0.04));
	drawRect(vec2(0, -3), vec2(21.5, 0.2), new Color(0.72, 0.28, 0.06));
}
// Draw rewind button
function drawButton() {
	drawCircle(BUTTONPOS.add(vec2(0.05, -0.05)), BUTTONSIZE, new Color(0.3, 0.1, 0.01));
	drawCircle(BUTTONPOS, BUTTONSIZE, BLACK);
	drawCircle(BUTTONPOS, BUTTONPOS.distance(mousePos) < BUTTONSIZE / 2 ? BUTTONSIZE - 0.1 : BUTTONSIZE, SANDRED);
	drawTextScreen("\u20D4", worldToScreen(BUTTONPOS.add(vec2(0.35, -0.5))), 32, BLACK);
}
// Main render function
function gameRender() {
	drawBackground();
	for (const pos of getPocketPos()) {
		if (pos.index < 0) continue;
		if (getPocketAt(pos).index === 0 || getPocketAt(pos).index === 7) drawHomePocket(pos, getPocketAt(pos).count);
		else {
			if (isMouseOverValidPocket(pos) && !gameOver) drawEllipse(pos.value, vec2(2.5, 2.0), BLACK);
			drawEllipse(pos.value, vec2(2.3, 1.8), SANDORANGE);
		}
		if (movingMarbles?.startingIndex !== getPocketAt(pos).index) drawMarbles(pos.value, getPocketAt(pos).count);
	}
}
// Post-render overlay (UI elements and animations)
function postGameRender() {
	drawAnimatedMarbles(), drawButton();
	if (gameInfo.length > 0 && gameInfo[gameInfo.length - 1].goAgain && currentPlayer === PLAYER && !gameOver)
		drawTextScreen("GO AGAIN!", vec2(320, 35), 36, SANDRED, 2, BLACK);
	const rulesText =
		"Click a pocket to place marbles counter-clockwise. \nCapture if last marble lands in an empty pocket. \nGo again if last marble lands in your home.";
	drawTextScreen(rulesText, vec2(320, 320), 18, BLACK, 0.5);
}
