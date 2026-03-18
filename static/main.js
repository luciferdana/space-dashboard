/* ═══════════════════════════════════════════════════════════════
   ORBIT ANALYTICS — main.js
   All frontend logic: particles, charts, table, animations
═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Global ECharts theme colours ─────────────────────────────
const C = {
  bg:       '#0a0a14',
  card:     '#0f0f1e',
  purple:   '#7c5cfc',
  teal:     '#00d4aa',
  amber:    '#f5a623',
  coral:    '#ff6b6b',
  text:     '#f0eeff',
  textMuted:'rgba(240,238,255,0.45)',
  grid:     'rgba(255,255,255,0.06)',
};

const ECHART_DEFAULTS = {
  animationDuration: 1500,
  animationEasing:   'cubicOut',
  textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
};

// ── Utilities ─────────────────────────────────────────────────
function apiFetch(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
    return r.json();
  });
}

function initEChart(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const chart = echarts.init(el, null, { renderer: 'canvas' });
  chart.setOption(ECHART_DEFAULTS);
  window.addEventListener('resize', () => chart.resize());
  return chart;
}

// ── Sidebar toggle ────────────────────────────────────────────
(function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sidebar-toggle');
  if (!sidebar || !toggle) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const icon = toggle.querySelector('i');
    if (sidebar.classList.contains('collapsed')) {
      icon.className = 'ti ti-layout-sidebar-left-expand text-lg';
    } else {
      icon.className = 'ti ti-layout-sidebar-left-collapse text-lg';
    }
  });

  // Active nav on scroll
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(n => n.classList.remove('active'));
        const active = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.35 });

  sections.forEach(s => observer.observe(s));
})();

// ── Particles.js ─────────────────────────────────────────────
(function initParticles() {
  if (typeof particlesJS === 'undefined') return;
  particlesJS('hero-particles', {
    particles: {
      number: { value: 80, density: { enable: true, value_area: 900 } },
      color:  { value: '#ffffff' },
      shape:  { type: 'circle' },
      opacity:{ value: 0.35, random: true,
                anim: { enable: true, speed: 0.5, opacity_min: 0.1, sync: false } },
      size:   { value: 2, random: true,
                anim: { enable: false } },
      line_linked: { enable: true, distance: 130, color: '#ffffff', opacity: 0.07, width: 1 },
      move: { enable: true, speed: 0.5, direction: 'none', random: true,
              straight: false, out_mode: 'out', bounce: false },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'grab' },
        onclick:  { enable: false },
        resize:   true,
      },
      modes: {
        grab: { distance: 160, line_linked: { opacity: 0.25 } },
      },
    },
    retina_detect: true,
  });
})();

// ── AOS ───────────────────────────────────────────────────────
AOS.init({
  duration: 800,
  offset:   100,
  easing:   'ease-out-cubic',
  once:     true,
});

// ── KPI — CountUp via Intersection Observer ──────────────────
(function initKPI() {
  apiFetch('/api/stats').then(data => {
    const defs = [
      { id: 'kpi-total-misi',  val: data.total_misi,     suffix: '',   decimals: 0 },
      { id: 'kpi-sukses',      val: data.tingkat_sukses, suffix: '%',  decimals: 1 },
      { id: 'kpi-perusahaan',  val: data.total_perusahaan, suffix: '', decimals: 0 },
      { id: 'kpi-rentang',     val: data.rentang_tahun,  suffix: '',   decimals: 0 },
    ];

    // Use CountUp.js (UMD module exposes window.countUp or window.CountUp)
    const CU = window.countUp || window.CountUp;
    const CountUpCls = (CU && CU.CountUp) ? CU.CountUp : CU;

    const section = document.getElementById('kpi');
    let fired = false;

    const kpiObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !fired) {
        fired = true;
        defs.forEach(d => {
          const el = document.getElementById(d.id);
          if (!el) return;
          if (CountUpCls) {
            const cu = new CountUpCls(d.id, d.val, {
              duration: 2.5,
              useEasing: true,
              decimalPlaces: d.decimals,
              suffix: d.suffix,
            });
            cu.start();
          } else {
            el.textContent = d.val + d.suffix;
          }
        });
      }
    }, { threshold: 0.3 });

    if (section) kpiObserver.observe(section);
  }).catch(console.error);
})();

// ── Chart: Space Race Timeline ────────────────────────────────
(function initTimeline() {
  apiFetch('/api/launches-per-year').then(data => {
    const chart = initEChart('chart-timeline');
    if (!chart) return;

    const annotations = [
      { year: 1957, label: 'Sputnik 1' },
      { year: 1969, label: 'Apollo 11' },
      { year: 1986, label: 'Bencana Challenger' },
      { year: 2015, label: 'SpaceX Mendarat Kembali' },
    ];

    // Build markPoint data
    const markPoints = annotations.map(a => {
      const idx = data.tahun.indexOf(a.year);
      return {
        name: a.label,
        coord: [a.year, idx >= 0 ? data.jumlah[idx] : 0],
        value: a.label,
        symbol: 'pin',
        symbolSize: 36,
        label: {
          show: true,
          formatter: a.label,
          color: C.text,
          fontSize: 10,
          position: 'top',
          distance: 8,
          fontFamily: 'Outfit, sans-serif',
        },
        itemStyle: { color: C.amber },
      };
    });

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a1a30',
        borderColor: C.grid,
        textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
        formatter: params => {
          const p = params[0];
          return `<b>${p.axisValue}</b><br/>Peluncuran: <b style="color:${C.teal}">${p.value}</b>`;
        },
      },
      grid: { left: 50, right: 30, top: 30, bottom: 40, containLabel: false },
      xAxis: {
        type: 'category',
        data: data.tahun,
        axisLine: { lineStyle: { color: C.grid } },
        axisTick: { show: false },
        axisLabel: { color: C.textMuted, fontSize: 11, interval: 4 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: C.textMuted, fontSize: 11 },
        splitLine: { lineStyle: { color: C.grid, type: 'dashed' } },
        name: 'Peluncuran',
        nameTextStyle: { color: C.textMuted, fontSize: 10 },
      },
      series: [{
        type: 'line',
        data: data.jumlah,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: C.teal, width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0,212,170,0.25)' },
              { offset: 1, color: 'rgba(0,212,170,0)' },
            ],
          },
        },
        markPoint: { data: markPoints },
      }],
      animationDuration: 1800,
      animationEasing: 'cubicOut',
    });
  }).catch(console.error);
})();

// ── Chart: Success Rate per Company ──────────────────────────
(function initSuccessRate() {
  apiFetch('/api/success-rate-company').then(data => {
    const chart = initEChart('chart-success');
    if (!chart) return;

    const colors = data.tingkat_sukses.map(v =>
      v >= 90 ? C.teal : v >= 80 ? C.amber : C.coral
    );

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        backgroundColor: '#1a1a30',
        borderColor: C.grid,
        textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
        formatter: params => {
          const p = params[0];
          return `<b>${p.name}</b><br/>Tingkat Sukses: <b style="color:${colors[p.dataIndex]}">${p.value}%</b>`;
        },
      },
      grid: { left: 120, right: 50, top: 15, bottom: 30 },
      xAxis: {
        type: 'value',
        min: 50, max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: C.textMuted, fontSize: 10,
          formatter: v => v + '%',
        },
        splitLine: { lineStyle: { color: C.grid, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: data.perusahaan,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: C.text, fontSize: 12 },
        inverse: false,
      },
      series: [{
        type: 'bar',
        data: data.tingkat_sukses.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] },
        })),
        barMaxWidth: 22,
        label: {
          show: true,
          position: 'right',
          color: C.textMuted,
          fontSize: 11,
          formatter: '{c}%',
          fontFamily: 'DM Mono, monospace',
        },
      }],
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    });
  }).catch(console.error);
})();

// ── Chart: Rocket Price ───────────────────────────────────────
(function initRocketPrice() {
  apiFetch('/api/rocket-price').then(data => {
    const chart = initEChart('chart-price');
    if (!chart) return;

    // Shorten long rocket names
    const shortNames = data.roket.map(n => n.length > 20 ? n.slice(0, 18) + '…' : n);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#1a1a30',
        borderColor: C.grid,
        textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
        formatter: params => {
          const p = params[0];
          return `<b>${data.roket[p.dataIndex]}</b><br/>Harga: <b style="color:${C.purple}">USD ${p.value} Juta</b>`;
        },
      },
      grid: { left: 15, right: 15, top: 15, bottom: 80, containLabel: true },
      xAxis: {
        type: 'category',
        data: shortNames,
        axisLine: { lineStyle: { color: C.grid } },
        axisTick: { show: false },
        axisLabel: {
          color: C.textMuted, fontSize: 10,
          rotate: 30, interval: 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: C.textMuted, fontSize: 10,
          formatter: v => v + 'M',
        },
        splitLine: { lineStyle: { color: C.grid, type: 'dashed' } },
      },
      series: [{
        type: 'bar',
        data: data.harga.map(v => ({
          value: v,
          itemStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: C.purple },
                { offset: 1, color: 'rgba(124,92,252,0.3)' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barMaxWidth: 36,
        label: {
          show: true,
          position: 'top',
          color: C.textMuted,
          fontSize: 10,
          fontFamily: 'DM Mono, monospace',
          formatter: p => p.value + 'M',
        },
      }],
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    });
  }).catch(console.error);
})();

// ── Chart: World Map ──────────────────────────────────────────
(function initMap() {
  apiFetch('/api/launch-country').then(data => {
    const chart = initEChart('chart-map');
    if (!chart) return;

    const mapData = data.map(d => ({ name: d.negara, value: d.jumlah }));
    const maxVal  = Math.max(...data.map(d => d.jumlah));

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1a1a30',
        borderColor: C.grid,
        textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
        formatter: p => {
          if (!p.value) return `<b>${p.name}</b><br/>Tidak ada data`;
          return `<b>${p.name}</b><br/>Peluncuran: <b style="color:${C.teal}">${p.value}</b>`;
        },
      },
      visualMap: {
        min: 0, max: maxVal,
        left: 'left', bottom: 20,
        text: ['Tinggi', 'Rendah'],
        textStyle: { color: C.textMuted, fontSize: 11 },
        inRange: {
          color: ['#1a1a30', '#3a2a80', C.purple],
        },
        calculable: true,
      },
      series: [{
        type: 'map',
        map: 'world',
        roam: true,
        data: mapData,
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: C.teal },
        },
        select: { disabled: true },
        itemStyle: {
          areaColor: '#1a1a30',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 0.5,
        },
        nameMap: {
          'United States': 'United States',
          'United States of America': 'United States',
        },
      }],
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    });
  }).catch(console.error);
})();

// ── Chart: SpaceX Effect ──────────────────────────────────────
(function initSpaceX() {
  apiFetch('/api/spacex-effect').then(data => {
    const chart = initEChart('chart-spacex');
    if (!chart) return;

    // Find the year SpaceX first beats the industry avg
    let dropYear = null;
    for (let i = 0; i < data.tahun.length; i++) {
      if (data.spacex[i] !== null && data.industri[i] !== null &&
          data.spacex[i] < data.industri[i]) {
        dropYear = data.tahun[i];
        break;
      }
    }

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a1a30',
        borderColor: C.grid,
        textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
        formatter: params => {
          let html = `<b>${params[0].axisValue}</b><br/>`;
          params.forEach(p => {
            if (p.value !== null && p.value !== '-') {
              html += `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${p.value}M USD</b><br/>`;
            }
          });
          return html;
        },
      },
      legend: {
        bottom: 10,
        textStyle: { color: C.textMuted, fontSize: 12 },
        icon: 'roundRect',
        itemWidth: 12, itemHeight: 4,
      },
      grid: { left: 55, right: 30, top: 30, bottom: 55 },
      xAxis: {
        type: 'category',
        data: data.tahun,
        axisLine: { lineStyle: { color: C.grid } },
        axisTick: { show: false },
        axisLabel: { color: C.textMuted, fontSize: 11, interval: 1 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: C.textMuted, fontSize: 11,
          formatter: v => v + 'M',
        },
        splitLine: { lineStyle: { color: C.grid, type: 'dashed' } },
        name: 'Juta USD',
        nameTextStyle: { color: C.textMuted, fontSize: 10 },
      },
      series: [
        {
          name: 'Rata-rata Industri',
          type: 'line',
          data: data.industri,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
          lineStyle: { color: C.amber, width: 2.5 },
          itemStyle: { color: C.amber },
        },
        {
          name: 'SpaceX',
          type: 'line',
          data: data.spacex,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          connectNulls: true,
          lineStyle: { color: C.teal, width: 2.5 },
          itemStyle: { color: C.teal },
          markPoint: dropYear ? {
            data: [{
              name: 'SpaceX lebih murah',
              xAxis: dropYear,
              yAxis: data.spacex[data.tahun.indexOf(dropYear)],
              symbol: 'arrow',
              symbolSize: 22,
              symbolRotate: 180,
              label: {
                show: true,
                formatter: 'SpaceX\nLebih Murah',
                color: C.teal,
                fontSize: 9,
                position: 'top',
                distance: 6,
              },
              itemStyle: { color: C.teal },
            }],
          } : undefined,
        },
      ],
      animationDuration: 1800,
      animationEasing: 'cubicOut',
    });
  }).catch(console.error);
})();

// ── Chart: Failure Heatmap ────────────────────────────────────
(function initHeatmap() {
  apiFetch('/api/failure-heatmap').then(data => {
    const chart = initEChart('chart-heatmap');
    if (!chart) return;

    const allValues = data.data.map(d => d[2]);
    const maxVal    = Math.max(...allValues, 1);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: '#1a1a30',
        borderColor: C.grid,
        textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
        formatter: p => {
          const decade = data.dekade[p.data[0]];
          const company = data.perusahaan[p.data[1]];
          const val = p.data[2];
          return `<b>${company}</b> pada <b>${decade}</b><br/>Kegagalan: <b style="color:${C.coral}">${val}</b>`;
        },
      },
      grid: { left: 120, right: 40, top: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: data.dekade,
        splitArea: { show: false },
        axisLine: { lineStyle: { color: C.grid } },
        axisTick: { show: false },
        axisLabel: { color: C.textMuted, fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: data.perusahaan,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: C.text, fontSize: 12 },
      },
      visualMap: {
        min: 0, max: maxVal,
        show: true,
        orient: 'horizontal',
        left: 'center', bottom: 0,
        textStyle: { color: C.textMuted, fontSize: 10 },
        text: ['Banyak', 'Sedikit'],
        inRange: {
          color: ['#1a1a30', '#4a1520', '#8b0000', C.coral],
        },
      },
      series: [{
        type: 'heatmap',
        data: data.data,
        label: {
          show: true,
          color: C.text,
          fontSize: 11,
          fontFamily: 'DM Mono, monospace',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(255,107,107,0.4)',
          },
        },
        itemStyle: { borderRadius: 4 },
      }],
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    });
  }).catch(console.error);
})();

// ── Quick Facts Strip ─────────────────────────────────────────
(function initQuickFacts() {
  apiFetch('/api/quick-facts').then(data => {
    const container = document.getElementById('facts-container');
    if (!container) return;

    const facts = [
      {
        icon: 'ti-rocket',
        label: 'Misi Pertama',
        value: data.misi_pertama,
        sub: String(data.tahun_pertama),
        color: C.teal,
      },
      {
        icon: 'ti-building-factory',
        label: 'Peluncur Paling Aktif',
        value: data.perusahaan_teratas,
        sub: `${Number(data.jumlah_teratas).toLocaleString('id-ID')} misi`,
        color: C.amber,
      },
      {
        icon: 'ti-calendar-event',
        label: 'Tahun Puncak Peluncuran',
        value: String(data.tahun_puncak),
        sub: `${data.peluncuran_puncak} peluncuran`,
        color: C.purple,
      },
      {
        icon: 'ti-coin',
        label: 'Roket Termahal',
        value: data.roket_termahal.length > 22 ? data.roket_termahal.slice(0, 20) + '…' : data.roket_termahal,
        sub: `USD ${data.harga_termahal} Juta`,
        color: C.coral,
      },
    ];

    container.innerHTML = facts.map((f, i) => `
      ${i > 0 ? '<div class="w-px h-10 bg-white/8 hidden sm:block flex-shrink-0"></div>' : ''}
      <div class="flex items-center gap-3 py-1">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style="background: ${f.color}1a; color: ${f.color}">
          <i class="ti ${f.icon} text-base"></i>
        </div>
        <div>
          <div class="text-white/35 text-xs leading-none mb-1">${f.label}</div>
          <div class="text-white/85 text-sm font-semibold leading-none">
            ${f.value}
            <span class="text-white/40 font-normal text-xs ml-1">· ${f.sub}</span>
          </div>
        </div>
      </div>`).join('');
  }).catch(console.error);
})();


// ── Donut: Mission Status Distribution ───────────────────────
(function initDonut() {
  apiFetch('/api/status-breakdown').then(data => {
    const chart = initEChart('chart-donut');
    if (!chart) return;

    const colorMap = {
      'Sukses':               C.teal,
      'Gagal':                C.coral,
      'Gagal Sebagian':       C.amber,
      'Gagal Pra-Peluncuran': 'rgba(180,180,200,0.5)',
    };

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1a1a30',
        borderColor: C.grid,
        textStyle: { color: C.text, fontFamily: 'Outfit, sans-serif' },
        formatter: p => `<b>${p.name}</b><br/>${p.value} misi &nbsp;<b style="color:${p.color}">${p.percent}%</b>`,
      },
      legend: {
        orient: 'vertical',
        right: 0, top: 'middle',
        textStyle: { color: C.textMuted, fontSize: 11 },
        icon: 'circle',
        itemWidth: 8, itemHeight: 8,
        itemGap: 10,
      },
      series: [{
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['38%', '50%'],
        data: data.map(d => ({
          name: d.label,
          value: d.jumlah,
          itemStyle: { color: colorMap[d.label] || C.purple, borderRadius: 4, borderColor: C.card, borderWidth: 3 },
        })),
        label: { show: false },
        emphasis: {
          scale: true, scaleSize: 6,
          label: { show: true, formatter: '{b}\n{d}%', color: C.text, fontSize: 12 },
        },
      }],
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    });
  }).catch(console.error);
})();


// ── Top 5 Launchers ───────────────────────────────────────────
(function initTopLaunchers() {
  apiFetch('/api/success-rate-company').then(data => {
    const container = document.getElementById('top-launchers-list');
    if (!container) return;

    const top5 = {
      perusahaan:    data.perusahaan.slice(0, 5),
      total:         data.total.slice(0, 5),
      tingkat_sukses: data.tingkat_sukses.slice(0, 5),
    };
    const maxTotal = Math.max(...top5.total);

    const rankColors  = [C.amber, '#b0b0c8', '#cd8050', C.textMuted, C.textMuted];
    const rankLabels  = ['🥇', '🥈', '🥉', '4', '5'];

    container.innerHTML = top5.perusahaan.map((company, i) => {
      const barPct  = ((top5.total[i] / maxTotal) * 100).toFixed(1);
      const sr      = top5.tingkat_sukses[i];
      const srColor = sr >= 90 ? C.teal : sr >= 80 ? C.amber : C.coral;

      return `
        <div class="flex items-center gap-3">
          <div class="w-7 text-center text-sm font-bold flex-shrink-0" style="color:${rankColors[i]}">
            ${rankLabels[i]}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-semibold text-white/85 truncate">${company}</span>
              <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                <span class="text-xs font-mono text-white/40">${top5.total[i].toLocaleString('id-ID')}</span>
                <span class="badge" style="background:${srColor}18;color:${srColor};border:1px solid ${srColor}40;font-size:10px;padding:1px 7px">${sr}%</span>
              </div>
            </div>
            <div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full rounded-full"
                   style="width:${barPct}%;background:linear-gradient(90deg,${C.purple},${C.teal});transition:width 1.2s cubic-bezier(0.34,1.56,0.64,1)">
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    // Animate bars in after paint
    requestAnimationFrame(() => {
      container.querySelectorAll('.h-1\\.5 > div').forEach(bar => {
        const target = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => { bar.style.width = target; }, 200);
      });
    });
  }).catch(console.error);
})();


// ── Globe 3D (Globe.gl) ───────────────────────────────────────
(function initGlobe3D() {
  const container = document.getElementById('globe-3d');
  if (!container) return;

  // Convert hex color to rgba string
  function hexRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Color by activity level
  function siteColor(d, maxJumlah) {
    const ratio = d.jumlah / maxJumlah;
    if (ratio > 0.4) return C.coral;   // sangat aktif
    if (ratio > 0.12) return C.amber;  // aktif
    return C.teal;                     // jarang
  }

  // Tooltip HTML
  function siteTooltip(d, maxJumlah) {
    const color = siteColor(d, maxJumlah);
    const pct   = ((d.jumlah / maxJumlah) * 100).toFixed(1);
    const bar   = Math.round(pct / 5);           // 0–20 blocks
    const level = d.jumlah / maxJumlah > 0.4 ? 'Sangat Aktif'
                : d.jumlah / maxJumlah > 0.12 ? 'Aktif'
                : 'Jarang';
    return `
      <div style="
        background: rgba(10,10,22,0.95);
        border: 1px solid ${hexRgba(color, 0.5)};
        border-radius: 10px;
        padding: 10px 14px;
        font-family: Outfit, sans-serif;
        min-width: 180px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.6);
      ">
        <div style="color:${color};font-weight:700;font-size:13px;margin-bottom:6px">${d.nama}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
          </div>
          <span style="color:rgba(240,238,255,0.55);font-size:10px">${pct}%</span>
        </div>
        <div style="color:rgba(240,238,255,0.45);font-size:11px">
          <b style="color:#f0eeff">${d.jumlah.toLocaleString('id-ID')}</b> peluncuran
          &nbsp;·&nbsp;
          <span style="color:${color}">${level}</span>
        </div>
      </div>`;
  }

  function tryInit(attempts) {
    if (typeof Globe === 'undefined') {
      if (attempts > 0) setTimeout(() => tryInit(attempts - 1), 500);
      else console.warn('Globe.gl did not load');
      return;
    }

    apiFetch('/api/launch-sites').then(sites => {
      if (!sites.length) return;
      const maxJumlah = Math.max(...sites.map(s => s.jumlah));

      // Top sites get pulsing rings (top 10 busiest)
      const topSites = [...sites].sort((a, b) => b.jumlah - a.jumlah).slice(0, 10);

      const w = container.offsetWidth  || 800;
      const h = container.offsetHeight || 520;

      const globe = Globe()
        .width(w)
        .height(h)
        .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2.27.2/example/img/earth-night.jpg')
        .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2.27.2/example/img/earth-topology.png')
        .backgroundColor('#0a0a14')
        .showAtmosphere(true)
        .atmosphereColor('#7c5cfc')
        .atmosphereAltitude(0.22)

        // ── Flat glowing circles (NO altitude = NO benjolan) ──
        .pointsData(sites)
        .pointLat('lat')
        .pointLng('lon')
        .pointAltitude(0)                                            // ← flat!
        .pointRadius(d => Math.sqrt(d.jumlah / maxJumlah) * 3.5 + 0.5)
        .pointColor(d => siteColor(d, maxJumlah))
        .pointResolution(24)
        .pointLabel(d => siteTooltip(d, maxJumlah))

        // ── Pulsing rings on top 10 sites ──
        .ringsData(topSites)
        .ringLat('lat')
        .ringLng('lon')
        .ringColor(d => hexRgba(siteColor(d, maxJumlah), 0.6))
        .ringMaxRadius(d => Math.sqrt(d.jumlah / maxJumlah) * 5 + 1.5)
        .ringPropagationSpeed(1.5)
        .ringRepeatPeriod(1400)

        // ── Labels on top 5 sites ──
        .labelsData(sites.slice(0, 5))
        .labelLat('lat')
        .labelLng('lon')
        .labelText('nama')
        .labelSize(0.55)
        .labelDotRadius(0.35)
        .labelColor(() => 'rgba(240,238,255,0.75)')
        .labelResolution(2)

        (container);

      // Camera: start over Russia/Europe where most sites are
      globe.pointOfView({ lat: 30, lng: 60, altitude: 2.0 }, 0);

      // Controls
      globe.controls().autoRotate      = true;
      globe.controls().autoRotateSpeed = 0.35;
      globe.controls().enableZoom      = true;
      globe.controls().minDistance     = 200;
      globe.controls().maxDistance     = 750;

      // Proper resize
      function resizeGlobe() {
        const nw = container.offsetWidth;
        const nh = container.offsetHeight;
        if (nw > 0 && nh > 0) globe.width(nw).height(nh);
      }
      window.addEventListener('resize', resizeGlobe);
      // Re-check after AOS reveal (page may scroll into view)
      setTimeout(resizeGlobe, 300);
      setTimeout(resizeGlobe, 800);

      // Pause rotation on hover
      container.addEventListener('mouseenter', () => { globe.controls().autoRotate = false; });
      container.addEventListener('mouseleave', () => { globe.controls().autoRotate = true; });

    }).catch(console.error);
  }

  tryInit(12);
})();


// ── Data Table ────────────────────────────────────────────────
(function initTable() {
  let allData   = [];
  let filtered  = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;

  // Status label map
  const statusLabel = {
    'Success':          { label: 'Sukses',              cls: 'badge-success' },
    'Failure':          { label: 'Gagal',               cls: 'badge-failure' },
    'Partial Failure':  { label: 'Gagal Sebagian',      cls: 'badge-partial' },
    'Prelaunch Failure':{ label: 'Gagal Pra-Peluncuran', cls: 'badge-prelaunch' },
  };

  function badgeHTML(status) {
    const s = (status || '').trim();
    const info = statusLabel[s] || { label: s || '—', cls: 'badge-prelaunch' };
    return `<span class="badge ${info.cls}">${info.label}</span>`;
  }

  function renderTable() {
    const tbody = document.getElementById('table-body');
    const info  = document.getElementById('table-info');
    if (!tbody) return;

    const total = filtered.length;
    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    if (slice.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-white/30 text-sm">Tidak ada data yang cocok</td></tr>`;
      info.textContent = '0 hasil';
      renderPagination(0);
      return;
    }

    tbody.innerHTML = slice.map((row, i) => {
      const no    = start + i + 1;
      const harga = row.harga != null ? `<span class="font-mono text-amber">${Number(row.harga).toFixed(1)}</span>` : '<span class="text-white/25">—</span>';
      const date  = (row.tanggal || '').slice(0, 10);
      return `
        <tr>
          <td class="text-white/30 font-mono text-xs">${no}</td>
          <td class="font-medium text-white/85">${row.perusahaan || '—'}</td>
          <td class="text-white/60">${row.roket || '—'}</td>
          <td class="text-white/75">${row.misi || '—'}</td>
          <td class="text-white/50 font-mono text-xs whitespace-nowrap">${date}</td>
          <td>${badgeHTML(row.status)}</td>
          <td class="text-right">${harga}</td>
        </tr>`;
    }).join('');

    info.textContent = `Menampilkan ${start + 1}–${Math.min(start + PAGE_SIZE, total)} dari ${total} misi`;
    renderPagination(total);
  }

  function renderPagination(total) {
    const pg = document.getElementById('pagination');
    if (!pg) return;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) { pg.innerHTML = ''; return; }

    let html = '';
    const range = pageRange(currentPage, totalPages);

    // Prev
    html += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>
      <i class="ti ti-chevron-left text-sm"></i>
    </button>`;

    range.forEach(p => {
      if (p === '…') {
        html += `<span class="text-white/25 px-1">…</span>`;
      } else {
        html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
      }
    });

    // Next
    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>
      <i class="ti ti-chevron-right text-sm"></i>
    </button>`;

    pg.innerHTML = html;
  }

  function pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
      pages.push(p);
    }
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }

  // Make goPage global for onclick handlers
  window.goPage = function(page) {
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    document.getElementById('data').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function applyFilters() {
    const search  = (document.getElementById('search-input')?.value || '').toLowerCase();
    const status  = document.getElementById('filter-status')?.value || '';
    const company = document.getElementById('filter-company')?.value || '';

    filtered = allData.filter(row => {
      const matchSearch = !search ||
        (row.misi      || '').toLowerCase().includes(search) ||
        (row.perusahaan|| '').toLowerCase().includes(search) ||
        (row.roket     || '').toLowerCase().includes(search);
      const matchStatus  = !status  || (row.status   || '') === status;
      const matchCompany = !company || (row.perusahaan|| '') === company;
      return matchSearch && matchStatus && matchCompany;
    });
    currentPage = 1;
    renderTable();
  }

  // Populate company dropdown from top companies
  function populateCompanyFilter(data) {
    const counts = {};
    data.forEach(r => { counts[r.perusahaan] = (counts[r.perusahaan] || 0) + 1; });
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(e => e[0]);

    const sel = document.getElementById('filter-company');
    if (!sel) return;
    top.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  // Load data
  apiFetch('/api/missions-table').then(data => {
    allData  = data;
    filtered = [...data];
    populateCompanyFilter(data);
    renderTable();

    document.getElementById('search-input')?.addEventListener('input',  applyFilters);
    document.getElementById('filter-status')?.addEventListener('change', applyFilters);
    document.getElementById('filter-company')?.addEventListener('change',applyFilters);
  }).catch(err => {
    console.error(err);
    const tbody = document.getElementById('table-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-coral/70">Gagal memuat data: ${err.message}</td></tr>`;
  });
})();
