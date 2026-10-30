# Annemaria

Blinks the num, caps and scroll lock LEDs of an old keyboard while a Mac is locked. The rhythm changes every 30 seconds: polyrhythm, heartbeat, scanner, counter, wave, disco, phase, bounce, fireflies or SOS.

```
./install.sh
```

This builds it and keeps it running in the background, also after a restart. Allow `main` once under System Settings > Privacy & Security > Input Monitoring. A new build needs this permission again: remove the old entry and add it again.

Stop with `launchctl unload ~/Library/LaunchAgents/cc.annemaria.plist`.

Lock with Ctrl+Cmd+Q and wait for the screen to turn off. `./main --test` plays all rhythms for 8 seconds each without locking. The log is in `/tmp/annemaria.log`.

*macOS, tested with a PS/2 keyboard via a USB converter. Set `vendorID` and `productID` in `main.swift` to match the keyboard.

## Is it running?

```
launchctl list | grep annemaria
tail /tmp/annemaria.log
```

A number in the first column (the pid) means it's running, `-` means it's not. The last line of the log tells why:

| Log | Meaning | Fix |
| --- | --- | --- |
| `waiting for lock` or `rhythm: ...` | Running | Nothing |
| `Can't open the keyboard (-536870174)` | No Input Monitoring permission | In System Settings > Privacy & Security > Input Monitoring remove `main` if it's listed, then add it with `+` (Cmd+Shift+G to paste the path). It retries within 30 seconds |
| `Keyboard not found` | Keyboard not connected or other ids | Connect it, or set `vendorID` and `productID` in `main.swift` and run `./install.sh` again |

## Good to know

- The LEDs only start once the screen is off. While the lock screen is visible macOS refuses LED writes (`0xe00002e2`), so keeping the screen on gives no blinking.
- Blinking only changes the LED, not the real caps lock state, so typing a password is not affected.
- Key presses and clicks pause the blinking for 15 seconds and show the real caps lock state instead.
- While locked on AC power the Mac stays awake, also overnight. On battery it sleeps as usual and the blinking stops.
- With the lid closed the Mac sleeps and the blinking stops.
