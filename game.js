// mancalaJS by aquarock

// Array that records all of the moves made in the game
boardMoves = [];

Pocket = (index, count, home) => ({ index, count, home });

const SANDRED = new Color(0.78, 0.28, 0.03);
const SANDLIGHTBROWN = new Color(0.97, 0.88, 0.63);
const SANDORANGE = new Color(0.97, 0.6, 0.22);

const INITMARBLECOUNT = 3;
const MARBLECOLOR = SANDRED;
const MARBLESIZE = 0.35;

const POCKETPOS = vec2(-10.4, -2.25);
const POCKETSIZE = vec2(2.6);

const BOARDWIDTH = 8;
const BOARDHEIGHT = 2;

const BUTTONPOS = screenToWorld(vec2( -310, -155 ));
const BUTTONSIZE = 1.25;

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 1.5;
	initBoard();
}

function isMouseOverValidPocket(pos) {
	return (
		mousePos.distance(pos.value) < POCKETSIZE.x / 2 &&
		pos.index > 0 &&
		pos.index !== 7 &&
		pos.index !== 16
	);
}

function undoButton() {
	return !(boardMoves.length - 2) ? false : mousePos.distance(BUTTONPOS) < POCKETSIZE.x / 2
}

function gameUpdate() {
	if (!mouseWasPressed(0)) return;
	if (undoButton()) boardMoves.pop()
	for (pos of positions) if (isMouseOverValidPocket(pos)) playMove(pos.index);
}

// ==================== BOARD LOGIC ====================

// iterates through all pockets and applies the move function
function* moveMarbles(state, move) {
	for (let i = 0; i < BOARDHEIGHT * BOARDWIDTH - 2; i++)
		yield move(i, state[i], state);
}

// returns an array representing the current marble count in each pocket
function getBoardState() {
	// Apply each move in boardMoves to build up the current board state
	calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return boardMoves.reduce(calcBoard, []);
}

// add a move to the list
function playMove(startingPocketIndex) {
	boardMoves.push((i, m, state) => {
		let start = state[startingPocketIndex];
		let crossing = start.index % 15 > (start.index + start.count) % 14;

		// find the indicies that need to updated
		if (
			(i >= start.index && i <= start.index + start.count) ||
			(crossing && i <= (start.index + start.count) % 14)
		) {
			return Pocket(i, i === start.index ? 0 : m.count + 1, m.home);
		} else {
			return Pocket(i, m.count, m.home);
		}
	});
}

// create moves that set up the board
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
	for (let x = 0.5; x <= BOARDWIDTH; x++) {
		i++;
		positions.push({
			index: i - 1,
			value: vec2(x, 0.55).multiply(POCKETSIZE).add(POCKETPOS),
		});
	}
	for (let x = BOARDWIDTH - 0.5; x >= 0; x--) {
		i++;
		pocketIndex = i === 9 || i === 16 ? -1 : i - 2;
		positions.push({
			index: pocketIndex,
			value: vec2(x, 1.7).multiply(POCKETSIZE).add(POCKETPOS),
		});
	}
	return positions;
}

function drawHomePocket(pos, count) {
	center = pos.add(vec2(0, 1.625));
	drawCircle(pos, 2.5, BLACK);
	drawCircle(pos.add(vec2(0, 3)), 2.5, BLACK);
	drawRect(center, vec2(2.5, 3), BLACK);
	drawCircle(pos, 2.4, SANDORANGE);
	drawCircle(pos.add(vec2(0, 3)), 2.4, SANDORANGE);
	drawRect(center, vec2(2.4, 3), SANDORANGE);

	drawTextScreen(
		String(count),
		worldToScreen(center),
		32,
		SANDORANGE,
		2,
		BLACK,
	);
}

function drawMarbles(pos, count) {
	getOffset = (i) =>
			i < 7 ? vec2(0).setAngle(1 + (Math.PI / 3) * i, i === 0 ? 0
			      : MARBLESIZE * 1.25)
			: vec2(0).setAngle((Math.PI / 6) * i, MARBLESIZE * 2.5);

	for (let i = 0; i < count; i++)
		drawCircle(pos.add(getOffset(i)), MARBLESIZE, MARBLECOLOR);
}

function drawBackground() {
	drawRect(vec2(0), vec2(32), SANDLIGHTBROWN);
	drawRect(vec2(0, 0.25), vec2(32, 7), SANDRED);
	drawRect(vec2(0, -2.425), vec2(32, 0.05), BLACK);
}

function drawButton(){
	if (BUTTONPOS.distance(mousePos) < BUTTONSIZE / 2)
		drawCircle(BUTTONPOS, BUTTONSIZE + 0.1, BLACK);
	drawCircle(BUTTONPOS, BUTTONSIZE, SANDRED);
	drawTextScreen(
		"\u20D4",
		worldToScreen(BUTTONPOS.add(vec2(0.35, -0.5))),
		32,
		BLACK,
	);
}

function gameRender() {
	let [state, positions] = [getBoardState(), getPocketPos()]

	drawBackground()
	drawButton()

	// draw each pocket and its marbles
	for (pos of positions) {
		if (pos.index < 0) continue;
		// get the pocket which is currently being drawn
		pocket = state[pos.index];

		// draw pocket
		if (pocket.index === 0 || pocket.index === 7)
			drawHomePocket(pos.value, pocket.count);
		else {
			if (isMouseOverValidPocket(pos)) drawCircle(pos.value, 2.5, BLACK);
			drawCircle(pos.value, 2.4, SANDORANGE);
		}

		drawMarbles(pos.value, pocket.count);
	}
}
