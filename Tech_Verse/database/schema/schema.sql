-- Create / select database
CREATE DATABASE IF NOT EXISTS techverse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE techverse;

/* ===========================================================
   1) USERS, STAFF, CUSTOMERS
   =========================================================== */

-- Main users table: customers, staff, admins
DROP TABLE IF EXISTS staff_profiles;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Extra info for staff so admin can keep track of them
CREATE TABLE staff_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,      -- must be users.role = 'staff'
  managed_by BIGINT UNSIGNED NULL,       -- admin user
  job_title VARCHAR(120) NULL,
  phone VARCHAR(30) NULL,
  hire_date DATE NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_user    FOREIGN KEY (user_id)   REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_staff_manager FOREIGN KEY (managed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- Addresses for customers (can have multiple)
CREATE TABLE addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  line1 VARCHAR(180) NOT NULL,
  line2 VARCHAR(180) NULL,
  city VARCHAR(120) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  country VARCHAR(120) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

/* ===========================================================
   2) CATEGORIES, PRODUCTS, VARIANTS, PRODUCT-SPECIFIC DETAILS
   =========================================================== */

DROP TABLE IF EXISTS basket_items;
DROP TABLE IF EXISTS baskets;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS returns;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS product_attributes;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT NULL,
  brand VARCHAR(120) NULL,
  image_url VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_cat FOREIGN KEY (category_id) REFERENCES categories(id)
    ON UPDATE CASCADE,
  INDEX (category_id, active)
) ENGINE=InnoDB;

-- Each sellable version of a product (e.g. colour / size)
CREATE TABLE product_variants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  variant_label VARCHAR(120) NULL,       -- e.g. "Black / 256GB"
  price DECIMAL(10,2) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,      -- used by your tester
  low_stock_threshold INT NOT NULL DEFAULT 5,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_var_prod FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX (product_id)
) ENGINE=InnoDB;

-- Lectures (notes): product-specific details (noise cancellation etc.)
CREATE TABLE product_attributes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  attribute_name  VARCHAR(120) NOT NULL,
  attribute_value VARCHAR(255) NOT NULL,
  CONSTRAINT fk_attr_prod FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX (product_id, attribute_name)
) ENGINE=InnoDB;

/* ===========================================================
   3) STOCK TABLE + MOVEMENTS (teacher explicitly asked)
   =========================================================== */

CREATE TABLE stock (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_variant_id BIGINT UNSIGNED NOT NULL UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_variant_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('IN','OUT','ADJUST') NOT NULL,
  quantity INT NOT NULL,
  note VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,    -- staff/admin user
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sm_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sm_user    FOREIGN KEY (created_by)        REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX (product_variant_id, movement_type, created_at)
) ENGINE=InnoDB;

/* ===========================================================
   4) BASKET, ORDERS, RETURNS
   =========================================================== */

CREATE TABLE baskets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_basket_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE basket_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  basket_id BIGINT UNSIGNED NOT NULL,
  product_variant_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  UNIQUE (basket_id, product_variant_id),
  CONSTRAINT fk_bi_basket  FOREIGN KEY (basket_id)         REFERENCES baskets(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_bi_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
    ON UPDATE CASCADE,
  INDEX (product_variant_id)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  address_id BIGINT UNSIGNED NULL,
  status ENUM('pending','paid','shipped','returned','cancelled') NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id)   REFERENCES users(id)     ON UPDATE CASCADE,
  CONSTRAINT fk_order_addr FOREIGN KEY (address_id) REFERENCES addresses(id) ON UPDATE CASCADE,
  INDEX (user_id, status, created_at)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_variant_id BIGINT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)          REFERENCES orders(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oi_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
    ON UPDATE CASCADE,
  INDEX (order_id),
  INDEX (product_variant_id)
) ENGINE=InnoDB;

CREATE TABLE returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NULL,
  status ENUM('requested','approved','rejected','refunded') NOT NULL DEFAULT 'requested',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_return_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

/* ===========================================================
   5) REVIEWS (teacher also mentioned this)
   =========================================================== */

CREATE TABLE reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, product_id),
  CONSTRAINT fk_rev_user FOREIGN KEY (user_id)   REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_rev_prod FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

/* ===========================================================
   6) CONTACT MESSAGES (Contact Us form)
   =========================================================== */

DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
