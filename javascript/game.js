const POCKETPOS = vec2(-10, -2.5);
const POCKETSCALE = vec2(2.5);

const WIDTH = 8;
const HEIGHT = 2;

const INITMARBLECOUNT = 3;
const MARBLECOLOR = BLACK;

// Game state variables
let boardMoves = []; // Array to track all moves made in the game
let Pocket = (i, m) => ({ index: i, count: m });

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));

	// Initialize the board with the starting configuration
	playMove([], (i, _) => Pocket(i, INITMARBLECOUNT));

	console.log(getBoardState());
	console.log(getPocketPos());
}

function gameStart() {
	gamestate = "playing"; // Set game state to active gameplay
}

function gameUpdate() {
	// if (state != "playing") return;
}

function gameUpdatePost() {}

// ==================== BOARD LOGIC ====================

// Iterates through all pockets and applies the move function
function* moveMarbles(state, move) {
	for (let pocketIndex = 0; pocketIndex < HEIGHT * WIDTH - 2; pocketIndex++)
		yield move(pocketIndex, state[pocketIndex]);
}

// Returns an array representing the current marble count in each pocket
function getBoardState() {
	// Apply each move in boardMoves to build up the current board state
	calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return boardMoves.reduce(calcBoard, []);
}

// Execute a move and add it to the move history
function playMove(state, move) {
	boardMoves.push(move);
	return Array.from(moveMarbles(state, move));
}

// Make a move which starts at the given pocket index
function move(startingPocket) {
	firstMove = (i, m) => (i > 10 ? Pocket(i, m.count + 3) : Pocket(i, 0));

	return playMove(getBoardState(), firstMove);
}

// ==================== RENDERING ====================

// Returns an array of objects with pocket index and screen position
function getPocketPos() {
	positions = [];
	let i = 0;

	// Iterate through grid positions to calculate pocket locations
	for (let y = 0.5; y <= HEIGHT; y += 1.3) {
		if (i < 8)
			for (let x = 0.5; x <= WIDTH; x++) {
				i++;
				positions.push({
					index: i - 1,
					value: vec2(x, y).multiply(POCKETSCALE).add(POCKETPOS),
				});
			}
		else
			for (let x = WIDTH - 0.5; x >= 0; x--) {
				i++;
				pocketIndex = i === 9 || i === 16 ? -1 : i - 2;
				positions.push({
					index: pocketIndex,
					value: vec2(x, y).multiply(POCKETSCALE).add(POCKETPOS),
				});
			}
	}
	return positions;
}

function gameRender() {
	// Draw background layers
	drawRect(vec2(0), vec2(32), rgb(0.6, 0.4, 0.08), 0); // Game board gray background

	// Get current game state and pocket positions
	state = getBoardState();
	positions = getPocketPos();

	// Render each pocket and its marbles
	for (pos of positions) {
		if (pos.index < 0) continue;

		// Get marble count for this pocket
		pocket = state[pos.index];

		// Draw pocket background circle
		if (pocket.index === 0 || pocket.index === 7)
			drawCircle(pos.value, 5, rgb(0.5, 0.3, 0));
		else drawCircle(pos.value, 2.5, rgb(0.5, 0.3, 0));

		drawCircle(pos.value, 2.5, rgb(0.5, 0.3, 0));

		drawCircle(mousePos, 0.2, MARBLECOLOR);

		// Draw marbles in the pocket
		// TODO: render each marble in a honeycomb shape for better visual
		// TODO: split a circle's circumference into 5 parts for marble placement
		for (let i = 0; i < pocket.count; i++)
			drawCircle(pos.value, 0.2, MARBLECOLOR);
	}
	if (mouseIsDown(0)) drawCircle(mousePos, 0.2, MARBLECOLOR);
}

function gameRenderPost() {}
