# Behang

A desktop wallpaper that never stops changing and never seems to. Soft colour fields are rendered again every minute, but consecutive minutes differ far below what the eye can see. Only after hours, days and weeks does it look different.

The image is a pure function of time: the real sun height in the Netherlands sets the light, slow overlapping cycles move the fields and the day of the year sets the palette. It also keeps updating while the screen is locked.

```
sed "s|__DIR__|$PWD|g" cc.behang.plist > ~/Library/LaunchAgents/cc.behang.plist
launchctl load ~/Library/LaunchAgents/cc.behang.plist
```

Stop with `launchctl unload ~/Library/LaunchAgents/cc.behang.plist`.

*macOS, Python 3 without dependencies. Set `LAT` and `LON` in `main.py` for another location.

## Tools

```
python3 main.py at 2026-12-21T16:30   # render a given moment to at.png
python3 main.py sheet day             # contact sheet to sheet.png (day, week or year)
python3 main.py check                 # max colour change per minute over a year
```
