/"Stockcode"/ {s/[[:space:]]*"Stockcode"/{\n\tretailerProductId/; p}
/"Barcode"/ {s/[[:space:]]*"Barcode"/\tcrossRetailerId/; p}
/"GtinFormat"/ {s/[[:space:]]*"GtinFormat"/\tgtinFormat/; p}

/"DisplayName"/ {s/^[[:space:]]*"DisplayName":[[:space:]]*"(.*)"/\tname: "\1"\n}/p}

/"Brand"/ {s/[[:space:]]*"Brand"/\tbrand/}
/"UrlFriendlyName"/ {s/[[:space:]]*"UrlFriendlyName"/\tpath/; p}
/"Description"/ {s/[[:space:]]*"Description"/\tdescription/; p}

/"Price"/ {s/[[:space:]]*"Price"/\tprice/; p}

/"CupPrice"/ {s/[[:space:]]*"CupPrice"/\tunitPrice/; p}

/"CupMeasure"/ { s/[[:space:]]*"CupMeasure": "([0-9]+)([A-Za-z]+)",/\tunitPrice: \1,\n\tunitPriceUnit: \2,\n/;  p }

/"PackageSize"/ {s/[[:space:]]*"PackageSize"/\tsize/; p}

/"MediumImageFile"/ {s/[[:space:]]*"MediumImageFile"/\timageUrl/; p}
