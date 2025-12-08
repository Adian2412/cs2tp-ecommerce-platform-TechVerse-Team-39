<?php
// public_html/api/cart.php
header('Content-Type: application/json');

require __DIR__ . '/../db.php';

// For demo: use a fixed user id. Replace with real logged-in user later.
const DEMO_USER_ID = 3;

$method = $_SERVER['REQUEST_METHOD'];

// Find or create basket for this user
function getBasketId(PDO $pdo, int $userId): int {
    $stmt = $pdo->prepare("SELECT id FROM baskets WHERE user_id = :uid LIMIT 1");
    $stmt->execute(['uid' => $userId]);
    $row = $stmt->fetch();
    if ($row) {
        return (int)$row['id'];
    }
    $stmt = $pdo->prepare(
        "INSERT INTO baskets (user_id, created_at, updated_at)
         VALUES (:uid, NOW(), NOW())"
    );
    $stmt->execute(['uid' => $userId]);
    return (int)$pdo->lastInsertId();
}

function getBasketItems(PDO $pdo, int $basketId): array {
    $sql = "SELECT 
                bi.product_variant_id,
                bi.quantity,
                p.id   AS product_id,
                p.name AS product_name,
                pv.price
            FROM basket_items bi
            JOIN product_variants pv ON bi.product_variant_id = pv.id
            JOIN products p          ON pv.product_id = p.id
            WHERE bi.basket_id = :bid";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['bid' => $basketId]);
    $rows = $stmt->fetchAll();

    $items = [];
    $subtotal = 0;
    $totalQty = 0;

    foreach ($rows as $r) {
        $price = (float)$r['price'];
        $qty   = (int)$r['quantity'];
        $line  = $price * $qty;
        $subtotal += $line;
        $totalQty += $qty;

        $items[] = [
            'product_id' => (int)$r['product_id'],
            'variant_id' => (int)$r['product_variant_id'],
            'name'       => $r['product_name'],
            'price'      => $price,
            'qty'        => $qty,
            'line_total' => $line,
        ];
    }

    return [
        'items'     => $items,
        'subtotal'  => $subtotal,
        'totalQty'  => $totalQty,
    ];
}

try {
    $basketId = getBasketId($pdo, DEMO_USER_ID);

    if ($method === 'GET') {
        echo json_encode(getBasketItems($pdo, $basketId));
        exit;
    }

    // For POST/DELETE, read JSON body
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: [];
    $action    = $data['action'] ?? 'add';
    $productId = isset($data['product_id']) ? (int)$data['product_id'] : 0;
    $qty       = isset($data['qty']) ? (int)$data['qty'] : 0;

    if (!in_array($action, ['add','update','clear'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        exit;
    }

    if ($action !== 'clear' && $productId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing product_id']);
        exit;
    }

    // Find a variant for this product
    if ($action !== 'clear') {
        $stmt = $pdo->prepare(
            "SELECT id FROM product_variants WHERE product_id = :pid LIMIT 1"
        );
        $stmt->execute(['pid' => $productId]);
        $v = $stmt->fetch();
        if (!$v) {
            http_response_code(404);
            echo json_encode(['error' => 'No variant for product']);
            exit;
        }
        $variantId = (int)$v['id'];
    }

    if ($action === 'clear') {
        $stmt = $pdo->prepare("DELETE FROM basket_items WHERE basket_id = :bid");
        $stmt->execute(['bid' => $basketId]);
    } elseif ($action === 'add') {
        // increase quantity if exists, otherwise insert
        $stmt = $pdo->prepare(
            "INSERT INTO basket_items (basket_id, product_variant_id, quantity)
             VALUES (:bid, :vid, :qty)
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)"
        );
        $stmt->execute([
            'bid' => $basketId,
            'vid' => $variantId,
            'qty' => max(1, $qty),
        ]);
    } elseif ($action === 'update') {
        if ($qty <= 0) {
            // Remove item
            $stmt = $pdo->prepare(
                "DELETE FROM basket_items
                 WHERE basket_id = :bid AND product_variant_id = :vid"
            );
            $stmt->execute(['bid' => $basketId, 'vid' => $variantId]);
        } else {
            $stmt = $pdo->prepare(
                "UPDATE basket_items
                 SET quantity = :qty
                 WHERE basket_id = :bid AND product_variant_id = :vid"
            );
            $stmt->execute([
                'qty' => $qty,
                'bid' => $basketId,
                'vid' => $variantId,
            ]);
        }
    }

    // Return updated basket
    echo json_encode(getBasketItems($pdo, $basketId));
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
