import { test } from "node:test";
import assert from "node:assert/strict";
import { RETAIL, matches, packSize, parseChaldal, parseShwapno } from "./retail-parse.ts";

test("pack sizes convert to the commodity unit and ignore ± tolerances", () => {
  assert.equal(packSize("Potato Regular (± 50 gm) 1 kg", "kg"), 1);
  assert.equal(packSize("Roshun (Garlic Imported) ± 25 gm 500 gm", "kg"), 0.5);
  assert.equal(packSize("Pran Miniket (Jirashail) Rice 5kg", "kg"), 5);
  assert.equal(packSize("ACI Pure Mustard Oil 1Ltr.", "L"), 1);
  assert.equal(packSize("Radhuni Mustard Oil 500ml", "L"), 0.5);
  assert.equal(packSize("Paragon Brown Egg 12Pcs (12Pcs Pack)", "piece"), 12);
  assert.equal(packSize("Roshun (Garlic) Deshi Loose Premium Kg", "kg"), 1);
  assert.equal(packSize("Lal Shak (Red Spinach) 1 bundle", "kg"), null);
  assert.equal(packSize("Egg 12 pcs", "kg"), null);
});

test("Chaldal: the regular price is used even when a discount is shown", () => {
  const html =
    '<div class="textWrapper"><div class="price"><div class="currency">৳</div><span>29</span></div>' +
    '<div class="pvName"><p class="nameTextWithEllipsis">Potato Regular (± 50 gm)</p></div><div class="subText"><span>1 kg</span></div></div>' +
    '<div class="textWrapper"><div class="productV2discountedPrice"><div class="currency">৳</div><span>79</span>' +
    '<div class="price"><div class="currency">৳</div><span>109</span></div></div>' +
    '<div class="pvName"><p class="nameTextWithEllipsis">Roshun (Garlic Imported) ± 25 gm</p></div><div class="subText"><span>500 gm</span></div></div>';
  assert.deepEqual(parseChaldal(html), [
    { name: "Potato Regular (± 50 gm)", size: "1 kg", regular: 29, sale: null },
    { name: "Roshun (Garlic Imported) ± 25 gm", size: "500 gm", regular: 109, sale: 79 },
  ]);
});

test("Shwapno: oldPriceValue (regular) wins over the discounted priceValue", () => {
  const discounted = String.raw`\"productName\":\"ACI Pure Mustard Oil 1Ltr.\",\"price\":{\"oldPrice\":\"৳380\",\"oldPriceValue\":380,\"price\":\"৳330\",\"priceValue\":330,\"discountAmountValue\":50}`;
  assert.deepEqual(parseShwapno(discounted), { name: "ACI Pure Mustard Oil 1Ltr.", regular: 380, sale: 330 });
  const plain = String.raw`\"productName\":\"Teer Atta 2kg\",\"price\":{\"price\":\"৳130\",\"priceValue\":130,\"discountAmountValue\":0}`;
  assert.deepEqual(parseShwapno(plain), { name: "Teer Atta 2kg", regular: 130, sale: null });
});

test("matching keeps like-for-like products only", () => {
  assert.ok(matches(RETAIL.potato.chaldal, "Potato Regular (± 50 gm)"));
  assert.ok(!matches(RETAIL.potato.chaldal, "Misti Alu (Sweet Potato) ± 25 gm"));
  assert.ok(matches(RETAIL.garlic.shwapno, "garlic roshun deshi loose p"));
  assert.ok(!matches(RETAIL.garlic.chaldal, "Roshun (Garlic Imported) ± 25 gm"));
  assert.ok(!matches(RETAIL.sugar.shwapno, "sugar free gold sugar substitute powder 100gm"));
  assert.ok(!matches(RETAIL.soybean_oil.shwapno, "nautilus sandwich tuna in soybean oil 18520gm"));
});
