#/usr/bin/sh

for file in *.json; do
	sed -if adjust-semi-parsed.sed $file
done
