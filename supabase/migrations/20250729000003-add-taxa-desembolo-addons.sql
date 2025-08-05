-- Add new "Taxa de Desembolo" add-ons for different pet sizes
INSERT INTO service_addons (id, name, price, active, created_at) VALUES
  (gen_random_uuid(), 'Taxa de Desembolo (P)', 20, true, now()),
  (gen_random_uuid(), 'Taxa de Desembolo (M)', 30, true, now()),
  (gen_random_uuid(), 'Taxa de Desembolo (G)', 40, true, now());

-- Add comment for documentation
COMMENT ON TABLE service_addons IS 'Service add-ons table including Taxa de Desembolo fees by pet size (P=Small, M=Medium, G=Large)'; 