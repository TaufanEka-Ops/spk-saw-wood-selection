import React from "react";

const WEIGHT_BAR_CLASS = "is-link";

export default function CriteriaTable({ criteria, weights }) {
  if (!criteria?.length) return null;
  return (
    <div className="box">
      <h2 className="title is-5">Kriteria dan bobot</h2>
      <p className="is-size-7 mb-3">
        Bobot kepentingan asli (Harga 3, Kondisi 2, Kualitas 5, Ketahanan 4) dinormalisasi
        sehingga totalnya tepat 1. Kolom terakhir menunjukkan bobot yang dipakai perhitungan.
      </p>
      <table className="table is-fullwidth is-striped">
        <thead>
          <tr>
            <th>Kriteria</th>
            <th>Jenis</th>
            <th className="has-text-right">Bobot kepentingan</th>
            <th className="has-text-right">Bobot normalisasi</th>
            <th>Pengaruh</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion) => {
            const weight = weights?.[criterion.key] ?? 0;
            return (
              <tr key={criterion.key}>
                <td>
                  <strong>{criterion.label}</strong>
                  {criterion.description ? (
                    <div className="is-size-7 has-text-grey">{criterion.description}</div>
                  ) : null}
                </td>
                <td>
                  <span className={`tag ${criterion.type === "cost" ? "is-warning" : "is-success"}`}>
                    {criterion.type === "cost" ? "cost (makin kecil makin baik)" : "benefit (makin besar makin baik)"}
                  </span>
                </td>
                <td className="is-narrow-num">{criterion.weight}</td>
                <td className="is-narrow-num">{weight.toFixed(4)}</td>
                <td style={{ width: "35%" }}>
                  <progress className={`progress ${WEIGHT_BAR_CLASS} is-small`} value={weight * 100} max="40" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
