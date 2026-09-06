-- ============================================================================
-- CHECKOUT STOCK ATOMICITY (B1 fix)
-- Atomic, lock-based product stock decrement for checkout.
-- The whole function runs in ONE transaction: if ANY item cannot be
-- decremented, the exception rolls back EVERY update (no partial deduction,
-- no negative stock, no double deduction under concurrency thanks to
-- deterministic FOR UPDATE row locking).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.checkout_decrement_product_stock(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item        JSONB;
  v_id        UUID;
  v_qty       INT;
  v_total     INT;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  -- Pass 1: validate quantities and lock every product row in deterministic
  -- order (sorted by id) to prevent deadlocks between concurrent checkouts.
  FOR item IN
    SELECT je FROM jsonb_array_elements(p_items) je ORDER BY je->>'id'
  LOOP
    v_id  := (item->>'id')::UUID;
    v_qty := (item->>'qty')::INT;

    IF v_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_quantity', 'product_id', item->>'id');
    END IF;

    PERFORM 1 FROM public.products WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'product_not_found', 'product_id', v_id);
    END IF;
  END LOOP;

  -- Pass 2: verify availability then decrement. Row locks from pass 1 are
  -- still held, so no concurrent transaction can change stock in between.
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_id  := (item->>'id')::UUID;
    v_qty := (item->>'qty')::INT;

    UPDATE public.products
       SET stock_quantity = stock_quantity - v_qty,
           updated_at     = now()
     WHERE id = v_id
       AND is_active IS TRUE
       AND stock_quantity >= v_qty;

    IF NOT FOUND THEN
      -- Raising here rolls back ALL decrements from this call.
      RAISE EXCEPTION 'STOCK_INSUFFICIENT %', v_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;
