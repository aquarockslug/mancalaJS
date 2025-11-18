function gameInit() {
	setCanvasFixedSize(settings.screenResolution);
}
function gameStart() { state = "playing" }
function gameOver() {}
function gameUpdate() {
	if (state != 'playing') return;

	console.log("playing state")
}
function gameUpdatePost() {}
function gameRender() {}
function gameRenderPost() {}
