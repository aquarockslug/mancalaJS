local highlight = function(text) return "\x1b[1m\x1b[35m" .. text .. "\x1b[0m" end
local archive = function(file)
	print(highlight "Deleting " .. file)
	os.execute("rm " .. file)
	print(string.format(highlight("Archiving") .. " %s", file))
	os.execute(string.format("7z a %s ./* | grep new", file))
end
local push = function(file, address, channel)
	print(highlight(string.format(highlight("Uploading") .. " %s to %s:%s", file, address, channel)))
	os.execute(string.format("butler push %s %s:%s", file, address, channel))
end

NAME = "html5"
archive("./" .. NAME .. ".zip")
push("./" .. NAME .. ".zip", "aquarock/mancalajs", NAME)
