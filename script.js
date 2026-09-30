(() => {
  'use strict';
  // Aggregates are derived from the same Netflix CSV used in the PostgreSQL analysis.
  // No live database connection or full CSV download is needed in the browser.
  const data = window.NETFLIX_DATA;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const format = (value) => Number(value).toLocaleString('en-US');
  const percent = (value, total) => (value / total * 100).toFixed(1);
  const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const charts = new Map();
  if (!data) {
    $('#chart-error').hidden = false;
    $('#chart-error').textContent = 'Dataset aggregates could not load. Check that assets/catalogue-data.js is present, then reload.';
    return;
  }

  function renderOverview() {
    $$('[data-total]').forEach((element) => { element.textContent = format(data.all.total); });
    $('#snapshot-date').textContent = new Date(`${data.dateRange[1]}T00:00:00Z`).toLocaleDateString('en-US', {month:'long',year:'numeric',timeZone:'UTC'});
    const snapshot = [['Records', format(data.all.total)], ['Original CSV columns', data.fields.length], ['Original release years', data.releaseRange.join('–')], ['India-associated titles', format(data.india.total)]];
    $('#dataset-snapshot').innerHTML = snapshot.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    const metrics = [
      ['Total Titles', data.all.total, 'Catalogue records'], ['Movies', data.movies.total, `${percent(data.movies.total,data.all.total)}% of the catalogue`],
      ['TV Shows', data.shows.total, `${percent(data.shows.total,data.all.total)}% of the catalogue`], ['Countries Represented', data.countryCount, 'Named country tokens'],
      ['Content Ratings', data.ratingCount, 'Valid, non-empty categories'], ['Release-Year Range', data.releaseRange.join('–'), 'Original release years']
    ];
    $('#kpis').innerHTML = metrics.map(([label,value,note]) => `<article class="kpi"><span>${label}</span><strong>${typeof value === 'number' ? format(value) : value}</strong><small>${note}</small></article>`).join('');
    const descriptions = ['Unique title identifier · primary key','Movie or TV Show','Content title','Director credits','Actor credits · CSV: cast','Associated countries','Addition date stored as text','Original release year','Content classification','Movie minutes or TV seasons','Genres / categories','Synopsis'];
    $('#schema-rows').innerHTML = data.schema.map(([name,type],i) => `<tr><td>${escape(name)}</td><td>${escape(type)}</td><td>${descriptions[i]}</td></tr>`).join('');
    $('#unique-ids').textContent = `${format(data.quality.uniqueIds)} unique IDs verified`;
    $('#csv-fields').innerHTML = data.fields.map((field) => `<span>${escape(field)}</span>`).join('');
    $('#sql-skills').innerHTML = data.techniques.map((technique) => `<span>${escape(technique)}</span>`).join('');
    $('#missing-values').innerHTML = Object.entries(data.quality.missing).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]).map(([field,count])=>`<div class="missing-row"><span>${escape(field)}</span><div class="missing-track" aria-hidden="true"><i style="width:${count/data.all.total*100}%"></i></div><strong>${format(count)}</strong></div>`).join('');
    const checks = [
      ['Identity checks', `${format(data.quality.uniqueIds)} unique show IDs; ${data.quality.duplicateTitleGroups} duplicate-title groups under exact, case-sensitive matching.`],
      ['Ratings, without silent correction', `${data.quality.rawRatingValues} raw non-empty values include ${data.quality.invalidRatings} duration-like entries. Charts use ${data.ratingCount} valid categories and omit ${data.quality.missing.rating} missing ratings.`],
      ['Multi-value countries and genres', `STRING_TO_ARRAY() and UNNEST() expand associations. Dashboard counts exclude ${data.quality.emptyCountryTokens} empty country tokens; a title can count toward several countries or genres.`],
      ['Dates and duration', `TO_DATE(TRIM(...)) parses text dates. ${data.quality.missing.date_added} missing dates are omitted from time charts. Movie minutes and TV seasons are analysed separately.`]
    ];
    $('#quality-checks').innerHTML = checks.map(([title,body])=>`<div class="quality-check"><strong>${title}</strong><p>${body}</p></div>`).join('');
  }

  function chartCard(id, title, subtitle) {
    return `<article class="chart-card"><h3 id="heading-${id}">${title}</h3><p class="chart-subtitle">${subtitle}</p><div class="chart-wrap"><canvas id="chart-${id}" role="img" aria-labelledby="heading-${id}" aria-describedby="summary-${id}"></canvas></div><p class="chart-summary" id="summary-${id}"></p><details><summary>View data table</summary><div class="table-scroll"><table><caption class="sr-only">${title} values</caption><thead><tr><th scope="col">Category / year</th><th scope="col">Titles</th></tr></thead><tbody id="table-${id}"></tbody></table></div></details></article>`;
  }

  function fillCalendarYears(pairs) {
    if (!pairs.length) return pairs;
    const map = new Map(pairs);
    return Array.from({length:pairs.at(-1)[0]-pairs[0][0]+1}, (_,i)=>[pairs[0][0]+i,map.get(pairs[0][0]+i)||0]);
  }

  function drawChart(id, pairs, kind, horizontal = false) {
    $('#table-'+id).innerHTML = pairs.map(([label,value])=>`<tr><th scope="row">${escape(label)}</th><td>${format(value)}</td></tr>`).join('');
    const largest = [...pairs].sort((a,b)=>b[1]-a[1])[0];
    $('#summary-'+id).textContent = largest ? `${kind === 'line' ? 'Peak year' : 'Largest category'}: ${largest[0]} · ${format(largest[1])} titles.` : 'No matching records.';
    const canvas = $('#chart-'+id);
    if (!window.Chart) {
      canvas.parentElement.hidden = true;
      canvas.closest('article').querySelector('details').open = true;
      return;
    }
    const labels = pairs.map(([label])=>label);
    const values = pairs.map(([,value])=>value);
    const doughnut = kind === 'doughnut';
    const colors = doughnut ? ['#ee2943','#9ea2b7'] : pairs.map((_,i)=> i===0 && kind!=='line' ? '#ee2943' : '#b32a40');
    const existing = charts.get(id);
    if (existing) {
      existing.data.labels = labels;
      existing.data.datasets[0].data = values;
      existing.data.datasets[0].backgroundColor = kind === 'line' ? '#ef233c15' : colors;
      existing.update();
      return;
    }
    const options = {
      responsive:true, maintainAspectRatio:false,
      animation:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : {duration:250},
      interaction:{mode:doughnut?'nearest':'index',intersect:false},
      plugins:{
        legend:{display:doughnut,position:'bottom',labels:{color:'#c8c8d3',boxWidth:9,padding:16,font:{size:10}}},
        tooltip:{backgroundColor:'#292930',borderColor:'#555562',borderWidth:1,padding:12,titleColor:'#fff',bodyColor:'#e3e3ee',callbacks:{label:(context)=>`${context.label}: ${format(context.raw)} titles`}}
      }
    };
    if (doughnut) options.cutout = '72%';
    else {
      options.indexAxis = horizontal ? 'y' : 'x';
      const numberAxis = {beginAtZero:true,grid:{color:'#28282f'},border:{display:false},ticks:{color:'#9595a3',font:{size:9},precision:0,maxTicksLimit:5}};
      const categoryAxis = {grid:{display:false},border:{display:false},ticks:{color:'#b2b2bf',font:{size:9},autoSkip:!horizontal,maxTicksLimit:horizontal?10:7,maxRotation:0,callback:function(value){const label=String(this.getLabelForValue(value)); return horizontal&&label.length>23?label.slice(0,21)+'…':label;}}};
      options.scales = horizontal ? {x:numberAxis,y:categoryAxis} : {x:categoryAxis,y:numberAxis};
    }
    charts.set(id, new Chart(canvas, {
      type:kind,
      data:{labels,datasets:[{label:'Titles',data:values,backgroundColor:kind==='line'?'#ef233c15':colors,borderColor:kind==='line'?'#ef5267':(doughnut?'#141417':'transparent'),borderWidth:doughnut?4:2,borderRadius:kind==='bar'?3:0,fill:kind==='line',tension:.25,pointRadius:kind==='line'?1.5:0,pointHoverRadius:5,barPercentage:.75}]},
      options
    }));
  }

  function renderDashboard(content = 'all') {
    const selected = data[content];
    $('#dashboard-status').textContent = `${format(selected.total)} ${content==='all'?'titles':content==='movies'?'movies':'TV shows'} shown below · KPI cards describe the full catalogue`;
    drawChart('mix', selected.mix, 'doughnut');
    drawChart('ratings', selected.ratings.slice(0,7), 'bar');
    drawChart('countries', selected.countries.slice(0,7), 'bar', true);
    drawChart('genres', selected.genres.slice(0,7), 'bar', true);
    drawChart('releases', fillCalendarYears(selected.releases), 'line');
    drawChart('additions', fillCalendarYears(selected.additions), 'line');
    const leading = selected.mix[0];
    $('#summary-mix').textContent = `${leading[0]}: ${format(leading[1])} titles (${percent(leading[1],selected.total)}% of the selected catalogue).`;
  }

  function renderIndia() {
    $('#india-total').textContent = format(data.india.total);
    $('#india-mix').innerHTML = data.india.mix.map(([label,value])=>`<span><strong>${format(value)}</strong>${label==='Movie'?'Movies':'TV Shows'}</span>`).join('');
    $('#india-chart').innerHTML = chartCard('india','Top genres in Indian content','Top six categories · titles may have multiple genres');
    drawChart('india',data.india.genres.slice(0,6),'bar',true);
    $('#india-actors').innerHTML = data.india.actors.slice(0,5).map(([name,value])=>`<li><span>${escape(name)}</span><strong>${format(value)}</strong></li>`).join('');
  }

  function highlightSQL(sql) {
    const tokens = /('(?:''|[^'])*')|\b(SELECT|FROM|WHERE|GROUP|BY|ORDER|DESC|ASC|LIMIT|WITH|AS|COUNT|ROUND|SUM|OVER|PARTITION|RANK|FILTER|CASE|WHEN|THEN|ELSE|END|IS|NOT|NULL|AND|OR|LIKE|ILIKE|DISTINCT|CROSS|JOIN|LATERAL|UNNEST|STRING_TO_ARRAY|TRIM|CAST|INTEGER|REGEXP_REPLACE|TO_DATE|EXTRACT)\b|\b(\d+)\b/g;
    let result = '', cursor = 0;
    for (const token of sql.matchAll(tokens)) {
      result += escape(sql.slice(cursor,token.index));
      result += `<span class="sql-${token[1]?'string':token[2]?'keyword':'number'}">${escape(token[0])}</span>`;
      cursor = token.index + token[0].length;
    }
    return result + escape(sql.slice(cursor));
  }

  function renderQuestions() {
    $('#questions').innerHTML = data.questions.map((question)=>`<article class="question" data-number="${question.number}"><button class="question-card" aria-haspopup="dialog" aria-controls="sql-modal" aria-labelledby="question-title-${question.number}"><span class="question-meta">QUESTION ${question.number} <span aria-hidden="true">•</span> ${question.difficulty.toUpperCase()}</span><span class="question-heading" id="question-title-${question.number}">${escape(question.title)}</span><span class="question-hint">Click to view PostgreSQL solution <span aria-hidden="true">→</span></span></button></article>`).join('');
    const modal = $('#sql-modal');
    const copyButton = $('#modal-copy');
    let activeQuestion = null;
    let opener = null;
    let copyTimer;
    let previousOverflow = '';

    const closeModal = () => { if (modal.open) modal.close(); };
    const openModal = (question, button) => {
      activeQuestion = question;
      opener = button;
      window.clearTimeout(copyTimer);
      copyButton.textContent = 'Copy SQL';
      $('#modal-meta').textContent = `QUESTION ${question.number} • ${question.difficulty.toUpperCase()}`;
      $('#modal-title').textContent = question.title;
      $('#modal-explanation').textContent = question.explanation;
      $('#modal-code').innerHTML = highlightSQL(question.sql);
      $('#modal-query-label').textContent = `POSTGRESQL / QUERY ${String(question.number).padStart(2,'0')}`;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      modal.showModal();
      modal.querySelector('.sql-modal-body').scrollTop = 0;
      modal.querySelector('.code-block').scrollLeft = 0;
      $('#modal-close').focus({preventScroll:true});
    };
    $$('.question-card').forEach((button,index)=>button.addEventListener('click',()=>openModal(data.questions[index],button)));
    $('#modal-close').addEventListener('click',closeModal);
    modal.addEventListener('cancel',(event)=>{event.preventDefault();closeModal();});
    modal.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const first = $('#modal-close');
      const last = modal.querySelector('.code-block');
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
    // Native dialog makes the background inert; explicit wrapping keeps keyboard focus in the panel.
    // Only a gesture that starts and ends outside the panel dismisses it.
    const outsidePanel = (event) => {
      const rect = modal.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    let pointerStartedOutside = false;
    modal.addEventListener('pointerdown',(event)=>{pointerStartedOutside=event.target===modal&&outsidePanel(event);});
    modal.addEventListener('click',(event)=>{
      if(pointerStartedOutside&&event.target===modal&&outsidePanel(event)) closeModal();
      pointerStartedOutside=false;
    });
    modal.addEventListener('close',()=>{
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(copyTimer);
      opener?.focus({preventScroll:true});
      activeQuestion = null;
    });
    copyButton.addEventListener('click',async()=>{
      if (!activeQuestion) return;
      const question = activeQuestion;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(question.sql);
        if (activeQuestion!==question) return;
        copyButton.textContent = 'Copied!';
      } catch {
        if (activeQuestion!==question) return;
        const range = document.createRange();
        range.selectNodeContents($('#modal-code'));
        const selection = window.getSelection();
        selection.removeAllRanges(); selection.addRange(range);
        copyButton.textContent = 'Selected — press Ctrl/Cmd+C';
      }
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(()=>{copyButton.textContent='Copy SQL';},2500);
    });

    let difficulty = 'All';
    const questionCards = $$('.question');
    const filter = () => {
      const terms = $('#sql-search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let count = 0;
      data.questions.forEach((question,index)=>{
        const text = `${question.title} ${question.explanation} ${question.sql}`.toLowerCase();
        const visible = (difficulty==='All'||difficulty===question.difficulty) && terms.every((term)=>text.includes(term));
        questionCards[index].hidden = !visible;
        if (visible) count++;
      });
      $('#result-count').textContent = `${count} of ${data.questions.length} questions`;
      $('#no-results').hidden = count !== 0;
    };
    $$('[data-difficulty]').forEach((button)=>button.addEventListener('click',()=>{
      difficulty = button.dataset.difficulty;
      $$('[data-difficulty]').forEach((item)=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button));});
      filter();
    }));
    $('#sql-search').addEventListener('input',filter);
    filter();
  }

  function renderInsights() {
    const releasePeak = [...data.all.releases].sort((a,b)=>b[1]-a[1])[0];
    const addedPeak = [...data.all.additions].sort((a,b)=>b[1]-a[1])[0];
    const [country,countryCount] = data.all.countries[0];
    const [genre,genreCount] = data.all.genres[0];
    const [rating,ratingCount] = data.all.ratings[0];
    const cards = [
      ['CONTENT MIX',`${percent(data.movies.total,data.all.total)}%`,'Movies make up the majority',`${format(data.movies.total)} movies versus ${format(data.shows.total)} TV shows. These are title counts, not viewing hours.`],
      ['GEOGRAPHY',format(countryCount),`${country} leads associations`,'A count of country credits, including co-productions. Multi-country titles contribute to each named country.'],
      ['CATEGORIES',format(genreCount),`${genre} is most frequent`,'The leading category by associated titles. Genres overlap, so their totals do not sum to the catalogue size.'],
      ['CONTENT RATINGS',format(ratingCount),`${rating} is the largest rating group`,'Excludes blank ratings and the three misplaced duration values; no original records were rewritten.'],
      ['RELEASE PATTERNS',String(releasePeak[0]),'The most represented release year',`${format(releasePeak[1])} titles were originally released that year. This differs from when they were added to Netflix.`],
      ['PLATFORM ADDITIONS',String(addedPeak[0]),'The busiest addition year in this sample',`${format(addedPeak[1])} catalogue entries have addition dates in this year. This historical sample ends on ${data.dateRange[1]}.`]
    ];
    $('#insight-grid').innerHTML = cards.map(([category,value,title,body])=>`<article class="insight"><span class="small-label">${category}</span><strong>${escape(value)}</strong><h3>${escape(title)}</h3><p>${escape(body)}</p></article>`).join('');
  }

  function setupNavigation() {
    const menu = $('.menu-toggle');
    const nav = $('#navigation');
    const closeMenu = () => {nav.classList.remove('open');menu.setAttribute('aria-expanded','false');};
    menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
    $$('#navigation a').forEach((link)=>link.addEventListener('click',closeMenu));
    document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
    const links = $$('#navigation a');
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        if (!entry.isIntersecting) return;
        links.forEach((link)=>{
          const active=link.hash===`#${entry.target.id}`;
          link.classList.toggle('active',active);
          if(active) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
        });
      });
    },{rootMargin:'-15% 0px -65% 0px',threshold:0});
    links.forEach((link)=>observer.observe($(link.hash)));
  }

  renderOverview();
  $('#chart-grid').innerHTML = [
    ['mix','Movies vs TV Shows','Share of titles by content type'],
    ['ratings','Top content ratings','Seven most frequent valid ratings'],
    ['countries','Top countries','Seven leading country associations'],
    ['genres','Top genres / categories','Seven leading category associations'],
    ['releases','Titles by release year','Original release year · full available range'],
    ['additions','Content added over time','Year added to Netflix · 2021 is partial']
  ].map((args)=>chartCard(...args)).join('');
  $('#chart-error').hidden = Boolean(window.Chart);
  renderDashboard(); renderIndia(); renderQuestions(); renderInsights(); setupNavigation();
  $$('[data-content]').forEach((button)=>button.addEventListener('click',()=>{
    $$('[data-content]').forEach((item)=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button));});
    renderDashboard(button.dataset.content);
  }));
})();
