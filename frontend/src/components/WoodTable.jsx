import React from "react";

export default function WoodTable({ rows, onDelete, busy }) {
  if (!rows?.length) {
    return (
      <div className="box">
        <h2 className="title is-5">Data alternatif</h2>
        <p className="empty-state has-text-grey">
          Belum ada data. Tambahkan minimal dua jenis kayu agar peringkat bisa dihitung.
        </p>
      </div>
    );
  }
  return (
    <div className="box">
      <h2 className="title is-5">
        Data alternatif <span className="tag is-light">{rows.length}</span>
      </h2>
      <div className="table-container">
        <table className="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th className="has-text-right">Harga (IDR)</th>
              <th className="has-text-right">Kondisi</th>
              <th className="has-text-right">Kualitas</th>
              <th className="has-text-right">Ketahanan</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td className="is-narrow-num">{Number(row.price).toLocaleString("id-ID")}</td>
                <td className="is-narrow-num">{row.condition}</td>
                <td className="is-narrow-num">{row.quality}</td>
                <td className="is-narrow-num">{row.durability}</td>
                <td className="has-text-right">
                  <button
                    type="button"
                    className="button is-small is-danger is-light"
                    disabled={busy}
                    onClick={() => onDelete(row)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
