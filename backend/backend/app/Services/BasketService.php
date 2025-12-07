<?php
class BasketService {
//add and item to the basket
// if it already exits, increase the quantity
public function addItem(array $basket, int $variantId, string $name, float $price, int $qty): array
{
if ($qty < 1) {
    return $basket; // invalid quantity 
}

$found = false;
foreach ($basket as $index => $item) {
    if (isset($item['product_variant_id']) && $item['product_variant_id'] === $variantId) {
$currentQty = isset($item['quantity']) ? intval($item['quantity']) : 0;
$basket[$index]['quantity'] = $currentQty + $qty;
$found = true;
break;
}
}

if (!$found) {
    $basket[] = [
'product_variant_id' => $variantId,
'name' => $name,
'unit_price' => $price,
'quantity' => $qty
    ];
}

return $basket;
}

//this updates the quantity of an item in the basket
// if the quantity is set to 0, remove the item
public function updateItemQuantity(array $basket, int $variantId, int $qty): array {
foreach ($basket as $index => $item) {
       if (isset($item['product_variant_id']) && $item['product_variant_id'] === $variantId) {
    if ($qty <= 0) {
        unset($basket[$index]);
    } else {
        $basket[$index]['quantity'] = $qty;
       }
    break;
       }
}
return array_values($basket); 
}

// caculate the total = sum(price * quantity) for all items in the basket
public function  calculateSubtotal(array $basket): float
{
$subtotal = 0;
foreach ($basket as $item) {
$price = isset($item['unit_price']) ? floatval($item['unit_price']) : 0;
$qty = isset($item['quantity']) ? intval($item['quantity']) : 0;
$subtotal += $price * $qty;
}
return $subtotal;
}
}