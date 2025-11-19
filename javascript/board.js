class Board extends EngineObject {
	constructor(pos, size) {
		super(pos, size);

		this.moves = [];

		let pocket = (i, m) => ({ index: i, count: m });

		let firstMove = (i, m) =>
			i > 10 ? pocket(i, m.count + 3) : pocket(i, m.count - 1);

		this.state = this.playMove(this.initBoardState(), firstMove);
		this.state = this.playMove(this.state, firstMove);
		console.log(this.getState());
	}
	playMove(state, move) {
		this.moves.push(move);
		return Array.from(this.moveMarbles(state, move));
	}
	// TODO function that replays all of the moves in order to get the current marble counts
	getState() {
		// moveMarbles(moveMarble(initBoardState(), move1), move2)
		let calcMove = (acc, curr) => Array.from(this.moveMarbles(acc, curr));
		return this.moves.reduce(calcMove, this.initBoardState());
	}
	update() {
		super.update();
	}
	*moveMarbles(state, move) {
		for (let pocketIndex = 0; pocketIndex <= height * width; pocketIndex++) {
			yield move(pocketIndex, state[pocketIndex]);
		}
	}
	*pocketPos() {
		let i = 0;
		for (let y = 0.5; y <= height; y++)
			for (let x = 0.5; x <= width; x++) {
				i++;
				yield { index: i, pos: vec2(x, y).multiply(this.size).add(this.pos) };
			}
	}
	initBoardState() {
		state = [];
		for (let i = 0; i <= width * height; i++)
			state.push({ index: i, count: 3 });
		return state;
	}
	render() {
		super.render();
		let state = this.getState()

		drawRect(vec2(0), vec2(16), (color = GRAY), (angle = 0));
		for (let p of this.pocketPos()) {
			drawRect(p.pos, vec2(0.9), WHITE);

			let marble = state[p.index];
			// TODO for each marble.count
			drawRect(p.pos, vec2(0.2), marble.count >= 6 ? RED : WHITE);
		}
	}
}
