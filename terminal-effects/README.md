# Terminal effects

## ⚠️ Warning

Executing scripts directly from the internet, like with `bash <(curl ...)`, is generally a bad idea. It can expose your system to malicious code, security vulnerabilities, or unintended damage. Always review the code first to ensure it's safe and only run scripts from trusted sources.

## ⚠️ Warning 2

Please use with caution: These commands will irreversibly erase data from the terminal screen.

## 🎉 Party

"full" color

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/party.sh)  
```

default color only

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/party.sh) none
```

emojis

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/party.sh) emojis
```

## 🌳 Grow

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/grow.sh)  
```

## 🧼 Clear (slowly remove all characters from screen)

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/clear.sh)  
```

##  ⚡ Glitch (might actually mess up your PC for a while)

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/glitch.sh)  
```

## 🍂🔥❄️🎄 Seasonal

Fullscreen, in color, nothing on screen but the effect itself. These four are
simulations, not loops: every frame is calculated again, so they never repeat.
They need `python3`, they look best in a terminal with truecolor (they fall back
to 256 colors), and they resize with the window. Press `q` or ctrl-c to stop.

### 🔥 Fire

A fireplace. Heat rises, cools a little per row and drifts sideways.

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/fire.sh)
```

half blocks instead of letters (double vertical resolution)

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/fire.sh) blok
```

`[m]` switch letters/blocks · `[spatie]` poke the fire · `[+/-]` higher/lower

### ❄️ Snow

Snowfall in three depths, turning wind, and it piles up: too steep a heap slides
towards its neighbours.

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/snow.sh)
```

heavier

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/snow.sh) --dicht
```

`[spatie]` gust of wind

### 🍂 Leaves

Autumn leaves, tumbling as they fall. They settle at the bottom, and a strong
gust picks some of them back up.

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/leaves.sh)
```

heavier

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/leaves.sh) --dicht
```

`[spatie]` gust of wind

### 🎄 Lights

Strings of christmas lights, hung on a few hooks, sagging between them and
swaying slowly. Every bulb breathes at its own pace, one flickers now and then,
and there is always a dead one.

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/lights.sh)
```

more strings

```
bash <(curl -s https://raw.githubusercontent.com/rickvanderwolk/rickvanderwolk.cc/refs/heads/main/terminal-effects/lights.sh) --druk
```
