"use client";

import { useState } from "react";
import { PART_CATEGORIES, IPHONE_MODELS } from "@/lib/constants";
import { ApiForm } from "./ApiForm";
import { Field } from "./ui";
import type { Part } from "@/db/schema";

const QUICK_CATS = ["Display", "Battery", "Charging Flex", "Back Glass", "Camera", "Tempered Glass", "Cable / Charger", "Cover"];

export function PartForm({ part }: { part?: Part }) {
  const [category, setCategory] = useState(part?.category ?? "Display");
  const [cost, setCost] = useState<string>(part?.costPrice !== undefined ? String(part.costPrice) : "");
  const [sale, setSale] = useState<string>(part?.salePrice !== undefined ? String(part.salePrice) : "");

  const costNum = parseInt(cost, 10) || 0;
  const saleNum = parseInt(sale, 10) || 0;
  const margin = saleNum - costNum;

  return (
    <ApiForm endpoint="/api/parts" actionName="save" redirectTo="/inventory" className="card space-y-4">
      {part && <input type="hidden" name="id" value={part.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Part / Item Name *" className="sm:col-span-2">
          <input name="name" required defaultValue={part?.name ?? ""} className="input" placeholder="e.g. iPhone 13 Display OLED / 20W Charger" />
        </Field>

        <div className="sm:col-span-2">
          <span className="label">Quick Category</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  category === c ? "bg-indigo-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Field label="Category">
          <input name="category" list="cat-list" value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
          <datalist id="cat-list">
            {PART_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Model (compatible)">
          <input name="model" list="pm-list" defaultValue={part?.model ?? ""} className="input" placeholder="iPhone 13 / All" />
          <datalist id="pm-list">
            {["All", ...IPHONE_MODELS].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Purchase (Cost Price) Rs">
          <input name="costPrice" type="number" min={0} inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className="input" />
        </Field>

        <Field label="Selling (Sale Price) Rs">
          <input name="salePrice" type="number" min={0} inputMode="numeric" value={sale} onChange={(e) => setSale(e.target.value)} placeholder="0" className="input" />
        </Field>

        <Field label="Stock Quantity (pcs)">
          <input name="stock" type="number" inputMode="numeric" defaultValue={part?.stock ?? 1} className="input" />
        </Field>

        <Field label="Low Stock Alert (min pcs)">
          <input name="minStock" type="number" min={0} inputMode="numeric" defaultValue={part?.minStock ?? 2} className="input" />
        </Field>
      </div>

      {(costNum > 0 || saleNum > 0) && (
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Profit per piece:{" "}
          <b className={margin >= 0 ? "text-emerald-600" : "text-rose-600"}>Rs {margin.toLocaleString("en-PK")}</b>
        </div>
      )}

      <button type="submit" className="btn-primary w-full py-3 sm:w-auto">
        {part ? "💾 Save Changes" : "✅ Add Part to Stock"}
      </button>
    </ApiForm>
  );
}
