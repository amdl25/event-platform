import '../styles/StyleGuide.css';

const StyleGuide = () => {
  return (
    <div className="style-guide-page">
      <div className="style-guide-shell">
        <header className="style-guide-header">
          <p className="overline">Style Guide</p>
          <h1 className="text-4xl">Sistem tipografic global</h1>
          <p className="body-l leading-relaxed">
            Referinta pentru fonturi, marimi, greutati si ierarhie in toata aplicatia.
          </p>
        </header>

        <section className="style-guide-section">
          <h2 className="text-3xl">Display</h2>
          <p className="text-6xl">Display XL 60px</p>
          <p className="text-5xl">Display L 48px</p>
        </section>

        <section className="style-guide-section">
          <h2 className="text-3xl">Headings</h2>
          <h1 className="text-4xl">H1 36px / 700</h1>
          <h2 className="text-3xl">H2 30px / 600</h2>
          <h3 className="text-2xl">H3 24px / 600</h3>
          <h4 className="text-xl">H4 20px / 600</h4>
          <h5 className="text-lg">H5 18px / 500</h5>
        </section>

        <section className="style-guide-section">
          <h2 className="text-3xl">Body si label-uri</h2>
          <p className="text-base">Body L 16px / 400 - pentru paragrafe importante.</p>
          <p className="text-sm">Body 14px / 400 - default pentru UI.</p>
          <p className="text-xs">Caption 12px / 500 - pentru etichete scurte.</p>
          <p className="overline">Overline uppercase tracking wider</p>
        </section>

        <section className="style-guide-section">
          <h2 className="text-3xl">KPI si accent serif</h2>
          <p className="kpi kpi-sm tabular-nums">2,560</p>
          <p className="kpi kpi-md tabular-nums">14,320</p>
          <p className="kpi kpi-xl tabular-nums">98,765</p>
          <p className="text-base">
            Accent editorial: Trăiește <span className="serif-accent">experiența</span> live.
          </p>
        </section>
      </div>
    </div>
  );
};

export default StyleGuide;
