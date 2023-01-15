"""
Converts the exported .mid.csv file into MPE (MIDI Polyphonic Expression) .mid files.

Creates one file per part.

Before you can run this, you need to install MIDIUtil from pip (Python's package manager).

Windows: `py -m pip install MIDIUtil`

Others: `python3 -m pip install MIDIUtil`

How to use: `python3 generate-mpe.py <path-to-file.mid.csv>`
"""

import argparse
import csv
from typing import Dict, List, Union
import midiutil

argparser = argparse.ArgumentParser("generate-mpe")
argparser.add_argument("filepath", help="Path to the .mid.csv file")
args = argparser.parse_args()

# Make sure you set this number to match the pitch band range setting of
# your VST. This number is in semitones.
PITCHBEND_RANGE = 2

try:
    with open(args.filepath, 'r') as f:
        contents = f.read().splitlines()
        ticks_per_quarter = int(contents[0])
        
        reader = csv.reader(contents[1:], delimiter=',')
        
        # Dict of staff to list of notes
        staff_notes: Dict[int, List[List[Union[int, float]]]] = {}
        
        max_staff = -1
        
        first_tick = 1e9
        
        for row in reader:
            staff = int(row[0])
            tick = int(row[2])
            if staff > max_staff:
                max_staff = staff
            
            if tick < first_tick:
                first_tick = tick
            
            if staff_notes.get(staff) is None:
                staff_notes[staff] = []
            
            staff_notes[staff].append([int(row[1]), tick, int(row[3]), int(row[4]), float(row[5])])
        
        if max_staff == -1:
            print("No notes found. Not exporting anything.")
            quit()
        
        mpe = midiutil.MIDIFile(
            max_staff + 1, 
            file_format=1, 
            ticks_per_quarternote=ticks_per_quarter, 
            eventtime_is_ticks=True,
            adjust_origin=True)
        
        
        for (track, notes) in staff_notes.items():
            # Send MPE configuration RPN (MSB 00, LSB 06)
            # upper zone mpe (send on channel 15 to use 0-14 as the zone)
            # Data MSB: 0xF (assigns 15 channels to zone)
            # Data LSB is ignored. Set to None.
            # Time order = True
            mpe.makeRPNCall(track, 15, first_tick, 0x00, 0x06, 0x0F, None, True)
            channel = 1 # round robin, channels 0-14 (15 is reserved for MPE zone messages)
            for [pitch, start, duration, velocity, cents] in notes:
                if velocity < 0:
                    velocity = 0
                elif velocity > 127:
                    velocity = 127
                
                mpe.addNote(track, channel, pitch, start, duration, velocity)
                
                pitchbend = int(cents / 100 / PITCHBEND_RANGE * 8192)
                mpe.addPitchWheelEvent(track, channel, start, pitchbend)
                
                channel += 1
                
                if channel > 15:
                    channel = 1
        
        export_path = args.filepath.replace(".mid.csv", ".mid")
        
        print(f'Exporting to "{export_path}"...')
        
        try:
            with open(export_path, "wb") as outfile:
                mpe.writeFile(outfile)
            print('Done!')
        except Exception as e:
            print(f"ERROR: Could not write file: {e}")
            exit()
except FileNotFoundError:
    print("ERROR: File not found.")
    exit()