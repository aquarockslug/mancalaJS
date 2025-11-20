const BOARDPOS = vec2(-4, 0);
const BOARDSCALE = vec2(1);

// the state of the game is stored with a sequence of move functions
let boardMoves = [];
let pocket = (i, m) => ({ index: i, count: m });

function getPocketPos() {
	let positions = [];
	let i = 0;
	for (let y = 0.5; y <= height; y++) {
		for (let x = 0.5; x <= width; x++) {
			i++;
			positions.push({
				index: i,
				pos: vec2(x, y).multiply(BOARDSCALE).add(BOARDPOS),
			});
		}
	}
	return positions;
}

function initBoardState() {
	let state = [];
	for (let i = 0; i <= width * height; i++) state.push({ index: i, count: 3 });
	return state;
}

function* moveMarbles(state, move) {
	for (let pocketIndex = 0; pocketIndex <= height * width; pocketIndex++) {
		yield move(pocketIndex, state[pocketIndex]);
	}
}

function getBoardState() {
	// moveMarbles(moveMarble(initBoardState(), move1), move2)
	let calcMove = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return boardMoves.reduce(calcMove, initBoardState());
}

function playMove(state, move) {
	boardMoves.push(move);
	return Array.from(moveMarbles(state, move));
}

function gameInit() {
	setCanvasFixedSize(settings.screenResolution);
	[width, height] = [9, 2];

	boardMoves = [];

	// Initial move logic
	let state = playMove(initBoardState(), (i, m) => pocket(i, 3));
}

function testMove() {
	let firstMove = (i, m) =>
		i > 10 ? pocket(i, m.count + 3) : pocket(i, 0);

	return playMove(getBoardState(), firstMove);
}

function gameStart() {
	gamestate = "playing";
}

function gameOver() {}

function gameUpdate() {
	// if (state != "playing") return;
}

function gameUpdatePost() {}

function gameRender() {
	// Background
	drawRect(vec2(0), vec2(16), (color = GRAY), (angle = 0));

	let state = getBoardState();

	let positions = getPocketPos();
	for (let p of positions) {
		drawRect(p.pos, vec2(0.9), WHITE);

		let marble = state[p.index];
		// TODO for each marble.count
		if (marble) {
			drawRect(p.pos, vec2(0.2), marble.count > 0 ? RED : WHITE);
		}
	}
}

function gameRenderPost() {}
