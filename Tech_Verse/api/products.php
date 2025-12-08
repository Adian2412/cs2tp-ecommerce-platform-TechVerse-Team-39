<?php
// public_html/api/products.php
header('Content-Type: application/json');

require __DIR__ . '/../db.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id > 0) {
    // Single product
    $sql = "SELECT 
              p.id,
              p.name,
              p.description,
              p.image_url,
              c.slug  AS category_slug,
              c.name  AS category_name,
              pv.price,
              IFNULL(s.quantity, pv.stock_qty) AS stock_quantity
            FROM products p
            JOIN categories c        ON p.category_id = c.id
            JOIN product_variants pv ON pv.product_id = p.id
            LEFT JOIN stock s        ON s.product_variant_id = pv.id
            WHERE p.id = :id AND p.active = 1
            LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
        exit;
    }

    echo json_encode([
        'id'            => (int)$row['id'],
        'name'          => $row['name'],
        'description'   => $row['description'],
        'price'         => (float)$row['price'],
        'image_url'     => $row['image_url'],
        'category_slug' => $row['category_slug'],
        'category_name' => $row['category_name'],
        'stock'         => (int)$row['stock_quantity'],
    ]);
    exit;
}

// List of products
$sql = "SELECT 
          p.id,
          p.name,
          p.description,
          p.image_url,
          c.slug  AS category_slug,
          c.name  AS category_name,
          pv.price,
          IFNULL(s.quantity, pv.stock_qty) AS stock_quantity
        FROM products p
        JOIN categories c        ON p.category_id = c.id
        JOIN product_variants pv ON pv.product_id = p.id
        LEFT JOIN stock s        ON s.product_variant_id = pv.id
        WHERE p.active = 1
        ORDER BY p.id ASC";
$rows = $pdo->query($sql)->fetchAll();

$out = [];
foreach ($rows as $r) {
    $out[] = [
        'id'            => (int)$r['id'],
        'name'          => $r['name'],
        'description'   => $r['description'],
        'price'         => (float)$r['price'],
        'image_url'     => $r['image_url'],
        'category_slug' => $r['category_slug'],
        'category_name' => $r['category_name'],
        'stock'         => (int)$r['stock_quantity'],
    ];
}

echo json_encode($out);
