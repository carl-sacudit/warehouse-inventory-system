ALTER TABLE products
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER unit_price;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS average_unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER selling_price;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_srp DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER selling_price;

UPDATE products
SET selling_price = unit_price
WHERE selling_price = 0.00;

UPDATE products AS product
JOIN (
  SELECT
    product_id,
    SUM(quantity_received * unit_cost) / SUM(quantity_received) AS received_average_cost
  FROM purchase_order_items
  WHERE quantity_received > 0
  GROUP BY product_id
) AS purchase_costs ON purchase_costs.product_id = product.id
SET product.average_unit_cost = ROUND(purchase_costs.received_average_cost, 2)
WHERE product.average_unit_cost = 0.00;

UPDATE products
SET average_unit_cost = unit_price
WHERE average_unit_cost = 0.00;

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS original_selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  AFTER unit_cost;

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS supplier_srp DECIMAL(10, 2) NOT NULL DEFAULT 0.00
  AFTER original_selling_price;

UPDATE purchase_order_items AS item
JOIN products AS product ON product.id = item.product_id
SET item.original_selling_price = product.selling_price
WHERE item.original_selling_price = 0.00;

CREATE TABLE IF NOT EXISTS sales_orders (
  id INT NOT NULL AUTO_INCREMENT,
  sale_number VARCHAR(40) NOT NULL,
  customer_name VARCHAR(150) NULL,
  created_by INT NOT NULL,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  gross_profit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_orders_sale_number (sale_number),
  KEY idx_sales_orders_created_at (created_at),
  CONSTRAINT fk_sales_orders_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_order_items (
  id INT NOT NULL AUTO_INCREMENT,
  sales_order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_selling_price DECIMAL(10, 2) NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  line_revenue DECIMAL(12, 2) NOT NULL,
  line_cost DECIMAL(12, 2) NOT NULL,
  line_profit DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sales_order_items_order (sales_order_id),
  KEY idx_sales_order_items_product (product_id),
  CONSTRAINT fk_sales_order_items_order
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;