#!/bin/sh

cd ../midi/
find . -exec timidity {} -Ov -o ../ogg/{} \;
cd ../ogg/
rename 's/\.mid/\.ogg/' *
