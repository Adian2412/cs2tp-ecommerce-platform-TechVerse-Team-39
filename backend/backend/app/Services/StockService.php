<?php
class StockService {
    // check if the requested quantity for a product variant is available in stock
 
    public function checkStock(array $stock,array $orderItems) : array
{
foreach ($orderItems as $item) {
$variantId = $item['product_variant_id'] ?? null;
$qty       = isset($item['quantity']) ? intval($item['quantity']) : 0;

if (!$variantId) {
  return [
'success' => false,
'message' => 'invalid product variant id.' 
 ];
}

if (!isset($stock[$variantId]))  {
  return [
'success' => false,
'message' => 'insufficient stock for product variant ' .$variantId . 'is not in stock.'
 ];
 }

 if ($qty < 1 ) {
return [
'success' => false,
'message' => 'invalid quantity for product variant.' . $variantId. '.'
];
 }

 if ($stock[$variantId] < $qty) {
  return [
'success' => false,
'message' => ' product variant ' .$variantId . 'is not in stock list.'
 ];
 }
}
return [
'success' => true,
'message' => 'all items are in stock.'
];


 

 // reduce stock levels based on the processed order
    public function applyOrderToStock(array $stock, array $orderItems): array
    {
     foreach ($orderItems as $item) {
            $variantId = $item['product_variant_id'] ?? null;
            $qty = isset($item['quantity']) ? intval($item['quantity']) : 0;

            if ($variantId && isset($stock[$variantId])) {
                $stock[$variantId] =  $stock[$variantId]-$qty;

                if ($stock[$variantId] < 0) {
                    $stock[$variantId] = 0; 
                }
            }
        }
        return $stock;
    }
    // get stock status for a product variant
    public function getStockStatus(int $quantity,  int $lowThreshold = 5): string
    {

   if ($quantity <= 0) {
         return 'out_of_stock';
        } 
        elseif ($quantity <= $lowThreshold) {
            return 'low_stock';
        } else {
            return 'in_stock';
        }
      }
}
    