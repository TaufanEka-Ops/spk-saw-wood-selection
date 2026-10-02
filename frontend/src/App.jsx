import React, { useState } from "react";

import { describeError, ranking as rankingApi, woods as woodsApi } from "./api/client.js";
import CriteriaTable from "./components/CriteriaTable.jsx";
import NormalisationTable from "./components/NormalisationTable.jsx";
import RankingTable from "./components/RankingTable.jsx";
import WoodForm from "./components/WoodForm.jsx";
import WoodTable from "./components/WoodTable.jsx";
import { useResource } from "./hooks/useResource.js";

export default function App() {
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  // One fetch of the resource, and one of the computed ranking. The parent
  // owns the data; children are presentational.
  const alternatives = useResource(woodsApi.list);
  const criteria = useResource(rankingApi.criteria, []);
  const result = useResource(rankingApi.compute, [alternatives.data?.length ?? 0]);

  const refreshAll = async () => {
    await alternatives.reload();
    await result.reload();
  };

  const handleCreate = async (payload) => {
    setBusy(true);
    try {
      await woodsApi.create(payload);
      await refreshAll();
    } catch (error) {
      setBanner({ kind: "is-danger", text: describeError(error) });
      throw new Error(describeError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus "${row.name}"?`)) return;
    setBusy(true);
    try {
      await woodsApi.remove(row.id);
      await refreshAll();
    } catch (error) {
      setBanner({ kind: "is-danger", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  };

  const failure = alternatives.error ?? criteria.error ?? result.error;

  return (
    <section className="section">
      <div className="container">
        <div className="box has-background-link app-header mb-5">
          <h1 className="title has-text-white has-text-centered is-4 mb-1">
            Sistem Pendukung Keputusan Pemilihan Kayu untuk Mebel
          </h1>
          <p className="has-text-white has-text-centered is-size-7">
            Metode Simple Additive Weighting (SAW)
          </p>
        </div>

        {failure ? (
          <div className="notification is-danger is-light">
            {describeError(failure)}
            <button type="button" className="button is-small ml-3" onClick={refreshAll}>
              Coba lagi
            </button>
          </div>
        ) : null}
        {banner ? (
          <div className={`notification is-light ${banner.kind}`}>
            {banner.text}
            <button type="button" className="delete" onClick={() => setBanner(null)} />
          </div>
        ) : null}

        {alternatives.loading ? <progress className="progress is-small is-link" max="100" /> : null}

        <div className="columns">
          <div className="column is-two-thirds">
            <WoodTable rows={alternatives.data} onDelete={handleDelete} busy={busy} />
            <RankingTable result={result.data} criteria={criteria.data} />
            <NormalisationTable result={result.data} criteria={criteria.data} />
          </div>
          <div className="column">
            <WoodForm onSubmit={handleCreate} busy={busy} />
            <CriteriaTable criteria={criteria.data} weights={result.data?.weights} />
          </div>
        </div>
      </div>
    </section>
  );
}
