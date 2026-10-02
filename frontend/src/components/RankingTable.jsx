import React from "react";

const medal = (rank) => (rank === 1 ? "is-success" : rank === 2 ? "is-info" : "is-light");

export default function RankingTable({ result, criteria }) {
  if (!result?.ranking?.length) return null;
  const label = (key) => criteria?.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="box">
      <h2 className="title is-5">Hasil perhitungan SAW</h2>
      <p className="is-size-7 mb-3">
        Skor tiap alternatif = Σ (bobot normalisasi × nilai ternormalisasi). Skor tertinggi
        menempati peringkat 1. Nilai mentah dan pembaginya bisa diaudit pada tabel di bawah.
      </p>
      <div className="table-container">
        <table className="table is-fullwidth is-striped">
          <thead>
            <tr>
              <th>Peringkat</th>
              <th>Alternatif</th>
              {criteria?.map((criterion) => (
                <th key={criterion.key} className="has-text-right">{criterion.label}</th>
              ))}
              <th className="has-text-right">Skor</th>
            </tr>
          </thead>
          <tbody>
            {result.ranking.map((row) => (
              <tr key={row.id} className={row.rank === 1 ? "rank-1" : undefined}>
                <td>
                  <span className={`tag ${medal(row.rank)}`}>{row.rank}</span>
                </td>
                <td>{row.name}</td>
                {criteria?.map((criterion) => (
                  <td key={criterion.key} className="contribution">
                    {row.contributions[criterion.key].toFixed(4)}
                  </td>
                ))}
                <td className="score-cell">
                  <strong>{row.score.toFixed(4)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3">
        <strong>Rekomendasi:</strong> {result.ranking[0].name} (skor {result.ranking[0].score.toFixed(4)})
      </p>
    </div>
  );
}
