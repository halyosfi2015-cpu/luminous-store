const fs = require("fs");
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" };
const U = env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/";
async function rpc(name, args) {
  const r = await fetch(U + "rpc/" + name, { method: "POST", headers: H, body: JSON.stringify(args) });
  return { status: r.status, body: await r.text() };
}
async function getProduct(id) {
  const r = await fetch(U + "products?id=eq." + id + "&select=id,name,stock_quantity,is_active,pricing", { headers: H });
  return (await r.json())[0];
}
(async () => {
  // pick a real active product
  let r = await fetch(U + "products?is_active=eq.true&stock_quantity=gte.5&limit=1&select=id", { headers: H });
  const prod = (await r.json())[0];
  console.log("TEST PRODUCT:", prod.id);
  const before = (await getProduct(prod.id)).stock_quantity;
  console.log("stock before:", before);

  // T1: valid decrement of 2
  let res = await rpc("checkout_decrement_product_stock", { p_items: [{ id: prod.id, qty: 2 }] });
  const afterT1 = (await getProduct(prod.id)).stock_quantity;
  console.log("T1 valid dec-2:", res.status, res.body, "stock:", before, "->", afterT1, afterT1 === before - 2 ? "PASS" : "FAIL");

  // T2: qty larger than stock -> full rollback, stock unchanged
  res = await rpc("checkout_decrement_product_stock", { p_items: [{ id: prod.id, qty: afterT1 + 100 }] });
  const afterT2 = (await getProduct(prod.id)).stock_quantity;
  console.log("T2 over-stock:", res.status, "stock unchanged:", afterT2 === afterT1 ? "PASS" : "FAIL");

  // T3: multi-item with second bad id -> first item NOT deducted (atomicity)
  res = await rpc("checkout_decrement_product_stock", { p_items: [{ id: prod.id, qty: 1 }, { id: "00000000-0000-0000-0000-000000000000", qty: 1 }] });
  const afterT3 = (await getProduct(prod.id)).stock_quantity;
  console.log("T3 atomic rollback:", res.status, res.body.slice(0, 120), "stock unchanged:", afterT3 === afterT1 ? "PASS" : "FAIL");

  // T4: invalid quantity (0 / negative)
  res = await rpc("checkout_decrement_product_stock", { p_items: [{ id: prod.id, qty: 0 }] });
  console.log("T4 zero qty:", res.status, res.body, res.status < 300 && JSON.parse(res.body).error ? "PASS" : "?");

  // T5: double deduction safety ? decrement exactly remaining stock twice; second must fail
  res = await rpc("checkout_decrement_product_stock", { p_items: [{ id: prod.id, qty: afterT1 }] });
  const atZero = (await getProduct(prod.id)).stock_quantity;
  console.log("T5 drain to:", atZero, atZero === 0 ? "PASS" : "PARTIAL(stock=" + atZero + ")");
  if (atZero === 0) {
    res = await rpc("checkout_decrement_product_stock", { p_items: [{ id: prod.id, qty: 1 }] });
    const afterOver = (await getProduct(prod.id)).stock_quantity;
    console.log("T5b no negative stock:", afterOver === 0 ? "PASS" : "FAIL", JSON.stringify(res).slice(0, 150));
    // restore original stock (catalog integrity)
    await fetch(U + "products?id=eq." + prod.id, { method: "PATCH", headers: H, body: JSON.stringify({ stock_quantity: before }) });
    console.log("catalog restored to", before);
  }
})();
