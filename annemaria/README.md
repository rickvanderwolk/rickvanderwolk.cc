# Annemaria

Blinks the num, caps and scroll lock LEDs of an old keyboard while a Mac is locked. The rhythm changes every 30 seconds: polyrhythm, heartbeat, scanner, counter, wave, disco, phase, bounce, fireflies or SOS.

```
swiftc main.swift -o main
caffeinate -i ./main
```

Lock with Ctrl+Cmd+Q and wait for the screen to turn off. `./main --test` plays all rhythms for 8 seconds each without locking.

*macOS, tested with a PS/2 keyboard via a USB converter. Set `vendorID` and `productID` in `main.swift` to match the keyboard.

## Good to know

- The LEDs only start once the screen is off. While the lock screen is visible macOS refuses LED writes (`0xe00002e2`), so `caffeinate -d`, which keeps the screen on, gives no blinking.
- Blinking only changes the LED, not the real caps lock state, so typing a password is not affected.
- Key presses and clicks pause the blinking for 15 seconds and show the real caps lock state instead.
- With the lid closed the Mac sleeps and the blinking stops.
