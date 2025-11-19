-- Clear any old data (safe on a dev DB)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE returns;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE basket_items;
TRUNCATE TABLE baskets;
TRUNCATE TABLE reviews;
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE stock;
TRUNCATE TABLE product_attributes;
TRUNCATE TABLE product_variants;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE addresses;
TRUNCATE TABLE staff_profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users: 1 admin, 1 staff, 1 customer
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'TechVerse Admin',   'admin@techverse.local',   'admin_hash_here',   'admin'),
  (2, 'Inventory Staff',   'staff@techverse.local',   'staff_hash_here',   'staff'),
  (3, 'Test Customer',     'customer@techverse.local','customer_hash_here','customer');

INSERT INTO staff_profiles (user_id, managed_by, job_title, phone, hire_date)
VALUES (2, 1, 'Inventory Controller', '+44 20 7946 0000', '2025-09-01');

INSERT INTO addresses (id, user_id, line1, city, postcode, country, is_default)
VALUES (1, 3, '1 High Street', 'London', 'SW1A 1AA', 'UK', 1);

-- 5 TechVerse product categories
INSERT INTO categories (id, name, slug) VALUES
  (1, 'Headphones',  'headphones'),
  (2, 'Laptops',     'laptops'),
  (3, 'Smartphones', 'smartphones'),
  (4, 'Accessories', 'accessories'),
  (5, 'Gaming Gear', 'gaming-gear');

-- One sample product & variant for testing (id=1 everywhere)
INSERT INTO products (id, category_id, name, slug, description, brand, image_url)
VALUES (1, 1, 'TechVerse ANC Headset', 'tv-anc-headset',
        'Wireless over-ear headset with active noise cancellation.',
        'TechVerse', NULL);

INSERT INTO product_variants (id, product_id, sku, variant_label, price, stock_qty, low_stock_threshold)
VALUES (1, 1, 'TV-ANC-BLK', 'Black', 79.99, 12, 3);

-- Stock table mirrors initial quantity
INSERT INTO stock (product_variant_id, quantity, low_stock_threshold)
VALUES (1, 12, 3);

-- Product-specific details
INSERT INTO product_attributes (product_id, attribute_name, attribute_value) VALUES
  (1, 'Noise Cancellation', 'Yes'),
  (1, 'Bluetooth', '5.3'),
  (1, 'Battery Life', '30h');

-- One example review
INSERT INTO reviews (user_id, product_id, rating, comment)
VALUES (3, 1, 5, 'Great sound and very comfortable.');
