"use client";

import { useState } from "react";
import { IPHONE_MODELS, REPAIR_TYPES } from "@/lib/constants";
import { ApiForm } from "./ApiForm";
import { Field } from "./ui";
import type { RepairJob } from "@/db/schema";

type Defaults = Partial<
  Pick<
    RepairJob,
    | "customerName"
    | "phone"
    | "deviceModel"
    | "imei"
    | "passcode"
    | "repairType"
    | "issue"
    | "total"
    | "partsCost"
    | "paid"
    | "advancePaid"
    | "warrantyDays"
    | "technician"
    | "notes"
  >
> & { id?: number };

type StockPartOption = {
  id: number;
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
};

const QUICK_MODELS = ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone 13 Pro Max", "iPhone 14 Pro Max", "iPhone 15 Pro Max"];
const QUICK_REPAIRS = ["Screen / Display", "Battery", "Charging Port", "Back Glass", "Face ID", "Motherboard / IC"];

export function JobForm({
  defaults = {},
  customers = [],
  stockParts = [],
  isEdit = false,
}: {
  defaults?: Defaults;
  customers?: { name: string; phone: string }[];
  stockParts?: StockPartOption[];
  isEdit?: boolean;
}) {
  const [customerName, setCustomerName] = useState(defaults.customerName ?? "");
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [deviceModel, setDeviceModel] = useState(defaults.deviceModel ?? "");
  const [repairType, setRepairType] = useState(defaults.repairType ?? "");
  const [total, setTotal] = useState(defaults.total ? String(defaults.total) : "");

  function handleCustomerChange(val: string) {
    setCustomerName(val);
    const match = customers.find((c) => c.name.toLowerCase() === val.toLowerCase());
    if (match && !phone) setPhone(match.phone);
  }

  function handlePartPick(partIdStr: string) {
    const id = parseInt(partIdStr, 10);
    const p = stockParts.find((x) => x.id === id);
    if (p && !total && p.salePrice > 0) {
      setTotal(String(p.salePrice));
    }
  }

  return (
    <ApiForm endpoint="/api/jobs" actionName={isEdit ? "update" : "create"} className="space-y-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="card space-y-4">
        <h2 className="font-semibold">👤 Customer</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer Name *">
            <input
              name="customerName"
              required
              list="cust-list"
              value={customerName}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="input"
              placeholder="e.g. Ahmed Khan"
            />
            <datalist id="cust-list">
              {customers.map((c, i) => (
                <option key={i} value={c.name}>
                  {c.phone}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="Mobile Number">
            <input
              name="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="03XX-XXXXXXX"
            />
          </Field>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">📱 Device &amp; Problem</h2>

        <div>
          <span className="label">Quick Model</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MODELS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDeviceModel(m)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  deviceModel === m ? "bg-indigo-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Quick Repair Type</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPAIRS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRepairType(r)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  repairType === r ? "bg-indigo-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Model *">
            <input
              name="deviceModel"
              required
              list="model-list"
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              className="input"
              placeholder="iPhone 13 Pro"
            />
            <datalist id="model-list">
              {IPHONE_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <Field label="Repair Type *">
            <input
              name="repairType"
              required
              list="repair-list"
              value={repairType}
              onChange={(e) => setRepairType(e.target.value)}
              className="input"
              placeholder="Screen / Display"
            />
            <datalist id="repair-list">
              {REPAIR_TYPES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <Field label="IMEI / Serial">
            <input name="imei" defaultValue={defaults.imei ?? ""} className="input" placeholder="35XXXXXXXXXXXXX" />
          </Field>
          <Field label="Passcode (optional)">
            <input name="passcode" defaultValue={defaults.passcode ?? ""} className="input" placeholder="For testing" />
          </Field>
          <Field label="Problem Detail" className="sm:col-span-2">
            <textarea
              name="issue"
              rows={2}
              defaultValue={defaults.issue ?? ""}
              className="input"
              placeholder="Screen cracked, touch not working..."
            />
          </Field>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">💰 Charges &amp; Parts</h2>

        {!isEdit && stockParts.length > 0 && (
          <Field label="Use a part from your stock? (optional — stock decreases automatically)">
            <select name="stockPartId" defaultValue="" onChange={(e) => handlePartPick(e.target.value)} className="input">
              <option value="">-- None / Add later --</option>
              {stockParts.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.name} — Cost Rs {p.costPrice.toLocaleString("en-PK")} / Sale Rs {p.salePrice.toLocaleString("en-PK")} (stock: {p.stock})
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Total Charge (Rs)">
            <input
              name="total"
              type="number"
              min={0}
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="input"
              placeholder="25000"
            />
          </Field>
          {isEdit && (
            <Field label="Recorded Advance (Rs)">
              <input name="advancePaid" type="number" min={0} inputMode="numeric" defaultValue={defaults.advancePaid ?? 0} className="input" placeholder="0" />
            </Field>
          )}
          {!isEdit && (
            <>
              <Field label="Advance Received (Rs)">
                <input name="paid" type="number" min={0} inputMode="numeric" defaultValue={defaults.paid || ""} className="input" placeholder="0" />
              </Field>
              <Field label="Outside Part Cost (Rs)">
                <input name="partsCost" type="number" min={0} inputMode="numeric" defaultValue={defaults.partsCost || ""} className="input" placeholder="0" />
              </Field>
            </>
          )}
          <Field label="Warranty (days)">
            <input name="warrantyDays" type="number" min={0} inputMode="numeric" defaultValue={defaults.warrantyDays ?? 30} className="input" />
          </Field>
          <Field label="Technician">
            <input name="technician" defaultValue={defaults.technician ?? ""} className="input" placeholder="Name" />
          </Field>
          <Field label="Notes" className="col-span-2 sm:col-span-3">
            <input name="notes" defaultValue={defaults.notes ?? ""} className="input" placeholder="Phone condition, scratches, accessories..." />
          </Field>
        </div>
        {isEdit && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            When a delivered job is reopened or cancelled, Paid returns to this recorded advance. For older delivered jobs, the original
            advance could not be recovered automatically — correct it here before changing status. Editing this value does not undo a real
            payment or issue a refund.
          </p>
        )}
      </div>

      <button type="submit" className="btn-primary w-full py-3 text-base sm:w-auto">
        {isEdit ? "💾 Save Changes" : "✅ Save Repair Job"}
      </button>
    </ApiForm>
  );
}
