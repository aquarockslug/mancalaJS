const POCKETPOS = vec2(-5.6, -1.25);
const POCKETSCALE = vec2(1.25);
const BOARDSIZE = vec2(12.5, 4);
const INITPIECES = 3;

let boardMoves = [];
let pocket = (i, m) => ({ index: i, count: m });

function gameInit() {
	setCanvasFixedSize(settings.screenResolution);
	[width, height] = [9, 2];

	// init board
	playMove([], (i, m) => pocket(i, INITPIECES));
}

function gameStart() {
	gamestate = "playing";
}

function gameUpdate() {
	// if (state != "playing") return;
}

function gameUpdatePost() {}

// BOARD
function* moveMarbles(state, move) {
	for (let pocketIndex = 0; pocketIndex <= height * width; pocketIndex++)
		yield move(pocketIndex, state[pocketIndex]);
}

function getBoardState() {
	// get the state of the board by playing every move
	let calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return boardMoves.reduce(calcBoard, []);
}

function playMove(state, move) {
	boardMoves.push(move);
	return Array.from(moveMarbles(state, move));
}

// MOVES
function testMove() {
	let firstMove = (i, m) => (i > 10 ? pocket(i, m.count + 3) : pocket(i, 0));

	return playMove(getBoardState(), firstMove);
}

// RENDER
function getPocketPos() {
	let positions = [];
	let i = 0;
	for (let y = 0.5; y <= height; y++) {
		for (let x = 0.5; x <= width; x++) {
			i++;
			positions.push({
				index: i,
				pos: vec2(x, y).multiply(POCKETSCALE).add(POCKETPOS),
			});
		}
	}
	return positions;
}

function gameRender() {
	// background
	drawRect(vec2(0), vec2(32), (color = WHITE), (angle = 0));
	drawRect(vec2(0), BOARDSIZE, (color = GRAY), (angle = 0));

	let state = getBoardState();
	let positions = getPocketPos();
	for (let p of positions) {
		// pocket background
		drawCircle(p.pos, 1.1, WHITE);

		let pocket = state[p.index];
		// TODO render each marble in a honeycomb shape
		// split a circles circumference into 5 parts
		for (let i = 0; i < pocket.count; i++)
			drawRect(p.pos, vec2(0.2), RED);
	}
}

function gameRenderPost() {}
