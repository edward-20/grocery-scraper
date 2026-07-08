/unitPriceQuantity/ {
	s/"unitPriceQuantity": "([[:digit:]]+)([[:space:]]*)([[:alpha:]]+)"/"unitPriceQuantity": \1/
} 

/unitPriceUnit/ {
    s/"unitPriceUnit": "[0-9]+[[:space:]]*EA"/"unitPriceUnit": "Each"/
	t end

    s/"unitPriceUnit": "[0-9]+[[:space:]]*KG"/"unitPriceUnit": "Kg"/
	t end

    s/"unitPriceUnit": "[0-9]+[[:space:]]*G"/"unitPriceUnit": "g"/
	t end

    s/"unitPriceUnit": "[0-9]+[[:space:]]*L"/"unitPriceUnit": "L"/
	t end

    s/"unitPriceUnit": "[0-9]+[[:space:]]*ML"/"unitPriceUnit": "mL"/
	t end

    s/"unitPriceUnit": "[0-9]+[[:space:]]*sheets"/"unitPriceUnit": "sheets"/
	t end

    s/"unitPriceUnit": "[0-9]+[[:space:]]*M"/"unitPriceUnit": "m"/
	t end

	:end
}
