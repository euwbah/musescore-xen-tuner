# Tunings

This folder contains [tuning configs](../README.md#how-to-tuning-configuration) that can be activated within MuseScore by specifying the [path to the tuning config](../README.md#4-select-tuning-configuration--key-signatures) `.txt` file relative to this folder. (E.g., the System Text `updown/31edo.txt` will enable the 31 edo ups and downs notation as specified by [tunings/updown/31edo.txt](updown/31edo.txt)).

Feel free to [create your own tuning configurations](../README.md#how-to-tuning-configuration) using the provided configs as examples.

If you wish to contribute your custom tuning configs and have them persist through plugin updates, feel free to fork this repository & [make a pull request](https://github.com/euwbah/musescore-xen-tuner/pulls).

If you're not familliar with git, or need assistance with creating a tuning config, you can also [submit a tuning config contribution/request issue](https://github.com/euwbah/musescore-xen-tuner/issues/new?assignees=&labels=tuning+config+request&projects=&template=request-contribute-tuning-config.md&title=).

## Directory

- [chromatic/](./chromatic/) --- Chromatic staves

- [fokker](./fokker/) --- Fokker's sesqui/semi sharp/flat accidentals for 31edo and other even-sharpness edos.

- [heji](./heji/) --- Helmholtz-Ellis just intonation & tempered mappings that use HEJI accidentals

- [hewm](./hewm/) --- Helmholtz-Ellis-Wolf-Monzo notation that uses text-beasd accidentals for just intonation & JI mappings

- [neji](./neji/) --- Contains configs for near-equal just intonation tunings, which are notated as EDOs (TODO: there is a lot of possible variance in notation styles for NEJIs. Until one particular style is agreed upon, this should probably be in [userspace](./user/))

- [test](./test/) --- Random tuning configs that are used to test/debug plugin features.

- [updown](./updown/) --- Ups and downs notation (Kite / Ligature HEJI) for EDOs/EDXs based off pythagorean accidentals/chain-of-fifths and up/down arrows to fill in edosteps.

- [user](./user/) --- Userspace directory. Each user will have one folder to throw in whatever tuning configs they like.


Feel free to create more directories as needed.