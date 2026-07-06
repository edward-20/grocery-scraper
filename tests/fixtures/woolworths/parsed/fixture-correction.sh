#/usr/bin/sh

for file in *.json; do
	sed -i -E -f adjust-semi-parsed.sed $file
done
