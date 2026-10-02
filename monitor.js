
(function(){
  const baseNewReport = newReport;

  newReport = function(type='computer'){
    const r = baseNewReport();
    r.equipmentType = type;
    r.ports = r.ports || '';
    return r;
  };

  editNew = async function(type='computer'){
    if(currentFolderKey===null){ alert('Najpierw otwórz lub utwórz folder.'); return; }
    current = newReport(type);
    await dbPut(current);
    reports.unshift(current);
    renderEditor();
  };

  renderFolder = function(){
    const q=(window._search||'').toLowerCase();
    const items=reports
      .filter(r=>(currentFolderKey===UNFILED?!r.folderId:r.folderId===currentFolderKey))
      .filter(r=>(r.computerNo+' '+r.model).toLowerCase().includes(q))
      .sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));

    $('#app').innerHTML=`<div class="topbar"><div class="editor-head"><button class="back" onclick="home()">‹</button><div><div class="editor-title">${esc(folderName())}</div><div class="sub">${items.length} raportów</div></div></div>
      <div class="row"><button class="btn primary grow" onclick="editNew('computer')">＋ Nowy komputer</button><button class="btn dark grow" onclick="editNew('monitor')">＋ Nowy monitor</button></div>
      <input class="search mt12" placeholder="Szukaj po numerze lub modelu…" value="${esc(window._search||'')}" oninput="window._search=this.value;renderFolder()"></div>
      ${items.length?items.map(r=>`<div class="card report-card"><input class="check" type="checkbox" ${selected.has(r.id)?'checked':''} onchange="toggleSel('${r.id}',this.checked)"><div onclick="openReport('${r.id}')"><div class="report-no">${esc(r.computerNo||'Bez numeru')}</div><div class="report-model">${r.equipmentType==='monitor'?'🖥️ ':''}${esc(r.model||'Bez modelu')}</div><div class="report-date">${r.equipmentType==='monitor'?'Monitor':'Komputer'} • ${fmtDate(r.updatedAt)}</div></div><div class="chev" onclick="openReport('${r.id}')">›</div></div>`).join(''):`<div class="card empty"><div class="emoji">🧰</div><b>Brak sprzętu w tym folderze</b><div class="mt8">Dodaj pierwszy komputer albo monitor.</div></div>`}
      ${currentFolderKey!==UNFILED&&items.length===0?`<button class="btn danger" style="width:100%;margin-top:10px" onclick="deleteCurrentFolder()">Usuń pusty folder</button>`:''}
      <div class="batch ${selected.size?'show':''}"><div class="grow"><b>${selected.size} zazn.</b><div style="font-size:12px;opacity:.75">PDF-y + wybrane zdjęcia</div></div><button class="btn primary small" onclick="exportBatch()">Utwórz ZIP</button></div>`;
  };

  setEquipmentType = function(type){
    current.equipmentType = type;
    current.ports = current.ports || '';
    current.updatedAt = nowISO();
    scheduleSave();
    renderEditor();
  };

  renderEditor = function(){
    const r=current;
    const isMonitor=r.equipmentType==='monitor';
    const fallback=isMonitor?'Nowy monitor':'Nowy komputer';

    const idFields=isMonitor
      ? field('Nazwa / numer','computerNo',r.computerNo,'np. 06020','numeric') + field('Model monitora','model',r.model,'np. Dell U2412 24"')
      : field('Nazwa kompa / numer','computerNo',r.computerNo,'np. 06543','numeric') + field('Model','model',r.model,'np. HP EliteBook 840 G4') + field('Procesor','cpu',r.cpu,'np. Intel i5-7200U');

    const specs=isMonitor
      ? `<div class="section-title">Specyfikacja monitora</div><div class="card">${field('Porty','ports',r.ports||'','np. DisplayPort, DVI, D-SUB, 4x USB-A')}</div>`
      : `<div class="section-title">Specyfikacja</div><div class="card">
          <div class="field"><span class="label">RAM</span><div class="chips">${['8','16','24','32'].map(v=>chip(v+' GB',r.ram===v,`setChoice('ram','${v}')`)).join('')}${chip('Inne',r.ram==='other',`setChoice('ram','other')`)}</div>${r.ram==='other'?field('', 'ramOther', r.ramOther,'Wpisz np. 64','numeric'):''}</div>
          <div class="field"><span class="label">Dysk</span><div class="chips">${['256','512'].map(v=>chip(v+' GB',r.disk===v,`setChoice('disk','${v}')`)).join('')}${chip('Inny',r.disk==='other',`setChoice('disk','other')`)}</div>${r.disk==='other'?field('', 'diskOther', r.diskOther,'Wpisz pojemność w GB','numeric'):''}</div>
          <div class="field"><span class="label">System operacyjny</span><div class="chips">${['Windows 10 Pro','Windows 11 Pro'].map(v=>chip(v,r.os===v,`setChoice('os','${v}')`)).join('')}${chip('Inny',r.os==='other',`setChoice('os','other')`)}</div>${r.os==='other'?field('', 'osOther', r.osOther,'Wpisz system'):''}</div>
        </div>`;

    const notes=isMonitor?'':`<div class="field"><span class="label">Uwagi — w PDF będą duże i czerwone</span><textarea class="textarea" placeholder="np. Laptop sprzedawany jest bez zasilacza." oninput="setVal('notes',this.value)">${esc(r.notes)}</textarea>${r.notes?`<div class="warn-preview mt8">${esc(r.notes)}</div>`:''}</div>`;

    $('#app').innerHTML=`<div class="editor-head"><button class="back" onclick="saveAndFolder()">‹</button><div class="editor-title">${esc(r.computerNo||fallback)}</div><div class="save-dot">● zapis automatyczny</div></div>
      <div class="section-title">Typ sprzętu</div><div class="card"><div class="chips"><button class="chip ${!isMonitor?'active':''}" onclick="setEquipmentType('computer')">💻 Komputer</button><button class="chip ${isMonitor?'active':''}" onclick="setEquipmentType('monitor')">🖥️ Monitor</button></div></div>
      <div class="section-title">Identyfikacja</div><div class="card">${idFields}</div>
      ${specs}
      <div class="section-title">Stan</div><div class="card">
        ${notes}
        <div class="field"><span class="label">Stan techniczny</span><div class="chips">${['Średni','Dobry','Bardzo dobry'].map(v=>`<button class="chip state ${r.condition===v?'active':''}" onclick="setChoice('condition','${v}')">${v}</button>`).join('')}</div></div>
        <div class="field"><span class="label">Opis stanu</span><textarea class="textarea" placeholder="${isMonitor?'np. normalne ślady użytkowania':'np. brak 1 śrubki od obudowy, ryski'}" oninput="setVal('conditionDesc',this.value)">${esc(r.conditionDesc)}</textarea></div>
      </div>
      <div class="section-title">Zdjęcia (${r.photos.length})</div><div class="card">
        <div class="photos">${r.photos.map((p,i)=>photoCard(p,i)).join('')}</div>
        <div class="photo-add"><label class="btn dark">📷 Zrób zdjęcie<input id="cam" class="file-input" type="file" accept="image/*" capture="environment" onchange="addFiles(this.files);this.value=''" /></label><label class="btn ghost">🖼️ Galeria<input id="gal" class="file-input" type="file" accept="image/*" multiple onchange="addFiles(this.files);this.value=''" /></label></div>
        <div class="notice">Pierwsze zdjęcie trafia na 1. stronę PDF. Kolejne układają się po 2 na stronę. Ostatnie samotne zdjęcie będzie duże na osobnej stronie.</div>
      </div>
      <div class="section-title">Eksport</div><div class="card"><div class="row wrap"><button class="btn ghost grow" onclick="previewPDF()">👁 Podgląd PDF</button><button class="btn primary grow" onclick="sharePDF()">↗️ Udostępnij PDF</button></div><div class="row wrap mt8"><button class="btn ghost grow" onclick="duplicateCurrent()">⧉ Duplikuj</button><button class="btn danger grow" onclick="deleteCurrent()">🗑 Usuń</button></div></div>
      <div class="sticky-actions"><div class="row"><button class="btn dark" onclick="saveAndFolder()">✓ Zapisz i wróć</button></div></div>`;
  };

  setVal = function(k,v){
    current[k]=v;
    current.updatedAt=nowISO();
    scheduleSave();
    if(k==='computerNo') $('.editor-title').textContent=v||(current.equipmentType==='monitor'?'Nowy monitor':'Nowy komputer');
  };

  pdfSpecs = function(report){
    if(report.equipmentType==='monitor') return report.ports?[['Porty',report.ports]]:[];
    const out=[];
    if(report.cpu)out.push(['Procesor',report.cpu]);
    const ram=report.ram==='other'?report.ramOther:report.ram;if(ram)out.push(['Pamięć RAM',ram+' GB RAM']);
    const disk=report.disk==='other'?report.diskOther:report.disk;if(disk)out.push(['Dysk SSD',disk+' GB']);
    const os=report.os==='other'?report.osOther:report.os;if(os)out.push(['System operacyjny',os]);
    return out;
  };

  buildPdfPages = function(report){
    const root=document.createElement('div');root.className='pdf-render-root';
    const p1=document.createElement('div');p1.className='pdf-page';
    const isMonitor=report.equipmentType==='monitor';
    const state=[report.condition,report.conditionDesc].filter(Boolean).join(', ');
    const title=isMonitor?'Monitor '+(report.model||''):(report.model||'Komputer');
    const specsHtml=isMonitor
      ? pdfSpecs(report).map(([a,b])=>`<div class="pdf-spec"><b>${esc(a)}:</b> ${esc(b)}</div>`).join('')
      : pdfSpecs(report).map(([a,b])=>`<div class="pdf-spec">• ${esc(a)}: ${esc(b)}</div>`).join('');
    p1.innerHTML=`<div class="pdf-inner"><div class="pdf-info"><div class="pdf-title">${esc(title)}${isMonitor?'':':'}</div>${specsHtml}${!isMonitor&&report.notes?`<div class="pdf-notes">${esc(report.notes)}</div>`:''}<div class="pdf-state"><b>Stan techniczny:</b><div>${esc(state)}</div></div></div>${report.photos[0]?`<div class="pdf-photo-slot"><img src="${report.photos[0].dataUrl}"></div>`:''}</div>`;
    root.appendChild(p1);
    const rest=report.photos.slice(1);
    for(let i=0;i<rest.length;i+=2){
      const page=document.createElement('div');page.className='pdf-page';
      const pair=rest.slice(i,i+2);
      page.innerHTML=`<div class="pdf-photo-page">${pair.map(p=>`<div class="pdf-photo-slot"><img src="${p.dataUrl}"></div>`).join('')}</div>`;
      root.appendChild(page);
    }
    return root;
  };
})();
