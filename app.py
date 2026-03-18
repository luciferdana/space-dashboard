from flask import Flask, render_template, jsonify
import pandas as pd
import numpy as np
import os

app = Flask(__name__)

# ── Load & clean CSV once at startup ──────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'data', 'space_missions.csv')

df_raw = pd.read_csv(CSV_PATH, encoding='latin-1')

# Normalise column names
df_raw.columns = df_raw.columns.str.strip()

# Parse Price: strip commas then cast to float
df_raw['Price'] = (
    df_raw['Price']
    .astype(str)
    .str.replace(',', '', regex=False)
    .str.strip()
)
df_raw['Price'] = pd.to_numeric(df_raw['Price'], errors='coerce')

# Parse year from Date
df_raw['Year'] = pd.to_datetime(df_raw['Date'], errors='coerce').dt.year

# Parse country: last segment of Location
df_raw['Country'] = df_raw['Location'].str.split(',').str[-1].str.strip()

# Decade
df_raw['Decade'] = (df_raw['Year'] // 10 * 10).astype('Int64')

df = df_raw.copy()


# ── Helper ────────────────────────────────────────────────────────────────────
def is_success(status: str) -> bool:
    return str(status).strip().lower() == 'success'


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/stats')
def api_stats():
    total_misi = int(len(df))
    total_perusahaan = int(df['Company'].nunique())
    sukses = df['MissionStatus'].apply(is_success).sum()
    tingkat_sukses = round(float(sukses / total_misi * 100), 1)
    tahun_min = int(df['Year'].min())
    tahun_max = int(df['Year'].max())
    rentang_tahun = tahun_max - tahun_min
    return jsonify({
        'total_misi': total_misi,
        'total_perusahaan': total_perusahaan,
        'tingkat_sukses': tingkat_sukses,
        'rentang_tahun': rentang_tahun,
        'tahun_min': tahun_min,
        'tahun_max': tahun_max,
    })


@app.route('/api/launches-per-year')
def api_launches_per_year():
    grp = df.groupby('Year').size().reset_index(name='jumlah')
    grp = grp.sort_values('Year')
    return jsonify({
        'tahun': grp['Year'].tolist(),
        'jumlah': grp['jumlah'].tolist(),
    })


@app.route('/api/success-rate-company')
def api_success_rate_company():
    grp = df.groupby('Company').agg(
        total=('MissionStatus', 'count'),
        sukses=('MissionStatus', lambda x: (x.str.strip().str.lower() == 'success').sum())
    ).reset_index()
    grp = grp[grp['total'] >= 5]
    grp['tingkat_sukses'] = (grp['sukses'] / grp['total'] * 100).round(1)
    grp = grp.sort_values('total', ascending=False).head(10)
    return jsonify({
        'perusahaan': grp['Company'].tolist(),
        'tingkat_sukses': grp['tingkat_sukses'].tolist(),
        'total': grp['total'].tolist(),
    })


@app.route('/api/rocket-price')
def api_rocket_price():
    grp = df.groupby('Rocket')['Price'].mean().dropna().reset_index()
    grp = grp.sort_values('Price', ascending=False).head(10)
    return jsonify({
        'roket': grp['Rocket'].tolist(),
        'harga': grp['Price'].round(1).tolist(),
    })


@app.route('/api/launch-country')
def api_launch_country():
    # Map country names to ECharts world map names
    country_map = {
        'USA': 'United States',
        'Russia': 'Russia',
        'Kazakhstan': 'Kazakhstan',
        'China': 'China',
        'France': 'France',
        'Japan': 'Japan',
        'India': 'India',
        'New Zealand': 'New Zealand',
        'Australia': 'Australia',
        'Iran': 'Iran',
        'Israel': 'Israel',
        'South Korea': 'South Korea',
        'Brazil': 'Brazil',
        'Kenya': 'Kenya',
        'Marshall Islands': 'Marshall Islands',
    }
    grp = df.groupby('Country').size().reset_index(name='jumlah')
    grp['Country_mapped'] = grp['Country'].map(country_map).fillna(grp['Country'])

    # Combine Russia + Kazakhstan under Russia
    russia_total = grp[grp['Country'].isin(['Russia', 'Kazakhstan'])]['jumlah'].sum()
    grp = grp[~grp['Country'].isin(['Kazakhstan'])]
    grp.loc[grp['Country'] == 'Russia', 'jumlah'] = russia_total
    grp.loc[grp['Country'] == 'Russia', 'Country_mapped'] = 'Russia'

    result = grp[['Country_mapped', 'jumlah']].rename(columns={'Country_mapped': 'negara'})
    result = result.sort_values('jumlah', ascending=False)
    return jsonify(result.to_dict(orient='records'))


@app.route('/api/failure-heatmap')
def api_failure_heatmap():
    failed = df[~df['MissionStatus'].str.strip().str.lower().isin(['success'])].copy()
    failed = failed.dropna(subset=['Decade'])
    failed['Decade'] = failed['Decade'].astype(int)

    top6 = (
        df.groupby('Company').size()
        .sort_values(ascending=False)
        .head(6).index.tolist()
    )
    failed_top = failed[failed['Company'].isin(top6)]
    grp = failed_top.groupby(['Decade', 'Company']).size().reset_index(name='kegagalan')

    decades = sorted(grp['Decade'].unique().tolist())
    decade_labels = [f"{d}an" for d in decades]

    data = []
    for _, row in grp.iterrows():
        x_idx = decades.index(int(row['Decade']))
        y_idx = top6.index(row['Company'])
        data.append([x_idx, y_idx, int(row['kegagalan'])])

    return jsonify({
        'dekade': decade_labels,
        'perusahaan': top6,
        'data': data,
    })


@app.route('/api/spacex-effect')
def api_spacex_effect():
    priced = df.dropna(subset=['Price', 'Year']).copy()
    priced = priced[priced['Year'] >= 1990]

    spacex = priced[priced['Company'].str.strip() == 'SpaceX']
    others = priced[priced['Company'].str.strip() != 'SpaceX']

    sx_avg = spacex.groupby('Year')['Price'].mean().round(1)
    ind_avg = others.groupby('Year')['Price'].mean().round(1)

    all_years = sorted(set(sx_avg.index.tolist()) | set(ind_avg.index.tolist()))

    spacex_prices = [float(sx_avg[y]) if y in sx_avg.index else None for y in all_years]
    industry_prices = [float(ind_avg[y]) if y in ind_avg.index else None for y in all_years]

    return jsonify({
        'tahun': all_years,
        'spacex': spacex_prices,
        'industri': industry_prices,
    })


@app.route('/api/missions-table')
def api_missions_table():
    cols = {
        'Company': 'perusahaan',
        'Rocket': 'roket',
        'Mission': 'misi',
        'Date': 'tanggal',
        'MissionStatus': 'status',
        'Price': 'harga',
    }
    out = df[list(cols.keys())].rename(columns=cols).copy()
    out['tanggal'] = out['tanggal'].astype(str)
    records = out.to_dict(orient='records')
    # Replace all float NaN with None so jsonify produces valid JSON (null not NaN)
    import math
    clean = [
        {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in row.items()}
        for row in records
    ]
    return jsonify(clean)


@app.route('/api/quick-facts')
def api_quick_facts():
    first = df.sort_values('Year').dropna(subset=['Year']).iloc[0]
    vc = df['Company'].value_counts()
    top_company       = str(vc.index[0])
    top_company_count = int(vc.iloc[0])
    year_counts = df.groupby('Year').size()
    peak_year   = int(year_counts.idxmax())
    peak_count  = int(year_counts.max())
    avg_price = df.groupby('Rocket')['Price'].mean().dropna()
    exp_rocket = str(avg_price.idxmax()) if len(avg_price) else '—'
    exp_price  = round(float(avg_price.max()), 1) if len(avg_price) else 0
    return jsonify({
        'misi_pertama':      str(first['Mission']),
        'tahun_pertama':     int(first['Year']),
        'perusahaan_teratas': top_company,
        'jumlah_teratas':    top_company_count,
        'tahun_puncak':      peak_year,
        'peluncuran_puncak': peak_count,
        'roket_termahal':    exp_rocket,
        'harga_termahal':    exp_price,
    })


@app.route('/api/status-breakdown')
def api_status_breakdown():
    counts = df['MissionStatus'].value_counts()
    label_map = {
        'Success':          'Sukses',
        'Failure':          'Gagal',
        'Partial Failure':  'Gagal Sebagian',
        'Prelaunch Failure':'Gagal Pra-Peluncuran',
    }
    result = [
        {'status': s, 'label': label_map.get(s, s), 'jumlah': int(c)}
        for s, c in counts.items()
    ]
    return jsonify(result)


@app.route('/api/launch-sites')
def api_launch_sites():
    SITES = [
        ('Cape Canaveral',  28.47, -80.56, 'Cape Canaveral, AS'),
        ('Kennedy',         28.52, -80.65, 'Kennedy Space Center, AS'),
        ('Vandenberg',      34.74,-120.57, 'Vandenberg, AS'),
        ('Wallops',         37.94, -75.47, 'Wallops Island, AS'),
        ('Kodiak',          57.44,-152.34, 'Kodiak, AS'),
        ('Baikonur',        45.92,  63.34, 'Baikonur, Kazakhstan'),
        ('Plesetsk',        62.93,  40.57, 'Plesetsk, Rusia'),
        ('Kapustin',        48.57,  45.75, 'Kapustin Yar, Rusia'),
        ('Svobodny',        51.71, 128.13, 'Svobodny, Rusia'),
        ('Jiuquan',         40.96, 100.29, 'Jiuquan, Tiongkok'),
        ('Xichang',         28.25, 102.02, 'Xichang, Tiongkok'),
        ('Taiyuan',         37.50, 112.62, 'Taiyuan, Tiongkok'),
        ('Wenchang',        19.61, 110.95, 'Wenchang, Tiongkok'),
        ('Kourou',           5.24, -52.77, 'Kourou, Prancis'),
        ('Tanegashima',     30.40, 130.97, 'Tanegashima, Jepang'),
        ('Uchinoura',       31.25, 131.08, 'Uchinoura, Jepang'),
        ('Sriharikota',     13.72,  80.23, 'Sriharikota, India'),
        ('Mahia',          -39.26, 177.86, 'Mahia, Selandia Baru'),
        ('Semnan',          35.23,  53.92, 'Semnan, Iran'),
        ('Palmachim',       31.90,  34.69, 'Palmachim, Israel'),
        ('Naro',            34.43, 127.53, 'Naro, Korea Selatan'),
        ('Alcantara',       -2.37, -44.40, 'Alcântara, Brasil'),
    ]

    def find_site(location):
        if not isinstance(location, str):
            return None
        loc_l = location.lower()
        for kw, lat, lon, name in SITES:
            if kw.lower() in loc_l:
                return (lat, lon, name)
        return None

    tmp = df.copy()
    tmp['_site'] = tmp['Location'].apply(find_site)
    matched = tmp[tmp['_site'].notna()]

    from collections import Counter
    counts_s = Counter()
    meta = {}
    for _, row in matched.iterrows():
        name = row['_site'][2]
        counts_s[name] += 1
        meta[name] = row['_site']

    result = [
        {'lat': meta[n][0], 'lon': meta[n][1], 'nama': n, 'jumlah': counts_s[n]}
        for n in counts_s
    ]
    result.sort(key=lambda x: -x['jumlah'])
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)
