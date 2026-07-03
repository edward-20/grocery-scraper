/"Stockcode"/ {s/"Stockcode"/retailerProductId/; p}
/"Barcode"/ {s/"Barcode"/crossRetailerId/; p}
/"GtinFormat"/ {s/"GtinFormat"/gtinFormat/; p}
/"DisplayName"/ {s/"DisplayName"/name/; p}
/"Brand"/ {s/"Brand"/brand/}
/"UrlFriendlyName"/ {s/"UrlFriendlyName"/path/; p}
/"Description"/ {s/"Description"/description/; p}

/"Price"/ {s/"Price"/price/; p}

/"CupPrice"/ {s/"CupPrice"/unitPrice/; p}

/"CupMeasure"/ { s/"CupMeasure": "([0-9]+)([A-Za-z]+)",/unitPrice: \1,\n unitPriceUnit: \2,\n/;  p }

/"PackageSize"/ {s/"PackageSize"/size/; p}

/"MediumImageFile"/ {s/"MediumImageFile"/imageUrl/; p}
