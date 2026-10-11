INSERT INTO categories (name)
SELECT category_name
FROM (
  SELECT 'Hardware & Construction Supplies' AS category_name
  UNION ALL SELECT 'Building Materials'
  UNION ALL SELECT 'Tools & Equipment'
  UNION ALL SELECT 'Electrical Supplies'
  UNION ALL SELECT 'Plumbing Supplies'
  UNION ALL SELECT 'Fasteners & Fixings'
  UNION ALL SELECT 'Safety & PPE'
  UNION ALL SELECT 'Electronics'
  UNION ALL SELECT 'Office Supplies'
  UNION ALL SELECT 'Packaging Materials'
) AS default_categories
WHERE NOT EXISTS (
  SELECT 1
  FROM categories AS existing_categories
  WHERE existing_categories.name = default_categories.category_name
);
