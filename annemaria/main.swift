import CoreGraphics
import Foundation
import IOKit.hid
import IOKit.pwr_mgt

// Blinks the keyboard LEDs while the screen is locked. Use --test to play all rhythms without locking.

// USB ids of the keyboard, find yours with: system_profiler SPUSBDataType
let vendorID = 0x13ba
let productID = 0x0018

// Report bits: 1 = num lock, 2 = caps lock, 4 = scroll lock
let tickSeconds = 0.1

// Seconds without key presses or clicks before the LEDs start blinking again
let pauseSeconds = 15.0

// Seconds before switching to another rhythm
let rhythmSeconds = 30.0

// Stable pseudo random value (0-255) for a given step
func noise(_ step: Int) -> Int {
    ((step &* 2654435761) >> 13) & 255
}

// "SOS" in morse, one character per tick: 1 = on
let morse = Array("1010101000111011101110001010101" + "00000000000000")

let rhythms: [(name: String, mask: (Int) -> UInt8)] = [
    // Each LED has its own period (3, 5 and 7 beats), so the pattern only repeats after 105 beats
    ("polyrhythm", { tick in
        let beat = tick / 2
        return (beat % 3 == 0 ? 1 : 0) | (beat % 5 == 0 ? 2 : 0) | (beat % 7 == 0 ? 4 : 0)
    }),
    ("heartbeat", { tick in
        [0, 2].contains(tick % 12) ? 7 : 0
    }),
    ("scanner", { tick in
        [1, 2, 4, 2][(tick / 2) % 4]
    }),
    // Counts from 0 to 7 in binary
    ("counter", { tick in
        UInt8((tick / 3) % 8)
    }),
    // Fills up from the left and drains to the right
    ("wave", { tick in
        [1, 3, 7, 6, 4, 0][(tick / 2) % 6]
    }),
    // Four on the floor, son clave and an offbeat, over 16 steps
    ("disco", { tick in
        let step = tick % 16
        let kick: UInt8 = step % 4 == 0 ? 1 : 0
        let clave: UInt8 = [0, 3, 6, 10, 12].contains(step) ? 2 : 0
        let offbeat: UInt8 = step % 4 == 2 ? 4 : 0
        return kick | clave | offbeat
    }),
    // Two pulses with almost the same period drift apart, the middle LED lights up when they meet
    ("phase", { tick in
        let left = tick % 12 < 2
        let right = tick % 13 < 2
        return (left ? 1 : 0) | (left && right ? 2 : 0) | (right ? 4 : 0)
    }),
    // Flashes that follow each other faster and faster, then a rest
    ("bounce", { tick in
        [0, 8, 14, 18, 21, 23, 25].contains(tick % 40) ? 7 : 0
    }),
    // Mostly dark, now and then a single LED
    ("fireflies", { tick in
        let slot = tick / 5
        let value = noise(slot)
        guard value < 48, tick % 5 == 0 else { return 0 }
        return [1, 2, 4][value % 3]
    }),
    ("sos", { tick in
        morse[tick % morse.count] == "1" ? 7 : 0
    }),
]

setbuf(stdout, nil)

let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
IOHIDManagerSetDeviceMatching(manager, [
    kIOHIDVendorIDKey: vendorID,
    kIOHIDProductIDKey: productID,
    kIOHIDDeviceUsagePageKey: kHIDPage_GenericDesktop,
    kIOHIDDeviceUsageKey: kHIDUsage_GD_Keyboard,
] as CFDictionary)

let result = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
guard result == kIOReturnSuccess else {
    print("Can't open the keyboard (\(result)). Allow main under Input Monitoring.")
    exit(1)
}

guard let device = (IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice>)?.first else {
    print("Keyboard not found")
    exit(1)
}

// launchd starts a new process, which finds the keyboard again once it's back
IOHIDManagerRegisterDeviceRemovalCallback(manager, { _, _, _, _ in exit(0) }, nil)
IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetMain(), CFRunLoopMode.defaultMode.rawValue)

var lastMask: UInt8? = nil
var sleepAssertion = IOPMAssertionID(0)

// Keeps the Mac awake while locked. macOS only honours this on AC power, on battery it sleeps as usual
@Sendable func keepAwake(_ awake: Bool) {
    if awake {
        IOPMAssertionCreateWithName(kIOPMAssertionTypePreventSystemSleep as CFString, IOPMAssertionLevel(kIOPMAssertionLevelOn), "Annemaria is blinking" as CFString, &sleepAssertion)
    } else {
        IOPMAssertionRelease(sleepAssertion)
    }
}

// Only writes on a change, so the slow PS/2 side isn't flooded
func set(_ mask: UInt8) {
    guard mask != lastMask else { return }
    var report = mask
    // Refused while the lock screen is visible: don't remember it, so it's retried after unlocking
    if IOHIDDeviceSetReport(device, kIOHIDReportTypeOutput, 0, &report, 1) == kIOReturnSuccess {
        lastMask = mask
    }
}

func screenIsLocked() -> Bool {
    let session = CGSessionCopyCurrentDictionary() as? [String: Any]
    return session?["CGSSessionScreenIsLocked"] as? Bool ?? false
}

func capsIsOn() -> Bool {
    CGEventSource.flagsState(.hidSystemState).contains(.maskAlphaShift)
}

func log(_ message: String) {
    let time = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
    print("\(time) \(message)")
}

var tick = 0
var rhythm = rhythms[0]
var rhythmStart = 0
var lockedAt = Date()
var paused = false

// While someone is at the keyboard the LEDs only show the real caps lock state
func inputSinceLock() -> Bool {
    // Mouse movement doesn't count: it was reported almost constantly and kept the LEDs paused
    let types: [CGEventType] = [.keyDown, .flagsChanged, .leftMouseDown, .rightMouseDown]
    let seconds = types.map { CGEventSource.secondsSinceLastEventType(.hidSystemState, eventType: $0) }.min()!
    let lastInput = Date().addingTimeInterval(-seconds)
    // The lock shortcut itself is input, so ignore the first second after locking
    return seconds < pauseSeconds && lastInput > lockedAt.addingTimeInterval(1)
}

@Sendable func nextRhythm() {
    let current = rhythm.name
    rhythm = rhythms.filter { $0.name != current }.randomElement()!
    rhythmStart = tick
    log("rhythm: \(rhythm.name)")
}

@Sendable func startBlinking() {
    tick = 0
    lockedAt = Date()
    paused = false
    nextRhythm()
}

@Sendable func update(_ newValue: Bool) {
    guard newValue != locked else { return }
    locked = newValue
    log(locked ? "locked" : "unlocked")
    keepAwake(locked)
    if locked {
        startBlinking()
    } else {
        set(capsIsOn() ? 2 : 0)
    }
}

let center = DistributedNotificationCenter.default()
center.addObserver(forName: Notification.Name("com.apple.screenIsLocked"), object: nil, queue: .main) { _ in
    update(true)
}
center.addObserver(forName: Notification.Name("com.apple.screenIsUnlocked"), object: nil, queue: .main) { _ in
    update(false)
}

let test = CommandLine.arguments.contains("--test")
var locked = screenIsLocked()
log(test ? "test mode" : "waiting for lock (now \(locked ? "locked" : "unlocked"))")
if locked && !test {
    keepAwake(true)
    startBlinking()
}

// Backup for missed notifications: read the session state once per second
Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
    if !test { update(screenIsLocked()) }
}

let rhythmTicks = Int(rhythmSeconds / tickSeconds)

Timer.scheduledTimer(withTimeInterval: tickSeconds, repeats: true) { _ in
    if test {
        // 8 seconds per rhythm, then stop
        let index = tick / 80
        guard index < rhythms.count else {
            set(0)
            exit(0)
        }
        if tick % 80 == 0 { log(rhythms[index].name) }
        set(rhythms[index].mask(tick % 80))
        tick += 1
    } else if locked {
        let nowPaused = inputSinceLock()
        if nowPaused != paused {
            paused = nowPaused
            log(paused ? "input: paused" : "no input: blinking")
        }
        if paused {
            set(capsIsOn() ? 2 : 0)
        } else {
            if tick > 0 && tick % rhythmTicks == 0 { nextRhythm() }
            set(rhythm.mask(tick - rhythmStart))
            tick += 1
        }
    }
}

RunLoop.main.run()
