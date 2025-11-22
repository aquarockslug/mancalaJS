// mancalaJS by aquarock
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

let gameMoves = []; // functions representing all of the moves
let gameInfo = []; // information about each move
let currentPlayer = PLAYERB;
let cpuDelay = new Timer(1);

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 1.5;
	initBoard();
}

const playerHome = (player) => (player === PLAYERA ? 0 : 7);

const isMouseOverValidPocket = (pocketPos) =>
	mousePos.distance(pocketPos.value) < POCKETSIZE.x / 2 &&
	((pocketPos.index > 7 && currentPlayer === PLAYERA) || (pocketPos.index < 7 && currentPlayer === PLAYERB)) &&
	pocketPos.index > 0 &&
	pocketPos.index !== 7 &&
	pocketPos.index !== 16;

const rewindButton = () => gameMoves.length > 3 && mousePos.distance(BUTTONPOS) < POCKETSIZE.x / 2;

function getRandomValidMove(player) {
	const validMoves = [];
	const state = getBoardState();
	const isPlayerA = player === PLAYERA;
	const startIndex = isPlayerA ? 8 : 1;
	const endIndex = isPlayerA ? 15 : 6;

	for (let i = startIndex; i <= endIndex; i++) if (state[i] && state[i].count > 0) validMoves.push(i);

	if (validMoves.length === 0) return null;
	return validMoves[Math.floor(Math.random() * validMoves.length)];
}

function gameUpdate() {
	if (cpuDelay.elapsed() && currentPlayer === PLAYERA && !MULTIPLAYER) {
		cpuMove(PLAYERA);
		cpuDelay.set(1);
	}

	if (!mouseWasPressed(0)) return;
	if (rewindButton()) {
		gameMoves = gameMoves.slice(0, MULTIPLAYER ? -1 : -2);
		gameInfo = gameInfo.slice(0, MULTIPLAYER ? -1 : -2);
	} else {
		// player move
		if (currentPlayer !== PLAYERA) for (const pos of getPocketPos()) if (isMouseOverValidPocket(pos)) playTurn(pos);
		cpuDelay.set(1);
	}
}

function playTurn(pos) {
	let pocket = getPocketAt(pos);
	if (pocket.count === 0) return null;
	gameInfo.push(playMove(pocket, currentPlayer, pos.index));
	if (gameInfo[gameInfo.length - 1].goAgain) return;
	else currentPlayer = currentPlayer === PLAYERA ? PLAYERB : PLAYERA;
}

function cpuMove(player) {
	if (player !== currentPlayer) return;

	const state = getBoardState();
	const isPlayerA = player === PLAYERA;
	const startIndex = isPlayerA ? 8 : 1;
	const endIndex = isPlayerA ? 15 : 6;

	let bestMove = null;
	let bestScore = -1;

	// evaluate each possible move
	for (let i = startIndex; i <= endIndex; i++) {
		if (state[i] && state[i].count > 0) {
			const pocket = state[i];
			const finalPocketIndex = (pocket.count + pocket.index) % 14;
			const finalPocket = state[finalPocketIndex];

			let score = 0;
			if (finalPocket.home) score += 10;

			if (finalPocket.count === 0 && !finalPocket.home) {
				const oppositePocket = state[getOppositeIndex(finalPocketIndex)];
				if (oppositePocket && oppositePocket.count > 0) score += oppositePocket.count; // score based on captured marbles
			}

			score += Math.random() * 0.5; // avoid being too predictable

			if (score > bestScore) {
				bestScore = score;
				bestMove = i;
			}
		}
	}

	// play the best move found
	if (bestMove !== null) {
		const positions = getPocketPos();
		const targetPos = positions.find((pos) => pos.index === bestMove);
		if (targetPos) playTurn(targetPos);
		if (!gameInfo[gameInfo.length - 1].goAgain)
			currentPlayer = PLAYERB
	}
}

// ==================== BOARD LOGIC ====================
// returns the pocket at the given index or position
const getPocketAt = (location) =>
	typeof location === "object" ? getBoardState()[location.index] : getBoardState()[location];
// returns the pocket on the opposite side of the board
const getOppositePocket = (pocket) => getBoardState()[pocket.index < 7 ? -pocket.index + 14 : -(pocket.index - 14)];
const getOppositeIndex = (index) => (index < 7 ? -index + 14 : -(index - 14));

// iterates through all pockets and applies the move function
const moveMarbles = function* (state, move) {
	for (let i = 0; i < BOARDHEIGHT * BOARDWIDTH - 2; i++) yield move(i, state[i], state);
};

// returns an array representing the current marble count in each pocket
function getBoardState() {
	const calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return gameMoves.reduce(calcBoard, []);
}

// add a move to the list
// returns the number of captured marbles and if the player can move again
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

// create moves that set up the board
function initBoard() {
	gameMoves = [
		(i, _) => Pocket(i, null, false),
		(i, m) => (m?.index === 0 || m?.index === 7 ? Pocket(i, 0, true) : Pocket(i, INITMARBLECOUNT, false)),
	];
}

// ==================== RENDERING ====================

// returns an array of objects with pocket index and screen position
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
	for (let i = 0; i < count; i++) drawCircle(pos.add(getOffset(i)), MARBLESIZE, MARBLECOLOR);
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
			if (isMouseOverValidPocket(pos)) drawCircle(pos.value, 2.5, BLACK);
			drawCircle(pos.value, 2.3, SANDORANGE);
		}
		drawMarbles(pos.value, pocket.count);
	}
	const rulesText =
		"Click a pocket to place marbles counter-clockwise. \nCapture if last marble lands in an empty pocket. \nGo again if last marble lands in your home.";
	drawTextScreen(rulesText, vec2(320, 320), 18, BLACK, 0.5);
}
