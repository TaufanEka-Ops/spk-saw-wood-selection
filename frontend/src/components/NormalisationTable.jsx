import React from "react";

/**
 * The audit table the original UI never had.
 *
 * Without the divisor it is impossible to check the normalisation by hand;
 * showing it turns the output from "trust me" into arithmetic a reviewer can
 * verify in ten seconds.
 */
export default function NormalisationTable({ result, criteria }) {
  if (!result?.normalisation) return null;
  return (
    <div className="box">
      <h2 className="title is-5">Normalisasi dan pembagi</h2>
      <table className="table is-fullwidth is-narrow">
        <thead>
          <tr>
            <th>Kriteria</th>
            <th>Jenis</th>
            <th className="has-text-right">Min</th>
            <th className="has-text-right">Maks</th>
            <th className="has-text-right">Pembagi dipakai</th>
            <th>Rumus</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(result.normalisation).map(([key, info]) => (
            <tr key={key}>
              <td>{criteria?.find((c) => c.key === key)?.label ?? key}</td>
              <td><span className="tag is-light">{info.type}</span></td>
              <td className="is-narrow-num">{format(info.min, key)}</td>
              <td className="is-narrow-num">{format(info.max, key)}</td>
              <td className="is-narrow-num">{format(info.divisor, key)}</td>
              <td className="is-size-7 has-text-grey">
                {info.type === "cost" ? "min(x) / x" : "x / max(x)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function format(value, key) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return key === "price" ? numeric.toLocaleString("id-ID") : numeric;
}
