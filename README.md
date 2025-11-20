mancalaJS

A tiny implementation of Mancala in JavaScript.
How to Play

    Click any pocket to distribute the marbles inside
    Marbles move counter-clockwise, one per pocket 

Planned Features

    Single player mode
    Capture when landing in an empty pocket on your side

Architecture

The game uses a functional pipeline where board state is reconstructed by applying a sequence of pure move functions:

getBoardState() -> boardMoves.reduce(calcBoard, [])

The game uses the minimalistic LittleJS engine. 

The entire game logic fits in under 200 lines.
Philosophy

The game is built with functional programming principles and minimalism:

    Immutable game state: Each move creates a new state
    No Classes: Simple objects and factory functions only
    Undo System: This feature is trivial to implement when using a functional state
    Zero Dependencies: No build tools or frameworks are required

This game demonstrates how complex game logic emerges from simple functional ideas.
