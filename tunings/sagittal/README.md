# [Sagittal Notation](https://sagittal.org/)

![sagittal demo](../../imgs/sagittal-demo.png)

Access supported edos using System Text:

- `sagittal/___edo` for Evo variant (mixed pythagorean sharp/flat symbols and sagittal symbols).
- `sagittal/___edo revo` for Revo variant (pure sagittal symbols)

As of now, the [edo notation definitions](./edo_definitions.json) are taken from https://github.com/Sagittal/sagittal-system/blob/main/src/notations/edo/definitions.ts

[generate_edo.py](./generate_edo.py) uses the definitions to generate the Sagittal notation for defined edos.

### Gold edos

Gold edos (5/10/15/20/25/30/35b/...) map the limma (256/243) to 0 or negative, which means that F can be lower than or equal to E, and C lower or equal to B.

The standard Sagittal recommends is to ignore B and F in these edos, so there are only 5 nominals C D E G A. This is the default behavior implemented by the [generate_edo.py](./generate_edo.py) script. However, this script offers three configurations which you can set to `True` or `False` to change the implementation:

- `SKIP_NOMINALS_WHEN_GOLD`
  - `True`: (recommended) Omits either B or C, and skips either E or F for gold edos.
  - `False`: Keeps all 7 nominals, although the up/down arrows will have a preference for either one of the two options. To access the other option, use the enharmonic cycling `J` key. The following two options don't make a difference in this case.
- `GOLD_IGNORE_B`
  - `True`: (recommended) Use C instead of B for gold edos
  - `False`: Use B instead of C for gold edos.
- `GOLD_IGNORE_F`
  - `True`: (recommended) Use E instead of F for gold edos
  - `False`: Use F instead of E for gold edos