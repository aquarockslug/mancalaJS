// mancalaJS by aquarock
// WARN Bug with move sequence 8, 6, 3

// Array that records all of the moves made in the game
let boardMoves = [];

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

const BUTTONPOS = screenToWorld(vec2(-310, -155));
const BUTTONSIZE = 1.25;

const PLAYERA = "playerA";
const PLAYERB = "playerB";

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));
	cameraScale -= 1.5;
	initBoard();
}

function playerHome(player) {
	return player === PLAYERA ? 0 : 7;
}

function isMouseOverValidPocket(pocketPos) {
	// TODO if pos is undefined search through all of the getPocketPos()
	return (
		mousePos.distance(pocketPos.value) < POCKETSIZE.x / 2 &&
		pocketPos.index > 0 &&
		pocketPos.index !== 7 &&
		pocketPos.index !== 16
	);
}

function rewindButton() {
	return (
		boardMoves.length > 2 && mousePos.distance(BUTTONPOS) < POCKETSIZE.x / 2
	);
}

function gameUpdate() {
	if (!mouseWasPressed(0)) return;

	if (rewindButton()) boardMoves.pop();

	for (const pos of getPocketPos())
		if (isMouseOverValidPocket(pos)) {
			let moveInfo = playMove(PLAYERB, pos.index);
		}
}

// ==================== BOARD LOGIC ====================

// returns the pocket at the given index or position
function getPocketAt(location) {
	if (typeof location === "object") return getBoardState()[location.index];
	else return getBoardState()[location];
}

// returns the pocket on the opposite side of the board
function getOppositePocket(pocket) {
	return getBoardState()[
		pocket.index < 7 ? -pocket.index + 14 : -(pocket.index - 14)
	];
}

function getOppositeIndex(index) {
	return index < 7 ? -index + 14 : -(index - 14);
}

// iterates through all pockets and applies the move function
function* moveMarbles(state, move) {
	for (let i = 0; i < BOARDHEIGHT * BOARDWIDTH - 2; i++)
		yield move(i, state[i], state);
}

// returns an array representing the current marble count in each pocket
function getBoardState() {
	const calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return boardMoves.reduce(calcBoard, []);
}

// add a move to the list
// returns the number of captured marbles and if the player can move again
function playMove(player, startingPocketIndex) {
	let pocket = getPocketAt(startingPocketIndex);
	if (pocket.count === 0) return null;
	let finalPocket = getPocketAt((pocket.count + pocket.index) % 14);
	let doCapture = finalPocket.count === 0 && !finalPocket.home;

	let move = (i, p, state) => {
		const start = state[startingPocketIndex];
		const crossing = start.index % 15 > (start.index + start.count) % 14;

		const shouldUpdate =
			(i >= start.index && i <= start.index + start.count) ||
			(crossing && i <= (start.index + start.count) % 14);

		return shouldUpdate
			? Pocket(i, i === start.index ? 0 : p.count + 1, p.home)
			: Pocket(i, p.count, p.home);
	};

	// update the state of the board with the move and return if not capping
	boardMoves.push(move);
	if (!doCapture) return { captureCount: 0, goAgain: finalPocket.home };

	// get the targetPocket after pushing the move
	let targetPocket = getOppositePocket(finalPocket);
	boardMoves.pop();

	removeMarbles = (p) =>
		p.index === targetPocket.index ? Pocket(p.index, 0, p.home) : p;

	addMarbles = (p) =>
		playerHome(player) == p.index
			? Pocket(p.index, p.count + targetPocket.count, p.home)
			: p;

	boardMoves.push((i, p, state) =>
		addMarbles(removeMarbles(move(i, p, state))),
	);

	return { captureCount: targetPocket.count, goAgain: finalPocket.home };
}

// create moves that set up the board
function initBoard() {
	boardMoves = [
		(i, _) => Pocket(i, null, false),
		(i, m) =>
			m?.index === 0 || m?.index === 7
				? Pocket(i, 0, true)
				: Pocket(i, INITMARBLECOUNT, false),
	];
}

// ==================== RENDERING ====================

// returns an array of objects with pocket index and screen position
function getPocketPos() {
	const positions = [];
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
		const pocketIndex = i === 9 || i === 16 ? -1 : i - 2;
		positions.push({
			index: pocketIndex,
			value: vec2(x, 1.7).multiply(POCKETSIZE).add(POCKETPOS),
		});
	}

	return positions;
}

function drawHomePocket(pos, count) {
	const center = pos.add(vec2(0, 1.625));

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
	const getOffset = (i) =>
		i < 7
			? vec2(0).setAngle(1 + (Math.PI / 3) * i, i === 0 ? 0 : MARBLESIZE * 1.25)
			: vec2(0).setAngle((Math.PI / 6) * i, MARBLESIZE * 2.5);

	for (let i = 0; i < count; i++)
		drawCircle(pos.add(getOffset(i)), MARBLESIZE, MARBLECOLOR);
}

function drawBackground() {
	drawRect(vec2(0), vec2(32), SANDLIGHTBROWN);
	drawRect(vec2(0, 0.25), vec2(32, 7), SANDRED);
	drawRect(vec2(0, -2.425), vec2(32, 0.05), BLACK);
}

function drawButton() {
	const isHovered = BUTTONPOS.distance(mousePos) < BUTTONSIZE / 2;

	if (isHovered) drawCircle(BUTTONPOS, BUTTONSIZE + 0.1, BLACK);
	drawCircle(BUTTONPOS, BUTTONSIZE, SANDRED);
	drawTextScreen(
		"\u20D4",
		worldToScreen(BUTTONPOS.add(vec2(0.35, -0.5))),
		32,
		BLACK,
	);
}

function gameRender() {
	const state = getBoardState();
	const positions = getPocketPos();

	drawBackground();
	drawButton();

	// draw each pocket and its marbles
	for (const pos of positions) {
		if (pos.index < 0) continue;

		// get the pocket which is currently being drawn
		const pocket = getPocketAt(pos);

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
