const POCKETPOS = vec2(-10.4, -2.5);
const POCKETSIZE = vec2(2.6);

const WIDTH = 8;
const HEIGHT = 2;

const INITMARBLECOUNT = 3;
const MARBLECOLOR = WHITE;
const MARBLESIZE = 0.35;

boardMoves = []; // Array to track all moves made in the game
Pocket = (index, count, home) => ({ index, count, home });

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 2;

	initBoard();
}

function isMouseOverValidPocket(pos) {
	return pos.index >= 0 &&
		mousePos.distance(pos.value) < POCKETSIZE.x / 2 &&
		pos.index !== 0 &&
		pos.index !== 7 &&
		pos.index !== 16;
}

function gameUpdate() {
	if (!mouseWasPressed(0)) return;
	for (pos of positions) {
		if (isMouseOverValidPocket(pos))
			playMove(pos.index);
	}
}

function gameUpdatePost() {}

// ==================== BOARD LOGIC ====================

// iterates through all pockets and applies the move function
function* moveMarbles(state, move) {
	for (let pocketIndex = 0; pocketIndex < HEIGHT * WIDTH - 2; pocketIndex++)
		yield move(pocketIndex, state[pocketIndex], state);
}

// returns an array representing the current marble count in each pocket
function getBoardState() {
	// Apply each move in boardMoves to build up the current board state
	calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return boardMoves.reduce(calcBoard, []);
}

// execute a move and add it to the move history
function playMove(startingPocketIndex) {
	currState = getBoardState();
	move = (i, m, state) => {
		start = state[startingPocketIndex];
		crossing = start.index % 15 > (start.index + start.count) % 14;

		// find the indicies that need to updated
		if (
			(i >= start.index && i <= start.index + start.count) ||
			(crossing && i <= (start.index + start.count) % 14)
		) {
			return Pocket(i, i === start.index ? 0 : m.count + 1, m.home);
		} else {
			return Pocket(i, m.count, m.home);
		}
	};
	boardMoves.push(move);
	return Array.from(moveMarbles(currState, move));
}

// use moves that set up the board
function initBoard() {
	boardMoves = [
		(i, _) => Pocket(i, null, false),
		(i, m) => {
			if (m?.index === 0 || m?.index === 7) return Pocket(i, 0, true);
			else return Pocket(i, INITMARBLECOUNT, false);
		},
	];
}

// ==================== RENDERING ====================

// returns an array of objects with pocket index and screen position
function getPocketPos() {
	positions = [];
	let i = 0;
	for (let x = 0.5; x <= WIDTH; x++) {
		i++;
		positions.push({
			index: i - 1,
			value: vec2(x, 0.5).multiply(POCKETSIZE).add(POCKETPOS),
		});
	}
	for (let x = WIDTH - 0.5; x >= 0; x--) {
		i++;
		pocketIndex = i === 9 || i === 16 ? -1 : i - 2;
		positions.push({
			index: pocketIndex,
			value: vec2(x, 1.75).multiply(POCKETSIZE).add(POCKETPOS),
		});
	}
	return positions;
}

function drawHomePocket(pos, count) {
	center = pos.add(vec2(0, 1.625));
	drawRect(center, vec2(2.5, 3.25), rgb(0.5, 0.3, 0));
	drawCircle(pos, 2.5, rgb(0.5, 0.3, 0));
	drawCircle(pos.add(vec2(0, 3.25)), 2.5, rgb(0.5, 0.3, 0));

	drawTextScreen(String(count), worldToScreen(center), 32, WHITE, 2, BLACK);
}

// draw marbles in a circle
function drawMarbles(pos, count) {
	getOffset = (i) =>
		i < 7
			? vec2(0).setAngle(1 + (Math.PI / 3) * i, i === 0 ? 0 : MARBLESIZE * 1.25)
			: vec2(0).setAngle((Math.PI / 6) * i, MARBLESIZE * 2.5);

	for (let i = 0; i < count; i++)
		drawCircle(pos.add(getOffset(i)), MARBLESIZE, MARBLECOLOR);
}

function gameRender() {
	// draw background layers
	drawRect(vec2(0), vec2(32), rgb(0.6, 0.4, 0.08), 0);

	// get current game state and pocket positions
	state = getBoardState();
	positions = getPocketPos();

	// draw each pocket and its marbles
	for (pos of positions) {
		if (pos.index < 0) continue;
		// get the pocket which is currently being drawn
		pocket = state[pos.index];

		//highlight the pocket the mouse is over
		if (isMouseOverValidPocket(pos))
			drawCircle(pos.value, 2.6, WHITE);

		// draw pocket
		if (pocket.index === 0 || pocket.index === 7)
			drawHomePocket(pos.value, pocket.count);
		else drawCircle(pos.value, 2.5, rgb(0.5, 0.3, 0));

		drawMarbles(pos.value, pocket.count);
	}
}

function gameRenderPost() {}
