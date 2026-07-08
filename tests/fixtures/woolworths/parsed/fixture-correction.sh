#!/usr/bin/env sh
set -eu

for file in woolworths-semi-parsed-product-page-*.json; do
	[ -e "$file" ] || continue

	sed -i -E -f adjust-semi-parsed.sed "$file"
	mv "$file" "woolworths-parsed-product-page-${file#woolworths-semi-parsed-product-page-}"
done
