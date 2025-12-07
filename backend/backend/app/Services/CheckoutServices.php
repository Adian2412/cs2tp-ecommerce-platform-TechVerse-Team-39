<?php

class CheckoutService
{
    /**
     * handles checkout logic: 
     *  - validate items 
     * caculate subtotal 
     * add shipping 
     * return final order structure ( larvel will be respnsible to save it later )
     */
public function processCheckout (array $cartItems, float $shippingCost, array $address )
{
    // if the cart is empty 
if (empty($cartItems)) {
    return [
 'success' => false,
 'message' => 'your basket  is empty.'
];
}
$items = [];
$subtotal = 0.0;

// validate each item in the cart & caculate total 
foreach ($cartItems as $item) {
$variantId = $item ['product_variant_id']?? null;
$name = $item['name'] ?? '';
$price = isset($item['unit_price']) ? floatval($item['unit_price']) : 0; 
$qty = isset($item['quantity']) ? intval($item['quantity']) : 0;

// basic validation
if (!$variantId || $qty < 1) { 
    return [
 'success' => false,
 'message' => 'invalid item in the basket.'
];
 }
//line total 
$lineTotal = $price * $qty;
$subtotal = $subtotal +  $lineTotal;

//store cleaned item
$items[] = [
'product_variant_id' => $variantId,
'name' => $name,
'unit_price' => $price,
'quantity' => $qty,
'line_total' => $lineTotal
];
}
// adress validation
if (empty($address['country']) || empty($address['line 1']) || empty($address['postal_code'])) {
    return [
 'success' => false,
 'message' => 'please add your delivery address.'
];
}
//final total 
if ($shippingCost < 0) {
    $shippingCost = 0;
}
$total = $subtotal +  $shippingCost;

return [
'success' => true,
'order' => [
'subtotal' => $subtotal,
'shipping_cost' => $shippingCost,
'total' => $total,
'items' => $items,
'address' => $address,
'status' => 'pending'
   ]
  ];
}
}
