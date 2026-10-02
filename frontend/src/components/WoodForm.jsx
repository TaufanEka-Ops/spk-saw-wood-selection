import React, { useState } from "react";

const SCORES = [0, 1, 2, 3, 4, 5];
const initialState = { name: "", price: "", condition: "0", quality: "0", durability: "0" };

export default function WoodForm({ onSubmit, busy }) {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState(null);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        // Deliberately NOT coerced here: the server validates types, and a
        // browser-side Number("") would happily invent a 0 out of an empty
        // field. The original form sent strings straight to the API.
        price: form.price,
        condition: Number(form.condition),
        quality: Number(form.quality),
        durability: Number(form.durability),
      });
      setForm(initialState);
      setMessage({ kind: "is-success", text: "Data tersimpan." });
    } catch (error) {
      setMessage({ kind: "is-danger", text: error.message });
    }
  }

  return (
    <div className="box">
      <h2 className="title is-5">Tambah jenis kayu</h2>
      {message ? <div className={`notification is-light ${message.kind}`}>{message.text}</div> : null}
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="name">Nama kayu</label>
          <div className="control">
            <input
              id="name" className="input" type="text" placeholder="mis. Kayu Sungkai"
              value={form.name} onChange={update("name")} required minLength={2} maxLength={120}
            />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="price">Harga per m³ (IDR)</label>
          <div className="control">
            <input
              id="price" className="input" type="number" min="1" step="1000" placeholder="mis. 125000"
              value={form.price} onChange={update("price")} required
            />
          </div>
        </div>
        <div className="columns">
          {["condition", "quality", "durability"].map((field) => (
            <div className="column" key={field}>
              <div className="field">
                <label className="label" htmlFor={field}>
                  {field === "condition" ? "Kondisi" : field === "quality" ? "Kualitas" : "Ketahanan"}
                </label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select id={field} value={form[field]} onChange={update(field)}>
                      {SCORES.map((score) => (
                        <option key={score} value={score}>{score}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="field">
          <button type="submit" className="button is-success" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
