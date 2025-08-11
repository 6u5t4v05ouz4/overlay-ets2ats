(() => {
  // Debug dos tooltips
  console.log('Renderer iniciado, verificando tooltips...');
  
  // Verificar se os tooltips estão sendo criados
  setTimeout(() => {
    const tooltipContainers = document.querySelectorAll('.tooltip-container');
    const tooltips = document.querySelectorAll('.tooltip');
    console.log(`Tooltip containers encontrados: ${tooltipContainers.length}`);
    console.log(`Tooltips encontrados: ${tooltips.length}`);
    
    if (tooltipContainers.length > 0) {
      console.log('Primeiro container:', tooltipContainers[0]);
      console.log('Primeiro tooltip:', tooltips[0]);
    }
  }, 1000);
  
  const micBtn = document.getElementById('btnMic');
  const transcriptEl = document.getElementById('transcript');
  const statusEl = document.getElementById('status');
  const tlmConn = document.getElementById('tlm-conn');
  const tlmSpeed = document.getElementById('tlm-speed');
  const tlmRpm = document.getElementById('tlm-rpm');
  const tlmGear = document.getElementById('tlm-gear');
  const tlmFuel = document.getElementById('tlm-fuel');
  const tlmSpeedLim = document.getElementById('tlm-speedlim');
  const tlmCruise = document.getElementById('tlm-cruise');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const btnSaveKey = document.getElementById('btnSaveKey');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const providerSelect = document.getElementById('providerSelect');
  const sectionDefault = document.getElementById('section-default');
  const sectionTruck = document.getElementById('section-truck');
  const sectionCargo = document.getElementById('section-cargo');
  const subtitleEl = document.getElementById('subtitle');
  const truckMakeEl = document.getElementById('truck-make');
  const truckModelEl = document.getElementById('truck-model');
  const truckOdoEl = document.getElementById('truck-odo');
  const truckDamageEl = document.getElementById('truck-damage');
  const truckDmgCabinEl = document.getElementById('truck-dmg-cabin');
  const truckDmgChassisEl = document.getElementById('truck-dmg-chassis');
  const truckDmgEngineEl = document.getElementById('truck-dmg-engine');
  const truckDmgTransEl = document.getElementById('truck-dmg-trans');
  const truckDmgWheelsEl = document.getElementById('truck-dmg-wheels');
  const warnAirEl = document.getElementById('warn-air');
  const warnAirEmgEl = document.getElementById('warn-air-emg');
  const warnFuelEl = document.getElementById('warn-fuel');
  const warnAdBlueEl = document.getElementById('warn-adblue');
  const warnOilEl = document.getElementById('warn-oil');
  const warnWaterEl = document.getElementById('warn-water');
  const warnBattEl = document.getElementById('warn-batt');
  const cargoGridEl = document.getElementById('cargo-grid');
  const cargoNoJobMessageEl = document.getElementById('cargo-no-job-message');
  const cargoOriginEl = document.getElementById('cargo-origin');
  const cargoOriginCompanyEl = document.getElementById('cargo-origin-company');
  const cargoDestEl = document.getElementById('cargo-dest');
  const cargoDestCompanyEl = document.getElementById('cargo-dest-company');
  const cargoDistEl = document.getElementById('cargo-dist');
  const cargoWeightEl = document.getElementById('cargo-weight');
  const cargoTypeEl = document.getElementById('cargo-type');
  const cargoDamageEl = document.getElementById('cargo-damage');
  const cargoIncomeEl = document.getElementById('cargo-income');
  const cargoDeadlineEl = document.getElementById('cargo-deadline');

  let isRunning = false;
  let audioContext = null;
  let sourceNode = null;
  let processorNode = null;
  let sampleRate = 16000;
  let currentBuffer = [];
  let sendTimer = null;
  let sendingInFlight = false;

  // VAD (Voice Activity Detection) simples baseado em RMS
  const vadControls = {
    input: document.getElementById('vadSensitivity'),
    label: document.getElementById('vadSensitivityLabel'),
  };
  let vadSensitivity = 2.0; // fator multiplicador sobre o floor
  let vadMinSpeechMs = 200; // ms acima do threshold para abrir gate
  let vadHangoverMs = 200; // ms abaixo do threshold para fechar gate
  let vadIsSpeaking = false;
  let vadPrevSpeaking = false;
  let vadAboveMs = 0;
  let vadBelowMs = 0;
  let vadNoiseRms = 0.01; // estimate do piso de ruído
  // Pre-roll: mantém ~400ms de áudio antes de detectar fala
  const preRollMs = 400;
  let preBuffer = [];
  let preBufferSamples = 0;

  function loadVadFromStorage() {
    try {
      const v = localStorage.getItem('vadSensitivity');
      if (v != null) vadSensitivity = Math.max(0.5, Math.min(8, Number(v) || 2.0));
    } catch (_) {}
    if (vadControls.input) vadControls.input.value = String(vadSensitivity);
    if (vadControls.label) vadControls.label.textContent = String(vadSensitivity);
  }
  function initVadUI() {
    loadVadFromStorage();
    if (vadControls.input) {
      vadControls.input.addEventListener('input', () => {
        const v = Math.max(0.5, Math.min(8, Number(vadControls.input.value) || 2.0));
        vadSensitivity = v;
        if (vadControls.label) vadControls.label.textContent = String(v.toFixed(1).replace(/\.0$/, ''));
        try { localStorage.setItem('vadSensitivity', String(v)); } catch (_) {}
      });
    }
  }

  function computeRms(float32) {
    let sum = 0;
    for (let i = 0; i < float32.length; i += 1) {
      const s = float32[i];
      sum += s * s;
    }
    const mean = sum / Math.max(1, float32.length);
    return Math.sqrt(mean);
  }

  function updateVad(rms, frameMs) {
    const minThreshold = 0.0005;
    const threshold = Math.max(minThreshold, vadNoiseRms * vadSensitivity);
    if (vadIsSpeaking) {
      if (rms < threshold) {
        vadBelowMs += frameMs;
        if (vadBelowMs >= vadHangoverMs) {
          vadIsSpeaking = false;
          vadBelowMs = 0;
          vadAboveMs = 0;
        }
      } else {
        vadBelowMs = 0;
      }
      // quando está falando, não atualiza agressivamente o piso
      vadNoiseRms = vadNoiseRms * 0.995 + rms * 0.005;
    } else {
      // atualizar piso de ruído com EMA mais agressiva
      vadNoiseRms = vadNoiseRms * 0.95 + rms * 0.05;
      if (rms > threshold) {
        vadAboveMs += frameMs;
        if (vadAboveMs >= vadMinSpeechMs) {
          vadIsSpeaking = true;
          vadAboveMs = 0;
          vadBelowMs = 0;
        }
      } else {
        vadAboveMs = 0;
      }
    }
    return { threshold, isSpeaking: vadIsSpeaking };
  }

  function safeFixed(n, digits = 0) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '--';
    try { return Number(n).toFixed(digits); } catch (_) { return String(n); }
  }

  function normalizeTelemetry(data) {
    if (!data || typeof data !== 'object') return null;
    const sdkActive = !!(data.game && data.game.sdkActive);
    const speedKmh = (data.truck?.speed?.kph != null)
      ? data.truck.speed.kph
      : Math.round(Math.abs((data.truck?.speed?.value || 0) * 3.6));
    const rpm = Math.round(data.truck?.engine?.rpm?.value ?? 0);
    const gear = (data.truck?.transmission?.gear?.displayed ?? data.truck?.transmission?.gear?.selected ?? null);
    const fuelLiters = Math.round(data.truck?.fuel?.value ?? 0);
    const speedLimitKmh = (data.navigation?.speedLimit?.kph != null)
      ? data.navigation.speedLimit.kph
      : Math.round(Math.abs((data.navigation?.speedLimit?.value || 0) * 3.6));
    const cruiseKmh = (data.truck?.cruiseControl?.kph != null)
      ? data.truck.cruiseControl.kph
      : Math.round(Math.abs((data.truck?.cruiseControl?.value || 0) * 3.6));
    const make = data.truck?.make?.name || '--';
    const model = data.truck?.model?.name || '--';
    const odometerKm = Math.round(data.truck?.odometer ?? 0);
    const damagePct = Math.round((data.truck?.damage?.total ?? 0) * 100);
    const dmgCabin = Math.round((data.truck?.damage?.cabin ?? 0) * 100);
    const dmgChassis = Math.round((data.truck?.damage?.chassis ?? 0) * 100);
    const dmgEngine = Math.round((data.truck?.damage?.engine ?? 0) * 100);
    const dmgTrans = Math.round((data.truck?.damage?.transmission ?? 0) * 100);
    const dmgWheels = Math.round((data.truck?.damage?.wheels ?? 0) * 100);

    const hasActiveJob = data.job && 
                        data.job.source && 
                        data.job.destination && 
                        data.job.source.city && 
                        data.job.destination.city &&
                        data.job.source.city.name && 
                        data.job.destination.city.name &&
                        data.job.source.city.name.trim() !== '' && 
                        data.job.destination.city.name.trim() !== '';
    
    const job = data.job || {};
    const srcCity = hasActiveJob ? (job.source?.city?.name || '--') : '--';
    const srcCompany = hasActiveJob ? (job.source?.company?.name || '--') : '--';
    const dstCity = hasActiveJob ? (job.destination?.city?.name || '--') : '--';
    const dstCompany = hasActiveJob ? (job.destination?.company?.name || '--') : '--';
    const cargoName = hasActiveJob ? (job.cargo?.name || '--') : '--';
    
    let cargoWeight = '--';
    if (hasActiveJob && job.cargo && job.cargo.mass != null) {
      const massInKg = job.cargo.mass;
      if (massInKg > 0) {
        const massInTons = massInKg / 1000;
        cargoWeight = `${massInTons.toFixed(1)} t`;
      }
    }

    let navDistKm = 0;
    if (hasActiveJob && data.navigation && data.navigation.distance != null) {
      navDistKm = Math.round(data.navigation.distance / 1000);
    }

    const cargoDamagePct = hasActiveJob ? Math.round((data.trailer?.damage?.cargo ?? 0) * 100) : 0;
    const income = hasActiveJob ? (job.income || 0) : 0;
    const eta = (hasActiveJob && data.navigation) ? (data.navigation.time || null) : null;

    const wAir = !!data.truck?.brakes?.airPressure?.warning?.enabled;
    const wAirEmg = !!data.truck?.brakes?.airPressure?.emergency?.enabled;
    const wFuel = !!data.truck?.fuel?.warning?.enabled;
    const wAdBlue = !!data.truck?.adBlue?.warning?.enabled;
    const wOil = !!data.truck?.engine?.oilPressure?.warning?.enabled;
    const wWater = !!data.truck?.engine?.waterTemperature?.warning?.enabled;
    const wBatt = !!data.truck?.engine?.batteryVoltage?.warning?.enabled;

    return { sdkActive, speedKmh, rpm, gear, fuelLiters, speedLimitKmh, cruiseKmh,
      make, model, odometerKm, damagePct, dmgCabin, dmgChassis, dmgEngine, dmgTrans, dmgWheels,
      srcCity, srcCompany, dstCity, dstCompany, cargoName, cargoWeight, navDistKm, cargoDamagePct, hasActiveJob,
      income, eta,
      wAir, wAirEmg, wFuel, wAdBlue, wOil, wWater, wBatt };
  }

  async function initTelemetry() {
    if (!window.overlayAPI) return;
    // Listener de stream
    window.overlayAPI.onTelemetryUpdate((data) => {
      console.log(JSON.stringify(data, null, 2));
      const n = normalizeTelemetry(data);
      if (!n) return;
      tlmConn.textContent = n.sdkActive ? 'Conectado' : 'Aguardando jogo…';
      tlmSpeed.textContent = safeFixed(n.speedKmh, 0);
      tlmRpm.textContent = safeFixed(n.rpm, 0);
      tlmGear.textContent = String(n.gear ?? '--');
      tlmFuel.textContent = safeFixed(n.fuelLiters, 0);
      tlmSpeedLim.textContent = safeFixed(n.speedLimitKmh, 0);
      tlmCruise.textContent = safeFixed(n.cruiseKmh, 0);

      // Atualiza views complementares
      truckMakeEl.textContent = n.make;
      truckModelEl.textContent = n.model;
      truckOdoEl.textContent = safeFixed(n.odometerKm, 0);

      const setChipLocal = (el, pctNum) => {
        if (!el) return;
        const pct = Math.max(0, Math.min(100, Number(pctNum) || 0));
        el.textContent = `${pct}%`;
        el.classList.remove('ok', 'mid', 'crit');
        if (pct < 10) el.classList.add('ok');
        else if (pct < 40) el.classList.add('mid');
        else el.classList.add('crit');
      };
      setChipLocal(truckDamageEl, n.damagePct);
      setChipLocal(truckDmgCabinEl, n.dmgCabin);
      setChipLocal(truckDmgChassisEl, n.dmgChassis);
      setChipLocal(truckDmgEngineEl, n.dmgEngine);
      setChipLocal(truckDmgTransEl, n.dmgTrans);
      setChipLocal(truckDmgWheelsEl, n.dmgWheels);

      // Atualiza dados da carga
      if (n.hasActiveJob) {
        if (cargoGridEl) cargoGridEl.style.display = 'grid';
        if (cargoNoJobMessageEl) cargoNoJobMessageEl.style.display = 'none';

        if (cargoOriginEl) cargoOriginEl.textContent = n.srcCity;
        if (cargoOriginCompanyEl) cargoOriginCompanyEl.textContent = n.srcCompany;
        if (cargoDestEl) cargoDestEl.textContent = n.dstCity;
        if (cargoDestCompanyEl) cargoDestCompanyEl.textContent = n.dstCompany;
        if (cargoDistEl) cargoDistEl.textContent = n.navDistKm > 0 ? `${n.navDistKm} km` : '--';
        if (cargoWeightEl) cargoWeightEl.textContent = n.cargoWeight;
        if (cargoTypeEl) cargoTypeEl.textContent = n.cargoName;
        
        const setCargoChip = (el, pctNum) => {
          if (!el) return;
          const pct = Math.max(0, Math.min(100, Number(pctNum) || 0));
          el.textContent = `${pct}%`;
          el.classList.remove('ok', 'mid', 'crit');
          if (pct < 10) el.classList.add('ok');
          else if (pct < 40) el.classList.add('mid');
          else el.classList.add('crit');
        };
        if (cargoDamageEl) {
            setCargoChip(cargoDamageEl, n.cargoDamagePct);
        }
        if (cargoIncomeEl) {
          cargoIncomeEl.textContent = n.income > 0 ? `€ ${n.income.toLocaleString('de-DE')}` : '--';
        }
        if (cargoDeadlineEl) {
          if (n.eta) {
            try {
              const d = new Date(n.eta);
              const day = String(d.getUTCDate()).padStart(2, '0');
              const month = String(d.getUTCMonth() + 1).padStart(2, '0');
              const hours = String(d.getUTCHours()).padStart(2, '0');
              const minutes = String(d.getUTCMinutes()).padStart(2, '0');
              cargoDeadlineEl.textContent = `${day}/${month} ${hours}:${minutes}`;
            } catch (e) {
              cargoDeadlineEl.textContent = '--';
            }
          } else {
            cargoDeadlineEl.textContent = '--';
          }
        }
      } else {
        if (cargoGridEl) cargoGridEl.style.display = 'none';
        if (cargoNoJobMessageEl) cargoNoJobMessageEl.style.display = 'block';
      }

      // Avisos: aplica badge OK/ALERTA
      const setWarn = (el, flag) => {
        if (!el) return;
        el.textContent = flag ? 'ALERTA' : 'OK';
        el.classList.toggle('warn', !!flag);
        el.classList.toggle('ok', !flag);
      };
      setWarn(warnAirEl, n.wAir);
      setWarn(warnAirEmgEl, n.wAirEmg);
      setWarn(warnFuelEl, n.wFuel);
      setWarn(warnAdBlueEl, n.wAdBlue);
      setWarn(warnOilEl, n.wOil);
      setWarn(warnWaterEl, n.wWater);
      setWarn(warnBattEl, n.wBatt);
    });
    window.overlayAPI.onTelemetryError?.((msg) => {
      tlmConn.textContent = 'Erro';
      appendLine(`[telemetry] ${msg}`);
    });
    // Snapshot inicial
    try {
      const res = await window.overlayAPI.getLatestTelemetry();
      if (res && res.ok && res.data) {
        const n = normalizeTelemetry(res.data);
        if (n) {
          tlmConn.textContent = n.sdkActive ? 'Conectado' : 'Aguardando jogo…';
          tlmSpeed.textContent = safeFixed(n.speedKmh, 0);
          tlmRpm.textContent = safeFixed(n.rpm, 0);
          tlmGear.textContent = String(n.gear ?? '--');
          tlmFuel.textContent = safeFixed(n.fuelLiters, 0);
          tlmSpeedLim.textContent = safeFixed(n.speedLimitKmh, 0);
          tlmCruise.textContent = safeFixed(n.cruiseKmh, 0);
        }
      }
    } catch (_) {}
  }

  // Views control
  const Views = Object.freeze({ Default: 'default', Truck: 'truck', Cargo: 'cargo' });
  let currentView = Views.Default;
  
  async function setView(view) {
    console.log('setView chamado com:', view);
    currentView = view;
    sectionDefault.classList.toggle('active', view === Views.Default);
    sectionTruck.classList.toggle('active', view === Views.Truck);
    sectionCargo.classList.toggle('active', view === Views.Cargo);
    if (view === Views.Default) subtitleEl.textContent = 'Telemetria';
    if (view === Views.Truck) subtitleEl.textContent = 'Status do caminhão';
    if (view === Views.Cargo) subtitleEl.textContent = 'Status da carga';
    
    // Salva o estado da view
    if (window.overlayAPI && typeof window.overlayAPI.saveState === 'function') {
      try {
        await window.overlayAPI.saveState({ view: currentView, focus: focusMode });
        console.log('Estado da view salvo com sucesso');
      } catch (e) {
        console.error('Erro ao salvar estado da view:', e);
      }
    }
    
    debouncedResize();
  }

  // Comandos de voz simples
  function parseVoiceCommand(text) {
    if (!text) return null;
    const norm = (s) => s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // remove acentos
    const t = norm(text);
    if (!/\bcentral\b/.test(t)) return null; // exige wake word
    // central + status do caminh(ão|ao)
    if (/\bcentral\b[\s,:-]*.*\bstatus\s+do\s+caminh(?:ao|\u00e3o)/.test(t) || /\bcentral\b[\s,:-]*.*\bstatus\s+do\s+cam/.test(t)) return 'truck_status';
    // central + status da carga (tolera pontuação/terminadores após 'carga')
    if (/\bcentral\b[\s,:-]*.*\bstatus\s+da\s+carga(?!\w)/.test(t)) return 'cargo_status';
    // central + voltar/retornar/inicial
    if (/\bcentral\b[\s,:-]*.*\b(voltar|retornar|inicial)\b/.test(t)) return 'back_default';
    return null;
  }

  async function initApiKeyUI() {
    if (!window.overlayAPI) return;
    try {
      const res = await window.overlayAPI.hasSavedApiKey();
      if (res && res.ok) {
        apiKeyStatus.textContent = res.saved ? 'API Key salva.' : 'Sem API Key salva.';
      }
      const p = await window.overlayAPI.getProvider();
      if (p && p.ok && p.provider) providerSelect.value = p.provider;
    } catch (_) {}

    btnSaveKey.addEventListener('click', async () => {
      const key = (apiKeyInput.value || '').trim();
      try {
        const r = await window.overlayAPI.setApiKey(key);
        if (r && r.ok) {
          apiKeyStatus.textContent = key ? 'API Key salva.' : 'Sem API Key salva.';
          apiKeyInput.value = '';
        } else {
          apiKeyStatus.textContent = `Erro ao salvar: ${(r && r.error) || 'desconhecido'}`;
        }
      } catch (e) {
        apiKeyStatus.textContent = `Erro ao salvar: ${e && e.message ? e.message : e}`;
      }
    });

    providerSelect.addEventListener('change', async () => {
      const next = providerSelect.value;
      try {
        const r = await window.overlayAPI.setProvider(next);
        if (!(r && r.ok)) {
          apiKeyStatus.textContent = `Erro ao trocar provedor: ${(r && r.error) || 'desconhecido'}`;
        }
      } catch (e) {
        apiKeyStatus.textContent = `Erro ao trocar provedor: ${e && e.message ? e.message : e}`;
      }
    });
  }

  const appendLine = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    transcriptEl.appendChild(div);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  };

  function floatTo16BitPCM(float32Array) {
    const out = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i += 1) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }

  function encodeWAV(float32Array, sampleRateHz) {
    const pcm16 = floatTo16BitPCM(float32Array);
    const byteRate = sampleRateHz * 2; // mono 16-bit
    const blockAlign = 2; // mono 16-bit
    const dataSize = pcm16.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // audio format = 1 (PCM)
    view.setUint16(22, 1, true); // channels = 1 (mono)
    view.setUint32(24, sampleRateHz, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM data
    let offset = 44;
    for (let i = 0; i < pcm16.length; i += 1) {
      view.setInt16(offset, pcm16[i], true);
      offset += 2;
    }
    return buffer;
  }

  function writeString(dataview, offset, string) {
    for (let i = 0; i < string.length; i += 1) {
      dataview.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function mergeFloat32(buffers) {
    let total = 0;
    for (const b of buffers) total += b.length;
    const result = new Float32Array(total);
    let offset = 0;
    for (const b of buffers) {
      result.set(b, offset);
      offset += b.length;
    }
    return result;
  }

  async function trySend() {
    if (sendingInFlight) return;
    if (currentBuffer.length === 0) return;
    const toSend = currentBuffer;
    currentBuffer = [];
    sendingInFlight = true;
    statusEl.textContent = 'Transcrevendo…';
    try {
      const merged = mergeFloat32(toSend);
      const wavBuffer = encodeWAV(merged, sampleRate);
      const arrayBuffer = wavBuffer; // already ArrayBuffer
      if (!window.overlayAPI || !window.overlayAPI.transcribe) {
        statusEl.textContent = 'IPC não disponível.';
        return;
      }
      const result = await window.overlayAPI.transcribe(arrayBuffer, 'audio/wav');
        if (result && result.ok) {
        // Se Google/Gemini retorna command diretamente
          if (result.command) {
            const cmd = String(result.command || '').trim().toLowerCase();
          if (cmd === 'truck_status') await setView(Views.Truck);
          else if (cmd === 'cargo_status') await setView(Views.Cargo);
          else if (cmd === 'back_default') await setView(Views.Default);
        } else {
          const text = (result.text || '').trim();
          if (text) {
            const cmd = parseVoiceCommand(text);
            if (cmd === 'truck_status') await setView(Views.Truck);
            else if (cmd === 'cargo_status') await setView(Views.Cargo);
            else if (cmd === 'back_default') await setView(Views.Default);
          }
        }
        statusEl.textContent = isRunning ? 'Ouvindo…' : 'Aguardando…';
      } else {
        const msg = (result && result.error) || 'desconhecido';
        statusEl.textContent = `Falha: ${msg}`;
        if (/OPENAI_API_KEY/i.test(msg)) {
          appendLine('Configure a variável de ambiente OPENAI_API_KEY no .env e reinicie.');
        }
      }
    } catch (err) {
      statusEl.textContent = `Erro: ${err && err.message ? err.message : String(err)}`;
    } finally {
      sendingInFlight = false;
    }
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      } catch (_) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      sampleRate = audioContext.sampleRate;
      sourceNode = audioContext.createMediaStreamSource(stream);
      const bufferSize = 4096;
      processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const frameMs = (input.length / sampleRate) * 1000;
        const rms = computeRms(input);
        const { isSpeaking } = updateVad(rms, frameMs);

        // Alimenta pre-roll buffer
        const copyForPre = new Float32Array(input);
        preBuffer.push(copyForPre);
        preBufferSamples += copyForPre.length;
        const preLimit = Math.ceil((preRollMs / 1000) * sampleRate);
        while (preBufferSamples > preLimit && preBuffer.length > 0) {
          const first = preBuffer.shift();
          preBufferSamples -= first.length;
        }

        // Se transicionou de silêncio->fala, injeta pre-roll no buffer atual
        if (!vadPrevSpeaking && isSpeaking && preBuffer.length > 0) {
          for (const chunk of preBuffer) {
            currentBuffer.push(new Float32Array(chunk));
          }
        }
        vadPrevSpeaking = isSpeaking;

        if (isSpeaking) {
          // copia para evitar retenção do buffer interno
          currentBuffer.push(new Float32Array(input));
        }
      };
      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);

      statusEl.textContent = 'Gravando…';
      if (sendTimer) clearInterval(sendTimer);
      sendTimer = setInterval(() => { if (isRunning) trySend(); }, 4000);
    } catch (e) {
      statusEl.textContent = `Permissão/erro de áudio: ${e && e.message ? e.message : e}`;
    }
  }

  function stop() {
    try {
      if (sendTimer) { clearInterval(sendTimer); sendTimer = null; }
      trySend();
      if (processorNode) { processorNode.disconnect(); processorNode = null; }
      if (sourceNode && sourceNode.mediaStream) {
        sourceNode.mediaStream.getTracks().forEach(t => t.stop());
      }
      if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
      if (audioContext) { audioContext.close(); audioContext = null; }
    } catch (_) {}
  }

  function updateMicButton() {
    if (!micBtn) return;
    micBtn.textContent = isRunning ? '⏹️' : '🎤';
    micBtn.title = isRunning ? 'Parar microfone' : 'Iniciar microfone';
    micBtn.setAttribute('aria-pressed', isRunning ? 'true' : 'false');
  }

  if (micBtn) {
    micBtn.addEventListener('click', async () => {
      if (!isRunning) {
        isRunning = true;
        updateMicButton();
        await start();
      } else {
        isRunning = false;
        updateMicButton();
        stop();
      }
    });
  }

  // inicializa estado do botão
  updateMicButton();

  // Tooltip logic via JavaScript
  function initializeTooltips() {
    const tooltipContainers = document.querySelectorAll('.tooltip-container');
    tooltipContainers.forEach(container => {
      const tooltip = container.querySelector('.tooltip');
      if (tooltip) {
        container.addEventListener('mouseenter', () => {
          tooltip.style.visibility = 'visible';
          tooltip.style.opacity = '1';
        });
        container.addEventListener('mouseleave', () => {
          tooltip.style.visibility = 'hidden';
          tooltip.style.opacity = '0';
        });
      }
    });
  }
  initializeTooltips();

  // Função para restaurar o estado salvo
  async function restoreState() {
    if (!window.overlayAPI || typeof window.overlayAPI.getState !== 'function') {
      console.log('API não disponível para restaurar estado');
      return;
    }
    
    try {
      console.log('Restaurando estado...');
      const result = await window.overlayAPI.getState();
      console.log('Resultado da API:', result);
      
      if (result && result.ok && result.state) {
        const { view, focus } = result.state;
        console.log('Estado recebido:', { view, focus });
        
        // Restaura a view
        if (view && ['default', 'truck', 'cargo'].includes(view)) {
          console.log('Restaurando view:', view);
          if (view === 'default') await setView(Views.Default);
          else if (view === 'truck') await setView(Views.Truck);
          else if (view === 'cargo') await setView(Views.Cargo);
        }
        
        // Restaura o modo foco
        if (typeof focus === 'boolean') {
          console.log('Restaurando modo foco:', focus);
          await setFocusMode(focus);
        }
      }
    } catch (e) {
      console.error('Erro ao restaurar estado:', e);
    }
  }

  // Inicia telemetria assim que carregar
  initTelemetry();
  initApiKeyUI();
  initVadUI();
  
  // Verifica se a API está disponível
  console.log('Verificando disponibilidade da API...');
  console.log('window.overlayAPI:', window.overlayAPI);
  console.log('overlayAPI.saveState:', window.overlayAPI?.saveState);
  console.log('overlayAPI.getState:', window.overlayAPI?.getState);
  
  // Restaura o estado salvo após inicialização completa
  window.addEventListener('load', () => {
    // Aguarda um pouco mais para garantir que a API esteja disponível
    setTimeout(() => {
      console.log('Tentando restaurar estado após load...');
      if (window.overlayAPI && typeof window.overlayAPI.getState === 'function') {
        console.log('API disponível, restaurando estado...');
        restoreState();
      } else {
        console.log('API ainda não disponível, aguardando...');
        // Tenta novamente após mais tempo
        setTimeout(() => {
          if (window.overlayAPI && typeof window.overlayAPI.getState === 'function') {
            console.log('API disponível na segunda tentativa, restaurando estado...');
            restoreState();
          } else {
            console.log('API não disponível após segunda tentativa');
          }
        }, 1000);
      }
    }, 500);
  });

  // Hotkeys (via IPC do main)
  if (window.overlayAPI && typeof window.overlayAPI.onSetView === 'function') {
    window.overlayAPI.onSetView(async (view) => {
      if (view === 'default') await setView(Views.Default);
      if (view === 'truck') await setView(Views.Truck);
      if (view === 'cargo') await setView(Views.Cargo);
    });
  }

  // Modo Foco: oculta elementos que não fazem parte da telemetria
  const nonTelemetrySelectors = [
    '.non-telemetry'
  ];
  let focusMode = false;
  
  async function setFocusMode(enabled) {
    console.log('setFocusMode chamado com:', enabled);
    focusMode = !!enabled;
    console.log('focusMode definido como:', focusMode);
    
    for (const sel of nonTelemetrySelectors) {
      const elements = document.querySelectorAll(sel);
      console.log(`Encontrados ${elements.length} elementos para selector: ${sel}`);
      elements.forEach(el => {
        const newDisplay = focusMode ? 'none' : '';
        console.log(`Alterando display de elemento ${sel} para: ${newDisplay}`);
        el.style.display = newDisplay;
      });
    }
    
    // Salva o estado do modo foco
    if (window.overlayAPI && typeof window.overlayAPI.saveState === 'function') {
      try {
        await window.overlayAPI.saveState({ view: currentView, focus: focusMode });
        console.log('Estado salvo com sucesso');
      } catch (e) {
        console.error('Erro ao salvar estado do modo foco:', e);
      }
    }
  }
  if (window.overlayAPI && typeof window.overlayAPI.onToggleFocus === 'function') {
    window.overlayAPI.onToggleFocus(async () => await setFocusMode(!focusMode));
  }

  // Auto-resize: observa o tamanho do conteúdo e pede para o main aplicar
  const rootEl = document.querySelector('.root');
  const contentEl = document.querySelector('.content');
  const measureSize = () => {
    const wCandidates = [
      contentEl?.scrollWidth || 0,
      document.documentElement?.scrollWidth || 0,
      rootEl?.scrollWidth || 0,
    ];
    const hCandidates = [
      contentEl?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
      rootEl?.scrollHeight || 0,
    ];
    const targetW = Math.max(200, Math.min(800, Math.ceil(Math.max(...wCandidates))));
    const targetH = Math.max(200, Math.min(1000, Math.ceil(Math.max(...hCandidates))));
    return { targetW, targetH };
  };
  const resize = () => {
    if (!window.overlayAPI || typeof window.overlayAPI.resizeTo !== 'function') return;
    const { targetW, targetH } = measureSize();
    window.overlayAPI.resizeTo(targetW, targetH);
  };
  let resizeTimer = null;
  const debouncedResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  };
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(debouncedResize);
    if (rootEl) ro.observe(rootEl);
    if (contentEl) ro.observe(contentEl);
  } else {
    // fallback
    setInterval(debouncedResize, 500);
  }
  // primeira chamada após load
  window.addEventListener('load', () => setTimeout(resize, 100));

  const stupidButton = document.getElementById('stupidButton');
  if (stupidButton) {
    stupidButton.addEventListener('click', async () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      if (window.overlayAPI) {
        const result = await window.overlayAPI.stripeCheckout('price_1Ruw2z4JAro8Nf4GJeJUyFYe');
        if (!result.ok) {
          console.error('Stripe Checkout Error:', result.error);
        }
      }
    });
  }
})();
