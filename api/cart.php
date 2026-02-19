<?php
// cart.php – Secure version

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/security_helpers.php';

header('Content-Type: application/json');
enforceHttps();
sendSecurityHeaders();
session_start_secure();

$method = $_SERVER['REQUEST_METHOD'];

// CSRF check on state-changing requests
if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'], true)) {
    verifyCsrf();
}

// All cart operations require a logged-in user
$authUser = requireAuth();
$userId   = $authUser['id'];

// ── Basket helpers (all use prepared statements) ──────────────────────────────
function getBasketId(PDO $pdo, int $userId): int
{
    $stmt = $pdo->prepare(
        'SELECT id FROM baskets WHERE user_id = :uid LIMIT 1'
    );
    $stmt->execute(['uid' => $userId]);
    $row = $stmt->fetch();

    if ($row) {
        return (int)$row['id'];
    }

    $stmt = $pdo->prepare(
        'INSERT INTO baskets (user_id, created_at, updated_at)
         VALUES (:uid, NOW(), NOW())'
    );
    $stmt->execute(['uid' => $userId]);
    return (int)$pdo->lastInsertId();
}

function getBasketItems(PDO $pdo, int $basketId): array
{
    // All column values are fetched via PDO – no string interpolation in SQL
    $stmt = $pdo->prepare(
        'SELECT
            bi.product_variant_id,
            bi.quantity,
            p.id        AS product_id,
            p.name      AS product_name,
            p.image_url AS product_image,
            pv.price
         FROM basket_items bi
         JOIN product_variants pv ON bi.product_variant_id = pv.id
         JOIN products p          ON pv.product_id = p.id
         WHERE bi.basket_id = :bid'
    );
    $stmt->execute(['bid' => $basketId]);
    $rows = $stmt->fetchAll();

    $items    = [];
    $subtotal = 0.0;
    $totalQty = 0;

    foreach ($rows as $r) {
        $price = (float)$r['price'];
        $qty   = (int)$r['quantity'];
        $line  = $price * $qty;
        $subtotal += $line;
        $totalQty += $qty;

        $items[] = [
            'product_id'  => (int)$r['product_id'],
            'variant_id'  => (int)$r['product_variant_id'],
            // XSS: escape string fields before including in JSON
            'name'        => htmlspecialchars($r['product_name'], ENT_QUOTES, 'UTF-8'),
            'image'       => htmlspecialchars($r['product_image'] ?? '', ENT_QUOTES, 'UTF-8'),
            'price'       => $price,
            'qty'         => $qty,
            'line_total'  => round($line, 2),
        ];
    }

    return [
        'items'    => $items,
        'subtotal' => round($subtotal, 2),
        'totalQty' => $totalQty,
    ];
}

// ── Main logic ────────────────────────────────────────────────────────────────
try {
    $basketId = getBasketId($pdo, $userId);

    if ($method === 'GET') {
        jsonSuccess(getBasketItems($pdo, $basketId));
    }

    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: [];

    // Sanitise and validate inputs
    $action    = sanitiseString($data['action'] ?? 'add');
    $productId = isset($data['product_id']) ? (int)$data['product_id'] : 0;
    $qty       = isset($data['qty'])        ? (int)$data['qty']        : 0;

    if (!in_array($action, ['add', 'update', 'clear'], true)) {
        jsonError('Invalid action', 400);
    }
    if ($action !== 'clear' && $productId <= 0) {
        jsonError('Missing or invalid product_id', 400);
    }

    // Resolve variant via prepared statement
    $variantId = 0;
    if ($action !== 'clear') {
        $stmt = $pdo->prepare(
            'SELECT id FROM product_variants WHERE product_id = :pid LIMIT 1'
        );
        $stmt->execute(['pid' => $productId]);
        $v = $stmt->fetch();
        if (!$v) {
            jsonError('Product not found', 404);
        }
        $variantId = (int)$v['id'];
    }

    if ($action === 'clear') {
        $stmt = $pdo->prepare('DELETE FROM basket_items WHERE basket_id = :bid');
        $stmt->execute(['bid' => $basketId]);

    } elseif ($action === 'add') {
        $stmt = $pdo->prepare(
            'INSERT INTO basket_items (basket_id, product_variant_id, quantity)
             VALUES (:bid, :vid, :qty)
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)'
        );
        $stmt->execute([
            'bid' => $basketId,
            'vid' => $variantId,
            'qty' => max(1, $qty),
        ]);

    } elseif ($action === 'update') {
        if ($qty <= 0) {
            $stmt = $pdo->prepare(
                'DELETE FROM basket_items
                 WHERE basket_id = :bid AND product_variant_id = :vid'
            );
            $stmt->execute(['bid' => $basketId, 'vid' => $variantId]);
        } else {
            $stmt = $pdo->prepare(
                'UPDATE basket_items
                 SET quantity = :qty
                 WHERE basket_id = :bid AND product_variant_id = :vid'
            );
            $stmt->execute([
                'qty' => $qty,
                'bid' => $basketId,
                'vid' => $variantId,
            ]);
        }
    }

    jsonSuccess(getBasketItems($pdo, $basketId));

} catch (Throwable $e) {
    error_log('cart.php error: ' . $e->getMessage());
    // Never expose internal error details to the client
    jsonError('Server error', 500);
}
