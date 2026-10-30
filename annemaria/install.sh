#!/bin/sh
# Builds Annemaria and starts it now and at every login
set -e
cd "$(dirname "$0")"

swiftc main.swift -o main

plist="$HOME/Library/LaunchAgents/cc.annemaria.plist"
launchctl unload "$plist" 2>/dev/null || true
sed "s|__DIR__|$PWD|g" cc.annemaria.plist > "$plist"
launchctl load "$plist"

echo "Running. Allow $PWD/main under Input Monitoring, the settings are opening now."
echo "Log: /tmp/annemaria.log"
open "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent"
