<?php
// api/products.php – Secure version
// Security: prepared statements (SQLi), XSS-safe JSON output,
//           HTTPS enforcement, security headers, input validation

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/security_helpers.php';

header('Content-Type: application/json');
enforceHttps();
sendSecurityHeaders();

// ── Input validation ──────────────────────────────────────────────────────────
$id           = isset($_GET['id'])       ? (int)$_GET['id']             : 0;
$categorySlug = isset($_GET['category']) ? sanitiseString($_GET['category']) : '';
$search       = isset($_GET['q'])        ? sanitiseString($_GET['q'])       : '';
$page         = isset($_GET['page'])     ? max(1, (int)$_GET['page'])       : 1;
$perPage      = 24; // fixed page size – don't let client control this
$offset       = ($page - 1) * $perPage;

// Helper: escape a product row for safe JSON output
function safeProduct(array $r): array
{
    return [
        'id'            => (int)$r['id'],
        'name'          => htmlspecialchars($r['name'],          ENT_QUOTES, 'UTF-8'),
        'description'   => htmlspecialchars($r['description'] ?? '', ENT_QUOTES, 'UTF-8'),
        'price'         => (float)$r['price'],
        'image_url'     => htmlspecialchars($r['image_url'] ?? '',   ENT_QUOTES, 'UTF-8'),
        'category_slug' => htmlspecialchars($r['category_slug'],     ENT_QUOTES, 'UTF-8'),
        'category_name' => htmlspecialchars($r['category_name'],     ENT_QUOTES, 'UTF-8'),
        'stock'         => (int)$r['stock_quantity'],
    ];
}

try {
    // ── Single product ────────────────────────────────────────────────────────
    if ($id > 0) {
        $sql = 'SELECT
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
                LIMIT 1';

        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            jsonError('Product not found', 404);
        }

        // Fetch attributes (also via prepared statement)
        $attrStmt = $pdo->prepare(
            'SELECT attribute_name, attribute_value
             FROM product_attributes
             WHERE product_id = :pid
             ORDER BY id'
        );
        $attrStmt->execute(['pid' => (int)$row['id']]);
        $attrs = [];
        foreach ($attrStmt->fetchAll() as $a) {
            $attrs[htmlspecialchars($a['attribute_name'], ENT_QUOTES, 'UTF-8')]
                = htmlspecialchars($a['attribute_value'], ENT_QUOTES, 'UTF-8');
        }

        $product               = safeProduct($row);
        $product['attributes'] = $attrs;

        jsonSuccess($product);
    }

    // ── Product list (with optional category/search filter) ───────────────────
    $params = ['active' => 1];
    $where  = ['p.active = :active'];

    if ($categorySlug !== '') {
        $where[]              = 'c.slug = :cat';
        $params['cat']        = $categorySlug;
    }
    if ($search !== '') {
        $where[]             = '(p.name LIKE :q OR p.description LIKE :q)';
        // Escape LIKE wildcards in the search string to prevent accidental % injection
        $safeLike            = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search) . '%';
        $params['q']         = $safeLike;
    }

    $whereClause = implode(' AND ', $where);

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
            WHERE {$whereClause}
            ORDER BY p.id ASC
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    // Bind named params first, then integer params separately
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    jsonSuccess(array_map('safeProduct', $rows));

} catch (Throwable $e) {
    error_log('products.php error: ' . $e->getMessage());
    jsonError('Server error', 500);
}
