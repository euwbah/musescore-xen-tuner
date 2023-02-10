"""
Helper python script to autogenerate tuning overrides of each unique 
nominal & accidental vector combination of a NEJI.

Copy & paste the output of this script into the tuning config .txt
to declare the NEJI overrides.

Use this script and "34 under 71x3.txt" as a template to define your own NEJIs.

For even larger NEJIs, consider adding more degrees to the second accidental chain.

For 'perfect-edo' NEJIs (7,14,21...), remove the first accidental chain and use 
the second as the first, since sharps/flats don't map to anything.
"""

# This file is an example of how to generate the override()
# section of 34-neji 71*3 notated as standard 34 edo

# MODIFY THIS:
import math


NUM_NOTES = 34

# MODIFY THIS: (can use javascript expression to stretch cents)
# If neji_tunings are specified in cents, specify this in cents
# as well.
# 
# e.g. '1200c', instead of '2/1'
EQUAVE_INTERVAL = '2' # 2/1 equave

# MODIFY THIS:
# Tunings must all be of the same type (all ratios or all cents).

# (stolen from https://twitter.com/iamzheanna/status/1623848355003781121)
neji_tunings = [
 '1/1', '224/219', '76/73', '233/219', '238/219', '81/73',
  '247/219', '253/219', '86/73', '263/219', '268/219',
 '274/219', '280/219', '95/73', 
 '97/73','99/73','101/73','310/219','316/219','323/219',
 '329/219','112/73','343/219','350/219','119/73',
 '5/3','124/73','379/219','129/73','395/219','403/219',
 '412/219','140/73','143/73',
 #'2/1',
]

assert(len(neji_tunings) == NUM_NOTES)

apotome = 4 # MODIFY THIS no. of edosteps for 2187/2048 (sharp/apotome)
limma = 2 # MODIFY THIS no. of edosteps for 256/243 (diatonic semitone)

tone = apotome + limma


# sharps/flats chain degrees
acc_chain1 = range(-2,3) # -2 to 2 inclusive
acc_chain1_step_size = apotome # apotome size 4

# ups/downs chain degrees
acc_chain2 = range(-3,4) # -3 to 3 inclusive
acc_chain2_step_size = 1 # up/downs are 1 step

nominals_steps = [0, tone, tone*2, tone*3, tone*3+limma, tone*4+limma, tone*5+limma]

print('override()')
for nom_idx, nom_steps in enumerate(nominals_steps):
    for acc1 in acc_chain1:
        for acc2 in acc_chain2:
            acc1_steps = acc1 * acc_chain1_step_size
            acc2_steps = acc2 * acc_chain2_step_size
            neji_steps = acc1_steps + acc2_steps + nominals_steps[nom_idx]
            mod_steps = neji_steps % NUM_NOTES
            equave_offset = math.floor(neji_steps / NUM_NOTES)
            equave_offset_str = ''
            if equave_offset > 0:
                equave_offset_str = f'*({EQUAVE_INTERVAL})' * equave_offset
            elif equave_offset < 0:
                equave_offset_str = f'/({EQUAVE_INTERVAL})' * -equave_offset
            
            print(f'{nom_idx} {acc1} {acc2} {neji_tunings[mod_steps]}{equave_offset_str}')