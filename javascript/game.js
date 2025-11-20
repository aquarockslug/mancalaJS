const POCKETPOS = vec2(-6, -2);
const POCKETSCALE = vec2(2);

const BOARDSIZE = vec2(16);

const MARBLECOLOR = BLACK;

const WIDTH = 6;
const HEIGHT = 2;

const INITMARBLECOUNT = 3;

// Game state variables
let boardMoves = []; // Array to track all moves made in the game
let pocket = (i, m) => ({ index: i, count: m });

function gameInit() {
	setCanvasFixedSize(vec2(640, 360));

	// Initialize the board with the starting configuration
	playMove([], (i, m) => pocket(i, INITMARBLECOUNT));
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
	for (let pocketIndex = 0; pocketIndex <= HEIGHT * WIDTH; pocketIndex++)
		yield move(pocketIndex, state[pocketIndex]);
}

// Returns an array representing the current marble count in each pocket
function getBoardState() {
	// Apply each move in boardMoves to build up the current board state
	let calcBoard = (acc, curr) => Array.from(moveMarbles(acc, curr));
	return boardMoves.reduce(calcBoard, []);
}

// Execute a move and add it to the move history
function playMove(state, move) {
	boardMoves.push(move);
	return Array.from(moveMarbles(state, move));
}

// Make a move which starts at the given pocket index
function move(startingPocket) {
	let firstMove = (i, m) => (i > 10 ? pocket(i, m.count + 3) : pocket(i, 0));

	return playMove(getBoardState(), firstMove);
}

// ==================== RENDERING ====================

// Returns an array of objects with pocket index and screen position
function getPocketPos() {
	let positions = [];
	let i = 0;

	// Iterate through grid positions to calculate pocket locations
	for (let y = 0.5; y <= HEIGHT; y += 1.3) {
		for (let x = 0.5; x <= WIDTH; x++) {
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
	// Draw background layers
	drawRect(vec2(0), BOARDSIZE, rgb(0.6, 0.4, 0.08), (angle = 0)); // Game board gray background

	// Get current game state and pocket positions
	let state = getBoardState();
	let positions = getPocketPos();

	// Render each pocket and its marbles
	for (let p of positions) {
		// Draw pocket background circle
		drawCircle(p.pos, 1.75, rgb(0.5, 0.3, 0));

		// Get marble count for this pocket
		let pocket = state[p.index];

		// Draw marbles in the pocket
		// TODO: render each marble in a honeycomb shape for better visual
		// TODO: split a circle's circumference into 5 parts for marble placement
		for (let i = 0; i < pocket.count; i++) drawCircle(p.pos, 0.2, MARBLECOLOR);
	}
	if (mouseIsDown(0)) drawCircle(mousePos, 0.2, MARBLECOLOR);
}

function gameRenderPost() {}
