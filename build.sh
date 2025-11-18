#!/bin/zsh

GAME_TITLE="LittleJs"
ARCHIVE_NAME="game"

# create a zip file containing only the files required to play
setopt extendedglob && 7z u -tzip $ARCHIVE_NAME **/^(*.zip|*.md|*.sh|biome.json) | tail

# upload the zip file to itch.io
echo && butler push $ARCHIVE_NAME.zip aquarock/$GAME_TITLE:build

sleep 10
$BROWSER https://aquarock.itch.io/$ARCHIVE_NAME
