-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 22, 2026 at 09:34 AM
-- Server version: 8.0.45-0ubuntu0.22.04.1
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cs2team39_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `addresses`
--

CREATE TABLE `addresses` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `line1` varchar(180) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `line2` varchar(180) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `city` varchar(120) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `postcode` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `country` varchar(120) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `baskets`
--

CREATE TABLE `baskets` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `basket_items`
--

CREATE TABLE `basket_items` (
  `id` bigint UNSIGNED NOT NULL,
  `basket_id` bigint UNSIGNED NOT NULL,
  `product_variant_id` bigint UNSIGNED NOT NULL,
  `quantity` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `slug` varchar(140) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`) VALUES
(1, 'Audio', 'audio'),
(2, 'Laptops & PCs', 'laptops-pcs'),
(3, 'Accessories', 'accessories'),
(4, 'Monitors & Displays', 'monitors-displays'),
(5, 'Gaming & Consoles', 'gaming-consoles');

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `address_id` bigint UNSIGNED DEFAULT NULL,
  `status` enum('pending','paid','shipped','delivered','returned','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'pending',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `product_variant_id` bigint UNSIGNED NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint UNSIGNED NOT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `name` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `slug` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `brand` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `image_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `is_sold` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `user_id`, `name`, `slug`, `description`, `brand`, `image_url`, `active`, `is_sold`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'Wireless Noise-Cancelling Headphones', 'wireless-noise-cancelling-headphones', 'Over-ear wireless headphones with noise cancellation and long battery life.', 'TechVerse Audio', 'images/products/wireless-noise-cancelling-headphones.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(2, 1, NULL, 'True Wireless Earbuds', 'true-wireless-earbuds', 'Compact earbuds with charging case and touch controls.', 'TechVerse Audio', 'images/products/true-wireless-earbuds.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(3, 1, NULL, 'Portable Bluetooth Speaker', 'portable-bluetooth-speaker', 'Portable speaker with rich sound and splash resistance.', 'TechVerse Audio', 'images/products/portable-bluetooth-speaker.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(4, 1, NULL, 'USB Condenser Microphone', 'usb-condenser-microphone', 'USB microphone ideal for streaming, study and voice recording.', 'TechVerse Audio', 'images/products/usb-condenser-microphone.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(5, 1, NULL, 'Compact Soundbar', 'compact-soundbar', 'Slim soundbar for desktop and TV setups.', 'TechVerse Audio', 'images/products/compact-soundbar.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(6, 2, NULL, '15.6 i5 Student Laptop', '15-6-i5-student-laptop', 'Reliable student laptop with 16GB RAM and SSD storage.', 'TechVerse Compute', 'images/products/15-6-i5-student-laptop.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(7, 2, NULL, '14 Ryzen Productivity Laptop', '14-ryzen-productivity-laptop', 'Portable 14-inch laptop for office and university work.', 'TechVerse Compute', 'images/products/14-ryzen-productivity-laptop.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(8, 2, NULL, 'Mini Office PC', 'mini-office-pc', 'Small form-factor PC for office and study use.', 'TechVerse Compute', 'images/products/mini-office-pc.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(9, 2, NULL, 'Core i7 Desktop Tower', 'core-i7-desktop-tower', 'Desktop tower for multitasking, productivity and light content work.', 'TechVerse Compute', 'images/products/core-i7-desktop-tower.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(10, 2, NULL, '24 All-in-One PC', '24-all-in-one-pc', 'Space-saving all-in-one desktop with integrated display.', 'TechVerse Compute', 'images/products/24-all-in-one-pc.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(11, 3, NULL, 'RGB Mechanical Keyboard', 'rgb-mechanical-keyboard', 'Mechanical keyboard with tactile switches and RGB lighting.', 'TechVerse Gear', 'images/products/rgb-mechanical-keyboard.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(12, 3, NULL, 'Wireless Ergonomic Mouse', 'wireless-ergonomic-mouse', 'Comfort-focused wireless mouse for long sessions.', 'TechVerse Gear', 'images/products/wireless-ergonomic-mouse.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(13, 3, NULL, '7-in-1 USB-C Hub', '7-in-1-usb-c-hub', 'USB-C hub with HDMI, USB, SD and PD charging.', 'TechVerse Gear', 'images/products/7-in-1-usb-c-hub.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(14, 3, NULL, '1080p USB Webcam', '1080p-usb-webcam', 'Full HD webcam for classes, calls and streaming.', 'TechVerse Gear', 'images/products/1080p-usb-webcam.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(15, 3, NULL, 'Aluminium Laptop Stand', 'aluminium-laptop-stand', 'Adjustable laptop stand for better posture and airflow.', 'TechVerse Gear', 'images/products/aluminium-laptop-stand.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(16, 4, NULL, '24 Full HD IPS Monitor', '24-full-hd-ips-monitor', '24-inch IPS monitor for study and general use.', 'TechVerse Display', 'images/products/24-full-hd-ips-monitor.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(17, 4, NULL, '27 QHD Monitor', '27-qhd-monitor', '27-inch QHD monitor with crisp text and strong colour.', 'TechVerse Display', 'images/products/27-qhd-monitor.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(18, 4, NULL, '27 4K IPS Monitor', '27-4k-ips-monitor', '4K IPS monitor suited for productivity and content work.', 'TechVerse Display', 'images/products/27-4k-ips-monitor.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(19, 4, NULL, '15.6 Portable Monitor', '15-6-portable-monitor', 'Portable display for dual-screen productivity on the go.', 'TechVerse Display', 'images/products/15-6-portable-monitor.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(20, 4, NULL, '34 Ultrawide Monitor', '34-ultrawide-monitor', 'Ultrawide monitor for immersive multitasking and media.', 'TechVerse Display', 'images/products/34-ultrawide-monitor.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(21, 5, NULL, 'Surround Gaming Headset', 'surround-gaming-headset', 'Gaming headset with virtual surround and boom mic.', 'TechVerse Gaming', 'images/products/surround-gaming-headset.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(22, 5, NULL, 'Lightweight Gaming Mouse', 'lightweight-gaming-mouse', 'Fast-response gaming mouse with RGB lighting.', 'TechVerse Gaming', 'images/products/lightweight-gaming-mouse.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(23, 5, NULL, 'Wireless Game Controller', 'wireless-game-controller', 'Wireless controller compatible with PC and console setups.', 'TechVerse Gaming', 'images/products/wireless-game-controller.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(24, 5, NULL, 'USB Capture Card', 'usb-capture-card', 'Capture card for recording and streaming gameplay.', 'TechVerse Gaming', 'images/products/usb-capture-card.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(25, 5, NULL, 'RGB Gaming Mouse Pad', 'rgb-gaming-mouse-pad', 'Extended RGB mouse pad with smooth tracking surface.', 'TechVerse Gaming', 'images/products/rgb-gaming-mouse-pad.jpg', 1, 0, '2026-03-22 08:21:14', '2026-03-22 08:21:14');

-- --------------------------------------------------------

--
-- Table structure for table `product_attributes`
--

CREATE TABLE `product_attributes` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `attribute_name` varchar(120) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `attribute_value` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `image_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `image_path`, `is_primary`, `created_at`, `updated_at`) VALUES
(1, 1, 'images/products/wireless-noise-cancelling-headphones.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(2, 2, 'images/products/true-wireless-earbuds.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(3, 3, 'images/products/portable-bluetooth-speaker.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(4, 4, 'images/products/usb-condenser-microphone.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(5, 5, 'images/products/compact-soundbar.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(6, 6, 'images/products/15-6-i5-student-laptop.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(7, 7, 'images/products/14-ryzen-productivity-laptop.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(8, 8, 'images/products/mini-office-pc.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(9, 9, 'images/products/core-i7-desktop-tower.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(10, 10, 'images/products/24-all-in-one-pc.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(11, 11, 'images/products/rgb-mechanical-keyboard.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(12, 12, 'images/products/wireless-ergonomic-mouse.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(13, 13, 'images/products/7-in-1-usb-c-hub.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(14, 14, 'images/products/1080p-usb-webcam.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(15, 15, 'images/products/aluminium-laptop-stand.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(16, 16, 'images/products/24-full-hd-ips-monitor.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(17, 17, 'images/products/27-qhd-monitor.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(18, 18, 'images/products/27-4k-ips-monitor.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(19, 19, 'images/products/15-6-portable-monitor.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(20, 20, 'images/products/34-ultrawide-monitor.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(21, 21, 'images/products/surround-gaming-headset.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(22, 22, 'images/products/lightweight-gaming-mouse.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(23, 23, 'images/products/wireless-game-controller.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(24, 24, 'images/products/usb-capture-card.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(25, 25, 'images/products/rgb-gaming-mouse-pad.jpg', 1, '2026-03-22 08:21:14', '2026-03-22 08:21:14');

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `sku` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `variant_label` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock_qty` int NOT NULL DEFAULT '0',
  `low_stock_threshold` int NOT NULL DEFAULT '5',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `variant_label`, `price`, `stock_qty`, `low_stock_threshold`, `created_at`, `updated_at`) VALUES
(1, 1, 'TV-AUD-001', 'Default', '79.99', 14, 3, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(2, 2, 'TV-AUD-002', 'Default', '59.99', 18, 4, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(3, 3, 'TV-AUD-003', 'Default', '49.99', 12, 3, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(4, 4, 'TV-AUD-004', 'Default', '89.99', 10, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(5, 5, 'TV-AUD-005', 'Default', '119.99', 8, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(6, 6, 'TV-LAP-001', 'Default', '699.00', 7, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(7, 7, 'TV-LAP-002', 'Default', '629.00', 9, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(8, 8, 'TV-LAP-003', 'Default', '399.00', 6, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(9, 9, 'TV-LAP-004', 'Default', '899.00', 5, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(10, 10, 'TV-LAP-005', 'Default', '749.00', 4, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(11, 11, 'TV-ACC-001', 'Default', '89.99', 20, 4, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(12, 12, 'TV-ACC-002', 'Default', '34.99', 25, 5, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(13, 13, 'TV-ACC-003', 'Default', '29.99', 22, 5, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(14, 14, 'TV-ACC-004', 'Default', '39.99', 16, 4, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(15, 15, 'TV-ACC-005', 'Default', '24.99', 18, 4, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(16, 16, 'TV-MON-001', 'Default', '149.99', 11, 3, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(17, 17, 'TV-MON-002', 'Default', '229.99', 8, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(18, 18, 'TV-MON-003', 'Default', '279.99', 6, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(19, 19, 'TV-MON-004', 'Default', '169.99', 10, 3, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(20, 20, 'TV-MON-005', 'Default', '399.99', 5, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(21, 21, 'TV-GAM-001', 'Default', '64.99', 15, 3, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(22, 22, 'TV-GAM-002', 'Default', '44.99', 17, 4, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(23, 23, 'TV-GAM-003', 'Default', '54.99', 14, 3, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(24, 24, 'TV-GAM-004', 'Default', '89.99', 9, 2, '2026-03-22 08:21:14', '2026-03-22 08:21:14'),
(25, 25, 'TV-GAM-005', 'Default', '19.99', 21, 5, '2026-03-22 08:21:14', '2026-03-22 08:21:14');

-- --------------------------------------------------------

--
-- Table structure for table `returns`
--

CREATE TABLE `returns` (
  `id` bigint UNSIGNED NOT NULL,
  `order_item_id` bigint UNSIGNED NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('requested','approved','rejected','refunded') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'requested',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_reviews`
--

CREATE TABLE `service_reviews` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('Kt4rwXJ67H2Tmw8ijrnkmTVyNnAV02Sf7a2LYGc8', 1, '185.182.52.252', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', 'YTo0OntzOjY6Il90b2tlbiI7czo0MDoiNldrdGdZcGN1VVlWSEM4dzJnd212Zlc5OGV6dExmajl2MFdDOWpNZiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NzE6Imh0dHBzOi8vY3MydGVhbTM5LmNzMjQxMC13ZWIwMXB2bS5hc3Rvbi5hYy51ay9hcGkvcHJvZHVjdHM/cGVyX3BhZ2U9MjAwIjtzOjU6InJvdXRlIjtOO31zOjY6Il9mbGFzaCI7YToyOntzOjM6Im9sZCI7YTowOnt9czozOiJuZXciO2E6MDp7fX1zOjUwOiJsb2dpbl93ZWJfNTliYTM2YWRkYzJiMmY5NDAxNTgwZjAxNGM3ZjU4ZWE0ZTMwOTg5ZCI7aToxO30=', 1774167803);

-- --------------------------------------------------------

--
-- Table structure for table `staff_profiles`
--

CREATE TABLE `staff_profiles` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `managed_by` bigint UNSIGNED DEFAULT NULL,
  `job_title` varchar(120) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock`
--

CREATE TABLE `stock` (
  `id` bigint UNSIGNED NOT NULL,
  `product_variant_id` bigint UNSIGNED NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `low_stock_threshold` int NOT NULL DEFAULT '5',
  `last_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `stock`
--

INSERT INTO `stock` (`id`, `product_variant_id`, `quantity`, `low_stock_threshold`, `last_updated`) VALUES
(1, 1, 14, 3, '2026-03-22 08:21:14'),
(2, 2, 18, 4, '2026-03-22 08:21:14'),
(3, 3, 12, 3, '2026-03-22 08:21:14'),
(4, 4, 10, 2, '2026-03-22 08:21:14'),
(5, 5, 8, 2, '2026-03-22 08:21:14'),
(6, 6, 7, 2, '2026-03-22 08:21:14'),
(7, 7, 9, 2, '2026-03-22 08:21:14'),
(8, 8, 6, 2, '2026-03-22 08:21:14'),
(9, 9, 5, 2, '2026-03-22 08:21:14'),
(10, 10, 4, 2, '2026-03-22 08:21:14'),
(11, 11, 20, 4, '2026-03-22 08:21:14'),
(12, 12, 25, 5, '2026-03-22 08:21:14'),
(13, 13, 22, 5, '2026-03-22 08:21:14'),
(14, 14, 16, 4, '2026-03-22 08:21:14'),
(15, 15, 18, 4, '2026-03-22 08:21:14'),
(16, 16, 11, 3, '2026-03-22 08:21:14'),
(17, 17, 8, 2, '2026-03-22 08:21:14'),
(18, 18, 6, 2, '2026-03-22 08:21:14'),
(19, 19, 10, 3, '2026-03-22 08:21:14'),
(20, 20, 5, 2, '2026-03-22 08:21:14'),
(21, 21, 15, 3, '2026-03-22 08:21:14'),
(22, 22, 17, 4, '2026-03-22 08:21:14'),
(23, 23, 14, 3, '2026-03-22 08:21:14'),
(24, 24, 9, 2, '2026-03-22 08:21:14'),
(25, 25, 21, 5, '2026-03-22 08:21:14');

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `product_variant_id` bigint UNSIGNED NOT NULL,
  `movement_type` enum('IN','OUT','ADJUST') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `quantity` int NOT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `role` enum('customer','staff','admin') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'customer',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `created_at`, `updated_at`) VALUES
(1, 'Admin User', 'admin@techverse.local', '$2y$12$DdwoIBuoyWIalFGna46QMOTTYJEDm6WNbvaKhyy8OtX/9g/CuJmyy', 'admin', '2025-12-09 01:36:43', '2026-03-20 08:07:56'),
(2, 'Staff Member', 'staff@techverse.local', '$2y$10$examplehashstaff', 'staff', '2025-12-09 01:36:43', '2025-12-09 01:36:43'),
(3, 'Test Customer', 'customer@techverse.local', '$2y$10$examplehashcust', 'customer', '2025-12-09 01:36:43', '2025-12-09 01:36:43'),
(6, 'Zain Shabaan', 'zainshabaan@outlook.com', '$2y$12$Jx3hB2jnpxK31e0DRNGfBulGy7u7SAjkYed1lTOO8WZfuA3GXDlgK', 'customer', '2025-12-09 10:57:07', '2025-12-09 10:57:07'),
(7, 'test test', 'test@example.com', '$2y$12$mcvE1i8ZSvu.KZRnkmEK1OxEv3G0GJNlSgnSKK7TbyodxYKsFvDTO', 'customer', '2025-12-09 11:08:21', '2025-12-09 11:08:21'),
(8, 'Zain Shabaan', 'zainshabaan55@gmail.com', '$2y$12$Pfxxc4.dCElizEpCov1WQuB4wtQWEnyFTfTUvVzd6/KI607smudAO', 'customer', '2025-12-09 11:10:03', '2025-12-09 11:10:03'),
(9, 'Zain Shabaan', '240231943@aston.ac.uk', '$2y$12$xxIspxkIZygBLsY39u1rL.p7ZB8aA7TBLcjaEJ9G/8VY3HncEwAmu', 'customer', '2025-12-09 11:15:03', '2025-12-09 11:15:03'),
(10, 'Quang Mai', 'cocicreerve@gmail.com', '$2y$12$f9IGGbpGnwcs9tqcs6aY5e9f9WQjy7Pj5bbB.llj2ekNlfwr5cNcq', 'customer', '2026-02-03 11:40:57', '2026-02-03 11:40:57'),
(11, 'Yes No', 'test@gmail.com', '$2y$12$OBfYDBs.w4ftXiIy2wiBhe4MtJ5UdOZ/ai0wOu6TPU4/DaVhmSn.G', 'customer', '2026-03-20 07:04:59', '2026-03-20 07:04:59');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `addresses`
--
ALTER TABLE `addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_addr_user` (`user_id`);

--
-- Indexes for table `baskets`
--
ALTER TABLE `baskets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `basket_items`
--
ALTER TABLE `basket_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `basket_id` (`basket_id`,`product_variant_id`),
  ADD KEY `product_variant_id` (`product_variant_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_order_addr` (`address_id`),
  ADD KEY `user_id` (`user_id`,`status`,`created_at`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_variant_id` (`product_variant_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `category_id` (`category_id`,`active`),
  ADD KEY `fk_prod_user` (`user_id`);

--
-- Indexes for table `product_attributes`
--
ALTER TABLE `product_attributes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`,`attribute_name`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product_images_product_id` (`product_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `returns`
--
ALTER TABLE `returns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_return_item` (`order_item_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`product_id`),
  ADD KEY `fk_rev_prod` (`product_id`);

--
-- Indexes for table `service_reviews`
--
ALTER TABLE `service_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_service_review_user` (`user_id`),
  ADD KEY `idx_service_review_created` (`created_at`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sessions_user_id` (`user_id`),
  ADD KEY `idx_sessions_last_activity` (`last_activity`);

--
-- Indexes for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_staff_user` (`user_id`),
  ADD KEY `fk_staff_manager` (`managed_by`);

--
-- Indexes for table `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_variant_id` (`product_variant_id`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sm_user` (`created_by`),
  ADD KEY `product_variant_id` (`product_variant_id`,`movement_type`,`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `addresses`
--
ALTER TABLE `addresses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `baskets`
--
ALTER TABLE `baskets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `basket_items`
--
ALTER TABLE `basket_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `product_attributes`
--
ALTER TABLE `product_attributes`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `returns`
--
ALTER TABLE `returns`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_reviews`
--
ALTER TABLE `service_reviews`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock`
--
ALTER TABLE `stock`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `addresses`
--
ALTER TABLE `addresses`
  ADD CONSTRAINT `fk_addr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `baskets`
--
ALTER TABLE `baskets`
  ADD CONSTRAINT `fk_basket_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `basket_items`
--
ALTER TABLE `basket_items`
  ADD CONSTRAINT `fk_bi_basket` FOREIGN KEY (`basket_id`) REFERENCES `baskets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bi_variant` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_order_addr` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_oi_variant` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_prod_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prod_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `product_attributes`
--
ALTER TABLE `product_attributes`
  ADD CONSTRAINT `fk_attr_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `fk_var_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `returns`
--
ALTER TABLE `returns`
  ADD CONSTRAINT `fk_return_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_rev_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `staff_profiles`
--
ALTER TABLE `staff_profiles`
  ADD CONSTRAINT `fk_staff_manager` FOREIGN KEY (`managed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stock`
--
ALTER TABLE `stock`
  ADD CONSTRAINT `fk_stock_variant` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_sm_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sm_variant` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
