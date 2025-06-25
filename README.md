# Gamepad to MIDI Controller

A web-based application that converts gamepad inputs to MIDI messages, allowing you to use any gamepad as a MIDI controller for music production.

## Features

- **Real-time Gamepad Detection**: Automatically detects and displays connected gamepads
- **Axis to CC Mapping**: Maps analog stick/trigger values to MIDI Continuous Controller (CC) messages
- **Button to Note Mapping**: Maps button presses to MIDI note on/off messages
- **Configurable Mappings**: Set custom CC numbers, note numbers, and velocities for each control
- **MIDI Device Selection**: Choose from available MIDI output devices
- **Value Conversion**: Automatically converts gamepad values (-1 to 1) to MIDI range (0-127)

## How to Use

1. **Open the Application**: Open `index.html` in a modern web browser (Chrome, Firefox, Edge)
2. **Connect Gamepad**: Plug in your gamepad and press any button to activate it
3. **Select MIDI Device**: Choose your MIDI output device from the dropdown menu
4. **Configure Controls**:
   - **Axes (Analog Controls)**: 
     - Check "Enable" to activate MIDI CC output
     - Set the CC number (0-127) you want to control
     - Watch the real-time MIDI value display
   - **Buttons**:
     - Check "Enable" to activate MIDI note output
     - Set the note number (0-127, where 60 = Middle C)
     - Set the velocity (1-127) for note-on messages

## MIDI Mapping Details

### Axes (Analog Controls)
- **Input Range**: -1.0 to 1.0 (gamepad axis values)
- **Output Range**: 0 to 127 (MIDI CC values)
- **Center Point**: 64 (when axis is at 0)
- **Real-time**: Continuous CC messages sent while moving

### Buttons
- **Note On**: Sent when button is pressed with configured velocity
- **Note Off**: Sent when button is released (velocity 0)
- **Range**: Notes 0-127 (60 = Middle C4)
- **Velocity**: Configurable 1-127 per button

## Browser Requirements

- **Web MIDI API Support**: Chrome, Edge, or Firefox with MIDI enabled
- **Gamepad API Support**: All modern browsers
- **HTTPS**: May be required for MIDI access on some browsers

## Troubleshooting

1. **No MIDI Devices**: Ensure your MIDI interface is connected and recognized by your OS
2. **Gamepad Not Detected**: Press any button on the gamepad to activate it
3. **Permission Issues**: Allow MIDI access when prompted by the browser
4. **HTTPS Required**: Some browsers require HTTPS for MIDI access

## Technical Notes

- Uses Web MIDI API for MIDI output
- Uses Gamepad API for controller input
- Real-time processing at 60fps
- Automatic gamepad hot-plugging support
- Memory cleanup when gamepads disconnect

## Default Mappings

- **Axes**: CC 1, 2, 3, 4... (in order)
- **Buttons**: Notes starting from C4 (60, 61, 62...)
- **Velocity**: 127 (maximum) for all buttons
- **All controls start disabled** - you must enable them individually

Enjoy making music with your gamepad!
