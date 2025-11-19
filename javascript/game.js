function gameInit() {
	setCanvasFixedSize(settings.screenResolution);
	[width, height] = [9, 2];
	new Board(vec2(-4, 0), vec2(1));
}
function gameStart() {
	state = "playing";
}
function gameOver() {}
function gameUpdate() {
	// if (state != "playing") return;
}
function gameUpdatePost() {}
function gameRender() {
	drawRect(vec2(0), vec2(10), (color = GRAY), (angle = 0));
}
function gameRenderPost() {}
